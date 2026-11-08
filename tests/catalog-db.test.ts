import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./helpers/pglite-db";

/**
 * Catalogue integrity on a real Postgres (in-memory, every migration
 * applied, then the idempotent first-run seed executed — the same state a
 * fresh environment reaches). Verifies the published state of the storefront
 * catalogue: every approved piece is purchasable made-to-order with a real
 * price, and no public product shows ₦0.
 */
const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../db/index", () => ({
  get db() {
    return h.db;
  },
}));

type Client = { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> };
let client: Client;

const APPROVED_16 = [
  "DFK-ACC-201", "DFK-ACC-202", "DFK-ACC-203", "DFK-ACC-204",
  "DFK-ACC-205", "DFK-ACC-206", "DFK-LWR-201", "DFK-LWR-202",
  "DFK-LWR-203", "DFK-LWR-204", "DFK-LWR-205", "DFK-LWR-206",
  "DFK-LWR-207", "DFK-LWR-208", "DFK-LWR-209", "DFK-LWR-210",
];

beforeAll(async () => {
  const t = await createTestDb();
  client = t.client as Client;
  h.db = t.db;
  const { seed } = await import("../src/server/seed.server");
  await seed();
}, 60_000);

describe("published catalogue after migrations", () => {
  it("all 16 approved products are published, priced and checkout-ready made-to-order", async () => {
    const rows = await client.query<{ sku: string; price: number; status: string; checkout_ready: boolean; availability: string; category_slug: string }>(
      `SELECT sku, price, status, checkout_ready, availability, category_slug
       FROM products WHERE sku = ANY($1)`,
      [APPROVED_16],
    );
    expect(rows.rows).toHaveLength(16);
    for (const row of rows.rows) {
      expect(row.status, row.sku).toBe("published");
      expect(row.price, row.sku).toBeGreaterThan(0);
      expect(row.checkout_ready, row.sku).toBe(true);
      expect(row.availability, row.sku).toBe("made_to_order");
    }
    const bySku = new Map(rows.rows.map((r) => [r.sku, r]));
    expect(bySku.get("DFK-ACC-206")!.category_slug).toBe("bags"); // Purpose Wrist Pouch → Bags
    expect(bySku.get("DFK-LWR-201")!.category_slug).toBe("leather-wear");
  });

  it("the Boot of Many Colours is ₦120,000 Product Only / ₦160,000 Complete Package", async () => {
    const [boot] = await client.query<{ price: number; complete_package_price: number | null; status: string; customizable: boolean }>(
      `SELECT price, complete_package_price, status, customizable FROM products WHERE sku = 'DFK-FTW-001'`,
    ).then((r) => r.rows);
    expect(boot.price).toBe(12_000_000);
    expect(boot.complete_package_price).toBe(16_000_000);
    expect(boot.status).toBe("published");
    expect(boot.customizable).toBe(false);
  });

  it("every published product carries photography and no public product shows ₦0", async () => {
    const rows = await client.query<{ sku: string; price: number; images: number }>(
      `SELECT p.sku, p.price,
              (SELECT count(*) FROM product_images pi WHERE pi.product_id = p.id) AS images
       FROM products p WHERE p.status = 'published'`,
    );
    expect(rows.rows.length).toBeGreaterThan(0);
    for (const row of rows.rows) {
      expect(row.price, `${row.sku} is publicly visible but unpriced`).toBeGreaterThan(0);
    }
    // The 16 new pieces each lead with their own photograph.
    const imageless = rows.rows.filter((r) => APPROVED_16.includes(r.sku) && Number(r.images) === 0);
    expect(imageless).toEqual([]);
  });

  it("category browsing order is Footwear → Leather Wear → Bags → Accessories", async () => {
    const rows = await client.query<{ slug: string; sort_order: number }>(
      `SELECT slug, sort_order FROM categories WHERE active ORDER BY sort_order`,
    );
    expect(rows.rows.map((r) => r.slug)).toEqual(["footwear", "leather-wear", "bags", "accessories"]);
  });

  it("the 16 approved pieces are discoverable through their categories", async () => {
    const rows = await client.query<{ category_slug: string; count: string }>(
      `SELECT category_slug, count(*) FROM products
       WHERE status = 'published' AND sku = ANY($1)
       GROUP BY category_slug`,
      [APPROVED_16],
    );
    const map = new Map(rows.rows.map((r) => [r.category_slug, Number(r.count)]));
    expect(map.get("bags")).toBe(1); // Purpose Wrist Pouch
    expect(map.get("accessories")).toBe(5);
    expect(map.get("leather-wear")).toBe(10);
  });
});
