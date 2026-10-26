import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import {
  adminUsers,
  analyticsEvents,
  bespokeRequests,
  commissions,
  corporateEnquiries,
  corporateQuotes,
  designRequests,
  feedback,
  mediaAssets,
  orderEvents,
  orderItems,
  orders,
  partnerProfiles,
  payments,
  partnershipEnquiries,
  payoutRequests,
  productImages,
  productVariants,
  products,
  referrers,
  settings,
} from "../../db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { isDisplayableImageUrl } from "../lib/img";
import { getPartnerPlan } from "../lib/partner-plans";

// ── Auth gate ────────────────────────────────────────────────────────

/**
 * Admin authentication lives in ./admin-auth.server.ts — a server-only
 * module referenced exclusively from handler bodies, so no request-context
 * import ever reaches the browser bundle. The master access key keeps
 * owner-level access; team members sign in with their DREAMZ account
 * (Netlify Identity) and are authorised through the admin_users table.
 */
import { requireAdmin, requireAdminRole } from "./admin-auth.server";
import { consumeRateLimit, clientIp } from "./rate-limit.server";
import { timingSafeEqual } from "node:crypto";

export type AdminRole = "owner" | "sales" | "operations";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { secret: string }) => data)
  .handler(async ({ data }) => {
    // Unauthenticated endpoint that validates the master key — throttle it so
    // the secret cannot be brute-forced online.
    const limit = await consumeRateLimit("admin-login", clientIp(), 5, 15 * 60);
    if (!limit.ok) {
      return {
        ok: false,
        error: `Too many sign-in attempts. Please try again in about ${Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))} minutes.`,
      };
    }
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      return { ok: false, error: "Admin access is not configured on this deployment." };
    }
    const provided = Buffer.from(String(data.secret ?? ""), "utf8");
    const expected = Buffer.from(secret, "utf8");
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return { ok: true, role: "owner" as const };
    }
    // Identity-team members sign in with their account, not the master key.
    try {
      const customer = await (await import("./auth.server")).getCurrentCustomer();
      if (customer) {
        const [row] = await db
          .select()
          .from(adminUsers)
          .where(sql`lower(${adminUsers.email}) = ${customer.email.toLowerCase()} AND ${adminUsers.active} = true`)
          .limit(1);
        if (row && (row.role === "owner" || row.role === "sales" || row.role === "operations")) {
          return { ok: true as const, role: row.role as AdminRole };
        }
      }
    } catch {
      /* identity unavailable */
    }
    return { ok: false, error: "Incorrect access key." };
  });

// ── Overview ─────────────────────────────────────────────────────────

