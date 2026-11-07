/**
 * Customer-facing shop structure. Product type (the record's `subcategory`,
 * e.g. "Monk Straps", "Mules") stays exact on every listing; this only groups
 * types into the browsing structure:
 *
 *   Footwear     → Shoes / Loafers / Boots / Slides
 *   Bags         → Briefcases / Wrist Pouches / Handbags & Totes
 *   Accessories  → Belts / Gift Sets / Wallets & Small Goods
 *   Leather Wear → Tops / Vests / Jackets / Trousers / Shorts / Skirts
 */

const FOOTWEAR_GROUPS: Array<[string, RegExp]> = [
  ["Boots", /boot|chelsea/i],
  ["Loafers", /loafer/i],
  ["Sneakers", /sneaker|trainer/i],
  ["Heels & Wedges", /heel|wedge|pump/i],
  ["Women's Flats", /flat|ballerina/i],
  ["Slides & Sandals", /slide|sandal|mule|clog|slipper/i],
  ["Shoes", /oxford|derby|brogue|monk|lace|shoe/i],
];

const BAG_GROUPS: Array<[string, RegExp]> = [
  ["Briefcases & Laptop Bags", /brief|business|laptop/i],
  ["Duffle & Travel", /duffle|travel|weekend|gym/i],
  ["Crossbody", /crossbody|cross.body/i],
  ["Wrist Pouches", /pouch|clutch|wristlet/i],
  ["Handbags & Totes", /hand|tote|satchel|shoulder|bag/i],
];

const ACCESSORY_GROUPS: Array<[string, RegExp]> = [
  ["Belts", /belt/i],
  ["Bracelets & Cuffs", /bracelet|cuff|bead/i],
  ["Gift Sets", /gift|combo|set/i],
  ["Purses", /purse/i],
  ["Wallets & Small Goods", /wallet|card|pouch|key/i],
];

const LEATHER_WEAR_GROUPS: Array<[string, RegExp]> = [
  ["Tops", /tee|top|shirt|blouse/i],
  ["Vests", /vest/i],
  ["Jackets", /jacket|coat|blazer|outerwear/i],
  ["Trousers", /trouser|jogger|pant|chino/i],
  ["Shorts", /short/i],
  ["Skirts", /skirt/i],
  ["Other Leather Wear", /other|ensemble|set|two.piece/i],
];

export const GROUP_ORDER: Record<string, string[]> = {
  footwear: ["Shoes", "Loafers", "Boots", "Sneakers", "Heels & Wedges", "Women's Flats", "Slides & Sandals"],
  bags: ["Handbags & Totes", "Briefcases & Laptop Bags", "Duffle & Travel", "Crossbody", "Wrist Pouches"],
  accessories: ["Belts", "Wallets & Small Goods", "Bracelets & Cuffs", "Purses", "Gift Sets"],
  "leather-wear": ["Tops", "Vests", "Jackets", "Trousers", "Shorts", "Skirts", "Other Leather Wear"],
};

// ── Product types (exact admin vocabulary) ────────────────────────────
// Collection and product type are separate facts: a product's collection
// (Essentials / Originals / Royale) is chosen by the admin, never derived
// from its type. These are the canonical types the admin picks from.

export const PRODUCT_TYPES: Record<string, string[]> = {
  footwear: [
    "Shoes",
    "Loafers",
    "Oxfords",
    "Derbies",
    "Boots",
    "Mules",
    "Slides",
    "Sandals",
    "Sneakers",
    "Women's Flats",
    "Heels",
    "Wedges",
    "Other Footwear",
  ],
  bags: [
    "Handbags",
    "Totes",
    "Mini Totes",
    "Duffle Bags",
    "Briefcases",
    "Laptop Bags",
    "Crossbody Bags",
    "Wrist Pouches",
    "Travel Bags",
    "Other Bags",
  ],
  accessories: [
    "Belts",
    "Wallets",
    "Purses",
    "Card Holders",
    "Key Holders",
    "Bracelets & Cuffs",
    "Wrist Pouches",
    "Gift Sets",
    "Other Accessories",
  ],
  "leather-wear": [
    "Tops",
    "Vests",
    "Jackets",
    "Trousers",
    "Joggers",
    "Shorts",
    "Skirts",
    "Other Leather Wear",
  ],
};

const TYPE_GROUPS: Record<string, string> = {
  Shoes: "Shoes",
  Loafers: "Loafers",
  Oxfords: "Shoes",
  Derbies: "Shoes",
  Boots: "Boots",
  Mules: "Slides & Sandals",
  Slides: "Slides & Sandals",
  Sandals: "Slides & Sandals",
  Sneakers: "Sneakers",
  "Women's Flats": "Women's Flats",
  Heels: "Heels & Wedges",
  Wedges: "Heels & Wedges",
  "Other Footwear": "Shoes",
  Handbags: "Handbags & Totes",
  Totes: "Handbags & Totes",
  "Mini Totes": "Handbags & Totes",
  "Duffle Bags": "Duffle & Travel",
  Briefcases: "Briefcases & Laptop Bags",
  "Laptop Bags": "Briefcases & Laptop Bags",
  "Crossbody Bags": "Crossbody",
  "Wrist Pouches": "Wrist Pouches",
  "Travel Bags": "Duffle & Travel",
  "Other Bags": "Handbags & Totes",
  Belts: "Belts",
  Wallets: "Wallets & Small Goods",
  Purses: "Purses",
  "Card Holders": "Wallets & Small Goods",
  "Key Holders": "Wallets & Small Goods",
  "Gift Sets": "Gift Sets",
  "Other Accessories": "Wallets & Small Goods",
  Tops: "Tops",
  Vests: "Vests",
  Jackets: "Jackets",
  Trousers: "Trousers",
  Joggers: "Trousers",
  Shorts: "Shorts",
  Skirts: "Skirts",
  "Other Leather Wear": "Other Leather Wear",
};

/** Browsing group for an exact product type (null when unknown). */
export function groupForType(categorySlug: string, type: string): string | null {
  const group = TYPE_GROUPS[type];
  if (!group) return null;
  return (GROUP_ORDER[categorySlug] ?? []).includes(group) ? group : null;
}

export function productGroup(categorySlug: string, subcategory: string | null | undefined): string | null {
  const sub = subcategory ?? "";
  const table =
    categorySlug === "footwear"
      ? FOOTWEAR_GROUPS
      : categorySlug === "bags"
        ? BAG_GROUPS
        : categorySlug === "accessories"
          ? ACCESSORY_GROUPS
          : categorySlug === "leather-wear"
            ? LEATHER_WEAR_GROUPS
            : null;
  if (!table) return null;
  for (const [group, re] of table) if (re.test(sub)) return group;
  return null;
}

/** Groups present in a product list, in house order, with counts. */
export function groupCounts(
  categorySlug: string,
  items: Array<{ categorySlug: string; subcategory: string | null }>,
): Array<{ group: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of items) {
    const g = productGroup(p.categorySlug, p.subcategory);
    if (g) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return (GROUP_ORDER[categorySlug] ?? [])
    .filter((g) => counts.has(g))
    .map((g) => ({ group: g, count: counts.get(g)! }));
}
