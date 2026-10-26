import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isDisplayableImageUrl } from "../src/lib/img";

/**
 * Upload → catalogue reconciliation for the bundled product photography in
 * public/img/products. Guards against the regression where every published
 * product rendered "Image coming soon": files deleted from the repo while
 * gallery rows still pointed at them, and a data-layer filter that dropped
 * every /img/ URL.
 */

const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT, "public/img/products");

/** Published SKU → gallery files, in display order (DB snapshot 2026-10-24). */
const PUBLISHED_GALLERIES: Record<string, string[]> = {
  "DFK-FTW-001": ["boot-of-many-colours-studio.jpg", "boot-of-many-colours.jpg"],
  "DFK-FTW-002": ["asiwaju-mule-brown.jpg", "asiwaju-mule-brown-detail.jpg"],
  "DFK-FTW-003": ["asiwaju-mule-black-white.jpg"],
  "DFK-FTW-004": ["crimson-pin.jpg"],
  "DFK-FTW-005": ["onyx-wave.jpg"],
  "DFK-FTW-006": ["onyx-stride.jpg"],
  "DFK-FTW-007": ["terra-cross.jpg"],
  "DFK-FTW-008": ["crimson-cross.jpg"],
  "DFK-FTW-009": ["pinnacle-denim.jpg"],
  "DFK-FTW-010": ["terra-cove.jpg"],
  // DFK-FTW-011 (Lightning Strap Loafer) was finalized as DFK-ORG-022,
  // "Legacy Strap Loafer", in 20261026135913_originals-front-edit-ten-products.
  "DFK-FTW-016": ["lagos-tassel.jpg"],
  "DFK-FTW-017": ["verona-buckle-slide.jpg"],
  "DFK-FTW-019": ["strap-twist.jpg"],
  "DFK-BAG-014": ["exotic-elegance.jpg"],
  "DFK-BAG-018": ["pedra-satchel.jpg"],
  "DFK-ACC-015": ["gentleman-complete-combo.jpg"],
  "DZE-HB-001": ["executive-leather-handbag.jpg"],
  "DFK-ORG-001": ["dreamz-faith-tan-green.jpg", "dreamz-faith-taupe-navy.jpg"],
  "DFK-ORG-002": ["dreamz-vision-green-red-orange-brown.jpg"],
  "DFK-ORG-003": ["dreamz-focus-black-royal-blue.jpg"],
  // DFK-ORG-004 (Dreamz Courage) was finalized as DFK-ORG-023, "Voltage Noir Loafer".
  "DFK-ORG-005": ["dreamz-integrity-black-burgundy.jpg"],
  "DFK-ORG-006": ["dreamz-purpose-brown-blue.jpg"],
  "DFK-ORG-007": ["dreamz-discipline-black-blue.jpg"],
  "DFK-ORG-008": ["dreamz-ambition-brown-blue-gold.jpg"],
  "DFK-ORG-009": ["dreamz-excellence-brown-white.jpg", "dreamz-excellence-black-blue.jpg"],
  "DFK-ORG-010": ["dreamz-grace-black-white.jpg", "dreamz-grace-black-blue.jpg"],
  "DFK-ORG-011": ["dreamz-confidence-black-royal-blue.jpg"],
  // DFK-ORG-012 (Dreamz Unity) was finalized as DFK-ORG-026, "Prism Cross Sandal".
  "DFK-ORG-013": ["dreamz-balance-sand-multicolour.jpg"],
  "DFK-ORG-014": ["dreamz-harmony-cream-multicolour.jpg"],
  "DFK-ORG-015": ["dreamz-resolve-multicolour.jpg"],
  // DREAMZ Originals front edit — the ten approved designs (2026-10-26).
  "DFK-ORG-022": ["legacy-strap-loafer.jpg"],
  "DFK-ORG-016": ["spectrum-buckle-slide.jpg"],
  "DFK-ORG-023": ["voltage-noir-loafer.jpg"],
  "DFK-ORG-017": ["heritage-medallion-oxford.jpg"],
  "DFK-ORG-018": ["executive-spectrum-briefcase.jpg"],
  "DFK-ORG-024": ["voyager-colourline-pouch.jpg"],
  "DFK-ORG-020": ["regent-croc-tote.jpg"],
  "DFK-ORG-025": ["ascension-oxford.jpg"],
  "DFK-ORG-026": ["prism-cross-sandal.jpg"],
  "DFK-ORG-021": ["mosaic-crest-mule.jpg"],
};

