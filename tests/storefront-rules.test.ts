import { describe, expect, it } from "vitest";
import { quoteDelivery, shippingInKobo } from "../src/lib/delivery";
import {
  bpsOf,
  chooseAttribution,
  classifyAttribution,
  commissionBasisKobo,
  formatRate,
  isCommissionEligible,
  isSelfPurchase,
  normalizePartnerCode,
} from "../src/lib/attribution";
import { DESIGN_TEMPLATES, defaultSelection, validateSelection, selectionSummary } from "../src/lib/design-templates";
import { detectImageType, precheckFile, REFERENCE_LIMITS } from "../src/lib/reference-upload";
import { groupCounts, productGroup } from "../src/lib/taxonomy";

const settings = { defaultFee: 3500, freeThreshold: 150000 }; // admin enters naira

describe("delivery", () => {
  it("reads admin settings as naira", () => {
    expect(shippingInKobo(settings)).toEqual({ defaultFeeKobo: 350_000, freeThresholdKobo: 15_000_000 });
  });
  it("never claims free delivery before a state is chosen", () => {
    const q = quoteDelivery({ state: "", merchandiseKobo: 99_000_000, allCompletePackage: true, settings });
    expect(q).toMatchObject({ status: "needs_state", feeKobo: null });
  });
  it("matches the banner: free at or above ₦150,000, flat fee below", () => {
    expect(quoteDelivery({ state: "Lagos", merchandiseKobo: 14_999_900, allCompletePackage: false, settings }).feeKobo).toBe(350_000);
    expect(quoteDelivery({ state: "Lagos", merchandiseKobo: 15_000_000, allCompletePackage: false, settings }).feeKobo).toBe(0);
  });
  it("Complete Package includes doorstep delivery", () => {
    expect(quoteDelivery({ state: "Kano", merchandiseKobo: 3_500_000, allCompletePackage: true, settings })).toMatchObject({ feeKobo: 0, reason: "complete_package" });
  });
});

describe("attribution rules", () => {
  it("normalises codes case-insensitively and rejects junk", () => {
    expect(normalizePartnerCode("  dami13 ")).toBe("DAMI13");
    expect(normalizePartnerCode("a")).toBeNull();
    expect(normalizePartnerCode("bad code!")).toBeNull();
  });
  it("explicit code wins over a referral link", () => {
    const chosen = chooseAttribution({ checkoutCode: { referrerId: 1, code: "A1B" }, referralLink: { referrerId: 2, code: "LINK" } });
    expect(chosen).toEqual({ referrerId: 1, code: "A1B", source: "checkout_code" });
    expect(chooseAttribution({ checkoutCode: null, referralLink: { referrerId: 2, code: "LINK" } })?.source).toBe("referral_link");
  });
  it("detects self-purchases by account, email or phone", () => {
    const partner = { customerId: 7, email: "c@x.com", phone: "0803 555 0000" };
    expect(isSelfPurchase(partner, { customerId: 7, email: null, phone: null })).toBe(true);
    expect(isSelfPurchase(partner, { customerId: null, email: "C@X.com", phone: null })).toBe(true);
    expect(isSelfPurchase(partner, { customerId: null, email: null, phone: "+2348035550000" })).toBe(true);
    expect(isSelfPurchase(partner, { customerId: 8, email: "d@x.com", phone: "08030000000" })).toBe(false);
  });
  it("classifies outcomes and never pays without a configured rate", () => {
    expect(classifyAttribution({ track: "creator", selfPurchase: false, commissionBps: 1300, selfPurchaseBenefitBps: 0 })).toBe("commission");
    expect(classifyAttribution({ track: "creator", selfPurchase: false, commissionBps: 0, selfPurchaseBenefitBps: 0 })).toBe("not_eligible");
    expect(classifyAttribution({ track: "public", selfPurchase: false, commissionBps: 1300, selfPurchaseBenefitBps: 0 })).toBe("not_eligible");
    expect(classifyAttribution({ track: "creator", selfPurchase: true, commissionBps: 1300, selfPurchaseBenefitBps: 0 })).toBe("self_purchase");
    expect(classifyAttribution({ track: "creator", selfPurchase: true, commissionBps: 1300, selfPurchaseBenefitBps: 500 })).toBe("self_purchase_benefit");
  });
  it("calculates on merchandise after discounts, excluding delivery, in integer kobo", () => {
    expect(commissionBasisKobo({ subtotal: 10_000_000, discountKobo: 1_000_000, selfPurchaseBenefitKobo: 0 })).toBe(9_000_000);
    expect(bpsOf(9_000_000, 1300)).toBe(1_170_000);
    expect(bpsOf(333, 1300)).toBe(43); // floor, never rounds up
    expect(formatRate(0)).toBe("Rate confirmed on approval");
    expect(formatRate(1300)).toBe("13%");
  });
  it("eligibility needs payment, delivery and the return window", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const deliveredAt = new Date("2026-11-07T12:00:00Z");
    expect(isCommissionEligible({ orderStatus: "delivered", paymentStatus: "paid", deliveredAt, returnWindowDays: 2, now })).toBe(true);
    expect(isCommissionEligible({ orderStatus: "delivered", paymentStatus: "paid", deliveredAt, returnWindowDays: 7, now })).toBe(false);
    expect(isCommissionEligible({ orderStatus: "delivered", paymentStatus: "refunded", deliveredAt, returnWindowDays: 0, now })).toBe(false);
    expect(isCommissionEligible({ orderStatus: "dispatched", paymentStatus: "paid", deliveredAt, returnWindowDays: 0, now })).toBe(false);
  });
});

