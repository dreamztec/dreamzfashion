import { db } from "../../db/index";
import {
  commissions,
  orderEvents,
  orders,
  partnerProfiles,
  payoutRequests,
  products,
  referrers,
} from "../../db/schema";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { isDisplayableImageUrl } from "../lib/img";
import {
  bpsOf,
  classifyAttribution,
  commissionBasisKobo,
  formatRate,
  isCommissionEligible,
  isSelfPurchase,
} from "../lib/attribution";
import { getPartnerSettingsFull } from "./order-pricing.server";

/**
 * Earn-with-DREAMZ partner engine.
 *
 * Three tracks share one application record (referrers.track):
 *   referral — recommend products, earn per configured programme
 *   creator  — curated storefront + co-designed collections
 *   trade    — volume reseller, quoted per order
 *
 * Commission rules (enforced here, not in the browser):
 *  - commissions exist only for verified, FULLY paid orders
 *  - one row per (order, partner) — unique index backs idempotency
 *  - self-referral is never rewarded
 *  - rates come from admin-configured settings, never the client
 *  - commissions sit "pending" until fulfilment + the return window pass;
 *    admin marks them eligible/paid. Refunds/cancellations reverse them.
 */

export type PartnerSettings = {
  commissionBps: number;
  payoutThresholdKobo: number;
  attributionWindowDays: number;
  termsNote: string;
};

export async function getPartnerSettings(): Promise<PartnerSettings> {
  const { getSetting } = await import("./catalog.server");
  return getSetting("partners", {
    commissionBps: 0,
    payoutThresholdKobo: 0,
    attributionWindowDays: 30,
    termsNote: "",
  });
}

/**
 * Commission engine — called ONLY from runPostPaymentEngines (fully paid
 * orders). Attribution was resolved and saved on the order when it was
 * created (explicit checkout code > referral link), so an unpaid request
 * that is paid later keeps its partner. Legacy orders without a saved
 * attribution fall back to the /r/CODE click session bound at checkout.
 * Rules live in src/lib/attribution.ts.
 */
export async function recordVerifiedCommission(
  order: Pick<
    typeof orders.$inferSelect,
    "id" | "orderNumber" | "total" | "subtotal" | "discountKobo" | "customerId" | "email" | "phone" | "paymentStatus"
  > & Partial<Pick<typeof orders.$inferSelect, "referrerId" | "attributionOutcome" | "selfPurchaseBenefitKobo">>,
): Promise<{ created: boolean; reason: string }> {
  if (order.paymentStatus !== "paid") return { created: false, reason: "unpaid" };
  let referrerId = order.referrerId ?? null;
  if (!referrerId) {
    const { referralAttributions } = await import("../../db/schema");
    const conds = [eq(referralAttributions.orderNumber, order.orderNumber)];
    if (order.customerId) conds.push(eq(referralAttributions.customerId, order.customerId));
    const [attribution] = await db
      .select({ referrerId: referralAttributions.referrerId })
      .from(referralAttributions)
      .where(and(inArray(referralAttributions.status, ["order_started", "payment_verified", "registered"]), or(...conds)))
      .orderBy(asc(referralAttributions.id))
      .limit(1);
    referrerId = attribution?.referrerId ?? null;
  }
  if (!referrerId) return { created: false, reason: "no_attribution" };

  const [referrer] = await db.select().from(referrers).where(eq(referrers.id, referrerId)).limit(1);
  if (!referrer || referrer.status !== "approved") return { created: false, reason: "partner_not_approved" };

  const settings = await getPartnerSettingsFull();
  const self =
    order.attributionOutcome === "self_purchase" ||
    order.attributionOutcome === "self_purchase_benefit" ||
    isSelfPurchase(
      { customerId: referrer.customerId, email: referrer.email, phone: referrer.phone },
      { customerId: order.customerId, email: order.email, phone: order.phone },
    );
  const outcome = classifyAttribution({
    track: referrer.track,
    selfPurchase: self,
    commissionBps: settings.commissionBps,
    selfPurchaseBenefitBps: settings.selfPurchaseBenefitBps,
  });
  if (outcome !== "commission") return { created: false, reason: outcome };

  const basis = commissionBasisKobo(order);
  const amountKobo = bpsOf(basis, settings.commissionBps);
  if (amountKobo <= 0) return { created: false, reason: "zero_amount" };

  // Idempotency: the (order, partner) unique index makes duplicate payment
  // events (verify + webhook, retries) a no-op.
  const inserted = await db
    .insert(commissions)
    .values({
      referrerId: referrer.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderTotalKobo: basis,
      rateBps: settings.commissionBps,
      amountKobo,
      status: "pending",
      note: "Basis: merchandise after discounts, excluding delivery",
    })
    .onConflictDoNothing({ target: [commissions.orderId, commissions.referrerId] })
    .returning();
  if (inserted.length === 0) return { created: false, reason: "duplicate" };

  const { referralAttributions } = await import("../../db/schema");
  await db
    .update(referralAttributions)
    .set({ status: "payment_verified", orderNumber: order.orderNumber, orderId: order.id, updatedAt: new Date() })
    .where(and(eq(referralAttributions.referrerId, referrerId), inArray(referralAttributions.status, ["order_started"])));
  return { created: true, reason: "commission" };
}