export const adminOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales", "operations"]);
  const [productCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);
  const [publishedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.status, "published"));
  const [orderCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);
  // Paid sales exclude cancelled orders; refunded amounts are reported via
  // the payments ledger so the owner can see gross vs settled cash.
  const [paidOrders] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      cash: sql<number>`coalesce(sum(${orders.paidKobo}), 0)::int`,
      outstanding: sql<number>`coalesce(sum(${orders.total} - ${orders.paidKobo}), 0)::int`,
    })
    .from(orders)
    .where(sql`${orders.paymentStatus} IN ('paid', 'deposit_paid') AND ${orders.status} != 'cancelled'`);
  const [settledCash] = await db
    .select({ cash: sql<number>`coalesce(sum(${payments.amountKobo}), 0)::int` })
    .from(payments)
    .where(eq(payments.status, "success"));
  const [unfulfilled] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`${orders.paymentStatus} IN ('paid', 'deposit_paid') AND ${orders.status} NOT IN ('delivered', 'completed', 'cancelled')`);
  const pendingReferralRewards = await db.execute(
    sql`SELECT COALESCE(SUM(amount_kobo), 0)::int AS amount FROM referral_rewards WHERE status IN ('pending','approved')`,
  );
  const [pendingPartnerCommissions] = await db
    .select({ amount: sql<number>`coalesce(sum(${commissions.amountKobo}), 0)::int` })
    .from(commissions)
    .where(sql`${commissions.status} IN ('pending', 'eligible')`);
  // Repeat purchase rate over signed-in customers with paid orders.
  const repeat = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE order_count = 1) AS single,
      COUNT(*) FILTER (WHERE order_count > 1) AS repeating
    FROM (
      SELECT customer_id, COUNT(*) AS order_count
      FROM orders
      WHERE payment_status IN ('paid', 'deposit_paid') AND customer_id IS NOT NULL AND status != 'cancelled'
      GROUP BY customer_id
    ) c
  `);
  const repeatRow = (repeat.rows[0] ?? {}) as { single?: number; repeating?: number };
  const singleBuyers = Number(repeatRow.single ?? 0);
  const repeatBuyers = Number(repeatRow.repeating ?? 0);
  const repeatRate = singleBuyers + repeatBuyers > 0 ? repeatBuyers / (singleBuyers + repeatBuyers) : null;
  // Checkout conversion: paid orders / orders that reached order creation
  // (the denominator excludes abandoned-for-other-reasons visits by design —
  // it measures created-checkout → paid).
  const [checkoutCreated] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);
  // Contribution after recorded product cost. Items without a recorded cost
  // make the figure incomplete — flagged, never silently presented as profit.
  const contributionRow = await db.execute(sql`
    SELECT
      COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS revenue,
      COALESCE(SUM(oi.unit_cost_kobo * oi.quantity), 0) AS cost,
      COUNT(*) FILTER (WHERE oi.unit_cost_kobo IS NULL) AS missing_cost_lines
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_status IN ('paid', 'deposit_paid') AND o.status != 'cancelled'
  `);
  const contrib = (contributionRow.rows[0] ?? {}) as {
    revenue?: number; cost?: number; missing_cost_lines?: number;
  };
  const contributionRevenue = Number(contrib.revenue ?? 0);
  const contributionCost = Number(contrib.cost ?? 0);
  const missingCostLines = Number(contrib.missing_cost_lines ?? 0);
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(8);
  const [bespokeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bespokeRequests)
    .where(eq(bespokeRequests.status, "new"));
  const [feedbackCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedback)
    .where(eq(feedback.status, "new"));
  const [enquiryCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(partnershipEnquiries)
    .where(eq(partnershipEnquiries.status, "new"));
  const [corporateCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(corporateEnquiries)
    .where(eq(corporateEnquiries.status, "new"));
  const [aiRequests] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventName, "ai_design_request"));

  return {
    products: productCount?.count ?? 0,
    published: publishedCount?.count ?? 0,
    orders: orderCount?.count ?? 0,
    paidOrders: paidOrders?.count ?? 0,
    revenue: paidOrders?.revenue ?? 0,
    cashReceived: settledCash?.cash ?? paidOrders?.cash ?? 0,
    outstandingBalances: paidOrders?.outstanding ?? 0,
    averageOrderValue: (paidOrders?.count ?? 0) > 0 ? Math.round((paidOrders?.revenue ?? 0) / (paidOrders?.count ?? 1)) : 0,
    checkoutConversion: (checkoutCreated?.count ?? 0) > 0 ? (paidOrders?.count ?? 0) / (checkoutCreated?.count ?? 1) : null,
    repeatPurchaseRate: repeatRate,
    unfulfilledOrders: unfulfilled?.count ?? 0,
    pendingCommissions:
      Number((pendingReferralRewards.rows[0] as { amount?: number } | undefined)?.amount ?? 0) +
      (pendingPartnerCommissions?.amount ?? 0),
    contribution: {
      revenue: contributionRevenue,
      recordedCost: contributionCost,
      incomplete: missingCostLines > 0,
      goodsContribution: contributionRevenue - contributionCost,
    },
    pendingOrders: (await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.paymentStatus, "pending")))[0]?.count ?? 0,
    bespokeRequests: bespokeCount?.count ?? 0,
    feedback: feedbackCount?.count ?? 0,
    partnershipEnquiries: enquiryCount?.count ?? 0,
    corporateEnquiries: corporateCount?.count ?? 0,
    aiDesignRequests: aiRequests?.count ?? 0,
    recentOrders: recentOrders.map((o) => ({
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      total: o.total,
      paidKobo: o.paidKobo,
      paymentStatus: o.paymentStatus,
      status: o.status,
      createdAt: o.createdAt?.toISOString() ?? null,
    })),
  };
});

// ── Production readiness (operational status, never secret values) ──

/**
 * Compact production-readiness snapshot for the admin overview. Every figure
 * is an operational fact a store manager acts on: configuration booleans
 * (never key values), catalogue-quality counts and media-queue counts.
 */
export const adminReadiness = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales", "operations"]);

  const rows = await db
    .select({
      id: products.id,
      tier: products.tier,
      price: products.price,
      colors: products.colors,
      status: products.status,
      checkoutReady: products.checkoutReady,
      collectionLocked: products.collectionLocked,
    })
    .from(products);
  const imgRows = await db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages);
  const displayableByProduct = new Map<number, number>();
  for (const im of imgRows) {
    if (isDisplayableImageUrl(im.url)) {
      displayableByProduct.set(im.productId, (displayableByProduct.get(im.productId) ?? 0) + 1);
    }
  }

  const { needsCategoryConfirmation } = await import("../lib/collection");
  let needsConfirmationCount = 0;
  let productsMissingImage = 0;
  let awaitingCheckoutApproval = 0;
  for (const p of rows) {
    if (p.status !== "archived") {
      const review = needsCategoryConfirmation({
        storedTier: p.tier,
        colorsCount: (p.colors ?? []).length || null,
        priceKobo: p.price,
      });
      if (!p.collectionLocked && review.needs) needsConfirmationCount += 1;
    }
    if (p.status === "published") {
      if ((displayableByProduct.get(p.id) ?? 0) === 0) productsMissingImage += 1;
      if (!p.checkoutReady) awaitingCheckoutApproval += 1;
    }
  }
  const [unassignedMedia] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mediaAssets)
    .where(sql`${mediaAssets.category} = 'PRODUCT' AND ${mediaAssets.productId} IS NULL`);

  return {
    // Configuration booleans only — a key's PRESENCE, never its value.
    paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
    aiTextConfigured: Boolean(
      process.env.NETLIFY_AI_GATEWAY_KEY && process.env.NETLIFY_AI_GATEWAY_BASE_URL,
    ),
    // Concept generation uses the same gateway; "unavailable" reads honestly
    // while it is absent.
    aiConceptConfigured: Boolean(
      process.env.NETLIFY_AI_GATEWAY_KEY && process.env.NETLIFY_AI_GATEWAY_BASE_URL,
    ),
    published: rows.filter((p) => p.status === "published").length,
    needsCategoryConfirmationCount: needsConfirmationCount,
    unassignedMedia: unassignedMedia?.count ?? 0,
    productsMissingImage,
    awaitingCheckoutApproval,
  };
});

// ── Products ─────────────────────────────────────────────────────────

const ProductInputSchema = z.object({
  id: z.number().int().optional(),
  sku: z.string().min(2).max(60),
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(160).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  categorySlug: z.string().min(2).max(60),
  subcategory: z.string().max(60).optional().or(z.literal("")),
  price: z.number().int().min(0), // kobo — Product Only price; 0 = quote-only
  completePackagePrice: z.number().int().min(0).nullable().optional(),
  packageContents: z.array(z.string().max(120)).max(20).default([]),
  compareAtPrice: z.number().int().min(0).nullable().optional(),
  shortDescription: z.string().max(300).optional().or(z.literal("")),
  fullDescription: z.string().max(5000).optional().or(z.literal("")),
  materials: z.string().max(400).optional().or(z.literal("")),
  colors: z.array(z.string().max(40)).max(12).default([]),
  sizes: z.array(z.string().max(10)).max(20).default([]),
  stockQuantity: z.number().int().min(0).default(0),
  availability: z
    .enum(["available", "made_to_order", "on_request", "out_of_stock", "sold_out"])
    .default("available"),
  imageFit: z.enum(["cover", "contain"]).default("contain"),
  featured: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  // Explicit admin controls — the homepage hero is chosen here, never by a
  // hard-coded SKU or an automatic rule.
  homepageHero: z.boolean().default(false),
  customizable: z.boolean().default(false),
  productLine: z.enum(["essentials", "originals", "royale"]).default("essentials"),
  collectionLocked: z.boolean().optional(),
  frontOriginalRank: z.number().int().min(1).max(100).nullable().optional(),
  // Customer-facing collection — independent of packaging. Legacy values are
  // accepted for compatibility and stored under the new names.
  tier: z
    .enum(["essentials", "originals", "royale", "signature", "bespoke"])
    .default("essentials")
    .transform((t) => (t === "signature" ? "originals" : t === "bespoke" ? "royale" : t)),
  // Private internal cost (kobo) — never displayed on the storefront.
  internalCostKobo: z.number().int().min(0).nullable().optional(),
  // Deposit plan flags — terms come from the house deposits setting.
  depositEligible: z.boolean().default(false),
  depositPercent: z.number().int().min(1).max(90).nullable().optional(),
  personalizationLabel: z.string().max(120).optional().or(z.literal("")),
  personalizationChargeKobo: z.number().int().min(0).nullable().optional(),
  sizeGuide: z.string().max(2000).optional().or(z.literal("")),
  returnsTerms: z.string().max(2000).optional().or(z.literal("")),
  // Admin gate: block checkout until the record is complete.
  checkoutReady: z.boolean().default(true),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  imageUrl: z.string().max(400).optional().or(z.literal("")),
  careInformation: z.string().max(1000).optional().or(z.literal("")),
  deliveryInformation: z.string().max(1000).optional().or(z.literal("")),
  // Full gallery write: order, alt text and role for every image. When
  // present this replaces the product's gallery rows (position order is the
  // display order; index 0 is the cover).
  images: z
    .array(
      z.object({
        url: z.string().min(1).max(400),
        altText: z.string().max(300).optional().or(z.literal("")),
        kind: z.enum(["product", "lifestyle", "catalogue"]).default("product"),
      }),
    )
    .max(24)
    .optional(),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .inputValidator(ProductInputSchema)
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "operations"]);
    const { imageUrl, packageContents, id, images, ...values } = data;
    const payload = {
      ...values,
      subcategory: values.subcategory || null,
      compareAtPrice: values.compareAtPrice ?? null,
      completePackagePrice: values.completePackagePrice ?? null,
      materials: values.materials || null,
      internalCostKobo: values.internalCostKobo ?? null,
      depositEligible: values.depositEligible,
      depositPercent: values.depositPercent ?? null,
      personalizationLabel: values.personalizationLabel || null,
      personalizationChargeKobo: values.personalizationChargeKobo ?? null,
      sizeGuide: values.sizeGuide || null,
      returnsTerms: values.returnsTerms || null,
      careInformation: values.careInformation || null,
      deliveryInformation: values.deliveryInformation || null,
      collection:
        values.tier === "originals"
          ? "DREAMZ Originals"
          : values.tier === "royale"
            ? "DREAMZ Royale"
            : "DREAMZ Essentials",
      productLine: values.tier,
      updatedAt: new Date(),
    };

    let productId = id;
    if (id) {
      await db.update(products).set(payload).where(eq(products.id, id));
      if (packageContents) {
        await db
          .update(products)
          .set({ packageContents })
          .where(eq(products.id, id));
      }
    } else {
      const [created] = await db
        .insert(products)
        .values({ ...payload, packageContents })
        .returning();
      productId = created.id;
    }

    // Full gallery write: replaces the product's image rows with the exact
    // order the admin arranged (index 0 = cover). Displayable URLs only.
    if (productId && images) {
      await db.delete(productImages).where(eq(productImages.productId, productId));
      const valid = images.filter((i) => isDisplayableImageUrl(i.url));
      if (valid.length > 0) {
        await db.insert(productImages).values(
          valid.map((im, i) => ({
            productId: productId!,
            url: im.url,
            altText: im.altText || data.name,
            position: i,
            kind: im.kind,
          })),
        );
      }
    }

    if (productId && imageUrl) {
      const existing = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, productId));
      if (existing.length === 0) {
        await db.insert(productImages).values({
          productId,
          url: imageUrl,
          altText: data.name,
          position: 0,
        });
      } else if (existing.length === 1 && imageUrl !== existing[0].url) {
        await db
          .update(productImages)
          .set({ url: imageUrl, altText: data.name })
          .where(eq(productImages.id, existing[0].id));
      }
    }

    // Variants always mirror the form: colours × sizes with the total stock
    // divided evenly. Per-variant stock is not editable anywhere in the
    // dashboard, so regenerating on every save keeps the storefront size /
    // colour selectors and stock gating in step with what the house entered
    // (previously variants were only created once and silently stopped
    // tracking the form, freezing products out of stock).
    if (productId) {
      await db.delete(productVariants).where(eq(productVariants.productId, productId));
      const rows: Array<{ productId: number; color: string | null; size: string | null; stockQuantity: number; sku: string }> = [];
      const colors = data.colors.length ? data.colors : [null as string | null];
      const sizes = data.sizes.length ? data.sizes : [null as string | null];
      const perStock = Math.max(0, Math.floor(data.stockQuantity / (colors.length * sizes.length)));
      for (const color of colors) {
        for (const size of sizes) {
          rows.push({
            productId,
            color: color ?? null,
            size: size ?? null,
            stockQuantity: perStock,
            sku: `${data.sku}-${String(color ?? "STD").slice(0, 3).toUpperCase()}${size ? `-${size}` : ""}`,
          });
        }
      }
      if (rows.length > 0) {
        await db.insert(productVariants).values(rows);
      }
    }

    return { ok: true, id: productId };
  });

export const adminSetProductStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      status: z.enum(["draft", "published", "archived"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "operations"]);
    await db
      .update(products)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(products.id, data.id));
    return { ok: true };
  });

/**
 * Set the customer-facing collection (Essentials / Originals / Royale) on a
 * product. This is the admin's manual decision — it always overrides the
 * automatic suggestion rules. Used by the "Needs Category Confirmation"
 * review queue and the product form.
 */
export const adminSetProductCollection = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      tier: z.enum(["essentials", "originals", "royale"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "operations"]);
    const collection =
      data.tier === "originals"
        ? "DREAMZ Originals"
        : data.tier === "royale"
          ? "DREAMZ Royale"
          : "DREAMZ Essentials";
    await db
      .update(products)
      .set({
        tier: data.tier,
        productLine: data.tier,
        collection,
        collectionLocked: true,
        updatedAt: new Date(),
      })
      .where(eq(products.id, data.id));
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    await db.delete(products).where(eq(products.id, data.id));
    return { ok: true };
  });

export const adminListProducts = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const rows = await db.select().from(products).orderBy(desc(products.id));
  const imgs = await db.select().from(productImages).orderBy(productImages.position);
  return rows.map((p) => ({
    ...p,
    createdAt: p.createdAt?.toISOString() ?? null,
    updatedAt: p.updatedAt?.toISOString() ?? null,
    image: imgs.find((i) => i.productId === p.id)?.url ?? null,
    // Full gallery for the admin image manager: order, alt text and role.
    gallery: imgs
      .filter((i) => i.productId === p.id)
      .map((i) => ({ id: i.id, url: i.url, altText: i.altText, position: i.position, kind: i.kind })),
  }));
});

/**
 * Replace a product's gallery in one call: the array order is the display
 * order (index 0 = cover), with per-image alt text and role. Used by the
 * admin image manager's reorder / remove / set-cover actions.
 */
export const adminSaveProductImages = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.number().int(),
      images: z
        .array(
          z.object({
            url: z.string().min(1).max(400),
            altText: z.string().max(300).optional().or(z.literal("")),
            kind: z.enum(["product", "lifestyle", "catalogue"]).default("product"),
          }),
        )
        .max(24),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "operations"]);
    const [product] = await db.select().from(products).where(eq(products.id, data.productId)).limit(1);
    if (!product) throw new Error("Product not found");
    await db.delete(productImages).where(eq(productImages.productId, data.productId));
    const valid = data.images.filter((i) => isDisplayableImageUrl(i.url));
    if (valid.length > 0) {
      await db.insert(productImages).values(
        valid.map((im, i) => ({
          productId: data.productId,
          url: im.url,
          altText: im.altText || product.name,
          position: i,
          kind: im.kind,
        })),
      );
    }
    return { ok: true };
  });

// ── Orders ───────────────────────────────────────────────────────────

export const adminListOrders = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
  const items = await db.select().from(orderItems);
  const paymentRows = await db.select().from(payments);
  return rows.map((o) => ({
    ...o,
    createdAt: o.createdAt?.toISOString() ?? null,
    updatedAt: o.updatedAt?.toISOString() ?? null,
    timeline: o.timeline ?? [],
    // Payment ledger view: one row per transaction attempt for this order.
    payments: paymentRows
      .filter((p) => p.orderId === o.id)
      .map((p) => ({
        reference: p.reference,
        amountKobo: p.amountKobo,
        currency: p.currency,
        kind: p.kind,
        status: p.status,
        channel: p.channel,
        gateway: p.gateway,
        processedAt: p.processedAt?.toISOString() ?? null,
        gatewayEventId: p.gatewayEventId,
        createdAt: p.createdAt?.toISOString() ?? null,
      })),
    items: items
      .filter((i) => i.orderId === o.id)
      .map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel,
        customization: i.customization ?? null,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
  }));
});

const ORDER_FLOW = [
  "order_received",
  "payment_confirmed",
  "size_details_confirmed",
  "processing",
  "production",
  "quality_control",
  "ready_for_dispatch",
  "dispatched",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "completed",
] as const;

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderNumber: z.string(),
      status: z.enum([...ORDER_FLOW, "cancelled"]),
      note: z.string().max(300).optional().or(z.literal("")),
      // Explicit owner override to advance an order whose balance is not yet
      // fully paid (e.g. a trusted corporate client). Recorded in the note.
      overrideOutstandingBalance: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales", "operations"]);
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, data.orderNumber))
      .limit(1);
    if (!order) throw new Error("Order not found");

    // Dispatch protection: an order ships only when fully paid, unless the
    // administrator explicitly overrides — and the override leaves a mark.
    const outstanding = order.total - (order.paidKobo ?? 0);
    const dispatchStatuses = ["dispatched", "in_transit", "out_for_delivery", "delivered", "completed"];
    if (dispatchStatuses.includes(data.status) && outstanding > 0) {
      if (!data.overrideOutstandingBalance) {
        throw new Error(
          `Balance of ₦${(outstanding / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })} is unpaid — collect the balance or record an explicit override before dispatch.`,
        );
      }
      data.note = `⚠ Dispatched with outstanding balance by admin override${data.note ? ` — ${data.note}` : ""}`;
    }

    const timeline = [...(order.timeline ?? [])];
    timeline.push({
      status: data.status,
      at: new Date().toISOString(),
      note: data.note || undefined,
    });
    await db
      .update(orders)
      .set({ status: data.status, timeline, adminNotes: data.note || order.adminNotes, updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await db.insert(orderEvents).values({
      orderId: order.id,
      status: data.status,
      note: data.note || null,
    });
    // Cancelling an order releases any held voucher back to the wallet and
    // reverses pending referral rewards AND partner commissions for that order.
    if (data.status === "cancelled") {
      const { releaseVoucherForOrder } = await import("./vouchers.server");
      const { voucherRedemptions: vr } = await import("../../db/schema");
      const [held] = await db
        .select({ voucherId: vr.voucherId })
        .from(vr)
        .where(sql`${vr.orderId} = ${order.id} AND ${vr.status} = 'held'`)
        .limit(1);
      if (held) await releaseVoucherForOrder(held.voucherId, order.id);
      const { referralRewards: rr } = await import("../../db/schema");
      await db
        .update(rr)
        .set({ status: "reversed", updatedAt: new Date() })
        .where(sql`${rr.orderId} = ${order.id} AND ${rr.status} IN ('pending','approved')`);
      const { reverseCommissionsForOrder } = await import("./partners.server");
      await reverseCommissionsForOrder(order.id, "cancellation");
    }
    return { ok: true };
  });

/**
 * Record a refund the owner has actually made (in Paystack or by transfer).
 * No money moves from here: this records the reference, marks the order
 * refunded and reverses partner commissions and referral rewards.
 */
export const adminRecordRefund = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderNumber: z.string().min(4).max(40), reference: z.string().min(3).max(120) }))
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, data.orderNumber)).limit(1);
    if (!order) throw new Error("Order not found");
    if (!["paid", "deposit_paid"].includes(order.paymentStatus)) {
      throw new Error("Only paid orders can be refunded.");
    }
    const note = `Refund recorded — reference ${data.reference}`;
    await db
      .update(orders)
      .set({
        paymentStatus: "refunded",
        timeline: [...(order.timeline ?? []), { status: "refunded", at: new Date().toISOString(), note }],
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await db.insert(orderEvents).values({ orderId: order.id, status: "refunded", note });
    const { referralRewards: rr } = await import("../../db/schema");
    await db
      .update(rr)
      .set({ status: "reversed", updatedAt: new Date() })
      .where(sql`${rr.orderId} = ${order.id} AND ${rr.status} IN ('pending','approved')`);
    const { reverseCommissionsForOrder } = await import("./partners.server");
    await reverseCommissionsForOrder(order.id, "refund");
    return { ok: true };
  });

// ── Bespoke & feedback ───────────────────────────────────────────────

export const adminListBespoke = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const rows = await db.select().from(bespokeRequests).orderBy(desc(bespokeRequests.createdAt)).limit(200);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null }));
});

export const adminListFeedback = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(200);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null }));
});

export const adminUpdateBespokeStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), status: z.string().max(30) }))
  .handler(async ({ data }) => {
    requireAdmin();
    await db.update(bespokeRequests).set({ status: data.status }).where(eq(bespokeRequests.id, data.id));
    return { ok: true };
  });

// ── Settings ─────────────────────────────────────────────────────────

const SettingsSchema = z.object({
  announcementBar: z.string().max(200).default(""),
  heroEyebrow: z.string().max(120).default(""),
  heroTitle: z.string().max(120).default(""),
  heroSubtitle: z.string().max(60).default(""),
  heroBody: z.string().max(600).default(""),
  whatsappNumber: z.string().max(24).default(""),
  whatsappDisplayName: z.string().max(60).default(""),
  instagram: z.string().max(400).default(""),
  tiktok: z.string().max(400).default(""),
  facebook: z.string().max(400).default(""),
  contactEmail: z.string().max(120).default(""),
  contactPhone: z.string().max(24).default(""),
  defaultFee: z.number().int().min(0),
  freeThreshold: z.number().int().min(0),
  deposits: z
    .object({
      enabled: z.boolean(),
      defaultPercent: z.number().int().min(1).max(90),
      balanceDueDays: z.number().int().min(0).max(120),
      termsText: z.string().max(600),
    })
    .default({ enabled: false, defaultPercent: 50, balanceDueDays: 14, termsText: "" }),
  partners: z
    .object({
      commissionBps: z.number().int().min(0).max(10_000),
      payoutThresholdKobo: z.number().int().min(0),
      attributionWindowDays: z.number().int().min(1).max(365),
      termsNote: z.string().max(600),
      // Owner-configured benefit when a creator buys with their own code
      // (0 = none). Self-purchases never earn commission.
      selfPurchaseBenefitBps: z.number().int().min(0).max(5_000).default(0),
      // Days after delivery before a commission becomes eligible.
      returnWindowDays: z.number().int().min(0).max(120).default(2),
      // One-time reward for introducing a partner who completes a first
      // verified customer sale. Zero disables it; never cascades to a downline.
      partnerIntroductionBonusKobo: z.number().int().min(0).default(0),
    })
    .default({ commissionBps: 0, payoutThresholdKobo: 0, attributionWindowDays: 30, termsNote: "", selfPurchaseBenefitBps: 0, returnWindowDays: 2, partnerIntroductionBonusKobo: 0 }),
  anniversary: z
    .object({
      enabled: z.boolean(),
      date: z.string().max(10),
      label: z.string().max(120),
    })
    .default({ enabled: true, date: "2027-06-12", label: "The Fifth Anniversary Collection" }),
  rewards: z
    .object({
      enabled: z.boolean(),
      pointsPerNaira: z.number().min(0),
      pointsValueKobo: z.number().int().min(0),
      eligibleCategorySlugs: z.array(z.string().max(40)).max(12),
      expiryDays: z.number().int().min(0),
      redemptionNote: z.string().max(300),
    })
    .default({
      enabled: false,
      pointsPerNaira: 0,
      pointsValueKobo: 0,
      eligibleCategorySlugs: [],
      expiryDays: 0,
      redemptionNote: "",
    }),
  ai: z
    .object({
      enabled: z.boolean(),
      dailyRequestCap: z.number().int().min(0),
      conceptDailyCap: z.number().int().min(0),
    })
    .default({ enabled: true, dailyRequestCap: 200, conceptDailyCap: 25 }),
});

export const adminGetSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales", "operations"]);
  const rows = await db.select().from(settings);
  const site = (rows.find((r) => r.key === "site")?.value ?? {}) as Record<string, unknown>;
  const shipping = (rows.find((r) => r.key === "shipping")?.value ?? {}) as Record<string, unknown>;
  const depositsRow = rows.find((r) => r.key === "deposits")?.value as Record<string, unknown> | undefined;
  const partnersRow = rows.find((r) => r.key === "partners")?.value as Record<string, unknown> | undefined;
  const anniversaryRow = rows.find((r) => r.key === "anniversary")?.value as Record<string, unknown> | undefined;
  const rewardsRow = rows.find((r) => r.key === "rewards")?.value;
  const aiRow = rows.find((r) => r.key === "ai")?.value;
  const rewards = {
    enabled: typeof (rewardsRow as { enabled?: boolean })?.enabled === "boolean"
      ? (rewardsRow as { enabled: boolean }).enabled
      : false,
    pointsPerNaira: (rewardsRow as { pointsPerNaira?: number })?.pointsPerNaira ?? 0,
    pointsValueKobo: (rewardsRow as { pointsValueKobo?: number })?.pointsValueKobo ?? 0,
    eligibleCategorySlugs: (rewardsRow as { eligibleCategorySlugs?: string[] })?.eligibleCategorySlugs ?? [],
    expiryDays: (rewardsRow as { expiryDays?: number })?.expiryDays ?? 0,
    redemptionNote: (rewardsRow as { redemptionNote?: string })?.redemptionNote ?? "",
  };
  const ai = {
    enabled: typeof (aiRow as { enabled?: boolean })?.enabled === "boolean"
      ? (aiRow as { enabled: boolean }).enabled
      : true,
    dailyRequestCap: (aiRow as { dailyRequestCap?: number })?.dailyRequestCap ?? 200,
    conceptDailyCap: (aiRow as { conceptDailyCap?: number })?.conceptDailyCap ?? 25,
  };
  return {
    announcementBar: site.announcementBar ?? "",
    heroEyebrow: site.heroEyebrow ?? "",
    heroTitle: site.heroTitle ?? "",
    heroSubtitle: site.heroSubtitle ?? "",
    heroBody: site.heroBody ?? "",
    whatsappNumber: site.whatsappNumber ?? "",
    whatsappDisplayName: site.whatsappDisplayName ?? "",
    instagram: site.instagram ?? "",
    tiktok: site.tiktok ?? "",
    facebook: site.facebook ?? "",
    contactEmail: site.contactEmail ?? "",
    contactPhone: site.contactPhone ?? "",
    defaultFee: shipping.defaultFee ?? 3500,
    freeThreshold: shipping.freeThreshold ?? 150000,
    deposits: {
      enabled: depositsRow?.enabled === true,
      defaultPercent: typeof depositsRow?.defaultPercent === "number" ? depositsRow.defaultPercent : 50,
      balanceDueDays: typeof depositsRow?.balanceDueDays === "number" ? depositsRow.balanceDueDays : 14,
      termsText: typeof depositsRow?.termsText === "string" ? depositsRow.termsText : "",
    },
    partners: {
      commissionBps: typeof partnersRow?.commissionBps === "number" ? partnersRow.commissionBps : 0,
      payoutThresholdKobo: typeof partnersRow?.payoutThresholdKobo === "number" ? partnersRow.payoutThresholdKobo : 0,
      attributionWindowDays: typeof partnersRow?.attributionWindowDays === "number" ? partnersRow.attributionWindowDays : 30,
      termsNote: typeof partnersRow?.termsNote === "string" ? partnersRow.termsNote : "",
      selfPurchaseBenefitBps: typeof partnersRow?.selfPurchaseBenefitBps === "number" ? partnersRow.selfPurchaseBenefitBps : 0,
      returnWindowDays: typeof partnersRow?.returnWindowDays === "number" ? partnersRow.returnWindowDays : 2,
      partnerIntroductionBonusKobo:
        typeof partnersRow?.partnerIntroductionBonusKobo === "number"
          ? partnersRow.partnerIntroductionBonusKobo
          : 0,
    },
    anniversary: {
      enabled: anniversaryRow?.enabled !== false,
      date: typeof anniversaryRow?.date === "string" ? anniversaryRow.date : "2027-06-12",
      label: typeof anniversaryRow?.label === "string" ? anniversaryRow.label : "The Fifth Anniversary Collection",
    },
    rewards,
    ai,
    paymentConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
  };
});

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator(SettingsSchema)
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    const { defaultFee, freeThreshold, rewards, ai, deposits, partners, anniversary, ...site } = data;
    // The hero image is gone: the rebuilt site presents the wordmark in type
    // and shows "Image coming soon" placeholders until approved uploads land.
    const { heroImage: _dropped, ...cleanSite } = site as Record<string, unknown>;
    void _dropped;
    await db
      .insert(settings)
      .values({ key: "site", value: cleanSite })
      .onConflictDoUpdate({ target: settings.key, set: { value: cleanSite, updatedAt: new Date() } });
    await db
      .insert(settings)
      .values({ key: "shipping", value: { defaultFee, freeThreshold } })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: { defaultFee, freeThreshold }, updatedAt: new Date() },
      });
    await db
      .insert(settings)
      .values([
        { key: "rewards", value: rewards },
        { key: "ai", value: ai },
        { key: "deposits", value: deposits },
        { key: "partners", value: partners },
        { key: "anniversary", value: anniversary },
      ])
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: sql`excluded.value`, updatedAt: new Date() },
      });
    return { ok: true };
  });

// ── Design requests (Design Lab leads) ───────────────────────────────

export const adminListDesignRequests = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const rows = await db
    .select()
    .from(designRequests)
    .orderBy(desc(designRequests.createdAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    sessionId: r.sessionId,
    customerName: r.customerName,
    email: r.email,
    phone: r.phone,
    specification: (r.specification ?? {}) as Record<string, string>,
    aiSummary: r.aiSummary,
    recommendedProductIds: r.recommendedProductIds ?? [],
    referenceImageUrl: r.referenceImageUrl,
    conceptImageUrl: r.conceptImageUrl,
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    status: r.status,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));
});

export const adminUpdateDesignRequestStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), status: z.string().max(30) }))
  .handler(async ({ data }) => {
    requireAdmin();
    await db
      .update(designRequests)
      .set({ status: data.status })
      .where(eq(designRequests.id, data.id));
    return { ok: true };
  });

// ── Vouchers ─────────────────────────────────────────────────────────

const _voucherRowSchemaUnused = undefined; void _voucherRowSchemaUnused;
export const adminListVouchers = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { vouchers } = await import("../../db/schema");
  const rows = await db.select().from(vouchers).orderBy(desc(vouchers.id)).limit(500);
  return rows.map((v) => ({
    id: v.id,
    code: v.code,
    campaign: v.campaign,
    type: v.type,
    value: v.value,
    minimumSpend: v.minimumSpend,
    maximumDiscount: v.maximumDiscount,
    status: v.status,
    singleUse: v.singleUse,
    expiresAt: v.expiresAt?.toISOString() ?? null,
    claimedAt: v.claimedAt?.toISOString() ?? null,
    redeemedAt: v.redeemedAt?.toISOString() ?? null,
    createdAt: v.createdAt?.toISOString() ?? null,
  }));
});

/**
 * Bulk import of printed voucher codes (CSV text: one code per line, or
 * full CSV rows). Existing codes are never duplicated.
 */
export const adminImportVouchers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      csv: z.string().min(3).max(200_000),
      defaults: z.object({
        campaign: z.string().max(80).optional().or(z.literal("")),
        type: z.enum(["fixed", "percentage", "product", "category", "campaign_reward"]).default("fixed"),
        value: z.number().int().min(0).default(0),
        minimumSpend: z.number().int().min(0).default(0),
        maximumDiscount: z.number().int().min(0).nullable().optional(),
        expiresAt: z.string().max(30).nullable().optional(),
        singleUse: z.boolean().default(true),
      }),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const { vouchers } = await import("../../db/schema");
    const lines = data.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: Array<typeof vouchers.$inferInsert> = [];
    const seen = new Set<string>();
    for (const line of lines) {
      // Accept "CODE" alone or "code,campaign,type,value,..."
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const code = (cols[0] ?? "").toUpperCase();
      if (!code || code.length < 3 || code.length > 40 || seen.has(code)) continue;
      if (!/^[A-Z0-9][A-Z0-9\-_]*$/.test(code)) continue;
      seen.add(code);
      const campaign = cols[1] || data.defaults.campaign || null;
      const type = (cols[2] as string) || data.defaults.type;
      const rawValue = cols[3] ? Number(cols[3]) : data.defaults.value;
      // For fixed vouchers a Naira figure in CSV is converted to kobo.
      const value =
        type === "percentage"
          ? Math.max(0, Math.round(rawValue || 0))
          : Math.max(0, Math.round((Number.isFinite(rawValue) ? rawValue : 0) * 100));
      rows.push({
        code,
        campaign,
        type: (["fixed", "percentage", "product", "category", "campaign_reward"].includes(type) ? type : "fixed") as string,
        value,
        minimumSpend: data.defaults.minimumSpend,
        maximumDiscount: data.defaults.maximumDiscount ?? null,
        eligibleProducts: [],
        eligibleCategories: [],
        expiresAt: data.defaults.expiresAt ? new Date(data.defaults.expiresAt) : null,
        singleUse: data.defaults.singleUse,
        status: "available",
      });
    }
    if (rows.length === 0) return { inserted: 0, skipped: lines.length };
    // Insert in chunks; conflicts (existing codes) are skipped.
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const res = await db
        .insert(vouchers)
        .values(chunk)
        .onConflictDoNothing()
        .returning();
      inserted += res.length;
    }
    return { inserted, skipped: lines.length - inserted };
  });

export const adminUpdateVoucherStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), status: z.enum(["available", "cancelled", "expired"]) }))
  .handler(async ({ data }) => {
    requireAdmin();
    const { vouchers } = await import("../../db/schema");
    await db
      .update(vouchers)
      .set({ status: data.status })
      .where(eq(vouchers.id, data.id));
    return { ok: true };
  });

// ── Referral programmes ──────────────────────────────────────────────

export const adminListReferrals = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { referralPrograms, referralRewards, referrers } = await import("../../db/schema");
  const programs = await db.select().from(referralPrograms).orderBy(referralPrograms.id);
  const applicants = await db
    .select()
    .from(referrers)
    .orderBy(desc(referrers.id))
    .limit(200);
  const rewards = await db
    .select()
    .from(referralRewards)
    .orderBy(desc(referralRewards.id))
    .limit(200);
  return {
    programs: programs.map((p) => ({
      id: p.id,
      track: p.track,
      name: p.name,
      description: p.description,
      rewardType: p.rewardType,
      commissionBps: p.commissionBps,
      pointsPerNaira1000: p.pointsPerNaira1000,
      minOrderKobo: p.minOrderKobo,
      payoutThresholdKobo: p.payoutThresholdKobo,
      requiresApproval: p.requiresApproval,
      eligibilityNote: p.eligibilityNote,
      active: p.active,
    })),
    referrers: applicants.map((r) => ({
      id: r.id,
      code: r.code,
      track: r.track,
      status: r.status,
      displayName: r.displayName,
      email: r.email,
      phone: r.phone,
      school: r.school,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
    rewards: rewards.map((r) => ({
      id: r.id,
      referrerId: r.referrerId,
      orderNumber: r.orderNumber,
      rewardType: r.rewardType,
      amountKobo: r.amountKobo,
      amountPoints: r.amountPoints,
      status: r.status,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  };
});

const ProgramSchema = z.object({
  id: z.number().int().optional(),
  track: z.enum(["student", "public"]),
  name: z.string().min(2).max(120),
  description: z.string().max(600).optional().or(z.literal("")),
  rewardType: z.enum(["points", "credit", "voucher", "cash"]).default("points"),
  commissionBps: z.number().int().min(0).max(10_000).default(0),
  pointsPerNaira1000: z.number().int().min(0).max(10_000).default(0),
  minOrderKobo: z.number().int().min(0).default(0),
  payoutThresholdKobo: z.number().int().min(0).default(0),
  requiresApproval: z.boolean().default(true),
  eligibilityNote: z.string().max(300).optional().or(z.literal("")),
  active: z.boolean().default(false),
});

export const adminSaveReferralProgram = createServerFn({ method: "POST" })
  .inputValidator(ProgramSchema)
  .handler(async ({ data }) => {
    requireAdmin();
    const { referralPrograms } = await import("../../db/schema");
    const values = {
      track: data.track,
      name: data.name,
      description: data.description ?? "",
      rewardType: data.rewardType,
      commissionBps: data.commissionBps,
      pointsPerNaira1000: data.pointsPerNaira1000,
      minOrderKobo: data.minOrderKobo,
      payoutThresholdKobo: data.payoutThresholdKobo,
      requiresApproval: data.requiresApproval,
      eligibilityNote: data.eligibilityNote ?? "",
      active: data.active,
      updatedAt: new Date(),
    };
    if (data.id) {
      await db.update(referralPrograms).set(values).where(eq(referralPrograms.id, data.id));
      return { ok: true, id: data.id };
    }
    const [created] = await db.insert(referralPrograms).values(values).returning();
    return { ok: true, id: created.id };
  });

export const adminUpdateReferrerStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), status: z.enum(["pending", "approved", "rejected", "suspended"]) }))
  .handler(async ({ data }) => {
    requireAdmin();
    const { referrers } = await import("../../db/schema");
    await db
      .update(referrers)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(referrers.id, data.id));
    return { ok: true };
  });

export const adminUpdateReferralReward = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), status: z.enum(["pending", "approved", "paid", "redeemed", "rejected", "reversed"]) }))
  .handler(async ({ data }) => {
    requireAdmin();
    const { referralRewards, customers } = await import("../../db/schema");
    const [reward] = await db
      .select()
      .from(referralRewards)
      .where(eq(referralRewards.id, data.id))
      .limit(1);
    if (!reward) return { ok: false };

    await db
      .update(referralRewards)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(referralRewards.id, data.id));

    // Mirror the state change into the referrer's reward ledger.
    const { referrers: referrersTable } = await import("../../db/schema");
    const [referrer] = await db
      .select()
      .from(referrersTable)
      .where(eq(referrersTable.id, reward.referrerId))
      .limit(1);
    if (referrer?.customerId) {
      const { appendLedger } = await import("./rewards-ledger.server");
      const amount = reward.rewardType === "points" ? reward.amountPoints : reward.amountKobo;
      const currency = reward.rewardType === "points" ? "points" : "credit";
      if (data.status === "approved") {
        await appendLedger({
          customerId: referrer.customerId,
          currency,
          type: "earned_referral",
          amount,
          status: "approved",
          source: "referral",
          orderNumber: reward.orderNumber,
          note: `Referral approved — ${reward.orderNumber ?? ""}`,
        });
      } else if (data.status === "paid" || data.status === "redeemed") {
        await appendLedger({
          customerId: referrer.customerId,
          currency,
          type: "earned_referral",
          amount,
          status: "redeemed",
          source: "referral",
          orderNumber: reward.orderNumber,
          note: `Referral ${data.status} — ${reward.orderNumber ?? ""}`,
        });
      } else if (data.status === "rejected" || data.status === "reversed") {
        await appendLedger({
          customerId: referrer.customerId,
          currency,
          type: "adjustment",
          amount: -amount,
          status: "reversed",
          source: "referral",
          orderNumber: reward.orderNumber,
          note: `Referral ${data.status} — ${reward.orderNumber ?? ""}`,
        });
      }
    }
    void customers;
    return { ok: true };
  });

// ── Campaigns & tasks ────────────────────────────────────────────────

const CampaignSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(600).optional().or(z.literal("")),
  audience: z.enum(["student", "public", "all"]).default("all"),
  tasks: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        label: z.string().min(1).max(120),
        type: z.string().max(40),
        target: z.number().int().min(1).max(1000).default(1),
      }),
    )
    .max(12),
  reward: z.object({
    type: z.enum(["points", "credit", "voucher"]),
    label: z.string().max(120),
    value: z.number().int().min(0).default(0),
  }),
  status: z.enum(["draft", "active", "ended"]).default("draft"),
});

export const adminListCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { campaigns: campaignsTable } = await import("../../db/schema");
  const rows = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.id)).limit(100);
  return rows.map((c) => {
    const config = (c.config ?? {}) as {
      tasks?: Array<{ key: string; label: string; type: string; target: number }>;
      reward?: { type: string; label: string; value: number };
    };
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      audience: c.audience,
      tasks: config.tasks ?? [],
      reward: config.reward ?? null,
      status: c.status,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
    };
  });
});

export const adminSaveCampaign = createServerFn({ method: "POST" })
  .inputValidator(CampaignSchema)
  .handler(async ({ data }) => {
    requireAdmin();
    const { campaigns: campaignsTable } = await import("../../db/schema");
    const config = { tasks: data.tasks, reward: data.reward };
    if (data.id) {
      await db
        .update(campaignsTable)
        .set({ name: data.name, description: data.description ?? "", audience: data.audience, config, status: data.status, updatedAt: new Date() })
        .where(eq(campaignsTable.id, data.id));
      return { ok: true, id: data.id };
    }
    const [created] = await db
      .insert(campaignsTable)
      .values({ name: data.name, description: data.description ?? "", audience: data.audience, config, status: data.status })
      .returning();
    return { ok: true, id: created.id };
  });

// ── Royale requests ──────────────────────────────────────────────────

export const adminListRoyale = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { royaleRequests } = await import("../../db/schema");
  const rows = await db.select().from(royaleRequests).orderBy(desc(royaleRequests.id)).limit(200);
  return rows.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    name: r.name,
    phone: r.phone,
    email: r.email,
    productType: r.productType,
    designDirection: r.designDirection,
    colors: r.colors,
    materials: r.materials,
    size: r.size,
    monogram: r.monogram,
    hardware: r.hardware,
    sole: r.sole,
    finishing: r.finishing,
    occasion: r.occasion,
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    deadline: r.deadline,
    referenceImageUrl: r.referenceImageUrl,
    inspirationNotes: r.inspirationNotes,
    status: r.status,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));
});

export const adminUpdateRoyaleStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), status: z.enum(["new", "contacted", "consultation", "quoted", "won", "archived"]) }))
  .handler(async ({ data }) => {
    requireAdmin();
    const { royaleRequests } = await import("../../db/schema");
    await db
      .update(royaleRequests)
      .set({ status: data.status })
      .where(eq(royaleRequests.id, data.id));
    return { ok: true };
  });

// ── TisasNG integration status ───────────────────────────────────────

export const adminTisasngStatus = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { verifyTisasngConnection } = await import("./rewards-ledger.server");
  const configured = Boolean(process.env.TISASNG_KEY);
  // The documented /balance endpoint is probed server-side. Balances are
  // never returned to the client — only a connected/not-connected boolean.
  const probe = configured ? await verifyTisasngConnection(null) : { connected: false };
  const { tisasngGiftingAvailable } = await import("./rewards.server");
  return {
    provider: "TisasNG",
    configured,
    connected: probe.connected,
    giftingAvailable: tisasngGiftingAvailable(),
    note: configured
      ? "Connection verified against the documented balance endpoint."
      : "TISASNG_KEY is not present in this environment.",
  };
});
// ── Corporate orders ─────────────────────────────────────────────────

export const adminListCorporateEnquiries = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales"]);
  const rows = await db.select().from(corporateEnquiries).orderBy(desc(corporateEnquiries.createdAt)).limit(200);
  const quotes = await db.select().from(corporateQuotes).orderBy(desc(corporateQuotes.id)).limit(200);
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt?.toISOString() ?? null,
    updatedAt: r.updatedAt?.toISOString() ?? null,
    quotes: quotes
      .filter((q) => q.enquiryId === r.id)
      .map((q) => ({ id: q.id, quoteNumber: q.quoteNumber, totalKobo: q.totalKobo, status: q.status })),
  }));
});

export const adminUpdateCorporateEnquiry = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      status: z.enum(["new", "qualified", "quoted", "accepted", "production", "delivered", "closed"]).optional(),
      nextAction: z.string().max(300).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    await db
      .update(corporateEnquiries)
      .set({
        ...(data.status ? { status: data.status } : {}),
        ...(data.nextAction !== undefined ? { nextAction: data.nextAction || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(corporateEnquiries.id, data.id));
    return { ok: true };
  });

const QuoteLineSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(100_000),
  unitPriceKobo: z.number().int().min(0),
});

export const adminSaveCorporateQuote = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int().optional(),
      enquiryId: z.number().int().nullable().optional(),
      companyName: z.string().min(2).max(160),
      contactPerson: z.string().min(2).max(120),
      email: z.string().email().max(140),
      phone: z.string().min(7).max(24),
      lines: z.array(QuoteLineSchema).min(1).max(50),
      brandingChargeKobo: z.number().int().min(0).default(0),
      deliveryChargeKobo: z.number().int().min(0).default(0),
      validUntil: z.string().max(10).optional().or(z.literal("")),
      milestones: z
        .array(
          z.object({
            label: z.string().min(1).max(120),
            percent: z.number().int().min(1).max(100),
            note: z.string().max(200).optional(),
          }),
        )
        .max(6)
        .default([]),
      terms: z.string().max(2000).optional().or(z.literal("")),
      deliveryExpectation: z.string().max(300).optional().or(z.literal("")),
      send: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    const subtotalKobo =
      data.lines.reduce((s, l) => s + l.quantity * l.unitPriceKobo, 0) +
      data.brandingChargeKobo +
      data.deliveryChargeKobo;
    const { generateCorporateNumber } = await import("@/lib/format");
    const accessToken = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
    const values = {
      enquiryId: data.enquiryId ?? null,
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      lines: data.lines,
      brandingChargeKobo: data.brandingChargeKobo,
      deliveryChargeKobo: data.deliveryChargeKobo,
      subtotalKobo,
      totalKobo: subtotalKobo,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      milestones: data.milestones,
      terms: data.terms || null,
      deliveryExpectation: data.deliveryExpectation || null,
      status: data.send ? "sent" : "draft",
      accessToken,
      updatedAt: new Date(),
    };
    if (data.id) {
      await db
        .update(corporateQuotes)
        .set({ ...values, accessToken: undefined })
        .where(eq(corporateQuotes.id, data.id));
      if (data.send) {
        await db
          .update(corporateEnquiries)
          .set({ status: "quoted", updatedAt: new Date() })
          .where(eq(corporateEnquiries.id, data.enquiryId ?? -1));
      }
      return { ok: true, id: data.id };
    }
    const [created] = await db
      .insert(corporateQuotes)
      .values({ ...values, quoteNumber: generateCorporateNumber("QUO") })
      .returning();
    if (data.enquiryId) {
      await db
        .update(corporateEnquiries)
        .set({ status: data.send ? "quoted" : "qualified", updatedAt: new Date() })
        .where(eq(corporateEnquiries.id, data.enquiryId));
    }
    return { ok: true, id: created.id, quoteNumber: created.quoteNumber, shareUrl: `/corporate/quote/${created.quoteNumber}?t=${accessToken}` };
  });

export const adminListCorporateQuotes = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales"]);
  const rows = await db.select().from(corporateQuotes).orderBy(desc(corporateQuotes.id)).limit(200);
  return rows.map((q) => ({
    ...q,
    validUntil: q.validUntil?.toISOString() ?? null,
    acceptedAt: q.acceptedAt?.toISOString() ?? null,
    createdAt: q.createdAt?.toISOString() ?? null,
    updatedAt: q.updatedAt?.toISOString() ?? null,
  }));
});

export const adminUpdateCorporateQuoteStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      status: z.enum(["draft", "sent", "production", "delivered", "expired"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    await db
      .update(corporateQuotes)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(corporateQuotes.id, data.id));
    return { ok: true };
  });

// ── Partners (creator + trade tracks) & commissions ──────────────────

export const adminListPartners = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales"]);
  const rows = await db.select().from(referrers).orderBy(desc(referrers.id)).limit(200);
  const profiles = await db.select().from(partnerProfiles);
  const partnerCommissions = await db.select().from(commissions).orderBy(desc(commissions.id)).limit(200);
  const payouts = await db.select().from(payoutRequests).orderBy(desc(payoutRequests.id)).limit(100);
  return {
    partners: rows.map((r) => ({
      id: r.id,
      code: r.code,
      track: r.track,
      status: r.status,
      displayName: r.displayName,
      email: r.email,
      phone: r.phone,
      school: r.school,
      socialProfile: r.socialProfile,
      agreedTerms: r.agreedTerms,
      sellingMode: r.sellingMode,
      partnerPlan: r.partnerPlan,
      physicalModel: r.physicalModel,
      membershipPaymentStatus: r.membershipPaymentStatus,
      membershipStartsAt: r.membershipStartsAt?.toISOString() ?? null,
      membershipExpiresAt: r.membershipExpiresAt?.toISOString() ?? null,
      introducerCode: r.introducerCode,
      createdAt: r.createdAt?.toISOString() ?? null,
      profile: profiles
        .filter((p) => p.referrerId === r.id)
        .map((p) => ({
          storeName: p.storeName,
          storeSlug: p.storeSlug,
          bio: p.bio,
          instagram: p.instagram,
          curatedProductIds: p.curatedProductIds,
          storefrontStatus: p.storefrontStatus,
        }))[0] ?? null,
    })),
    commissions: partnerCommissions.map((c) => ({
      id: c.id,
      referrerId: c.referrerId,
      orderId: c.orderId,
      orderNumber: c.orderNumber,
      orderTotalKobo: c.orderTotalKobo,
      rateBps: c.rateBps,
      amountKobo: c.amountKobo,
      status: c.status,
      createdAt: c.createdAt?.toISOString() ?? null,
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      referrerId: p.referrerId,
      amountKobo: p.amountKobo,
      status: p.status,
      destination: p.destination,
      adminReference: p.adminReference,
      requestedAt: p.requestedAt?.toISOString() ?? null,
      processedAt: p.processedAt?.toISOString() ?? null,
    })),
  };
});

export const adminUpdatePartner = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
      membershipPaymentStatus: z.enum(["not_required", "payment_requested", "paid", "waived"]).optional(),
      storefront: z
        .object({
          storeName: z.string().max(120).optional().or(z.literal("")),
          storeSlug: z.string().max(80).regex(/^[a-z0-9-]*$/).optional().or(z.literal("")),
          bio: z.string().max(1000).optional().or(z.literal("")),
          curatedProductIds: z.array(z.number().int()).max(100).optional(),
          storefrontStatus: z.enum(["off", "pending", "live"]).optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    const [currentPartner] = await db.select().from(referrers).where(eq(referrers.id, data.id)).limit(1);
    if (!currentPartner) throw new Error("Partner not found.");

    const nextPaymentStatus = data.membershipPaymentStatus ?? currentPartner.membershipPaymentStatus;
    const plan = getPartnerPlan(currentPartner.partnerPlan);

    if (data.status === "approved") {
      // A creator/trade partner can only be activated once the owner has set
      // a real commission rate — no partner is approved onto unknown terms.
      const { getPartnerSettingsFull } = await import("./order-pricing.server");
      const terms = await getPartnerSettingsFull();
      if (["creator", "trade"].includes(currentPartner.track) && terms.commissionBps <= 0) {
        throw new Error("Set the partner commission rate in Settings → Partner commissions before approving this seller.");
      }
      if (plan.feeKobo > 0 && !["paid", "waived"].includes(nextPaymentStatus)) {
        throw new Error("Confirm the annual plan payment before approving this paid partner.");
      }
    }

    const paymentJustActivated =
      plan.feeKobo > 0 &&
      ["paid", "waived"].includes(nextPaymentStatus) &&
      !["paid", "waived"].includes(currentPartner.membershipPaymentStatus);
    const now = new Date();
    const expires = paymentJustActivated
      ? new Date(now.getTime() + 365 * 86_400_000)
      : currentPartner.membershipExpiresAt;

    if (data.status || data.membershipPaymentStatus) {
      await db
        .update(referrers)
        .set({
          ...(data.status ? { status: data.status } : {}),
          ...(data.membershipPaymentStatus ? { membershipPaymentStatus: data.membershipPaymentStatus } : {}),
          ...(paymentJustActivated
            ? { membershipStartsAt: now, membershipExpiresAt: expires }
            : {}),
          updatedAt: now,
        })
        .where(eq(referrers.id, data.id));
    }
    if (data.storefront) {
      const [existing] = await db
        .select()
        .from(partnerProfiles)
        .where(eq(partnerProfiles.referrerId, data.id))
        .limit(1);
      const values = {
        storeName: data.storefront.storeName || null,
        storeSlug: data.storefront.storeSlug || null,
        bio: data.storefront.bio || null,
        curatedProductIds: data.storefront.curatedProductIds ?? [],
        storefrontStatus: data.storefront.storefrontStatus,
        updatedAt: new Date(),
      };
      if (existing) {
        await db.update(partnerProfiles).set(values).where(eq(partnerProfiles.id, existing.id));
      } else {
        await db.insert(partnerProfiles).values({ referrerId: data.id, partnerType: "creator", ...values });
      }
    }
    return { ok: true };
  });

export const adminUpdateCommission = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      // "paid" is set only through a payout with a recorded transfer reference.
      status: z.enum(["pending", "eligible", "reversed"]),
      note: z.string().max(300).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    await db
      .update(commissions)
      .set({
        status: data.status,
        ...(data.status === "eligible" ? { eligibleAt: new Date() } : {}),
        ...(data.note ? { note: data.note } : {}),
        updatedAt: new Date(),
      })
      .where(eq(commissions.id, data.id));
    return { ok: true };
  });

export const adminUpdatePayoutRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      status: z.enum(["requested", "approved", "paid", "rejected"]),
      adminReference: z.string().max(120).optional().or(z.literal("")),
      note: z.string().max(300).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    if (data.status === "paid" && !(data.adminReference ?? "").trim()) {
      throw new Error("Record the actual transfer reference before marking a payout paid.");
    }
    if (data.status === "paid") {
      const weekday = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "Africa/Lagos",
      }).format(new Date());
      if (weekday !== "Wednesday") {
        throw new Error("DREAMZ Payday is Wednesday. Approve the request now and mark it paid on Wednesday after the transfer.");
      }
    }
    await db
      .update(payoutRequests)
      .set({
        status: data.status,
        ...(data.adminReference ? { adminReference: data.adminReference } : {}),
        ...(data.note ? { note: data.note } : {}),
        ...(data.status === "paid" || data.status === "rejected" ? { processedAt: new Date() } : {}),
      })
      .where(eq(payoutRequests.id, data.id));
    // Mark the linked commissions paid when the payout settles.
    if (data.status === "paid") {
      await db
        .update(commissions)
        .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
        .where(sql`${commissions.payoutRequestId} = ${data.id} AND ${commissions.status} = 'eligible'`);
    }
    // A rejected request releases its commissions for a future request.
    if (data.status === "rejected") {
      await db
        .update(commissions)
        .set({ payoutRequestId: null, updatedAt: new Date() })
        .where(sql`${commissions.payoutRequestId} = ${data.id} AND ${commissions.status} = 'eligible'`);
    }
    return { ok: true };
  });

// ── Admin users (roles) ──────────────────────────────────────────────

export const adminListUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner"]);
  const rows = await db.select().from(adminUsers).orderBy(adminUsers.id);
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.displayName,
    role: r.role,
    active: r.active,
  }));
});

export const adminSaveUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int().optional(),
      email: z.string().email().max(140),
      displayName: z.string().max(120).optional().or(z.literal("")),
      role: z.enum(["owner", "sales", "operations"]),
      active: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    if (data.id) {
      await db
        .update(adminUsers)
        .set({
          email: data.email.toLowerCase(),
          displayName: data.displayName || "",
          role: data.role,
          active: data.active,
        })
        .where(eq(adminUsers.id, data.id));
      return { ok: true };
    }
    await db
      .insert(adminUsers)
      .values({
        email: data.email.toLowerCase(),
        displayName: data.displayName || "",
        role: data.role,
        active: data.active,
      })
      .onConflictDoNothing({ target: adminUsers.email });
    return { ok: true };
  });

export const adminRemoveUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    await db.delete(adminUsers).where(eq(adminUsers.id, data.id));
    return { ok: true };
  });

// ── CSV exports ──────────────────────────────────────────────────────

export const adminExportOrdersCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales"]);
  const rows = await db.select().from(orders).orderBy(desc(orders.id)).limit(2000);
  const items = await db.select().from(orderItems);
  const header = "order_number,date,customer,phone,email,state,city,status,payment_status,plan,subtotal_naira,delivery_naira,discount_naira,paid_naira,outstanding_naira,total_naira,items";
  const lines = rows.map((o) => {
    const its = items
      .filter((i) => i.orderId === o.id)
      .map((i) => `${i.quantity}x ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""}`)
      .join(" | ");
    const cell = (v: string | number | null | undefined) =>
      `"${String(v ?? "").replaceAll('"', '""')}"`;
    return [
      o.orderNumber,
      o.createdAt?.toISOString() ?? "",
      o.customerName,
      o.phone,
      o.email ?? "",
      o.state,
      o.city,
      o.status,
      o.paymentStatus,
      o.paymentPlan,
      (o.subtotal / 100).toFixed(2),
      (o.deliveryFee / 100).toFixed(2),
      (o.discountKobo / 100).toFixed(2),
      ((o.paidKobo ?? 0) / 100).toFixed(2),
      (Math.max(0, o.total - (o.paidKobo ?? 0)) / 100).toFixed(2),
      (o.total / 100).toFixed(2),
      cell(its),
    ].join(",");
  });
  return { csv: [header, ...lines].join("\n") };
});

export const adminExportWaitlistCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales"]);
  const { waitlist } = await import("../../db/schema");
  const rows = await db.select().from(waitlist).orderBy(desc(waitlist.id)).limit(5000);
  const header = "email,name,phone,interest,source,marketing_consent,created_at";
  const lines = rows.map((w) =>
    [
      w.email,
      w.name ?? "",
      w.phone ?? "",
      w.interest.replace(/"/g, '""'),
      w.source,
      w.marketingConsent ? "yes" : "no",
      w.createdAt?.toISOString() ?? "",
    ].join(","),
  );
  return { csv: [header, ...lines].join("\n") };
});