/** Byte-identical duplicates of canonical photographs (superseded draft names). */
const SUPERSEDED_DUPLICATES = [
  "dreamz-balance-beige-burnt-orange-slate-blue.jpg",
  "dreamz-depth-black-deep-blue.jpg",
  "dreamz-discipline-black-royal-blue.jpg",
  "dreamz-discipline-cognac-royal-blue-gold.jpg",
  "dreamz-faith-black-oxblood.jpg",
  "dreamz-freedom-cognac-green-blue-red-yellow.jpg",
  "dreamz-grace-black-royal-blue.jpg",
  "dreamz-harmony-tan-forest-green.jpg",
  "dreamz-harmony-taupe-navy.jpg",
  "dreamz-legacy-black-royal-blue.jpg",
  "dreamz-legacy-cognac-white.jpg",
  "dreamz-purpose-cognac-royal-blue.jpg",
  "dreamz-rhythm-olive-orange-brown-black.jpg",
  "dreamz-unity-cream-multi.jpg",
];

/**
 * Photography of pieces superseded by the 2026-10-26 Originals front edit.
 * The old rows were renamed in place (SKU rekeyed); their earlier artwork
 * stays on disk behind the approved photo in each gallery.
 */
const SUPERSEDED_FRONT_EDIT_PHOTO = [
  "lightning-strap-loafer.jpg",
  "dreamz-courage-black-red.jpg",
  "dreamz-unity-multicolour.jpg",
];

/** Present but intentionally unpublished, with the reason. */
const HELD_BACK: Record<string, string> = {
  "classic-black-penny-loafer.jpg": "draft DFK-FTW-012 — no price source",
  "multicolour-oxford.jpg": "lifestyle model shot — product not identified",
  "patterned-loafer.jpg": "lifestyle model shot — product not identified",
};

describe("isDisplayableImageUrl", () => {
  it("accepts uploaded media, bundled product photography and https", () => {
    expect(isDisplayableImageUrl("/api/media/products/abc.jpg")).toBe(true);
    expect(isDisplayableImageUrl("/img/products/strap-twist.jpg")).toBe(true);
    expect(isDisplayableImageUrl("https://cdn.example.com/a.jpg")).toBe(true);
  });

  it("rejects empty values and legacy root-level placeholders", () => {
    expect(isDisplayableImageUrl(null)).toBe(false);
    expect(isDisplayableImageUrl("")).toBe(false);
    expect(isDisplayableImageUrl("/img/derby-black.jpg")).toBe(false);
    expect(isDisplayableImageUrl("http://insecure.example.com/a.jpg")).toBe(false);
  });
});

describe("Published product galleries", () => {
  it("every gallery file exists with exact filename case", () => {
    const onDisk = new Set(fs.readdirSync(PRODUCTS_DIR));
    for (const [sku, files] of Object.entries(PUBLISHED_GALLERIES)) {
      expect(files.length, `${sku} has no primary image`).toBeGreaterThan(0);
      for (const f of files) {
        expect(onDisk.has(f), `${sku}: missing public/img/products/${f}`).toBe(true);
        expect(isDisplayableImageUrl(`/img/products/${f}`)).toBe(true);
      }
    }
  });

  it("no image is shared between two published products", () => {
    const seen = new Map<string, string>();
    for (const [sku, files] of Object.entries(PUBLISHED_GALLERIES)) {
      for (const f of files) {
        expect(seen.get(f), `${f} used by ${seen.get(f)} and ${sku}`).toBeUndefined();
        seen.set(f, sku);
      }
    }
  });

  it("every uploaded file is reconciled — published, superseded or explicitly held back", () => {
    const accounted = new Set([
      ...Object.values(PUBLISHED_GALLERIES).flat(),
      ...SUPERSEDED_DUPLICATES,
      ...SUPERSEDED_FRONT_EDIT_PHOTO,
      ...Object.keys(HELD_BACK),
    ]);
    const orphans = fs.readdirSync(PRODUCTS_DIR).filter((f) => !accounted.has(f));
    expect(orphans, "unreconciled uploads in public/img/products").toEqual([]);
  });

  it("the data layer filters through isDisplayableImageUrl rather than dropping /img/", () => {
    const catalog = fs.readFileSync(path.join(ROOT, "src/server/catalog.server.ts"), "utf-8");
    expect(catalog).toContain("isDisplayableImageUrl(i.url)");
    expect(catalog).not.toContain('!i.url.startsWith("/img/")');
  });
});

describe("Upload reconciliation migration", () => {
  const sql = fs.readFileSync(
    path.join(
      ROOT,
      "netlify/database/migrations/20261024100058_reconcile_uploaded_product_images/migration.sql",
    ),
    "utf-8",
  );

  it("is idempotent", () => {
    const inserts = sql.match(/INSERT INTO/g) ?? [];
    const guards = sql.match(/NOT EXISTS|ON CONFLICT/g) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    expect(guards.length).toBeGreaterThanOrEqual(inserts.length);
    expect(sql).not.toMatch(/\bUPDATE\b|\bDELETE\b/);
  });

  it("uses the poster prices for Strap Twist and invents no stock", () => {
    expect(sql).toContain("2250000, 3000000");
    expect(sql).toMatch(/0, 'in_stock'/);
    expect(sql).toMatch(/'published', false\)/);
  });
});
