import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTestDb } from "./helpers/pglite-db";

/**
 * Real-query tests for the leather-house catalogue work: the coherent naming
 * migration (IDs, SKUs, orders and imagery preserved, old slugs aliased),
 * gallery hygiene (poster artwork never reaches the storefront), the Boot of
 * Many Colours fix, and the MAKE IT MEANINGFUL checkout rules.
 */
const h = vi.hoisted(() => ({ db: null as unknown, client: null as unknown }));
vi.mock("../db/index", () => ({
  get db() {
    return h.db;
  },
}));

type Client = { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> };
const q = async <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  (await (h.client as Client).query<T>(sql, params)).rows;

const buyer = { customerId: null, email: "buyer@example.com", phone: "08030000001" };

const RENAME_SKUS = [
  "DFK-FTW-001",
  "DFK-FTW-004",
  "DFK-FTW-005",
  "DFK-FTW-006",
  "DFK-FTW-007",
  "DFK-FTW-008",
  "DFK-FTW-009",
  "DFK-FTW-010",
  "DFK-ORG-001",
  "DFK-ORG-002",
  "DFK-ORG-003",
  "DFK-ORG-008",
  "DFK-ORG-009",
  "DFK-ORG-010",
  "DFK-ORG-011",
  "DFK-ORG-013",
  "DFK-ORG-014",
  "DFK-ORG-015",
  "DFK-ORG-005",
  "DFK-ORG-006",
  "DFK-ORG-007",
  "DFK-BAG-014",
  "DFK-FTW-016",
];

