/**
 * Creator & partner attribution rules — pure functions shared by checkout,
 * the commission engine and tests. Documented for customers on
 * /creators and for the owner in docs/implementation-status.md.
 *
 *  1. An explicit, valid code typed at checkout takes precedence over a
 *     referral link (/r/CODE) clicked earlier.
 *  2. Attribution is saved on the order when it is created — including an
 *     unpaid order request — and is never re-derived from the browser later.
 *  3. Unpaid order → no commission. Verified full payment → one pending
 *     commission per (order, partner). Fulfilled + return window elapsed →
 *     eligible. Refund/cancellation → reversed. Recorded transfer → paid.
 *  4. Self-purchases (the partner buying with their own code) never earn
 *     ordinary commission. A purchase benefit applies only when the owner has
 *     configured one.
 *  5. Commission basis: merchandise subtotal after discounts and any
 *     self-purchase benefit — delivery fees are excluded.
 */

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

/** Codes are case-insensitive: stored and compared upper-case. */
export function normalizePartnerCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

export type AttributionCandidate = { referrerId: number; code: string };

export function chooseAttribution(input: {
  checkoutCode: AttributionCandidate | null;
  referralLink: AttributionCandidate | null;
}): (AttributionCandidate & { source: "checkout_code" | "referral_link" }) | null {
  if (input.checkoutCode) return { ...input.checkoutCode, source: "checkout_code" };
  if (input.referralLink) return { ...input.referralLink, source: "referral_link" };
  return null;
}

export type PartnerIdentity = {
  customerId: number | null;
  email: string | null;
  phone: string | null;
};

function digits(phone: string | null | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "");
  // Compare the last 10 digits so 0803… and +234803… match.
  return d.slice(-10);
}

export function isSelfPurchase(partner: PartnerIdentity, buyer: PartnerIdentity): boolean {
  if (partner.customerId && buyer.customerId && partner.customerId === buyer.customerId) return true;
  if (partner.email && buyer.email && partner.email.trim().toLowerCase() === buyer.email.trim().toLowerCase()) return true;
  const pd = digits(partner.phone);
  if (pd.length === 10 && pd === digits(buyer.phone)) return true;
  return false;
}

export type AttributionOutcome = "commission" | "self_purchase" | "self_purchase_benefit" | "not_eligible";

/** Tracks that earn cash commission through the partner ledger. */
export const COMMISSION_TRACKS = ["creator", "trade"] as const;

export function classifyAttribution(input: {
  track: string;
  selfPurchase: boolean;
  commissionBps: number;
  selfPurchaseBenefitBps: number;
}): AttributionOutcome {
  if (input.selfPurchase) {
    return input.selfPurchaseBenefitBps > 0 ? "self_purchase_benefit" : "self_purchase";
  }
  if (!(COMMISSION_TRACKS as readonly string[]).includes(input.track)) return "not_eligible";
  return input.commissionBps > 0 ? "commission" : "not_eligible";
}

export function bpsOf(amountKobo: number, bps: number): number {
  if (amountKobo <= 0 || bps <= 0) return 0;
  return Math.floor((amountKobo * bps) / 10_000);
}

export function commissionBasisKobo(order: {
  subtotal: number;
  discountKobo: number;
  selfPurchaseBenefitKobo?: number;
}): number {
  return Math.max(0, order.subtotal - order.discountKobo - (order.selfPurchaseBenefitKobo ?? 0));
}

/** Pending → eligible once fulfilled and the return window has elapsed. */
export function isCommissionEligible(input: {
  orderStatus: string;
  paymentStatus: string;
  deliveredAt: Date | null;
  returnWindowDays: number;
  now?: Date;
}): boolean {
  if (input.paymentStatus !== "paid") return false;
  if (!["delivered", "completed"].includes(input.orderStatus)) return false;
  if (!input.deliveredAt) return false;
  const now = (input.now ?? new Date()).getTime();
  return now - input.deliveredAt.getTime() >= Math.max(0, input.returnWindowDays) * 86_400_000;
}

export function formatRate(bps: number): string {
  if (bps <= 0) return "Rate confirmed on approval";
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}
