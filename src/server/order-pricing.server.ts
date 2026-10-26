import { db } from "../../db/index";
import { customDesigns, products, productVariants, referrers, referralAttributions } from "../../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getSetting } from "./catalog.server";
import { quoteDelivery, type DeliveryQuote, type ShippingSettings } from "@/lib/delivery";
import {
  bpsOf,
  chooseAttribution,
  classifyAttribution,
  isSelfPurchase,
  normalizePartnerCode,
  type AttributionOutcome,
} from "@/lib/attribution";

/**
 * Server-side order pricing — the ONLY place cart totals are decided.
 * Used by the checkout preview and by order creation, so the customer sees
 * exactly what the order records. Prices, discounts, delivery and partner
 * benefits all come from the database; nothing priced by the browser is
 * trusted.
 */

export type CartLineInput = {
  productId: number;
  variantLabel?: string | null;
  purchaseOption: "product_only" | "complete_package";
  customization?: Record<string, string> | null;
  designId?: string | null;
  quantity: number;
};

export type PricedLine = {
  productId: number;
  sku: string | null;
  productName: string;
  variantLabel: string | null;
  size: string | null;
  purchaseOption: "product_only" | "complete_package";
  customization: Record<string, string> | null;
  designId: string | null;
  imageUrl: string | null;
  unitPrice: number;
  unitCostKobo: number | null;
  quantity: number;
  /** Quote lines (custom designs awaiting a price) have unitPrice 0. */
  quoteRequired: boolean;
};

export type PartnerResult = {
  referrerId: number;
  code: string;
  source: "checkout_code" | "referral_link";
  outcome: AttributionOutcome;
  displayName: string;
} | null;

export type PricedOrder = {
  lines: PricedLine[];
  subtotal: number;
  delivery: DeliveryQuote;
  discountKobo: number;
  voucherId: number | null;
  voucherCode: string | null;
  selfPurchaseBenefitKobo: number;
  partner: PartnerResult;
  partnerCodeError: string | null;
  /** Null while delivery cannot be calculated (no state yet). */
  total: number | null;
  hasQuoteLines: boolean;
};

export class PricingError extends Error {}

/** Split "Colour · Size" variant labels used across the storefront. */
export function splitVariantLabel(label: string | null | undefined): {
  color: string | null;
  size: string | null;
  singlePart: boolean;
} {
  const parts = (label ?? "").split(" · ").filter(Boolean);
  if (parts.length === 1) return { color: parts[0] ?? null, size: parts[0] ?? null, singlePart: true };
  return { color: parts[0] ?? null, size: parts[1] ?? null, singlePart: false };
}

