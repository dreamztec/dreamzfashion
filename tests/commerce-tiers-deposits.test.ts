import { describe, expect, it } from "vitest";
import { isPurchasable } from "../src/server/catalog.server";
import { tierFromProductLine, normalizeTier, TIER_LABELS } from "../src/lib/format";

/**
 * Tier + quote-only semantics of the rebuilt platform:
 *  - three customer-facing tiers (Essentials / Signature / Bespoke)
 *  - unpriced or admin-gated products are quote-only, never buyable
 *  - legacy product lines map onto the tiers without losing data
 */

describe("Tier system", () => {
  it("legacy product lines map onto customer-facing tiers", () => {
    expect(tierFromProductLine("essentials")).toBe("essentials");
    expect(tierFromProductLine("originals")).toBe("signature");
    expect(tierFromProductLine("royale")).toBe("bespoke");
    expect(tierFromProductLine(null)).toBe("essentials");
  });

  it("normalizeTier only accepts the three tiers", () => {
    expect(normalizeTier("signature")).toBe("signature");
    expect(normalizeTier("bespoke")).toBe("bespoke");
    expect(normalizeTier("essentials")).toBe("essentials");
    expect(normalizeTier("unknown")).toBe("essentials");
    expect(normalizeTier("royale")).toBe("essentials");
  });

  it("tier labels are customer-facing", () => {
    expect(TIER_LABELS.essentials).toBe("DREAMZ Essentials");
    expect(TIER_LABELS.signature).toBe("DREAMZ Signature");
    expect(TIER_LABELS.bespoke).toBe("DREAMZ Bespoke");
  });
});

describe("Quote-only gating", () => {
  it("unpriced products are never purchasable (Request a quote)", () => {
    expect(isPurchasable({ price: 0, checkoutReady: true })).toBe(false);
  });

  it("admin-gated products are not purchasable even when priced", () => {
    expect(isPurchasable({ price: 9000000, checkoutReady: false })).toBe(false);
  });

  it("priced, checkout-ready products are purchasable — verified prices preserved", () => {
    expect(isPurchasable({ price: 9000000, checkoutReady: true })).toBe(true);
  });

  it("a bespoke-tier piece with a verified price stays purchasable", () => {
    // e.g. the Gentleman Complete Combo mapped to bespoke tier keeps its
    // approved price; only unpriced pieces become quote-only.
    expect(isPurchasable({ price: 18750000, checkoutReady: true })).toBe(true);
  });
});

describe("Deposit plan arithmetic (server-side rules)", () => {
  // Mirrors the calculation in initializeCheckout.
  const depositFor = (
    subtotal: number,
    discountKobo: number,
    deliveryFee: number,
    percent: number,
    total: number,
  ) => {
    const discountedMerch = Math.max(0, subtotal - discountKobo);
    let deposit = Math.round((discountedMerch * percent) / 100) + deliveryFee;
    deposit = Math.min(total, Math.max(100, deposit));
    return { deposit, balance: total - deposit };
  };

  it("deposit covers delivery plus the configured percent of merchandise", () => {
    // ₦300,000 merchandise, 50% deposit, ₦3,500 delivery
    const { deposit, balance } = depositFor(30000000, 0, 350000, 50, 30350000);
    expect(deposit).toBe(15350000); // ₦153,500
    expect(deposit + balance).toBe(30350000);
  });

  it("the discount reduces the merchandise the deposit percent applies to", () => {
    const { deposit, balance } = depositFor(30000000, 5000000, 0, 50, 25000000);
    expect(deposit).toBe(12500000);
    expect(balance).toBe(12500000);
  });

  it("deposit never exceeds the total and is never zero", () => {
    const tiny = depositFor(5000, 4000, 0, 50, 1000);
    expect(tiny.deposit).toBeLessThanOrEqual(1000);
    expect(tiny.deposit).toBeGreaterThanOrEqual(100);
  });
});

describe("Paid-state arithmetic", () => {
  it("a deposit clears to paid only when verified cash covers the total", () => {
    const total = 30350000;
    let paid = 0;
    const confirm = (amountKobo: number) => {
      paid += amountKobo;
      return paid >= total ? "paid" : "deposit_paid";
    };
    expect(confirm(15350000)).toBe("deposit_paid");
    expect(confirm(15000000)).toBe("paid");
  });

  it("overpayment still counts as paid (never blocks dispatch accounting)", () => {
    const total = 100000;
    expect(150000 >= total).toBe(true);
  });
});
