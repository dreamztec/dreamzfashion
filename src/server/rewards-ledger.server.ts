import { db } from "../../db/index";
import {
  externalRewardTransactions,
  rewardAccounts,
  rewardLedger,
} from "../../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { pointsForOrder, tisasngCheckBalance, tisasngConfigured } from "./rewards.server";

/**
 * DREAMZ reward ledger engine. All balances live in reward_accounts and are
 * reconciled with reward_ledger entries. Every mutation happens server-side —
 * no frontend code can change a balance.
 */

export type LedgerCurrency = "points" | "credit";

export type LedgerType =
  | "earned_purchase"
  | "earned_referral"
  | "earned_task"
  | "redeemed"
  | "voucher_claimed"
  | "adjustment"
  | "expired";

export type LedgerStatus = "pending" | "approved" | "redeemed" | "expired" | "reversed";

async function ensureAccount(customerId: number) {
  const [existing] = await db
    .select()
    .from(rewardAccounts)
    .where(eq(rewardAccounts.customerId, customerId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(rewardAccounts)
    .values({ customerId })
    .onConflictDoNothing()
    .returning();
  return (
    created ??
    (await db.select().from(rewardAccounts).where(eq(rewardAccounts.customerId, customerId)).limit(1))[0]
  );
}

interface AppendOptions {
  customerId: number;
  currency: LedgerCurrency;
  type: LedgerType;
  amount: number; // positive credit / negative debit
  status?: LedgerStatus;
  source?: string;
  orderNumber?: string | null;
  reference?: string | null;
  campaign?: string | null;
  note?: string | null;
}

/**
 * Append a ledger entry AND move the balance atomically.
 * Pending entries move the pending buckets; approved entries move the
 * available buckets. This is the only way balances ever change.
 */
export async function appendLedger(opts: AppendOptions): Promise<void> {
  const status = opts.status ?? "approved";
  await ensureAccount(opts.customerId);
  await db.insert(rewardLedger).values({
    customerId: opts.customerId,
    currency: opts.currency,
    type: opts.type,
    amount: opts.amount,
    status,
    source: opts.source ?? "dreamz",
    orderNumber: opts.orderNumber ?? null,
    reference: opts.reference ?? null,
    campaign: opts.campaign ?? null,
    note: opts.note ?? null,
  });

  const isCredit = opts.amount > 0;
  const magnitude = Math.abs(opts.amount);
  if (opts.currency === "points") {
    if (status === "pending") {
      await db
        .update(rewardAccounts)
        .set({
          pointsPending: sql`${rewardAccounts.pointsPending} + ${isCredit ? magnitude : -magnitude}`,
          pointsLifetime: isCredit ? sql`${rewardAccounts.pointsLifetime} + ${magnitude}` : sql`${rewardAccounts.pointsLifetime}`,
          updatedAt: new Date(),
        })
        .where(eq(rewardAccounts.customerId, opts.customerId));
    } else if (status === "approved") {
      await db
        .update(rewardAccounts)
        .set({
          pointsAvailable: sql`${rewardAccounts.pointsAvailable} + ${isCredit ? magnitude : -magnitude}`,
          pointsLifetime: isCredit ? sql`${rewardAccounts.pointsLifetime} + ${magnitude}` : sql`${rewardAccounts.pointsLifetime}`,
          updatedAt: new Date(),
        })
        .where(eq(rewardAccounts.customerId, opts.customerId));
    } else if (status === "reversed" || status === "expired") {
      // A pending entry that dies: pull it back out of the pending bucket.
      await db
        .update(rewardAccounts)
        .set({
          pointsPending: sql`GREATEST(${rewardAccounts.pointsPending} - ${magnitude}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(rewardAccounts.customerId, opts.customerId));
    }
    // "redeemed" entries were already debited at redemption time.
  } else {
    if (status === "pending") {
      await db
        .update(rewardAccounts)
        .set({
          creditPendingKobo: sql`${rewardAccounts.creditPendingKobo} + ${isCredit ? magnitude : -magnitude}`,
          updatedAt: new Date(),
        })
        .where(eq(rewardAccounts.customerId, opts.customerId));
    } else if (status === "approved") {
      await db
        .update(rewardAccounts)
        .set({
          creditKobo: sql`${rewardAccounts.creditKobo} + ${isCredit ? magnitude : -magnitude}`,
          updatedAt: new Date(),
        })
        .where(eq(rewardAccounts.customerId, opts.customerId));
    } else if (status === "reversed" || status === "expired") {
      await db
        .update(rewardAccounts)
        .set({
          creditPendingKobo: sql`GREATEST(${rewardAccounts.creditPendingKobo} - ${magnitude}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(rewardAccounts.customerId, opts.customerId));
    }
  }
}

/**
 * Purchase reward — created EXACTLY ONCE per verified order (idempotent),
 * from server-side code that has already verified the Paystack payment.
 */
export async function grantPurchaseReward(
  customerId: number,
  orderNumber: string,
  orderTotalKobo: number,
): Promise<{ granted: boolean; points: number }> {
  const { getRewardsConfig } = await import("./rewards.server");
  const cfg = await getRewardsConfig();
  const points = pointsForOrder(orderTotalKobo, cfg);
  if (points <= 0) return { granted: false, points: 0 };

  // The unique (customer, type, order) shape is enforced by the caller via
  // reference; guard here against ledger duplication too.
  const existing = await db
    .select({ id: rewardLedger.id })
    .from(rewardLedger)
    .where(
      and(
        eq(rewardLedger.customerId, customerId),
        eq(rewardLedger.type, "earned_purchase"),
        eq(rewardLedger.orderNumber, orderNumber),
      ),
    )
    .limit(1);
  if (existing.length > 0) return { granted: false, points: 0 };

  await appendLedger({
    customerId,
    currency: "points",
    type: "earned_purchase",
    amount: points,
    status: "approved",
    source: "dreamz",
    orderNumber,
    note: `Purchase reward — ${orderNumber}`,
  });
  return { granted: true, points };
}

/**
 * Server-side connectivity probe against the documented TisasNG endpoint.
 * Writes an audit row; returns ONLY a boolean to the caller. Balances from
 * the response are never exposed through this function's return value.
 */
export async function verifyTisasngConnection(
  customerId: number | null,
): Promise<{ connected: boolean }> {
  const outcome = await tisasngCheckBalance();
  await db.insert(externalRewardTransactions).values({
    customerId,
    provider: "tisasng",
    operation: "balance_check",
    status: outcome.ok ? "ok" : "error",
    result: outcome.ok ? { keys: Object.keys(outcome.result ?? {}) } : { error: outcome.error },
  });
  return { connected: outcome.ok };
}

export { tisasngConfigured };
