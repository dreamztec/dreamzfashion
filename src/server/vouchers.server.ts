import { db } from "../../db/index";
import { products, vouchers, voucherRedemptions } from "../../db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

/**
 * DREAMZ voucher engine (printed voucher codes).
 *
 * Lifecycle: imported → available → claimed (in a customer wallet) →
 * reserved (held against a pending order) → redeemed (after verified payment)
 * or released (payment failed / order cancelled) → expired / cancelled.
 */

export type VoucherType = "fixed" | "percentage" | "product" | "category" | "campaign_reward";

export interface VoucherCheck {
  ok: boolean;
  reason?: string;
  voucher?: {
    id: number;
    code: string;
    type: VoucherType;
    value: number;
    minimumSpend: number;
    expiresAt: string | null;
    status: string;
  };
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Look up a voucher by code WITHOUT exposing the rest of the table. */
export async function lookupVoucher(rawCode: string): Promise<VoucherCheck> {
  const code = normalizeCode(rawCode);
  if (!code || code.length < 4 || code.length > 40) {
    return { ok: false, reason: "We couldn't validate this voucher." };
  }
  const [v] = await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  if (!v) return { ok: false, reason: "We couldn't validate this voucher." };

  const now = new Date();
  if (v.status === "redeemed") return { ok: false, reason: "This voucher has already been redeemed." };
  if (v.status === "cancelled") return { ok: false, reason: "This voucher is no longer valid." };
  if (v.expiresAt && v.expiresAt < now) {
    return { ok: false, reason: "This voucher has expired." };
  }
  if (v.validFrom && v.validFrom > now) {
    return { ok: false, reason: "This voucher is not active yet." };
  }
  return {
    ok: true,
    voucher: {
      id: v.id,
      code: v.code,
      type: v.type as VoucherType,
      value: v.value,
      minimumSpend: v.minimumSpend,
      expiresAt: v.expiresAt?.toISOString() ?? null,
      status: v.status,
    },
  };
}

/**
 * Compute the discount a voucher gives on a concrete cart, server-side.
 * Returns the discount in kobo and the eligible subtotal it applies to.
 */
export async function computeVoucherDiscount(
  voucherId: number,
  lines: Array<{ productId: number | null; categorySlug: string | null; unitPrice: number; quantity: number }>,
): Promise<{ discountKobo: number; eligibleSubtotalKobo: number; reason?: string }> {
  const [v] = await db.select().from(vouchers).where(eq(vouchers.id, voucherId)).limit(1);
  if (!v) return { discountKobo: 0, eligibleSubtotalKobo: 0, reason: "Voucher not found" };

  const cartSubtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  if (v.minimumSpend > 0 && cartSubtotal < v.minimumSpend) {
    return {
      discountKobo: 0,
      eligibleSubtotalKobo: 0,
      reason: `This voucher requires a minimum spend of ₦${Math.round(v.minimumSpend / 100).toLocaleString("en-NG")}.`,
    };
  }

  const restricted = (v.eligibleProducts?.length ?? 0) > 0 || (v.eligibleCategories?.length ?? 0) > 0;
  let eligibleLines = lines;
  if (restricted) {
    const eligibleProductIds = new Set(v.eligibleProducts ?? []);
    const eligibleCategories = new Set((v.eligibleCategories ?? []).map((c) => c.toLowerCase()));
    eligibleLines = lines.filter(
      (l) =>
        (l.productId != null && eligibleProductIds.has(l.productId)) ||
        (l.categorySlug != null && eligibleCategories.has(l.categorySlug.toLowerCase())),
    );
    if (eligibleLines.length === 0) {
      return { discountKobo: 0, eligibleSubtotalKobo: 0, reason: "This voucher does not apply to the items in your cart." };
    }
  }
  const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  let discount: number;
  if (v.type === "percentage") {
    // value is basis points (1000 = 10%)
    discount = Math.floor((eligibleSubtotal * v.value) / 10000);
    if (v.maximumDiscount != null && v.maximumDiscount > 0) {
      discount = Math.min(discount, v.maximumDiscount);
    }
  } else {
    // fixed / product / category / campaign_reward all act as fixed-value credit
    discount = Math.min(v.value, eligibleSubtotal);
  }
  return { discountKobo: Math.max(0, discount), eligibleSubtotalKobo: eligibleSubtotal };
}

/**
 * Claim a voucher into a customer's wallet. Single-use vouchers can only be
 * claimed once — enforced with a conditional UPDATE so two simultaneous
 * claims cannot both succeed.
 */
export async function claimVoucherToCustomer(
  voucherId: number,
  customerId: number,
): Promise<{ ok: boolean; reason?: string }> {
  const [v] = await db.select().from(vouchers).where(eq(vouchers.id, voucherId)).limit(1);
  if (!v) return { ok: false, reason: "We couldn't validate this voucher." };
  const now = new Date();
  if (v.status === "redeemed") return { ok: false, reason: "This voucher has already been redeemed." };
  if (v.status === "cancelled") return { ok: false, reason: "This voucher is no longer valid." };
  if (v.expiresAt && v.expiresAt < now) return { ok: false, reason: "This voucher has expired." };
  if (v.assignedCustomerId && v.assignedCustomerId !== customerId) {
    return { ok: false, reason: "This voucher belongs to another account." };
  }
  if (!v.singleUse && v.status === "available") {
    // Multi-use vouchers stay "available" but record the claim; the wallet
    // still shows it via voucher_redemptions-less claim row.
  }

  const claimed = await db
    .update(vouchers)
    .set({
      status: "claimed",
      claimedByCustomerId: customerId,
      claimedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(vouchers.id, voucherId),
        inArray(vouchers.status, ["available", "imported", "claimed"]),
      ),
    )
    .returning({ id: vouchers.id, claimedBy: vouchers.claimedByCustomerId });

  const row = claimed[0];
  if (!row) return { ok: false, reason: "This voucher is no longer available." };
  if (row.claimedBy !== customerId) {
    return { ok: false, reason: "This voucher has already been claimed." };
  }
  return { ok: true };
}

/**
 * HOLD (reserve) a claimed voucher against a pending order (status "reserved").
 * Called during initializeCheckout BEFORE payment. Two browser tabs cannot
 * both hold the same single-use voucher: the UPDATE only succeeds from a
 * "claimed"/"available" state. A held voucher is never consumed — release
 * returns it to the wallet when payment fails.
 */
export async function holdVoucherForOrder(
  voucherId: number,
  orderId: number,
  customerId: number | null,
  discountKobo: number,
): Promise<{ ok: boolean; reason?: string }> {
  const now = new Date();
  const updated = await db
    .update(vouchers)
    .set({ status: "reserved", updatedAt: now })
    .where(
      and(
        eq(vouchers.id, voucherId),
        customerId
          ? eq(vouchers.claimedByCustomerId, customerId)
          : sql`${vouchers.claimedByCustomerId} IS NULL`,
        inArray(vouchers.status, ["available", "claimed"]),
      ),
    )
    .returning({ id: vouchers.id });
  if (updated.length === 0) return { ok: false, reason: "The voucher could not be applied to this order." };

  await db.insert(voucherRedemptions).values({
    voucherId,
    orderId,
    status: "held",
    discountKobo,
  });
  return { ok: true };
}

/**
 * Permanently redeem the voucher after VERIFIED payment. Idempotent — a
 * duplicate webhook or a second verify call changes nothing.
 */
export async function redeemVoucherForOrder(
  voucherId: number,
  orderId: number,
): Promise<void> {
  const now = new Date();
  const updated = await db
    .update(vouchers)
    .set({ status: "redeemed", redeemedOrderId: orderId, redeemedAt: now, updatedAt: now })
    .where(and(eq(vouchers.id, voucherId), inArray(vouchers.status, ["reserved", "claimed", "available"])))
    .returning({ id: vouchers.id });
  await db
    .update(voucherRedemptions)
    .set({ status: "redeemed", redeemedAt: now })
    .where(and(eq(voucherRedemptions.voucherId, voucherId), eq(voucherRedemptions.orderId, orderId), inArray(voucherRedemptions.status, ["held"])));
  if (updated.length === 0) {
    // Already redeemed by a concurrent path — treat as no-op (idempotent).
  }
}

/**
 * RELEASE the hold when payment fails or the order is cancelled — the voucher
 * returns to the customer's wallet as available.
 */
export async function releaseVoucherForOrder(
  voucherId: number,
  orderId: number,
): Promise<void> {
  const now = new Date();
  await db
    .update(vouchers)
    .set({ status: "claimed", updatedAt: now })
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.status, "reserved")));
  await db
    .update(voucherRedemptions)
    .set({ status: "released", releasedAt: now })
    .where(and(eq(voucherRedemptions.voucherId, voucherId), eq(voucherRedemptions.orderId, orderId), eq(voucherRedemptions.status, "held")));
}

/**
 * List vouchers in a customer's wallet — safe projection only.
 */
export async function listCustomerVouchers(customerId: number) {
  const rows = await db
    .select()
    .from(vouchers)
    .where(eq(vouchers.claimedByCustomerId, customerId))
    .orderBy(sql`${vouchers.claimedAt} DESC`);
  const now = new Date();
  return rows.map((v) => ({
    id: v.id,
    code: v.code,
    campaign: v.campaign,
    type: v.type,
    value: v.value,
    minimumSpend: v.minimumSpend,
    maximumDiscount: v.maximumDiscount,
    status: v.expiresAt && v.expiresAt < now && v.status !== "redeemed" ? "expired" : v.status,
    expiresAt: v.expiresAt?.toISOString() ?? null,
    claimedAt: v.claimedAt?.toISOString() ?? null,
  }));
}

/** Helper for checkout: enrich cart lines with their category for eligibility. */
export async function categorySlugsForProductIds(productIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (productIds.length === 0) return map;
  const rows = await db
    .select({ id: products.id, categorySlug: products.categorySlug })
    .from(products)
    .where(inArray(products.id, productIds));
  for (const r of rows) map.set(r.id, r.categorySlug);
  return map;
}
