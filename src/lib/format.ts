export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

/**
 * Parse a Naira amount typed by a customer/admin into kobo.
 * Accepts "₦25,000", "25000", "25,000.50" — returns null when not a valid
 * non-negative amount. There is deliberately NO upper bound: a product may
 * cost ₦5,000,000 or more without any source change.
 */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DFK-${y}${m}${d}-${rand}`;
}

export function generateRequestNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DR-${y}${m}${d}-${rand}`;
}

export function isValidNigerianPhone(phone: string): boolean {
  return /^(\+?234|0)[789][01]\d{8}$/.test(phone.replace(/[\s-]/g, ""));
}

// ── Product lines (legacy brand structure, kept for data compatibility) ─

export type ProductLine = "essentials" | "originals" | "royale";

export const PRODUCT_LINES: ProductLine[] = ["essentials", "originals", "royale"];

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  essentials: "DREAMZ Essentials",
  originals: "DREAMZ Originals",
  royale: "DREAMZ Royale",
};

// ── Collections (customer-facing, admin-editable) ─────────────────────
// The three primary DREAMZ collections: Essentials (ready-to-wear),
// Originals (distinctive house designs) and Royale (the premium design &
// customization service). Legacy stored values ("signature", "bespoke")
// are presented under their new names via normalizeTier.
// Packaging upgrades ("Complete Package") stay a separate choice at checkout.

export type ProductTier = "essentials" | "originals" | "royale";

export const PRODUCT_TIERS: ProductTier[] = ["essentials", "originals", "royale"];

export const TIER_LABELS: Record<ProductTier, string> = {
  essentials: "DREAMZ Essentials",
  originals: "DREAMZ Originals",
  royale: "DREAMZ Royale",
};

export const TIER_TAGLINES: Record<ProductTier, string> = {
  essentials: "Ready-to-wear, accessible every day.",
  originals: "Distinctive DREAMZ house designs.",
  royale: "Premium design and customization, made for you.",
};

export const TIER_DESCRIPTIONS: Record<ProductTier, string> = {
  essentials:
    "Everyday leather goods made to the DREAMZ standard — slides, sandals, belts and practical bundles with honest prices.",
  originals:
    "The house's distinctive designs: the Boot of Many Colours and other original statements, with personalization where approved.",
  royale:
    "Our premium design and customization service. Share a reference or brief, choose materials, colours and hardware, and receive a considered quotation.",
};

export function normalizeTier(raw: string | null | undefined): ProductTier {
  const value = (raw ?? "").toLowerCase();
  if (value === "originals" || value === "signature") return "originals";
  if (value === "royale" || value === "bespoke") return "royale";
  return "essentials";
}

/** Legacy brand line → customer-facing collection (identity for new values). */
export function tierFromProductLine(line: string | null | undefined): ProductTier {
  return normalizeTier(line);
}

export function normalizeProductLine(
  raw: string | null | undefined,
): ProductLine {
  const value = (raw ?? "").toLowerCase();
  if (value === "originals") return "originals";
  if (value === "royale") return "royale";
  return "essentials";
}

// ── Order lifecycle ──────────────────────────────────────────────────

export const ORDER_STATUSES = [
  "order_requested",
  "order_received",
  "payment_confirmed",
  "size_details_confirmed",
  "processing",
  "production",
  "quality_control",
  "ready_for_dispatch",
  "dispatched",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  order_requested: "Order Request Received",
  order_received: "Order Received",
  payment_confirmed: "Payment Confirmed",
  size_details_confirmed: "Size & Details Confirmed",
  processing: "Processing",
  production: "In Production",
  quality_control: "Quality Control",
  ready_for_dispatch: "Ready for Dispatch",
  dispatched: "Shipped",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  requested: "Unpaid — Payment Link to Follow",
  pending_payment: "Pending Payment",
  deposit_paid: "Deposit Paid — Balance Outstanding",
  paid: "Paid",
  failed: "Payment Failed",
  abandoned: "Payment Abandoned",
  refunded: "Refunded",
};

/** Generate a corporate enquiry/quote reference: COR-YYMMDD-XXXXX. */
export function generateCorporateNumber(prefix: "CEN" | "QUO"): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

/** Fulfilment progress timeline — cancelled stops the ladder. */
export const TRACKING_FLOW: string[] = ORDER_STATUSES.filter((s) => s !== "cancelled" && s !== "order_requested");