/**
 * Pending → eligible: the order is fully paid, delivered/completed, and the
 * return window (Admin → Settings → Partner commissions) has passed since
 * delivery. Safe to run repeatedly; called when dashboards load.
 */
export async function promoteEligibleCommissions(referrerId?: number): Promise<number> {
  const settings = await getPartnerSettingsFull();
  const pending = await db
    .select({ id: commissions.id, orderId: commissions.orderId })
    .from(commissions)
    .where(
      referrerId
        ? and(eq(commissions.status, "pending"), eq(commissions.referrerId, referrerId))
        : eq(commissions.status, "pending"),
    )
    .limit(500);
  let promoted = 0;
  for (const c of pending) {
    if (!c.orderId) continue;
    const [o] = await db
      .select({ status: orders.status, paymentStatus: orders.paymentStatus, id: orders.id })
      .from(orders)
      .where(eq(orders.id, c.orderId))
      .limit(1);
    if (!o) continue;
    const [delivered] = await db
      .select({ at: orderEvents.createdAt })
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, o.id), inArray(orderEvents.status, ["delivered", "completed"])))
      .orderBy(asc(orderEvents.id))
      .limit(1);
    if (
      isCommissionEligible({
        orderStatus: o.status,
        paymentStatus: o.paymentStatus,
        deliveredAt: delivered?.at ?? null,
        returnWindowDays: settings.returnWindowDays,
      })
    ) {
      await db
        .update(commissions)
        .set({ status: "eligible", eligibleAt: new Date(), updatedAt: new Date() })
        .where(and(eq(commissions.id, c.id), eq(commissions.status, "pending")));
      promoted++;
    }
  }
  return promoted;
}

/** Public creator storefront data — approved products only, minimum info. */
export async function getCreatorStorefront(slug: string) {
  const [profile] = await db
    .select({
      referrerId: partnerProfiles.referrerId,
      storeName: partnerProfiles.storeName,
      bio: partnerProfiles.bio,
      instagram: partnerProfiles.instagram,
      curatedProductIds: partnerProfiles.curatedProductIds,
    })
    .from(partnerProfiles)
    .where(and(eq(partnerProfiles.storeSlug, slug), eq(partnerProfiles.storefrontStatus, "live")))
    .limit(1);
  if (!profile) return null;
  const [partner] = await db
    .select({ code: referrers.code, displayName: referrers.displayName })
    .from(referrers)
    .where(eq(referrers.id, profile.referrerId))
    .limit(1);
  if (!partner || partner.code === null) return null;

  const curated = profile.curatedProductIds.length
    ? await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          shortDescription: products.shortDescription,
          tier: products.tier,
        })
        .from(products)
        .where(
          and(
            inArray(products.id, profile.curatedProductIds),
            eq(products.status, "published"),
          ),
        )
        .orderBy(asc(products.name))
    : [];

  // Cover image (uploaded media only — legacy bundled files are not shown).
  const { productImages } = await import("../../db/schema");
  const images = curated.length
    ? await db
        .select({ productId: productImages.productId, url: productImages.url, position: productImages.position })
        .from(productImages)
        .where(inArray(productImages.productId, curated.map((p) => p.id)))
    : [];
  const coverByProduct = new Map<number, string>();
  for (const img of images.sort((a, b) => a.position - b.position)) {
    if (!isDisplayableImageUrl(img.url)) continue;
    if (!coverByProduct.has(img.productId)) coverByProduct.set(img.productId, img.url);
  }

  return {
    storeName: profile.storeName || partner.displayName || "DREAMZ Creator",
    bio: profile.bio || "",
    instagram: profile.instagram || "",
    referralCode: partner.code,
    products: curated.map((p) => ({ ...p, image: coverByProduct.get(p.id) ?? null })),
  };
}