async function priceLine(item: CartLineInput): Promise<PricedLine> {
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
    throw new PricingError("Quantities must be between 1 and 10.");
  }
  const [p] = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      price: products.price,
      completePackagePrice: products.completePackagePrice,
      checkoutReady: products.checkoutReady,
      internalCostKobo: products.internalCostKobo,
      image: sql<string | null>`(SELECT url FROM product_images pi WHERE pi.product_id = ${products.id} ORDER BY position LIMIT 1)`,
    })
    .from(products)
    .where(and(eq(products.id, item.productId), eq(products.status, "published")))
    .limit(1);
  if (!p) throw new PricingError("A piece in your cart is no longer available.");

  // ── Custom design line: priced only when the house has quoted it ──
  if (item.designId) {
    const [design] = await db
      .select()
      .from(customDesigns)
      .where(eq(customDesigns.designId, item.designId))
      .limit(1);
    if (!design || design.productId !== p.id) {
      throw new PricingError("Your saved design could not be found. Please reopen it and add it again.");
    }
    const quoted = design.priceStatus === "quoted" && (design.quotedPriceKobo ?? 0) > 0;
    const { selectionFromDesignRow } = await import("./designs.server");
    return {
      productId: p.id,
      sku: p.sku,
      productName: `${p.name} — custom design`,
      variantLabel: design.size ? `Size ${design.size}` : null,
      size: design.size,
      purchaseOption: "product_only",
      customization: { "Design ID": design.designId, ...selectionFromDesignRow(design) },
      designId: design.designId,
      imageUrl: p.image,
      unitPrice: quoted ? design.quotedPriceKobo! : 0,
      unitCostKobo: p.internalCostKobo,
      quantity: item.quantity,
      quoteRequired: !quoted,
    };
  }

  // Quote-only guard: unpriced or unapproved products are never sold online.
  if (p.price <= 0 || !p.checkoutReady) {
    throw new PricingError(`${p.name} is priced after review — please request a quote instead.`);
  }
  let unitPrice = p.price;
  if (item.purchaseOption === "complete_package") {
    if (!p.completePackagePrice) throw new PricingError(`${p.name} is not available as a Complete Package.`);
    unitPrice = p.completePackagePrice;
  }
  const { color, size, singlePart } = splitVariantLabel(item.variantLabel);
  if (item.variantLabel) {
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, p.id));
    const variant = variants.find((v) =>
      singlePart ? v.color === color || v.size === size : (!color || v.color === color) && (!size || v.size === size),
    );
    if (!variant) throw new PricingError(`The selected option for ${p.name} is unavailable.`);
    if (variant.stockQuantity < item.quantity) {
      throw new PricingError(`Only ${variant.stockQuantity} left of ${p.name} (${item.variantLabel}).`);
    }
    if (item.purchaseOption === "product_only" && variant.price) unitPrice = variant.price;
  }
  return {
    productId: p.id,
    sku: p.sku,
    productName: p.name,
    variantLabel: item.variantLabel ?? null,
    size: singlePart ? (/^\d/.test(size ?? "") ? size : null) : size,
    purchaseOption: item.purchaseOption,
    customization: item.customization ?? null,
    designId: null,
    imageUrl: p.image,
    unitPrice,
    unitCostKobo: p.internalCostKobo,
    quantity: item.quantity,
    quoteRequired: false,
  };
}

export type PartnerSettingsFull = {
  commissionBps: number;
  payoutThresholdKobo: number;
  attributionWindowDays: number;
  termsNote: string;
  selfPurchaseBenefitBps: number;
  returnWindowDays: number;
  partnerIntroductionBonusKobo: number;
};

export async function getPartnerSettingsFull(): Promise<PartnerSettingsFull> {
  const s = await getSetting<Partial<PartnerSettingsFull>>("partners", {});
  return {
    commissionBps: Number(s.commissionBps ?? 0) || 0,
    payoutThresholdKobo: Number(s.payoutThresholdKobo ?? 0) || 0,
    attributionWindowDays: Number(s.attributionWindowDays ?? 30) || 30,
    termsNote: String(s.termsNote ?? ""),
    selfPurchaseBenefitBps: Number(s.selfPurchaseBenefitBps ?? 0) || 0,
    // Returns policy: faults reported within 48 hours of delivery.
    returnWindowDays: s.returnWindowDays == null ? 2 : Number(s.returnWindowDays) || 0,
    // Optional one-time reward for introducing a partner who then makes their
    // first verified customer sale. Zero means disabled; there is no downline.
    partnerIntroductionBonusKobo: Number(s.partnerIntroductionBonusKobo ?? 0) || 0,
  };
}

type ReferrerRow = typeof referrers.$inferSelect;

async function approvedReferrerByCode(code: string): Promise<ReferrerRow | null> {
  const [r] = await db
    .select()
    .from(referrers)
    .where(and(sql`upper(${referrers.code}) = ${code}`, eq(referrers.status, "approved")))
    .limit(1);
  return r ?? null;
}

async function referrerFromLinkSession(sessionId: string | null | undefined, windowDays: number): Promise<ReferrerRow | null> {
  if (!sessionId) return null;
  const [row] = await db
    .select({ referrerId: referralAttributions.referrerId, createdAt: referralAttributions.createdAt })
    .from(referralAttributions)
    .where(eq(referralAttributions.sessionId, sessionId))
    .limit(1);
  if (!row?.createdAt) return null;
  if ((Date.now() - row.createdAt.getTime()) / 86_400_000 > windowDays) return null;
  const [r] = await db
    .select()
    .from(referrers)
    .where(and(eq(referrers.id, row.referrerId), eq(referrers.status, "approved")))
    .limit(1);
  return r ?? null;
}

