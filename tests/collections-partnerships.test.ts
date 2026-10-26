import { describe, expect, it } from "vitest";
import {
  suggestCollection,
  collectionFromLegacyTier,
  needsCategoryConfirmation,
  COLLECTIONS,
  COLLECTION_LABELS,
  COLLECTION_PRICE_BAND_KOBO,
} from "../src/lib/collection";
import { PRODUCT_TYPES, groupForType } from "../src/lib/taxonomy";
import { CAMPAIGN_TIERS } from "../src/lib/campaign-tiers";

/**
 * The three-collection structure (Essentials / Originals / Royale):
 *  - automatic rules are SUGGESTIONS, never destructive
 *  - ambiguous data is never guessed — it is flagged for admin confirmation
 *  - the admin's stored choice always wins on the storefront
 */

describe("Automatic collection suggestions", () => {
  it("Essentials: at most 2 colours AND price below ₦50,000", () => {
    expect(suggestCollection({ colorsCount: 0, priceKobo: 4_999_999 }).suggestion).toBe("essentials");
    expect(suggestCollection({ colorsCount: 2, priceKobo: 3_000_000 }).suggestion).toBe("essentials");
  });

  it("Originals: more than 3 colours AND price above ₦50,000", () => {
    expect(suggestCollection({ colorsCount: 4, priceKobo: 5_000_001 }).suggestion).toBe("originals");
    expect(suggestCollection({ colorsCount: 7, priceKobo: 90_000_000 }).suggestion).toBe("originals");
  });

  it("Royale: no public price (quote-first design service)", () => {
    expect(suggestCollection({ colorsCount: 1, priceKobo: 0 }).suggestion).toBe("royale");
    expect(suggestCollection({ colorsCount: null, priceKobo: null }).suggestion).toBe("royale");
  });

  it("exactly 3 colours is NEVER guessed — Needs Category Confirmation", () => {
    const s = suggestCollection({ colorsCount: 3, priceKobo: 2_000_000 });
    expect(s.suggestion).toBeNull();
    expect(s.needsConfirmation).toBe(true);
    expect(s.reason).toBeTruthy();
  });

  it("exactly ₦50,000 is NEVER guessed", () => {
    const s = suggestCollection({ colorsCount: 2, priceKobo: COLLECTION_PRICE_BAND_KOBO });
    expect(s.suggestion).toBeNull();
    expect(s.needsConfirmation).toBe(true);
  });

  it("clear price data but missing colour data is NEVER guessed", () => {
    const s = suggestCollection({ colorsCount: null, priceKobo: 2_000_000 });
    expect(s.suggestion).toBeNull();
    expect(s.needsConfirmation).toBe(true);
  });

  it("mixed data (≤2 colours but above band) is NEVER guessed", () => {
    const s = suggestCollection({ colorsCount: 2, priceKobo: 90_000_000 });
    expect(s.suggestion).toBeNull();
    expect(s.needsConfirmation).toBe(true);
  });
});

describe("Stored values and the review queue", () => {
  it("legacy tier names map to the new collections; unknown values do not", () => {
    expect(collectionFromLegacyTier("signature")).toBe("originals");
    expect(collectionFromLegacyTier("bespoke")).toBe("royale");
    expect(collectionFromLegacyTier("originals")).toBe("originals");
    expect(collectionFromLegacyTier("royale")).toBe("royale");
    expect(collectionFromLegacyTier("essentials")).toBe("essentials");
    expect(collectionFromLegacyTier("exotic collection")).toBeNull();
    expect(collectionFromLegacyTier(null)).toBeNull();
  });

  it("a stored choice that contradicts the suggestion is flagged, not overwritten", () => {
    const r = needsCategoryConfirmation({
      storedTier: "essentials",
      colorsCount: 6,
      priceKobo: 60_000_000,
    });
    expect(r.needs).toBe(true);
    expect(r.reason).toMatch(/differs from the automatic suggestion/i);
  });

  it("recognised stored values with ambiguous data are flagged with the reason", () => {
    const r = needsCategoryConfirmation({ storedTier: "originals", colorsCount: 3, priceKobo: 10_000_000 });
    expect(r.needs).toBe(true);
  });

  it("a clear-cut correctly stored product is not flagged", () => {
    expect(
      needsCategoryConfirmation({ storedTier: "essentials", colorsCount: 1, priceKobo: 2_000_000 }).needs,
    ).toBe(false);
    expect(
      needsCategoryConfirmation({ storedTier: "royale", colorsCount: 4, priceKobo: 0 }).needs,
    ).toBe(false);
  });

  it("the three collections are exactly Essentials, Originals, Royale", () => {
    expect(COLLECTIONS).toEqual(["essentials", "originals", "royale"]);
    expect(COLLECTION_LABELS.essentials).toBe("DREAMZ Essentials");
    expect(COLLECTION_LABELS.originals).toBe("DREAMZ Originals");
    expect(COLLECTION_LABELS.royale).toBe("DREAMZ Royale");
    // The old customer-facing names are gone.
    expect(Object.values(COLLECTION_LABELS).join(" ")).not.toMatch(/Signature|Bespoke|Essentials Pro/);
  });
});

describe("Product type structure", () => {
  it("offers every footwear type in the house catalogue", () => {
    expect(PRODUCT_TYPES.footwear).toEqual([
      "Shoes", "Loafers", "Oxfords", "Derbies", "Boots", "Mules", "Slides",
      "Sandals", "Sneakers", "Women's Flats", "Heels", "Wedges", "Other Footwear",
    ]);
  });

  it("offers every bag and accessory type", () => {
    expect(PRODUCT_TYPES.bags).toContain("Mini Totes");
    expect(PRODUCT_TYPES.bags).toContain("Laptop Bags");
    expect(PRODUCT_TYPES.bags).toContain("Other Bags");
    expect(PRODUCT_TYPES.accessories).toEqual([
      "Belts", "Wallets", "Purses", "Card Holders", "Key Holders", "Gift Sets", "Other Accessories",
    ]);
  });

  it("maps product types onto browsing groups without confusing collections", () => {
    // "Boots" is a product TYPE — never a collection.
    expect(groupForType("footwear", "Boots")).toBe("Boots");
    expect(groupForType("footwear", "Derbies")).toBe("Shoes");
    expect(groupForType("bags", "Travel Bags")).toBe("Duffle & Travel");
    expect(groupForType("accessories", "Gift Sets")).toBe("Gift Sets");
    expect(groupForType("accessories", "Wedges")).toBeNull();
  });
});

describe("Creator campaign tiers", () => {
  it("lists exactly seven tiers with their collaboration values", () => {
    expect(CAMPAIGN_TIERS).toHaveLength(7);
    expect(CAMPAIGN_TIERS.map((t) => t.name)).toEqual([
      "Spark", "Rise", "Momentum", "Impact", "Ambassador", "Premier", "Icon",
    ]);
    expect(CAMPAIGN_TIERS[0].price).toBe("₦25,000");
    expect(CAMPAIGN_TIERS[5].price).toBe("₦2,000,000");
    expect(CAMPAIGN_TIERS[6].price).toContain("₦7,000,000");
  });

  it("never promises guaranteed views, revenue or conversions", () => {
    const text = CAMPAIGN_TIERS.flatMap((t) => t.deliverables).join(" ");
    expect(text.toLowerCase()).not.toMatch(/guarantee/);
    // Icon scope is explicitly individually contracted.
    expect(CAMPAIGN_TIERS[6].audience).toMatch(/individually contracted/i);
  });
});