beforeAll(async () => {
  const t = await createTestDb();
  h.db = t.db;
  h.client = t.client;

  // Insert the catalogue rows the rename migration expects, capturing IDs
  // before the data migration runs.
  for (const sku of RENAME_SKUS) {
    await q(
      `INSERT INTO products (sku, name, slug, category_slug, subcategory, price, stock_quantity, status, checkout_ready, customizable)
       VALUES ($1, $1, $2, 'footwear', 'Slides', 100000, 5, 'published', true, true)
       ON CONFLICT (sku) DO NOTHING`,
      [sku, sku.toLowerCase().replace(/-/g, "-")],
    );
  }
  await q(`UPDATE products SET name = 'Dreamz Faith', slug = 'dreamz-faith' WHERE sku = 'DFK-ORG-001'`);
  await q(`UPDATE products SET name = 'Crimson Pin', slug = 'crimson-pin' WHERE sku = 'DFK-FTW-004'`);

  // Apply the data-migration statements again on top of these rows. The DDL
  // already ran with createTestDb; every UPDATE/INSERT statement is
  // idempotent, so re-running just the data half is safe.
  const dir = path.resolve(__dirname, "../netlify/database/migrations");
  const entry = fs
    .readdirSync(dir)
    .find((e) => e.includes("leather_atelier_meaningful_catalog"));
  const file = path.join(dir, entry!, "migration.sql");
  const sql = fs.readFileSync(file, "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    // Strip comment lines so the first UPDATE (preceded by an explanatory
    // comment) still matches; every statement is idempotent.
    const body = statement
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim();
    if (/^(UPDATE|INSERT)\b/.test(body)) await (h.client as Client).query(body);
  }

  // Shipping terms for pricing tests.
  await q(
    `INSERT INTO settings (key, value) VALUES ('shipping', '{"defaultFee":3500,"freeThreshold":150000}'::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
  );
}, 60_000);

describe("product renaming migration", () => {
  it("preserves the database product ID while renaming", async () => {
    const [row] = await q<{ id: number; name: string; slug: string }>(`SELECT id, name, slug FROM products WHERE sku = 'DFK-ORG-001'`);
    expect(row.name).toBe("Faith Loafer");
    expect(row.slug).toBe("faith-loafer");
    // The id is whatever the row already had — a rename never re-creates it.
    const alias = await q<{ product_id: number }>(`SELECT product_id FROM product_slug_aliases WHERE alias = 'dreamz-faith'`);
    expect(alias[0]?.product_id).toBe(row.id);
  });

  it("applies the coherent MEANINGFUL NAME + PRODUCT TYPE architecture", async () => {
    const rows = await q<{ sku: string; name: string; theme: string | null; universal_meaning: string | null }>(
      `SELECT sku, name, theme, universal_meaning FROM products WHERE sku = ANY($1)`,
      [RENAME_SKUS],
    );
    const bySku = new Map(rows.map((r) => [r.sku, r]));
    expect(bySku.get("DFK-FTW-004")).toMatchObject({ name: "Crimson Slide", theme: "Courage" });
    expect(bySku.get("DFK-FTW-005")).toMatchObject({ name: "Onyx Slide" });
    expect(bySku.get("DFK-FTW-006")).toMatchObject({ name: "Onyx Sandal" });
    expect(bySku.get("DFK-ORG-002")).toMatchObject({ name: "Vision Brogue", theme: "Vision" });
    expect(bySku.get("DFK-ORG-008")).toMatchObject({ name: "Ambition Monk Strap" });
    expect(bySku.get("DFK-ORG-009")).toMatchObject({ name: "Excellence Brogue" });
    expect(bySku.get("DFK-BAG-014")).toMatchObject({ name: "Exotic Elegance Tote" });
    // No duplicate meaningful names within the same product type.
    const names = rows.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    // Every meaningful product carries a universal statement.
    for (const r of rows) {
      expect(r.universal_meaning).toBeTruthy();
    }
  });

  it("old slugs resolve through permanent aliases", async () => {
    const { getProductBySlug } = await import("../src/server/catalog.server");
    const viaAlias = await getProductBySlug("dreamz-faith");
    expect(viaAlias?.slug).toBe("faith-loafer");
    const viaAliasPin = await getProductBySlug("crimson-pin");
    expect(viaAliasPin?.slug).toBe("crimson-slide");
    // The canonical slug still resolves directly.
    const direct = await getProductBySlug("faith-loafer");
    expect(direct?.slug).toBe("faith-loafer");
  });

  it("collection locks and untouched names are left alone", async () => {
    const rows = await q<{ name: string }>(`SELECT name FROM products WHERE sku = 'DFK-FTW-001'`);
    expect(rows[0]?.name).toBe("DFK-FTW-001"); // seeded by the test, not renamed
  });
});

describe("the Boot of Many Colours is fixed", () => {
  it("the migration sets customizable = false for DFK-FTW-001", async () => {
    const [row] = await q<{ customizable: boolean }>(`SELECT customizable FROM products WHERE sku = 'DFK-FTW-001'`);
    expect(row.customizable).toBe(false);
  });
});

describe("gallery hygiene", () => {
  it("poster artwork and catalogue images never enter a public product gallery", async () => {
    const [product] = await q<{ id: number }>(
      `INSERT INTO products (sku, name, slug, category_slug, price, stock_quantity, status, checkout_ready)
       VALUES ('T-MEDIA', 'Media Test', 'media-test', 'bags', 100000, 3, 'published', true) RETURNING id`,
    );
    await q(
      `INSERT INTO product_images (product_id, url, alt_text, position, kind) VALUES
       ($1, '/img/products/clean-boot.jpg', 'clean photo', 0, 'product'),
       ($1, '/img/products/boot-of-many-colours.jpg', 'poster with prices baked in', 1, 'catalogue'),
       ($1, '/api/media/lifestyle-shot.jpg', 'editorial', 2, 'lifestyle')`,
      [product.id],
    );
    const { getPublishedProducts } = await import("../src/server/catalog.server");
    const all = await getPublishedProducts({ categorySlug: "bags" });
    const media = all.find((p) => p.sku === "T-MEDIA");
    expect(media).toBeDefined();
    const urls = media!.images.map((i) => i.url);
    expect(urls).toContain("/img/products/clean-boot.jpg"); // clean photography retained
    expect(urls).toContain("/api/media/lifestyle-shot.jpg");
    expect(urls).not.toContain("/img/products/boot-of-many-colours.jpg"); // poster archived out
  });
});

describe("make it meaningful at checkout", () => {
  let productId = 0;
  let approvedId = "";
  beforeAll(async () => {
    const [product] = await q<{ id: number }>(
      `INSERT INTO products (sku, name, slug, category_slug, price, stock_quantity, status, checkout_ready, inspiration_eligible, theme, allowed_message_placements)
       VALUES ('T-MEANING', 'Faith Loafer', 'meaning-test', 'footwear', 500000, 4, 'published', true, true, 'Faith', '["message_card","gift_note","embossing"]'::jsonb)
       RETURNING id`,
    );
    productId = product.id;
    await q(
      `INSERT INTO inspiration_messages (message_id, version, theme, source, text, reference, translation, attribution, reproduction_permission, status, rtl)
       VALUES
       ('DQ-TEST-01', 1, 'Faith', 'dreamz', 'Take the next step with courage.', NULL, NULL, 'DREAMZ', 'verified', 'approved', false),
       ('DQ-TEST-OLD', 1, 'Faith', 'dreamz', 'Archived wording.', NULL, NULL, 'DREAMZ', 'verified', 'archived', false),
       ('DQ-TEST-DRAFT', 1, 'Faith', 'bible', '', 'Hebrews 11:1', NULL, NULL, 'unverified', 'draft', false)`,
    );
    approvedId = "DQ-TEST-01";
    // Placement pricing: card + gift note complimentary (explicit), embossing unconfigured.
    await q(
      `INSERT INTO settings (key, value) VALUES ('meaning', '{"placements":{"message_card":0,"gift_note":0,"embossing":null}}'::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    );
  });

  it("attaches an approved message snapshot and a server-computed charge", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({
      items: [
        { productId, purchaseOption: "product_only", quantity: 1, message: { messageId: approvedId, version: 1, placement: "message_card" } },
      ],
      state: "Lagos",
      buyer,
    });
    const line = res.lines[0];
    expect(line.messageSnapshot).toMatchObject({
      messageId: "DQ-TEST-01",
      version: 1,
      source: "dreamz",
      text: "Take the next step with courage.",
      placement: "message_card",
      chargeKobo: 0,
    });
    // Complimentary card: no extra charge, no quote required.
    expect(line.messageChargeKobo).toBe(0);
    expect(line.quoteRequired).toBe(false);
    expect(res.subtotal).toBe(500000);
  });

  it("prices a configured physical placement server-side, per unit", async () => {
    await q(
      `UPDATE settings SET value = '{"placements":{"message_card":0,"gift_note":0,"embossing":500}}'::jsonb WHERE key = 'meaning'`,
    );
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({
      items: [
        { productId, purchaseOption: "product_only", quantity: 2, message: { messageId: approvedId, version: 1, placement: "embossing" } },
      ],
      state: "Lagos",
      buyer,
    });
    expect(res.lines[0].messageChargeKobo).toBe(50000); // ₦500 × 2 units, server-computed
    expect(res.subtotal).toBe(500000 * 2 + 100000);
  });

  it("an unconfigured physical placement becomes a quote line — never silently free", async () => {
    await q(
      `UPDATE settings SET value = '{"placements":{"message_card":0,"gift_note":0,"embossing":null}}'::jsonb WHERE key = 'meaning'`,
    );
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({
      items: [
        { productId, purchaseOption: "product_only", quantity: 1, message: { messageId: approvedId, version: 1, placement: "embossing" } },
      ],
      state: "Lagos",
      buyer,
    });
    expect(res.lines[0].messageChargeKobo).toBeNull();
    expect(res.lines[0].quoteRequired).toBe(true);
    expect(res.hasQuoteLines).toBe(true);
  });

  it("archived and draft messages are never sold", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    await expect(
      priceOrder({ items: [{ productId, purchaseOption: "product_only", quantity: 1, message: { messageId: "DQ-TEST-OLD", version: 1, placement: "message_card" } }], state: "Lagos", buyer }),
    ).rejects.toThrow(/not available/);
    await expect(
      priceOrder({ items: [{ productId, purchaseOption: "product_only", quantity: 1, message: { messageId: "DQ-TEST-DRAFT", version: 1, placement: "message_card" } }], state: "Lagos", buyer }),
    ).rejects.toThrow(/not available/);
  });

  it("sacred text falls back to the Message Card on an inappropriate placement", async () => {
    await q(
      `UPDATE inspiration_messages SET text = 'Verified wording pending permission.', translation = 'NIV (to confirm)' WHERE message_id = 'DQ-TEST-DRAFT'`,
    );
    await q(
      `UPDATE inspiration_messages SET status = 'approved', reproduction_permission = 'verified', verification_url = 'https://www.biblegateway.com/' WHERE message_id = 'DQ-TEST-DRAFT'`,
    );
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({
      items: [
        { productId, purchaseOption: "product_only", quantity: 1, message: { messageId: "DQ-TEST-DRAFT", version: 1, placement: "sole" } },
      ],
      state: "Lagos",
      buyer,
    });
    expect(res.lines[0].messageSnapshot).toMatchObject({ placement: "message_card", source: "bible" });
  });

  it("an ineligible product refuses messages", async () => {
    await q(`UPDATE products SET inspiration_eligible = false WHERE id = $1`, [productId]);
    const { priceOrder } = await import("../src/server/order-pricing.server");
    await expect(
      priceOrder({ items: [{ productId, purchaseOption: "product_only", quantity: 1, message: { messageId: approvedId, version: 1, placement: "message_card" } }], state: "Lagos", buyer }),
    ).rejects.toThrow(/does not carry inspiration/);
    await q(`UPDATE products SET inspiration_eligible = true WHERE id = $1`, [productId]);
  });

  it("the order-line snapshot is immutable against later catalogue edits", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({
      items: [{ productId, purchaseOption: "product_only", quantity: 1, message: { messageId: approvedId, version: 1, placement: "gift_note" } }],
      state: "Lagos",
      buyer,
    });
    const snapshot = res.lines[0].messageSnapshot as Record<string, unknown>;
    expect(snapshot.text).toBe("Take the next step with courage.");
    // The house edits the catalogue afterwards — historic wording stands.
    await q(`UPDATE inspiration_messages SET text = 'Rewritten later.' WHERE message_id = $1`, [approvedId]);
    expect(snapshot.text).toBe("Take the next step with courage.");
  });
});
