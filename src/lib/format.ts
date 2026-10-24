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

// ── Commercial tiers (customer-facing, admin-editable) ────────────────
// Tiers describe what the customer is buying; packaging upgrades
// ("Complete Package") stay a separate choice at checkout.

export type ProductTier = "essentials" | "signature" | "bespoke";

export const PRODUCT_TIERS: ProductTier[] = ["essentials", "signature", "bespoke"];

export const TIER_LABELS: Record<ProductTier, string> = {
  essentials: "DREAMZ Essentials",
  signature: "DREAMZ Signature",
  bespoke: "DREAMZ Bespoke",
};

export const TIER_TAGLINES: Record<ProductTier, string> = {
  essentials: "Accessible everyday pieces and practical bundles.",
  signature: "Distinctive designs, premium finishes, personal touches.",
  bespoke: "Individually commissioned. Priced after review.",
};

export const TIER_DESCRIPTIONS: Record<ProductTier, string> = {
  essentials:
    "Everyday leather goods made to the DREAMZ standard — slides, sandals, belts and practical bundles with honest prices.",
  signature:
    "The house's distinctive designs: premium finishes, considered details and personalization options on request.",
  bespoke:
    "One vision, commissioned for you. Share your brief, receive a considered quotation, and we craft it together.",
};

export function normalizeTier(raw: string | null | undefined): ProductTier {
  const value = (raw ?? "").toLowerCase();
  if (value === "signature") return "signature";
  if (value === "bespoke") return "bespoke";
  return "essentials";
}

/** Legacy product line → customer-facing tier. */
export function tierFromProductLine(line: string | null | undefined): ProductTier {
  const value = (line ?? "").toLowerCase();
  if (value === "originals") return "signature";
  if (value === "royale") return "bespoke";
  return "essentials";
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
