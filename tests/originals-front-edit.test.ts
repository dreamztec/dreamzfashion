import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * DREAMZ Originals front edit — the ten approved designs finalized by
 * 20261026135913_originals-front-edit-ten-products.
 *
 * The owner's assignments are permanent: collection locked to DREAMZ
 * Originals, fixed front ranks 1–10, fixed prices, and approved product
 * photography bundled under /img/products/.
 */

const ROOT = path.resolve(__dirname, "..");
const MIGRATION_PATH = path.resolve(
  __dirname,
  "../netlify/database/migrations/20261026135913_originals-front-edit-ten-products/migration.sql",
);
const SEED_PATH = path.resolve(__dirname, "../src/server/seed.server.ts");

const FRONT_EDIT: Array<{
  sku: string;
  name: string;
  slug: string;
  rank: number;
  priceKobo: number;
  image: string;
  category: string;
  subcategory: string;
}> = [
  { sku: "DFK-ORG-022", name: "Legacy Strap Loafer", slug: "legacy-strap-loafer", rank: 1, priceKobo: 15000000, image: "legacy-strap-loafer.jpg", category: "footwear", subcategory: "Loafers" },
  { sku: "DFK-ORG-016", name: "Spectrum Buckle Slide", slug: "spectrum-buckle-slide", rank: 2, priceKobo: 4500000, image: "spectrum-buckle-slide.jpg", category: "footwear", subcategory: "Slides" },
  { sku: "DFK-ORG-023", name: "Voltage Noir Loafer", slug: "voltage-noir-loafer", rank: 3, priceKobo: 11000000, image: "voltage-noir-loafer.jpg", category: "footwear", subcategory: "Loafers" },
  { sku: "DFK-ORG-017", name: "Heritage Medallion Oxford", slug: "heritage-medallion-oxford", rank: 4, priceKobo: 15800000, image: "heritage-medallion-oxford.jpg", category: "footwear", subcategory: "Oxfords" },
  { sku: "DFK-ORG-018", name: "Executive Spectrum Briefcase", slug: "executive-spectrum-briefcase", rank: 5, priceKobo: 18000000, image: "executive-spectrum-briefcase.jpg", category: "bags", subcategory: "Briefcases" },
  { sku: "DFK-ORG-024", name: "Voyager Colourline Pouch", slug: "voyager-colourline-pouch", rank: 6, priceKobo: 3500000, image: "voyager-colourline-pouch.jpg", category: "bags", subcategory: "Travel Bags" },
  { sku: "DFK-ORG-020", name: "Regent Croc Tote", slug: "regent-croc-tote", rank: 7, priceKobo: 12000000, image: "regent-croc-tote.jpg", category: "bags", subcategory: "Totes" },
  { sku: "DFK-ORG-025", name: "Ascension Oxford", slug: "ascension-oxford", rank: 8, priceKobo: 13000000, image: "ascension-oxford.jpg", category: "footwear", subcategory: "Oxfords" },
  { sku: "DFK-ORG-026", name: "Prism Cross Sandal", slug: "prism-cross-sandal", rank: 9, priceKobo: 4500000, image: "prism-cross-sandal.jpg", category: "footwear", subcategory: "Sandals" },
  { sku: "DFK-ORG-021", name: "Mosaic Crest Mule", slug: "mosaic-crest-mule", rank: 10, priceKobo: 4500000, image: "mosaic-crest-mule.jpg", category: "footwear", subcategory: "Slides" },
];

describe("Originals front edit (20261026135913)", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");

  it("finalizes exactly ten approved pieces with unique ranks 1–10", () => {
    expect(FRONT_EDIT).toHaveLength(10);
    expect(new Set(FRONT_EDIT.map((p) => p.sku)).size).toBe(10);
    expect(new Set(FRONT_EDIT.map((p) => p.slug)).size).toBe(10);
    expect([...FRONT_EDIT.map((p) => p.rank)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("locks every piece to DREAMZ Originals at the Originals line/tier", () => {
    for (const p of FRONT_EDIT) {
      expect(sql).toContain(`'${p.slug}'`);
      expect(sql).toContain(`'${p.sku}'`);
      expect(sql).toContain(`'${p.name}'`);
      expect(sql).toContain(`'${p.subcategory}'`);
    }
    // Collection is locked in every UPDATE block — no automatic rule may
    // move a piece out of Originals.
    expect(sql).toContain(`"collection" = 'DREAMZ Originals'`);
    expect(sql).toContain(`"collection_locked" = true`);
    expect(sql).toContain(`"tier" = 'originals'`);
    expect(sql).toContain(`"product_line" = 'originals'`);
  });

  it("carries the owner's prices in kobo", () => {
    for (const p of FRONT_EDIT) {
      expect(sql).toContain(String(p.priceKobo));
    }
  });

  it("attaches the approved photography as product-kind imagery", () => {
    const onDisk = new Set(fs.readdirSync(path.join(ROOT, "public/img/products")));
    for (const p of FRONT_EDIT) {
      expect(onDisk.has(p.image), `missing public/img/products/${p.image}`).toBe(true);
      expect(sql).toContain(`/img/products/${p.image}`);
    }
  });

  it("keeps prior slugs reachable — nothing deleted, superseded rows archived", () => {
    // The migration must never DELETE rows; displaced presentations are
    // archived instead.
    expect(sql).not.toMatch(/\bDELETE FROM\b/);
    expect(sql).toContain("'lightning-strap-loafer'");
    expect(sql).toContain("'dreamz-courage'");
    expect(sql).toContain("'dreamz-unity'");
  });

  it("seed no longer re-creates the retired Lightning Strap Loafer presentation", () => {
    const seed = fs.readFileSync(SEED_PATH, "utf-8");
    // The old priced presentation is gone; the SKU is only retained as an
    // archived stub.
    expect(seed).not.toContain("price: 6375000");
  });
});