describe("design template", () => {
  const t = DESIGN_TEMPLATES[0];
  it("Boot of Many Colours is the first template and is honestly not 3D yet", () => {
    expect(t.productSku).toBe("DFK-FTW-001");
    expect(t.has3d).toBe(false);
    expect(t.model3d).toBeNull();
  });
  it("defaults are valid and changing one part leaves every other part unchanged", () => {
    const s = defaultSelection(t);
    expect(validateSelection(t, s)).toEqual([]);
    const next = { ...s, parts: { ...s.parts, toe_cap: "Emerald" } as Record<string, string> };
    for (const p of t.parts) if (p.key !== "toe_cap") expect(next.parts[p.key]).toBe(s.parts[p.key]);
    expect(selectionSummary(t, next)["Toe cap"]).toBe("Emerald — Smooth leather");
  });
  it("rejects unlisted colours, materials, parts and sizes", () => {
    const s = defaultSelection(t);
    expect(validateSelection(t, { ...s, parts: { ...s.parts, toe_cap: "Neon" } })).not.toEqual([]);
    expect(validateSelection(t, { ...s, materials: { ...s.materials, toe_cap: "Suede" } })).not.toEqual([]); // toe cap: no suede
    expect(validateSelection(t, { ...s, parts: { ...s.parts, heel_height: "Black" } })).not.toEqual([]);
    expect(validateSelection(t, { ...s, size: "39" })).not.toEqual([]);
  });
});

describe("reference uploads", () => {
  it("identifies images by their bytes", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("image/png");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(detectImageType(webp)).toBe("image/webp");
    const heic = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
    expect(detectImageType(heic)).toBe("image/heic");
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
  it("pre-checks size and type with actionable messages", () => {
    expect(precheckFile({ size: REFERENCE_LIMITS.maxBytes + 1, type: "image/jpeg", name: "big.jpg" })).toMatch(/5 MB/);
    expect(precheckFile({ size: 10, type: "application/pdf", name: "x.pdf" })).toMatch(/supported/);
    expect(precheckFile({ size: 10, type: "", name: "IMG_0001.HEIC" })).toBeNull();
  });
});

describe("shop structure", () => {
  it("groups product types under the customer-facing structure", () => {
    expect(productGroup("footwear", "Oxfords")).toBe("Shoes");
    expect(productGroup("footwear", "Derby Shoes")).toBe("Shoes");
    expect(productGroup("footwear", "Monk Straps")).toBe("Shoes");
    expect(productGroup("footwear", "Loafers")).toBe("Loafers");
    expect(productGroup("footwear", "Boots")).toBe("Boots");
    expect(productGroup("footwear", "Mules")).toBe("Slides");
    expect(productGroup("bags", "Briefcases")).toBe("Briefcases");
    expect(productGroup("bags", "Wrist Pouches")).toBe("Wrist Pouches");
    expect(productGroup("accessories", "Belts")).toBe("Belts");
    expect(
      groupCounts("footwear", [
        { categorySlug: "footwear", subcategory: "Boots" },
        { categorySlug: "footwear", subcategory: "Loafers" },
        { categorySlug: "footwear", subcategory: "Loafers" },
      ]),
    ).toEqual([
      { group: "Loafers", count: 2 },
      { group: "Boots", count: 1 },
    ]);
  });
});
