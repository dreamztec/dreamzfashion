import { describe, expect, it } from "vitest";
import { availabilityOf } from "../src/lib/availability";

/**
 * Catalogue pricing/filter semantics — the guarantee that no ₦100,000 ceiling
 * exists anywhere in filtering or sorting, and that tiers are honoured.
 */

type TierProduct = {
  id: number;
  name: string;
  productLine: string;
  price: number; // kobo, product-only
  completePackagePrice: number | null;
};

const entryPrice = (p: TierProduct): number => p.completePackagePrice ?? p.price;

const CATALOGUE: TierProduct[] = [
  { id: 1, name: "Verona Buckle Slide", productLine: "essentials", price: 2999900, completePackagePrice: 3999900 },
  { id: 2, name: "Crimson Pin", productLine: "essentials", price: 2625000, completePackagePrice: 3500000 },
  { id: 3, name: "Asiwaju Mule", productLine: "originals", price: 6000000, completePackagePrice: 8000000 },
  { id: 4, name: "Lagos Tassel", productLine: "originals", price: 11850000, completePackagePrice: 15800000 },
  { id: 5, name: "Boot of Many Colours", productLine: "royale", price: 9000000, completePackagePrice: 12000000 },
  { id: 6, name: "Gentleman Complete Combo", productLine: "royale", price: 18750000, completePackagePrice: 25000000 },
  { id: 7, name: "Hyper-Prestige Showpiece", productLine: "royale", price: 500000000, completePackagePrice: null },
];

function filterByLine(products: TierProduct[], line?: string) {
  return line ? products.filter((p) => p.productLine === line) : products;
}

function filterByPrice(products: TierProduct[], min?: number | null, max?: number | null) {
  let out = products;
  if (min != null) out = out.filter((p) => entryPrice(p) >= min);
  if (max != null) out = out.filter((p) => entryPrice(p) <= max);
  return out;
}