export async function priceOrder(input: {
  items: CartLineInput[];
  state?: string | null;
  voucherCode?: string | null;
  partnerCode?: string | null;
  referralSessionId?: string | null;
  buyer: { customerId: number | null; email: string | null; phone: string | null };
}): Promise<PricedOrder> {
  if (input.items.length === 0) throw new PricingError("Your cart is empty.");
  const lines: PricedLine[] = [];
  for (const item of input.items) lines.push(await priceLine(item));
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const hasQuoteLines = lines.some((l) => l.quoteRequired);

  const shipping = await getSetting<ShippingSettings>("shipping", { defaultFee: 3500, freeThreshold: 150000 });
  const delivery = quoteDelivery({
    state: input.state,
    merchandiseKobo: subtotal,
    allCompletePackage: lines.every((l) => l.purchaseOption === "complete_package"),
    settings: shipping,
  });

  // ── Voucher ─────────────────────────────────────────────────────────
  let voucherId: number | null = null;
  let voucherCode: string | null = null;
  let discountKobo = 0;
  if (input.voucherCode && input.voucherCode.trim().length >= 4) {
    const { lookupVoucher, computeVoucherDiscount, categorySlugsForProductIds } = await import("./vouchers.server");
    const check = await lookupVoucher(input.voucherCode);
    if (!check.ok || !check.voucher) throw new PricingError(check.reason ?? "We couldn't validate this voucher.");
    const categoryMap = await categorySlugsForProductIds(lines.map((l) => l.productId));
    const calc = await computeVoucherDiscount(
      check.voucher.id,
      lines.map((l) => ({
        productId: l.productId,
        categorySlug: categoryMap.get(l.productId) ?? null,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
    );
    if (calc.discountKobo <= 0) throw new PricingError(calc.reason ?? "This voucher does not apply to your order.");
    voucherId = check.voucher.id;
    voucherCode = check.voucher.code;
    discountKobo = Math.min(calc.discountKobo, subtotal);
  }

  // ── Partner attribution: explicit code beats referral link ──────────
  const settings = await getPartnerSettingsFull();
  let partnerCodeError: string | null = null;
  let codeReferrer: ReferrerRow | null = null;
  if (input.partnerCode && input.partnerCode.trim()) {
    const code = normalizePartnerCode(input.partnerCode);
    codeReferrer = code ? await approvedReferrerByCode(code) : null;
    if (!codeReferrer) partnerCodeError = "That creator or partner code isn't active. Check the spelling, or continue without it.";
  }
  const linkReferrer = codeReferrer ? null : await referrerFromLinkSession(input.referralSessionId, settings.attributionWindowDays);
  const chosen = chooseAttribution({
    checkoutCode: codeReferrer ? { referrerId: codeReferrer.id, code: codeReferrer.code.toUpperCase() } : null,
    referralLink: linkReferrer ? { referrerId: linkReferrer.id, code: linkReferrer.code.toUpperCase() } : null,
  });
  let partner: PartnerResult = null;
  let selfPurchaseBenefitKobo = 0;
  if (chosen) {
    const r = (codeReferrer ?? linkReferrer)!;
    const self = isSelfPurchase(
      { customerId: r.customerId, email: r.email, phone: r.phone },
      input.buyer,
    );
    const outcome = classifyAttribution({
      track: r.track,
      selfPurchase: self,
      commissionBps: settings.commissionBps,
      selfPurchaseBenefitBps: settings.selfPurchaseBenefitBps,
    });
    if (outcome === "self_purchase_benefit") {
      selfPurchaseBenefitKobo = bpsOf(Math.max(0, subtotal - discountKobo), settings.selfPurchaseBenefitBps);
    }
    partner = { ...chosen, outcome, displayName: r.displayName || "DREAMZ partner" };
  }

  const total =
    delivery.feeKobo === null
      ? null
      : Math.max(0, subtotal - discountKobo - selfPurchaseBenefitKobo + delivery.feeKobo);

  return {
    lines,
    subtotal,
    delivery,
    discountKobo,
    voucherId,
    voucherCode,
    selfPurchaseBenefitKobo,
    partner,
    partnerCodeError,
    total,
    hasQuoteLines,
  };
}