/**
 * Partner dashboard data — strictly their own records. No customer
 * addresses, no supplier identities, no internal costs, no other partners.
 */
export async function getPartnerDashboard(referrerId: number) {
  const [partner] = await db.select().from(referrers).where(eq(referrers.id, referrerId)).limit(1);
  if (!partner) return null;
  await promoteEligibleCommissions(referrerId).catch(() => 0);
  const profile = (
    await db.select().from(partnerProfiles).where(eq(partnerProfiles.referrerId, referrerId)).limit(1)
  )[0];
  const myCommissions = await db
    .select()
    .from(commissions)
    .where(eq(commissions.referrerId, referrerId))
    .orderBy(desc(commissions.id))
    .limit(100);
  const myPayouts = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.referrerId, referrerId))
    .orderBy(desc(payoutRequests.id))
    .limit(50);
  const [attributedOrders] = await db
    .select({
      paid: sql<number>`count(*) FILTER (WHERE status = 'payment_verified')::int`,
      clicks: sql<number>`count(*)::int`,
    })
    .from(sql`referral_attributions`)
    .where(sql`referrer_id = ${referrerId}`);

  const settings = await getPartnerSettingsFull();
  const payableKobo = myCommissions
    .filter((c) => c.status === "eligible" && !c.payoutRequestId)
    .reduce((s, c) => s + c.amountKobo, 0);
  // Orders carrying this partner's code — order number, date, status and
  // value only. No customer names, addresses or phone numbers.
  const attributed = await db
    .select({
      orderNumber: orders.orderNumber,
      createdAt: orders.createdAt,
      paymentStatus: orders.paymentStatus,
      status: orders.status,
      subtotal: orders.subtotal,
      discountKobo: orders.discountKobo,
      attributionSource: orders.attributionSource,
      attributionOutcome: orders.attributionOutcome,
    })
    .from(orders)
    .where(eq(orders.referrerId, referrerId))
    .orderBy(desc(orders.id))
    .limit(100);

  return {
    code: partner.code,
    status: partner.status,
    track: partner.track,
    displayName: partner.displayName,
    profile: profile
      ? {
          storeName: profile.storeName,
          storeSlug: profile.storeSlug,
          bio: profile.bio,
          instagram: profile.instagram,
          curatedProductIds: profile.curatedProductIds,
          storefrontStatus: profile.storefrontStatus,
        }
      : null,
    commissions: myCommissions.map((c) => ({
      id: c.id,
      orderNumber: c.orderNumber,
      basisKobo: c.orderTotalKobo,
      rateBps: c.rateBps,
      amountKobo: c.amountKobo,
      status: c.status,
      inPayout: Boolean(c.payoutRequestId),
      createdAt: c.createdAt?.toISOString() ?? null,
    })),
    attributedOrders: attributed.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt?.toISOString() ?? null,
      paid: o.paymentStatus === "paid",
      paymentStatus: o.paymentStatus,
      status: o.status,
      merchandiseKobo: Math.max(0, o.subtotal - o.discountKobo),
      source: o.attributionSource,
      outcome: o.attributionOutcome,
    })),
    payouts: myPayouts.map((p) => ({
      id: p.id,
      amountKobo: p.amountKobo,
      status: p.status,
      requestedAt: p.requestedAt?.toISOString() ?? null,
      adminReference: p.adminReference,
    })),
    stats: {
      clicks: Number(attributedOrders?.clicks ?? 0),
      paidOrders: Number(attributedOrders?.paid ?? 0),
      pendingKobo: myCommissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amountKobo, 0),
      eligibleKobo: payableKobo,
      reversedKobo: myCommissions.filter((c) => c.status === "reversed").reduce((s, c) => s + c.amountKobo, 0),
      paidKobo: myCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amountKobo, 0),
      lifetimeKobo: myCommissions.filter((c) => c.status !== "reversed").reduce((s, c) => s + c.amountKobo, 0),
    },
    terms: {
      payoutThresholdKobo: settings.payoutThresholdKobo,
      termsNote: settings.termsNote,
      commissionBps: settings.commissionBps,
      rateLabel: formatRate(settings.commissionBps),
      returnWindowDays: settings.returnWindowDays,
      selfPurchaseBenefitBps: settings.selfPurchaseBenefitBps,
    },
  };
}

