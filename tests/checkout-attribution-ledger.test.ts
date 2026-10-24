import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./helpers/pglite-db";

/**
 * Real-query tests (in-memory Postgres with every migration applied):
 * server pricing, delivery, creator-code attribution, and the commission
 * ledger lifecycle — unpaid → pending → eligible → reversed, idempotent.
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

let pricedId = 0;
let quoteOnlyId = 0;
let bootId = 0;
let creatorId = 0;
let publicId = 0;

async function insertOrder(values: Record<string, unknown>) {
  const base = {
    order_number: `DFK-T-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    customer_name: "Test Buyer",
    phone: "08030000001",
    email: "buyer@example.com",
    state: "Lagos",
    city: "Ikeja",
    address: "1 Test Street",
    subtotal: 10_000_000,
    delivery_fee: 350_000,
    total: 10_350_000,
    payment_status: "paid",
    status: "payment_confirmed",
    ...values,
  };
  const cols = Object.keys(base);
  const rows = await q<{ id: number; order_number: string }>(
    `INSERT INTO orders (${cols.join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id, order_number`,
    Object.values(base),
  );
  return rows[0];
}

async function loadOrder(id: number) {
  const { orders } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const db = h.db as { select: () => { from: (t: unknown) => { where: (c: unknown) => Promise<unknown[]> } } };
  const [row] = (await db.select().from(orders).where(eq(orders.id, id))) as Array<typeof orders.$inferSelect>;
  return row;
}

beforeAll(async () => {
  const t = await createTestDb();
  h.db = t.db;
  h.client = t.client;
  const ins = async (sku: string, name: string, price: number, cpp: number | null, ready: boolean) =>
    (
      await q<{ id: number }>(
        `INSERT INTO products (sku,name,slug,category_slug,price,complete_package_price,stock_quantity,status,checkout_ready)
         VALUES ($1,$2,$3,'footwear',$4,$5,10,'published',$6) RETURNING id`,
        [sku, name, sku.toLowerCase(), price, cpp, ready],
      )
    )[0].id;
  pricedId = await ins("T-PRICED", "Test Slide", 2_625_000, 3_500_000, true);
  quoteOnlyId = await ins("T-QUOTE", "Unpriced Boot", 0, null, false);
  const boot = await q<{ id: number }>(`SELECT id FROM products WHERE sku = 'DFK-FTW-001'`);
  bootId = boot[0]?.id ?? (await ins("DFK-FTW-001", "Boot of Many Colours", 9_000_000, 12_000_000, true));
  await q(`UPDATE products SET status='published', price=9000000, checkout_ready=true WHERE id=$1`, [bootId]);
  creatorId = (
    await q<{ id: number }>(
      `INSERT INTO referrers (code,track,status,display_name,email,phone) VALUES ('DAMI13','creator','approved','Dami','dami@example.com','08035550000') RETURNING id`,
    )
  )[0].id;
  publicId = (
    await q<{ id: number }>(
      `INSERT INTO referrers (code,track,status,display_name) VALUES ('FRIEND1','public','approved','Friend') RETURNING id`,
    )
  )[0].id;
  // Owner-approved test terms: 13% creator rate, 2-day return window.
  await q(
    `INSERT INTO settings (key, value) VALUES ('partners', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify({ commissionBps: 1300, payoutThresholdKobo: 0, attributionWindowDays: 30, termsNote: "", returnWindowDays: 2, selfPurchaseBenefitBps: 0 })],
  );
  await q(
    `INSERT INTO settings (key, value) VALUES ('shipping', '{"defaultFee":3500,"freeThreshold":150000}'::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
  );
}, 60_000);

const buyer = { customerId: null, email: "buyer@example.com", phone: "08030000001" };

describe("server pricing", () => {
  it("re-prices from the database and asks for a state before delivery", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 2 }], buyer });
    expect(res.subtotal).toBe(5_250_000);
    expect(res.delivery.status).toBe("needs_state");
    expect(res.total).toBeNull();
  });

  it("charges the flat ₦3,500 fee below ₦150,000 and nothing above it", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const small = await priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 1 }], state: "Lagos", buyer });
    expect(small.delivery.feeKobo).toBe(350_000);
    expect(small.total).toBe(2_625_000 + 350_000);
    const big = await priceOrder({ items: [{ productId: bootId, purchaseOption: "product_only", quantity: 2 }], state: "Kano", buyer });
    expect(big.subtotal).toBe(18_000_000);
    expect(big.delivery.feeKobo).toBe(0);
  });

  it("includes delivery when every line is a Complete Package", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({ items: [{ productId: pricedId, purchaseOption: "complete_package", quantity: 1 }], state: "Oyo", buyer });
    expect(res.subtotal).toBe(3_500_000);
    expect(res.delivery).toMatchObject({ feeKobo: 0, reason: "complete_package" });
  });

  it("rejects quote-only products, invalid quantities and missing products", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    await expect(priceOrder({ items: [{ productId: quoteOnlyId, purchaseOption: "product_only", quantity: 1 }], buyer })).rejects.toThrow(/quote/i);
    await expect(priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 0 }], buyer })).rejects.toThrow(/Quantities/);
    await expect(priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 11 }], buyer })).rejects.toThrow(/Quantities/);
    await expect(priceOrder({ items: [{ productId: 999_999, purchaseOption: "product_only", quantity: 1 }], buyer })).rejects.toThrow(/no longer available/);
  });
});

describe("creator code attribution", () => {
  it("accepts codes case-insensitively and reports commission", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 1 }], state: "Lagos", partnerCode: " dami13 ", buyer });
    expect(res.partner).toMatchObject({ code: "DAMI13", source: "checkout_code", outcome: "commission", referrerId: creatorId });
    expect(res.partnerCodeError).toBeNull();
  });

  it("explains an unknown code instead of silently ignoring it", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 1 }], partnerCode: "NOPE99", buyer });
    expect(res.partner).toBeNull();
    expect(res.partnerCodeError).toMatch(/isn't active/);
  });

  it("an explicit checkout code beats an earlier referral link", async () => {
    await q(`INSERT INTO referral_attributions (referrer_id, session_id, status) VALUES ($1, 'sess-link-123456', 'clicked')`, [publicId]);
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const viaLink = await priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 1 }], referralSessionId: "sess-link-123456", buyer });
    expect(viaLink.partner).toMatchObject({ code: "FRIEND1", source: "referral_link", outcome: "not_eligible" });
    const both = await priceOrder({ items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 1 }], referralSessionId: "sess-link-123456", partnerCode: "DAMI13", buyer });
    expect(both.partner).toMatchObject({ code: "DAMI13", source: "checkout_code" });
  });

  it("marks a creator's own purchase as self-purchase (no commission, no benefit unless configured)", async () => {
    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({
      items: [{ productId: pricedId, purchaseOption: "product_only", quantity: 1 }],
      state: "Lagos",
      partnerCode: "DAMI13",
      buyer: { customerId: null, email: "DAMI@example.com", phone: null },
    });
    expect(res.partner?.outcome).toBe("self_purchase");
    expect(res.selfPurchaseBenefitKobo).toBe(0);
  });
});

describe("commission ledger", () => {
  it("unpaid order requests never create commission", async () => {
    const { recordVerifiedCommission } = await import("../src/server/partners.server");
    const o = await insertOrder({ payment_status: "requested", status: "order_requested", referrer_id: creatorId, referral_code: "DAMI13", attribution_source: "checkout_code", attribution_outcome: "commission" });
    const res = await recordVerifiedCommission(await loadOrder(o.id));
    expect(res).toMatchObject({ created: false, reason: "unpaid" });
    expect(await q(`SELECT * FROM commissions WHERE order_id = $1`, [o.id])).toHaveLength(0);
  });

  it("a verified paid order creates exactly one 13% pending commission on merchandise (excl. delivery), even on duplicate events", async () => {
    const { recordVerifiedCommission } = await import("../src/server/partners.server");
    const o = await insertOrder({ subtotal: 10_000_000, discount_kobo: 1_000_000, delivery_fee: 350_000, total: 9_350_000, referrer_id: creatorId, referral_code: "DAMI13", attribution_source: "checkout_code", attribution_outcome: "commission" });
    const order = await loadOrder(o.id);
    expect((await recordVerifiedCommission(order)).created).toBe(true);
    expect((await recordVerifiedCommission(order)).reason).toBe("duplicate");
    expect((await recordVerifiedCommission(order)).reason).toBe("duplicate");
    const rows = await q<{ amount_kobo: number; status: string; order_total_kobo: number; rate_bps: number }>(`SELECT * FROM commissions WHERE order_id = $1`, [o.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount_kobo: 1_170_000, status: "pending", order_total_kobo: 9_000_000, rate_bps: 1300 });
  });

  it("self-purchases never earn commission even when paid", async () => {
    const { recordVerifiedCommission } = await import("../src/server/partners.server");
    const o = await insertOrder({ email: "dami@example.com", referrer_id: creatorId, attribution_outcome: "self_purchase" });
    const res = await recordVerifiedCommission(await loadOrder(o.id));
    expect(res.reason).toBe("self_purchase");
  });

  it("pending becomes eligible only after delivery plus the return window, and cancellation/refund reverses", async () => {
    const { recordVerifiedCommission, promoteEligibleCommissions, reverseCommissionsForOrder } = await import("../src/server/partners.server");
    const fresh = await insertOrder({ referrer_id: creatorId, attribution_outcome: "commission", status: "delivered" });
    const aged = await insertOrder({ referrer_id: creatorId, attribution_outcome: "commission", status: "delivered" });
    await recordVerifiedCommission(await loadOrder(fresh.id));
    await recordVerifiedCommission(await loadOrder(aged.id));
    await q(`INSERT INTO order_events (order_id, status, created_at) VALUES ($1, 'delivered', now() - interval '1 day')`, [fresh.id]);
    await q(`INSERT INTO order_events (order_id, status, created_at) VALUES ($1, 'delivered', now() - interval '3 days')`, [aged.id]);
    await promoteEligibleCommissions(creatorId);
    const status = async (id: number) => (await q<{ status: string }>(`SELECT status FROM commissions WHERE order_id = $1`, [id]))[0].status;
    expect(await status(fresh.id)).toBe("pending");
    expect(await status(aged.id)).toBe("eligible");
    await reverseCommissionsForOrder(aged.id, "refund");
    await reverseCommissionsForOrder(fresh.id, "cancellation");
    expect(await status(aged.id)).toBe("reversed");
    expect(await status(fresh.id)).toBe("reversed");
  });

  it("a payout request reserves eligible commissions and never moves money", async () => {
    const { recordVerifiedCommission, promoteEligibleCommissions, requestPayout } = await import("../src/server/partners.server");
    const o = await insertOrder({ referrer_id: creatorId, attribution_outcome: "commission", status: "completed" });
    await recordVerifiedCommission(await loadOrder(o.id));
    await q(`INSERT INTO order_events (order_id, status, created_at) VALUES ($1, 'completed', now() - interval '5 days')`, [o.id]);
    await promoteEligibleCommissions(creatorId);
    await requestPayout(creatorId, "GTBank 0123456789");
    const [payout] = await q<{ id: number; status: string; amount_kobo: number; admin_reference: string | null }>(`SELECT * FROM payout_requests WHERE referrer_id = $1`, [creatorId]);
    expect(payout).toMatchObject({ status: "requested", admin_reference: null });
    const [c] = await q<{ payout_request_id: number; status: string }>(`SELECT * FROM commissions WHERE order_id = $1`, [o.id]);
    expect(c).toMatchObject({ payout_request_id: payout.id, status: "eligible" });
    await expect(requestPayout(creatorId, "GTBank 0123456789")).rejects.toThrow();
  });
});

describe("saved designs", () => {
  it("saves a validated design, reopens it identically and prices it as a quote line", async () => {
    const { saveDesign, loadDesign } = await import("../src/server/designs.server");
    const { defaultSelection, DESIGN_TEMPLATES } = await import("../src/lib/design-templates");
    await q(`UPDATE products SET sku = 'DFK-FTW-001' WHERE id = $1`, [bootId]);
    const selection = defaultSelection(DESIGN_TEMPLATES[0]);
    selection.parts.toe_cap = "Emerald";
    selection.materials.shaft = "Suede";
    selection.size = "43";
    const saved = await saveDesign({ productId: bootId, selection, referenceIds: [], notes: "Wedding in March" });
    expect(saved.designId).toMatch(/^DZD-[A-Z0-9]{8}$/);
    const reopened = await loadDesign(saved.designId, saved.editToken);
    expect(reopened?.selection).toEqual(selection);
    expect(reopened?.notes).toBe("Wedding in March");
    expect(await loadDesign(saved.designId, "WRONGTOKENWRONGTOKENWRON")).toBeNull();

    const { priceOrder } = await import("../src/server/order-pricing.server");
    const res = await priceOrder({ items: [{ productId: bootId, purchaseOption: "product_only", designId: saved.designId, quantity: 1 }], state: "Lagos", buyer });
    expect(res.hasQuoteLines).toBe(true);
    expect(res.lines[0]).toMatchObject({ unitPrice: 0, quoteRequired: true, designId: saved.designId, size: "43" });
    expect(res.lines[0].customization?.["Toe cap"]).toBe("Emerald — Smooth leather");
    expect(res.lines[0].customization?.["Shaft"]).toBe("Charcoal Black — Suede");
  });

  it("rejects options that are not in the template", async () => {
    const { saveDesign } = await import("../src/server/designs.server");
    const { defaultSelection, DESIGN_TEMPLATES } = await import("../src/lib/design-templates");
    const bad = defaultSelection(DESIGN_TEMPLATES[0]);
    bad.parts.toe_cap = "Neon Pink";
    await expect(saveDesign({ productId: bootId, selection: bad, referenceIds: [] })).rejects.toThrow(/Toe cap/);
    const unknownRef = defaultSelection(DESIGN_TEMPLATES[0]);
    await expect(saveDesign({ productId: bootId, selection: unknownRef, referenceIds: ["ref_AAAAAAAAAAAAAAAAAAAA"] })).rejects.toThrow(/reference/);
  });
});
