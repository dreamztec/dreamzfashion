import { describe, expect, it } from "vitest";
import {
  suggestCollection,
  collectionFromLegacyTier,
  needsCategoryConfirmation,
  COLLECTIONS,
  COLLECTION_LABELS,
  COLLECTION_PRICE_BAND_KOBO,
} from "../src/lib/collection";
import { PRODUCT_TYPES, GROUP_ORDER, groupForType, productGroup } from "../src/lib/taxonomy";
import { CAMPAIGN_TIERS } from "../src/lib/campaign-tiers";

/**
 * The three-collection structure (Essentials / Originals / Royale):
 *  - automatic rules are SUGGESTIONS, never destructive
 *  - ambiguous data is never guessed — it is flagged for admin confirmation
 *  - the admin's stored choice always wins on the storefront
 */

describe("DREAMZ customer-facing price bands", () => {
  const offer = (priceKobo: number, categorySlug: string, subcategory: string) =>
    suggestCollection({ priceKobo, categorySlug, subcategory, colorsCount: null });

  it("classifies slides and easy wear below ₦50k Essentials, at ₦50k Originals", () => {
    expect(offer(4_999_999, "footwear", "Slides").suggestion).toBe("essentials");
    expect(offer(5_000_000, "footwear", "Slides").suggestion).toBe("originals");
    expect(offer(5_000_000, "footwear", "Mules").suggestion).toBe("originals");
  });

  it("classifies shoes below ₦100k Essentials, from ₦100k Originals", () => {
    expect(offer(9_999_999, "footwear", "Oxfords").suggestion).toBe("essentials");
    expect(offer(10_000_000, "footwear", "Loafers").suggestion).toBe("originals");
    expect(offer(12_000_000, "footwear", "Boots").suggestion).toBe("originals");
  });

  it("keeps small accessories under ₦50k Essentials, at ₦50k Originals", () => {
    expect(offer(500_000, "accessories", "Bracelets & Cuffs").suggestion).toBe("essentials");
    expect(offer(4_999_999, "accessories", "Wallets").suggestion).toBe("essentials");
    expect(offer(5_000_000, "accessories", "Belts").suggestion).toBe("originals");
  });

  it("uses ₦100k for bags and leather wear and does not guess absent categories", () => {
    expect(offer(9_000_000, "bags", "Handbags").suggestion).toBe("essentials");
    expect(offer(10_000_000, "leather-wear", "Jackets").suggestion).toBe("originals");
    expect(suggestCollection({priceKobo:9_000_000,colorsCount:3}).needsConfirmation).toBe(true);
  });

  it("unpriced Royale custom requests remain quote-only", () => {
    expect(offer(0, "footwear", "Oxfords").suggestion).toBe("royale");
    expect(suggestCollection({priceKobo:null,colorsCount:null}).suggestion).toBe("royale");
  });
});

describe("Preserve house choices and historical collection names", () => {
  it("maps legacy category names without auto rewriting", () => {
    expect(collectionFromLegacyTier("signature")).toBe("originals");
    expect(collectionFromLegacyTier("bespoke")).toBe("royale");
    expect(collectionFromLegacyTier("essentials")).toBe("essentials");
    expect(collectionFromLegacyTier("exotic collection")).toBeNull();
  });

  it("flags a retail mismatch for manual confirmation", () => {
    const r=needsCategoryConfirmation({storedTier:"essentials",colorsCount:2,priceKobo:15_000_000,categorySlug:"footwear",subcategory:"Boots"});
    expect(r.needs).toBe(true);
    expect(r.reason).toMatch(/differs/i);
  });

  it("does not override explicitly selected Royale or correctly priced Essentials", () => {
    expect(needsCategoryConfirmation({storedTier:"royale",colorsCount:2,priceKobo:0,categorySlug:"footwear",subcategory:"Oxfords"}).needs).toBe(false);
    expect(needsCategoryConfirmation({storedTier:"essentials",colorsCount:2,priceKobo:5_000_000,categorySlug:"footwear",subcategory:"Shoes"}).needs).toBe(false);
  });

  it("three commercial collections remain Essentials, Originals and Royale", () => {
    expect(COLLECTIONS).toEqual(["essentials","originals","royale"]);
    expect(COLLECTION_LABELS.essentials).toBe("DREAMZ Essentials");
    expect(COLLECTION_LABELS.originals).toBe("DREAMZ Originals");
    expect(COLLECTION_LABELS.royale).toBe("DREAMZ Royale");
    expect(COLLECTION_PRICE_BAND_KOBO).toBe(5_000_000);
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
      "Belts", "Wallets", "Purses", "Card Holders", "Key Holders", "Bracelets & Cuffs", "Wrist Pouches", "Gift Sets", "Other Accessories",
    ]);
  });

  it("offers the Leather Wear browsing structure with the house subcategories", () => {
    expect(PRODUCT_TYPES["leather-wear"]).toEqual([
      "Tops", "Vests", "Jackets", "Trousers", "Joggers", "Shorts", "Skirts", "Other Leather Wear",
    ]);
    expect(GROUP_ORDER["leather-wear"]).toEqual([
      "Tops", "Vests", "Jackets", "Trousers", "Shorts", "Skirts", "Other Leather Wear",
    ]);
    expect(productGroup("leather-wear", "Tops")).toBe("Tops");
    expect(productGroup("leather-wear", "Vests")).toBe("Vests");
    expect(productGroup("leather-wear", "Joggers")).toBe("Trousers");
    expect(productGroup("leather-wear", "Shorts")).toBe("Shorts");
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
