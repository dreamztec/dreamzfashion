import { db } from "../../db/index";
import {
  commissions,
  partnerProfiles,
  payoutRequests,
  products,
  referrers,
} from "../../db/schema";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";

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
 * orders). Attribution is resolved server-side: the /r/CODE click session was
 * bound to the order at checkout time (referral_attributions.order_number),
 * so no browser data is trusted here.
 */
export async function recordVerifiedCommission(
  order: { id: number; orderNumber: string; total: number; customerId: number | null },
): Promise<void> {
  const { referralAttributions } = await import("../../db/schema");
  const conds = [eq(referralAttributions.orderNumber, order.orderNumber)];
  if (order.customerId) {
    conds.push(eq(referralAttributions.customerId, order.customerId));
  }
  const [attribution] = await db
    .select({ referrerId: referralAttributions.referrerId })
    .from(referralAttributions)
    .where(
      and(
        inArray(referralAttributions.status, ["order_started", "payment_verified", "registered"]),
        or(...conds),
      ),
    )
    .orderBy(asc(referralAttributions.id))
    .limit(1);
  const referrerId = attribution?.referrerId ?? null;
  if (!referrerId) return;

  // Idempotency: (order, partner) unique index.
  const [existing] = await db
    .select({ id: commissions.id })
    .from(commissions)
    .where(and(eq(commissions.orderId, order.id), eq(commissions.referrerId, referrerId)))
    .limit(1);
  if (existing) return;

  const [referrer] = await db.select().from(referrers).where(eq(referrers.id, referrerId)).limit(1);
  if (!referrer || referrer.status !== "approved") return;
  // Only creator and trade partners earn cash commissions here; referral
  // track rewards run through the referral engine.
  if (referrer.track !== "creator" && referrer.track !== "trade") return;

  // Self-referral guard: the partner's own account never earns.
  if (referrer.customerId && referrer.customerId === order.customerId) return;

  const settings = await getPartnerSettings();
  if (settings.commissionBps <= 0) return; // no invented earnings

  const amountKobo = Math.floor((order.total * settings.commissionBps) / 10_000);
  if (amountKobo <= 0) return;

  await db.insert(commissions).values({
    referrerId: referrer.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderTotalKobo: order.total,
    rateBps: settings.commissionBps,
    amountKobo,
    status: "pending",
  });

  // Bind the attribution to this order for the partner's own dashboard.
  await db
    .update(referralAttributions)
    .set({ status: "payment_verified", orderNumber: order.orderNumber, orderId: order.id, updatedAt: new Date() })
    .where(
      and(
        eq(referralAttributions.referrerId, referrerId),
        inArray(referralAttributions.status, ["order_started"]),
      ),
    );
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
    if (!img.url || img.url.startsWith("/img/")) continue;
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

  const settings = await getPartnerSettings();
  const payableKobo = myCommissions
    .filter((c) => c.status === "eligible")
    .reduce((s, c) => s + c.amountKobo, 0);

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
      amountKobo: c.amountKobo,
      status: c.status,
      createdAt: c.createdAt?.toISOString() ?? null,
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
      lifetimeKobo: myCommissions.filter((c) => c.status !== "reversed").reduce((s, c) => s + c.amountKobo, 0),
    },
    terms: {
      payoutThresholdKobo: settings.payoutThresholdKobo,
      termsNote: settings.termsNote,
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
  await db.insert(payoutRequests).values({
    referrerId,
    amountKobo: dashboard.stats.eligibleKobo,
    destination,
  });
}

/** Reverse commissions when an order is refunded or cancelled. */
export async function reverseCommissionsForOrder(orderId: number): Promise<void> {
  await db
    .update(commissions)
    .set({ status: "reversed", updatedAt: new Date() })
    .where(and(eq(commissions.orderId, orderId), inArray(commissions.status, ["pending", "eligible", "paid"])));
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
