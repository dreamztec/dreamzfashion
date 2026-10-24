/**
 * Customer-facing shop structure. Product type (the record's `subcategory`,
 * e.g. "Monk Straps", "Mules") stays exact on every listing; this only groups
 * types into the browsing structure:
 *
 *   Footwear    → Shoes / Loafers / Boots / Slides
 *   Bags        → Briefcases / Wrist Pouches / Handbags & Totes
 *   Accessories → Belts / Gift Sets / Wallets & Small Goods
 */

const FOOTWEAR_GROUPS: Array<[string, RegExp]> = [
  ["Boots", /boot|chelsea/i],
  ["Loafers", /loafer/i],
  ["Slides", /slide|sandal|mule|clog|slipper/i],
  ["Shoes", /oxford|derby|brogue|monk|lace|shoe/i],
];

const BAG_GROUPS: Array<[string, RegExp]> = [
  ["Briefcases", /brief|business|laptop/i],
  ["Wrist Pouches", /pouch|clutch|wristlet/i],
  ["Handbags & Totes", /hand|tote|satchel|shoulder|bag/i],
];

const ACCESSORY_GROUPS: Array<[string, RegExp]> = [
  ["Belts", /belt/i],
  ["Gift Sets", /gift|combo|set/i],
  ["Wallets & Small Goods", /wallet|purse|card|pouch/i],
];

export const GROUP_ORDER: Record<string, string[]> = {
  footwear: ["Shoes", "Loafers", "Boots", "Slides"],
  bags: ["Briefcases", "Wrist Pouches", "Handbags & Totes"],
  accessories: ["Belts", "Gift Sets", "Wallets & Small Goods"],
};

export function productGroup(categorySlug: string, subcategory: string | null | undefined): string | null {
  const sub = subcategory ?? "";
  const table =
    categorySlug === "footwear" ? FOOTWEAR_GROUPS : categorySlug === "bags" ? BAG_GROUPS : categorySlug === "accessories" ? ACCESSORY_GROUPS : null;
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
