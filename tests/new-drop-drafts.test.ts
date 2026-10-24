import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * New-drop drafts (DFK-DFT-150 … DFK-DFT-166).
 *
 * The 17 administrator-supplied designs are staged as quote-only drafts:
 * no price, no checkout, unpublished. The seed (fresh installs) and the
 * roll-forward migration (existing databases) must agree on SKUs, slugs,
 * categories and tiers, and no imagery may be bundled in the repo — the
 * house uploads photography in Admin → Media.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../netlify/database/migrations/20261024030000_stage_new_drop_drafts.sql",
);

const SEED_PATH = path.resolve(__dirname, "../src/server/seed.server.ts");

const EXPECTED: Array<{ sku: string; slug: string; category: string; tier: string }> = [
  { sku: "DFK-DFT-150", slug: "ascension-oxford-blue-black", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-151", slug: "woven-lightning-loafer-brown", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-152", slug: "buckle-slide-cream-brown", category: "footwear", tier: "essentials" },
  { sku: "DFK-DFT-153", slug: "regent-button-boot-emerald", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-154", slug: "wrist-pouch-forest-green", category: "accessories", tier: "essentials" },
  { sku: "DFK-DFT-155", slug: "frontier-croc-boot-multicolour", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-156", slug: "heritage-briefcase-brown", category: "bags", tier: "signature" },
  { sku: "DFK-DFT-157", slug: "heritage-harness-boot-brown-croc", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-158", slug: "midnight-vow-oxford-black-red", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-159", slug: "chelsea-boot-navy-cognac", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-160", slug: "signature-hook-belt-black-rainbow", category: "accessories", tier: "signature" },
  { sku: "DFK-DFT-161", slug: "voltage-boot-oxblood-black", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-162", slug: "chunky-derby-black", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-163", slug: "loafer-tan-forest-green", category: "footwear", tier: "signature" },
  { sku: "DFK-DFT-164", slug: "patchwork-slide-brown", category: "footwear", tier: "essentials" },
  { sku: "DFK-DFT-165", slug: "lined-belt-trio-black", category: "accessories", tier: "essentials" },
  { sku: "DFK-DFT-166", slug: "croc-slide-blue-black", category: "footwear", tier: "essentials" },
];

describe("New-drop drafts (DFK-DFT-150 … DFK-DFT-166)", () => {
  it("stages exactly 17 contiguous draft SKUs", () => {
    expect(EXPECTED).toHaveLength(17);
    expect(new Set(EXPECTED.map((e) => e.sku)).size).toBe(17);
    expect(new Set(EXPECTED.map((e) => e.slug)).size).toBe(17);
    for (let i = 150; i <= 166; i++) {
      expect(EXPECTED.map((e) => e.sku)).toContain(`DFK-DFT-${i}`);
    }
  });

  it("seed and migration agree on every SKU, slug, category and tier", () => {
    const seed = fs.readFileSync(SEED_PATH, "utf-8");
    const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
    for (const e of EXPECTED) {
      expect(seed).toContain(e.sku);
      expect(seed).toContain(e.slug);
      expect(sql).toContain(e.sku);
      expect(sql).toContain(e.slug);
      expect(sql).toContain(`'${e.category}'`);
      expect(sql).toContain(`'${e.tier}'`);
    }
  });

  it("migration is idempotent and quote-only (no prices, no checkout, draft)", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("DO NOTHING");
    expect(sql).toContain("'draft'");
    // Every row is unpriced with checkout disabled and zero stock.
    const draftRows = (sql.match(/0, 'draft', false/g) ?? []).length;
    expect(draftRows).toBe(17);
    expect(sql).not.toMatch(/checkout_ready[^,]*true/);
    expect(sql).not.toContain("'published'");
  });

  it("bundles no imagery for the new drop", () => {
    const root = path.resolve(__dirname, "..");
    expect(fs.existsSync(path.join(root, "public/img/products"))).toBe(false);
    const sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
    expect(sql).not.toContain("/img/");
    expect(sql).not.toContain("/api/media/");
  });
});