/** Request a payout — admin reviews before any transfer. */
export async function requestPayout(referrerId: number, destination: string): Promise<void> {
  const dashboard = await getPartnerDashboard(referrerId);
  if (!dashboard) throw new Error("Partner not found");
  if (dashboard.stats.eligibleKobo <= 0) throw new Error("No eligible commissions to pay out yet");
  if (dashboard.terms.payoutThresholdKobo > 0 && dashboard.stats.eligibleKobo < dashboard.terms.payoutThresholdKobo) {
    throw new Error("You have not reached the payout threshold yet");
  }
  const openRequest = await db
    .select({ id: payoutRequests.id })
    .from(payoutRequests)
    .where(and(eq(payoutRequests.referrerId, referrerId), inArray(payoutRequests.status, ["requested", "approved"])))
    .limit(1);
  if (openRequest.length > 0) throw new Error("You already have a payout under review");
  const [request] = await db
    .insert(payoutRequests)
    .values({ referrerId, amountKobo: dashboard.stats.eligibleKobo, destination })
    .returning();
  // Reserve exactly the eligible commissions this request covers.
  await db
    .update(commissions)
    .set({ payoutRequestId: request.id, updatedAt: new Date() })
    .where(
      and(
        eq(commissions.referrerId, referrerId),
        eq(commissions.status, "eligible"),
        sql`${commissions.payoutRequestId} IS NULL`,
      ),
    );
}

/** Reverse commissions when an order is refunded or cancelled. */
export async function reverseCommissionsForOrder(orderId: number, reason: "refund" | "cancellation"): Promise<void> {
  await db
    .update(commissions)
    .set({ status: "reversed", note: `Reversed — order ${reason}`, payoutRequestId: null, updatedAt: new Date() })
    .where(and(eq(commissions.orderId, orderId), inArray(commissions.status, ["pending", "eligible"])));
  // Already-paid commissions are never silently rewritten: flag for the owner.
  await db
    .update(commissions)
    .set({ note: `Order ${reason} after payout — recover manually`, updatedAt: new Date() })
    .where(and(eq(commissions.orderId, orderId), eq(commissions.status, "paid")));
}

/** Attribution window note: sessions older than the window never attribute. */
export async function attributionSessionValid(sessionId: string): Promise<boolean> {
  const { referralAttributions } = await import("../../db/schema");
  const settings = await getPartnerSettings();
  const [row] = await db
    .select({ createdAt: referralAttributions.createdAt })
    .from(referralAttributions)
    .where(eq(referralAttributions.sessionId, sessionId))
    .limit(1);
  if (!row?.createdAt) return false;
  const ageDays = (Date.now() - row.createdAt.getTime()) / 86_400_000;
  return ageDays <= settings.attributionWindowDays;
}