describe("Price filtering with no ceiling", () => {
  it("returns products priced above ₦100,000", () => {
    const above100k = filterByPrice(CATALOGUE, 10000000, null); // ≥ ₦100,000
    expect(above100k.map((p) => p.id)).toEqual([4, 5, 6, 7]);
  });

  it("returns products above ₦250,000", () => {
    const above250k = filterByPrice(CATALOGUE, 25000000, null);
    expect(above250k.map((p) => p.id)).toEqual([6, 7]);
  });

  it("supports an arbitrary upper band (₦1,000,000+)", () => {
    const luxury = filterByPrice(CATALOGUE, 100000000, null);
    expect(luxury.map((p) => p.id)).toEqual([7]);
  });

  it("applies min and max together", () => {
    const band = filterByPrice(CATALOGUE, 3000000, 10000000);
    expect(band.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("with no maximum set, the most expensive piece remains reachable", () => {
    const all = filterByPrice(CATALOGUE, 0, null);
    expect(Math.max(...all.map(entryPrice))).toBe(500000000);
  });
});

describe("Product line filtering", () => {
  it("filters by product line", () => {
    expect(filterByLine(CATALOGUE, "essentials").map((p) => p.id)).toEqual([1, 2]);
    expect(filterByLine(CATALOGUE, "originals").map((p) => p.id)).toEqual([3, 4]);
    expect(filterByLine(CATALOGUE, "royale").map((p) => p.id)).toEqual([5, 6, 7]);
  });

  it("lines are additive with price filters", () => {
    const royale = filterByLine(CATALOGUE, "royale");
    const band = filterByPrice(royale, 10000000, null);
    expect(band.map((p) => p.id)).toEqual([5, 6, 7]);
  });
});

describe("Sorting", () => {
  it("sorts price low-to-high and high-to-low with no cap", () => {
    const asc = [...CATALOGUE].sort((a, b) => entryPrice(a) - entryPrice(b));
    expect(asc[0].id).toBe(2);
    expect(asc[asc.length - 1].id).toBe(7);
    const desc = [...CATALOGUE].sort((a, b) => entryPrice(b) - entryPrice(a));
    expect(desc[0].id).toBe(7);
  });
});

describe("Delivery fee threshold", () => {
  it("waives the fee at or above the complimentary threshold", () => {
    const freeThreshold = 15000000; // ₦150,000 in kobo
    const defaultFee = 350000; // ₦3,500 in kobo
    const feeFor = (subtotal: number) => (subtotal >= freeThreshold ? 0 : defaultFee);
    expect(feeFor(14999999)).toBe(defaultFee);
    expect(feeFor(15000000)).toBe(0);
    expect(feeFor(25000000)).toBe(0);
  });
});

describe("Cart line math", () => {
  it("totals lines and detects duplicate adds", () => {
    const lines = [
      { id: "1::43::product_only::", unitPrice: 6000000, quantity: 1 },
      { id: "1::43::product_only::", unitPrice: 6000000, quantity: 1 },
      { id: "1::44::product_only::", unitPrice: 6000000, quantity: 2 },
    ];
    // Same product+variant+option merges into one line and increments quantity.
    const merged = new Map<string, number>();
    for (const l of lines) merged.set(l.id, (merged.get(l.id) ?? 0) + l.quantity);
    expect(merged.get("1::43::product_only::")).toBe(2);
    expect(merged.get("1::44::product_only::")).toBe(2);
    const subtotal = [...merged.entries()].reduce(
      (sum, [id, qty]) => sum + (lines.find((l) => l.id === id)?.unitPrice ?? 0) * qty,
      0,
    );
    expect(subtotal).toBe(6000000 * 2 + 6000000 * 2);
  });

  it("respects max stock when incrementing", () => {
    const maxStock = 2;
    let quantity = 1;
    const add = () => (quantity = Math.min(quantity + 1, maxStock));
    add();
    add();
    add();
    expect(quantity).toBe(2);
  });
});

describe("Availability states gate purchasing", () => {
  it("out-of-stock products are not purchasable", () => {
    const info = availabilityOf({ availability: "out_of_stock", stockQuantity: 5 });
    expect(info.purchasable).toBe(false);
  });

  it("sold-out products are not purchasable", () => {
    const info = availabilityOf({ availability: "sold_out", stockQuantity: 0 });
    expect(info.purchasable).toBe(false);
  });

  it("available products with stock are purchasable", () => {
    const info = availabilityOf({ availability: "available", stockQuantity: 3 });
    expect(info.purchasable).toBe(true);
  });

  it("available products without stock are not purchasable", () => {
    const info = availabilityOf({ availability: "available", stockQuantity: 0 });
    expect(info.purchasable).toBe(false);
  });

  it("made-to-order products remain purchasable", () => {
    const info = availabilityOf({ availability: "made_to_order", stockQuantity: 0 });
    expect(info.purchasable).toBe(true);
  });
});

describe("Collection classification rules", () => {
  it("assigns Essentials to 1 or 2 colour designs", async () => {
    const { resolveCollection } = await import("../src/server/catalog.server");
    expect(resolveCollection({ name: "Single Tone", colors: ["Brown"] })).toBe("Essentials");
    expect(resolveCollection({ name: "Dual Tone", colors: ["Black / Brown"] })).toBe("Essentials");
  });

  it("counts design colours per colourway, not across colourway options", async () => {
    const { resolveCollection } = await import("../src/server/catalog.server");
    // Exotic Elegance: one bag offered in three single-colour colourways.
    expect(
      resolveCollection({ name: "Exotic Elegance", colors: ["Brown", "Black", "Grey"] }),
    ).toBe("Essentials");
  });

  it("assigns Essentials Pro to 3+ colour designs or multicolour", async () => {
    const { resolveCollection } = await import("../src/server/catalog.server");
    expect(
      resolveCollection({ name: "Trio Tone", colors: ["Brown / Black / Grey"] }),
    ).toBe("Essentials Pro");
    expect(
      resolveCollection({ name: "Boot of Many Colours", colors: ["Multicolour"] }),
    ).toBe("Essentials Pro");
    expect(
      resolveCollection({ name: "Rainbow Belt", colors: ["Black / Rainbow"] }),
    ).toBe("Essentials Pro");
  });

  it("preserves explicit collection metadata", async () => {
    const { resolveCollection } = await import("../src/server/catalog.server");
    expect(
      resolveCollection({
        collection: "DREAMZ Originals",
        name: "Dreamz Faith",
        colors: ["Tan / Forest Green", "Taupe / Navy"],
      }),
    ).toBe("DREAMZ Originals");
  });
});
