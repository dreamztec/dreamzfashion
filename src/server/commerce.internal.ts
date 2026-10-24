import { db } from "../../db/index";
import {
  campaigns,
  customers,
  orderEvents,
  orders,
  payments,
  referralAttributions,
  taskProgress,
  voucherRedemptions,
} from "../../db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

/**
 * Server-only commerce internals. These are plain (non-`createServerFn`)
 * functions, so they must never live in a `*.functions.ts` module: the
 * TanStack Start compiler keeps non-RPC exports in the client-split of that
 * module, which drags the database driver into the browser bundle and crashes
 * hydration. Route handlers and server functions import from here.
 */

/**
 * Single idempotent confirmation used by BOTH the verify callback and the
 * webhook. The payments ledger row is marked processed once — a second call
 * (duplicate webhook, double verify) short-circuits and changes nothing.
 *
 * Payment-aware: the row's own amount is credited to the order (full payment,
 * deposit, balance or quote milestone). An order is "paid" only when verified
 * cash covers the full total — a deposit moves it to deposit_paid and leaves
 * a tracked outstanding balance that must be cleared before dispatch.
 */
export async function confirmOrderPaid(
  orderId: number,
  reference: string,
  channel: string,
  source: "verify" | "webhook",
  eventId?: string,
): Promise<{ alreadyProcessed: boolean }> {
  // Claim the payment row atomically: only the first caller wins.
  const claimed = await db
    .update(payments)
    .set({
      status: "success",
      channel,
      processedAt: new Date(),
      updatedAt: new Date(),
      ...(eventId ? { gatewayEventId: eventId } : {}),
    })
    .where(sql`${payments.reference} = ${reference} AND ${payments.processedAt} IS NULL`)
    .returning({
      id: payments.id,
      amountKobo: payments.amountKobo,
      kind: payments.kind,
    });

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return { alreadyProcessed: false };

  if (claimed.length === 0) {
    // Row already processed on a previous call (or unknown reference).
    return { alreadyProcessed: true };
  }

  const payment = claimed[0];
  const newPaidKobo = (order.paidKobo ?? 0) + payment.amountKobo;
  const fullyPaid = newPaidKobo >= order.total;
  const nextPaymentStatus = fullyPaid ? "paid" : "deposit_paid";
  const nextStatus = fullyPaid ? "payment_confirmed" : order.status;
  const now = new Date();
  const timelineEntry = {
    status: fullyPaid ? "payment_confirmed" : "deposit_received",
    at: now.toISOString(),
  };

  await db
    .update(orders)
    .set({
      paidKobo: newPaidKobo,
      paymentStatus: nextPaymentStatus,
      paymentMethod: channel,
      status: nextStatus,
      timeline: [...order.timeline, timelineEntry],
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  // Insert the confirmation event only when this call actually did the work.
  const eventStatus = fullyPaid ? "payment_confirmed" : "deposit_received";
  const existingEvents = await db
    .select({ id: orderEvents.id })
    .from(orderEvents)
    .where(sql`${orderEvents.orderId} = ${orderId} AND ${orderEvents.status} = ${eventStatus}`)
    .limit(1);
  if (existingEvents.length === 0) {
    await db.insert(orderEvents).values({
      orderId,
      status: eventStatus,
      note:
        eventStatus === "deposit_received"
          ? `Deposit verified via ${channel} — balance of ${order.balanceKobo / 100}₦ outstanding`
          : source === "webhook"
            ? "Payment confirmed via webhook"
            : `Payment verified via ${channel}`,
    });
  }

  // ── Post-payment engines (all idempotent) ──────────────────────────
  // Fulfilment engines (vouchers, rewards, referrals, commissions) fire only
  // when the order is FULLY paid — a deposit alone reserves nothing yet.
  if (fullyPaid) {
    await runPostPaymentEngines({ ...order, paidKobo: newPaidKobo }).catch((err) => {
      // Engines must never break the payment confirmation itself.
      console.error("[dreamz] post-payment engine error:", err instanceof Error ? err.message : err);
    });
  }

  return { alreadyProcessed: claimed.length === 0 };
}

/**
 * Rewards / referrals / vouchers — executed once per verified order.
 * Each engine is individually idempotent:
 *  - purchase reward: guarded by a unique ledger lookup
 *  - referral reward: guarded by the (order_id, referrer_id) unique index
 *  - voucher: the redemption UPDATE only matches an un-redeemed state
 *  - TisasNG gifting: dormant until the official Gift Tokens spec arrives
 */
async function runPostPaymentEngines(order: typeof orders.$inferSelect): Promise<void> {
  const { grantPurchaseReward } = await import("./rewards-ledger.server");
  const { redeemVoucherForOrder } = await import("./vouchers.server");

  // 1. Voucher: permanently redeem the held voucher (or release on later refund).
  if (order.voucherCode) {
    const [held] = await db
      .select({ id: voucherRedemptions.id, voucherId: voucherRedemptions.voucherId })
      .from(voucherRedemptions)
      .where(
        sql`${voucherRedemptions.orderId} = ${order.id} AND ${voucherRedemptions.status} = 'held'`,
      )
      .limit(1);
    if (held) {
      await redeemVoucherForOrder(held.voucherId, order.id);
    } else if (order.paymentMethod === "voucher") {
      // Fully-covered order confirmed directly through confirmOrderPaid.
      const [existing] = await db
        .select({ id: voucherRedemptions.id, voucherId: voucherRedemptions.voucherId })
        .from(voucherRedemptions)
        .where(sql`${voucherRedemptions.orderId} = ${order.id}`)
        .limit(1);
      if (existing) await redeemVoucherForOrder(existing.voucherId, order.id);
    }
  }

  // 2. Purchase reward → DREAMZ Points (only when the owner enabled rewards).
  if (order.customerId) {
    await grantPurchaseReward(order.customerId, order.orderNumber, order.total);
  }

  // 3. Referral reward — once per (order, referrer), from verified payment.
  const { recordVerifiedPurchaseForReferrals } = await import("./referrals.server");
  await recordVerifiedPurchaseForReferrals(order);

  // 3b. Partner commission (creator / trade tracks) — same verified order.
  const { recordVerifiedCommission } = await import("./partners.server");
  await recordVerifiedCommission(order);

  // 4. TisasNG external reward — the official Gift Tokens specification is
  //    not yet available; the internal ledger already records the reward and
  //    the external gift step stays pending documented API support.
}

/**
 * Recompute the signed-in customer's progress for every active campaign's
 * tasks from real server-side data (orders, referrals, profile state), then
 * persist it into task_progress. Campaign rewards come from the campaign's
 * admin-configured JSON — nothing is hard-coded here.
 *
 * Task types understood by the engine:
 *  - verified_orders   target = number of paid orders
 *  - referral_signups  target = number of registered attributions
 *  - profile_complete  target 1 = profile fields filled
 */
export async function syncTaskProgress(customerId: number): Promise<void> {
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.status, "active"));
  if (activeCampaigns.length === 0) return;

  const [orderCount] = await db
    .select({ c: sql<number>`count(*) FILTER (WHERE ${orders.paymentStatus} = 'paid')` })
    .from(orders)
    .where(eq(orders.customerId, customerId));
  const [referralCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(referralAttributions)
    .where(
      and(
        eq(referralAttributions.customerId, customerId),
        inArray(referralAttributions.status, ["registered", "order_started", "payment_verified"]),
      ),
    );
  const [me] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  const profileComplete =
    Boolean(me?.fullName?.trim()) && Boolean(me?.phone?.trim());

  for (const campaign of activeCampaigns) {
    const cfg = campaign.config as {
      tasks?: Array<{ key: string; type?: string; target?: number }>;
    };
    for (const task of cfg.tasks ?? []) {
      const target = Math.max(1, task.target ?? 1);
      let progress = 0;
      switch (task.type) {
        case "verified_orders":
          progress = Math.min(target, Number(orderCount?.c ?? 0));
          break;
        case "referral_signups":
          progress = Math.min(target, Number(referralCount?.c ?? 0));
          break;
        case "profile_complete":
          progress = profileComplete ? target : 0;
          break;
        default:
          progress = 0;
      }
      const completed = progress >= target;
      const now = new Date();
      await db
        .insert(taskProgress)
        .values({
          campaignId: campaign.id,
          customerId,
          taskKey: task.key,
          progress,
          target,
          completed,
          completedAt: completed ? now : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [taskProgress.campaignId, taskProgress.customerId, taskProgress.taskKey],
          set: {
            progress,
            target,
            completed,
            completedAt: sql`CASE WHEN ${taskProgress.completed} THEN ${taskProgress.completedAt} ELSE ${completed ? now : null} END`,
            updatedAt: now,
          },
        });
    }
  }
}
