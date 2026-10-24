import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { orderEvents, orderItems, orders, payments, productVariants, voucherRedemptions } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import { getPaymentProvider } from "./payments.server";
import { getSetting } from "./catalog.server";
import { getCurrentCustomer } from "./auth.server";
import { computeVoucherDiscount, holdVoucherForOrder, categorySlugsForProductIds } from "./vouchers.server";
import { confirmOrderPaid } from "./commerce.internal";
import {
  generateOrderNumber,
  isValidNigerianPhone,
  ORDER_STATUS_LABELS,
} from "@/lib/format";

const CheckoutItemSchema = z.object({
  productId: z.number().int().positive(),
  variantLabel: z.string().max(120).nullable().optional(),
  purchaseOption: z.enum(["product_only", "complete_package"]).default("product_only"),
  customization: z.record(z.string(), z.string()).nullable().optional(),
  quantity: z.number().int().min(1).max(10),
});

const CheckoutSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z
    .string()
    .refine(isValidNigerianPhone, "Please enter a valid Nigerian phone number"),
  email: z
    .string()
    .email()
    .max(140)
    .optional()
    .or(z.literal("")),
  state: z.string().min(2).max(60),
  city: z.string().min(2).max(80),
  address: z.string().min(6).max(400),
  deliveryNote: z.string().max(500).optional().or(z.literal("")),
  giftNote: z.string().max(300).optional().or(z.literal("")),
  items: z.array(CheckoutItemSchema).min(1).max(20),
  voucherCode: z.string().max(40).optional().or(z.literal("")),
  // "deposit" is honoured only when the server confirms every line is
  // deposit-eligible and the house has deposit terms configured.
  paymentPlan: z.enum(["full", "deposit"]).default("full"),
  // Explicit marketing consent, stored with the order (never inferred).
  marketingConsent: z.boolean().default(false),
  // First-party referral attribution session issued at /r/CODE click time.
  // Never a referrer id from the browser — the server re-resolves it.
  referralSessionId: z.string().min(6).max(80).optional().or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;

/** Split "Colour · Size" variant labels used across the storefront. */
function splitVariantLabel(label: string | null | undefined): {
  color: string | null;
  size: string | null;
  singlePart: boolean;
} {
  const parts = (label ?? "").split(" · ").filter(Boolean);
  // A single-part label is ambiguous (size-only product vs colour-only
  // product); the caller matches it against whichever dimension carries it.
  if (parts.length === 1) return { color: parts[0] ?? null, size: parts[0] ?? null, singlePart: true };
  return { color: parts[0] ?? null, size: parts[1] ?? null, singlePart: false };
}

/**
 * Create an order from the cart and initialize Paystack payment.
 * Prices are ALWAYS recalculated server-side from the database —
 * client-supplied prices are never trusted.
 */
export const initializeCheckout = createServerFn({ method: "POST" })
  .inputValidator(CheckoutSchema)
  .  handler(async ({ data }) => {
    // Re-price every line from the database first — the voucher discount and
    // "fully covered" decision come from the priced lines, not the client.
    const priced: Array<{
      productId: number;
      sku: string | null;
      productName: string;
      variantLabel: string | null;
      size: string | null;
      purchaseOption: "product_only" | "complete_package";
      customization: Record<string, string> | null;
      imageUrl: string | null;
      unitPrice: number;
      unitCostKobo: number | null;
      quantity: number;
    }> = [];
    let subtotal = 0;

    for (const item of data.items) {
      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, item.productId));
      const productRow = await db.execute(
        sql`SELECT products.id, products.sku, products.name, products.slug, products.price, products.complete_package_price, products.checkout_ready, products.internal_cost_kobo, (SELECT url FROM product_images pi WHERE pi.product_id = products.id ORDER BY position LIMIT 1) AS image FROM products WHERE products.id = ${item.productId} AND products.status = 'published' LIMIT 1`,
      );
      const firstRow = productRow.rows.length > 0 ? productRow.rows[0] : null;
      const p = firstRow as
        | {
            id: number;
            sku: string;
            name: string;
            slug: string;
            price: number;
            complete_package_price: number | null;
            checkout_ready: boolean;
            internal_cost_kobo: number | null;
            image: string | null;
          }
        | null;
      if (!p) throw new Error("A piece in your cart is no longer available");
      // Quote-only guard: an unpriced product, or one the admin has not yet
      // approved for checkout, can never be bought online.
      if (p.price <= 0 || !p.checkout_ready) {
        throw new Error(
          `${p.name} is priced after review — please request a quote instead of checking out.`,
        );
      }

      let unitPrice = p.price;
      if (item.purchaseOption === "complete_package") {
        if (!p.complete_package_price) {
          throw new Error(`${p.name} is not available as a Complete Package`);
        }
        unitPrice = p.complete_package_price;
      }
      const { color, size, singlePart } = splitVariantLabel(item.variantLabel);
      if (item.variantLabel) {
        // Two-part labels ("Brown · 42") must match both dimensions exactly.
        // Single-part labels ("44" or "Multicolour") match whichever
        // dimension the variant actually carries.
        const variant = variants.find((v) =>
          singlePart
            ? v.color === color || v.size === size
            : (!color || v.color === color) && (!size || v.size === size),
        );
        if (!variant) throw new Error(`Selected option for ${p.name} is unavailable`);
        if (variant.stockQuantity < item.quantity) {
          throw new Error(`Only ${variant.stockQuantity} left of ${p.name} (${item.variantLabel})`);
        }
        if (
          item.purchaseOption === "product_only" &&
          variant.price
        ) {
          unitPrice = variant.price;
        }
      }

      subtotal += unitPrice * item.quantity;
      priced.push({
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        variantLabel: item.variantLabel ?? null,
        size,
        purchaseOption: item.purchaseOption,
        customization: item.customization ?? null,
        imageUrl: p.image,
        unitPrice,
        unitCostKobo: p.internal_cost_kobo,
        quantity: item.quantity,
      });
    }

    const shipping = await getSetting("shipping", {
      defaultFee: 3500,
      freeThreshold: 150000,
    });
    const deliveryFee =
      subtotal >= (shipping.freeThreshold ?? 150000) ? 0 : (shipping.defaultFee ?? 3500);

    // ── Voucher (server-side validation & discount) ─────────────────
    // The discount is computed from the database, never from the client.
    // The code is held (not redeemed) until payment is verified.
    let voucherId: number | null = null;
    let discountKobo = 0;
    let voucherCodeForOrder: string | null = null;
    if (data.voucherCode && data.voucherCode.trim().length >= 4) {
      const { lookupVoucher } = await import("./vouchers.server");
      const check = await lookupVoucher(data.voucherCode);
      if (!check.ok || !check.voucher) {
        throw new Error(check.reason ?? "We couldn't validate this voucher.");
      }
      const categoryMap = await categorySlugsForProductIds(priced.map((p) => p.productId));
      const lines = priced.map((p) => ({
        productId: p.productId,
        categorySlug: categoryMap.get(p.productId) ?? null,
        unitPrice: p.unitPrice,
        quantity: p.quantity,
      }));
      const calc = await computeVoucherDiscount(check.voucher.id, lines);
      if (calc.discountKobo <= 0) {
        throw new Error(calc.reason ?? "This voucher does not apply to your order.");
      }
      voucherId = check.voucher.id;
      discountKobo = calc.discountKobo;
      voucherCodeForOrder = check.voucher.code;
    }

    const totalBeforeDiscount = subtotal + deliveryFee;
    // The discount applies to the merchandise + delivery; never below zero.
    const total = Math.max(0, totalBeforeDiscount - discountKobo);
    const fullyCovered = total === 0;

    // ── Deposit plan (server-decided) ─────────────────────────────────
    // The browser's request is only a preference. A deposit plan is granted
    // when the house has deposit terms configured AND every line's product
    // is deposit-eligible. Amounts are computed here, never from the client.
    let paymentPlan: "full" | "deposit" = "full";
    let depositKobo = 0;
    let balanceDueAt: Date | null = null;
    if (data.paymentPlan === "deposit" && !fullyCovered) {
      const depositTerms = await getSetting("deposits", {
        enabled: false,
        defaultPercent: 50,
        balanceDueDays: 14,
        termsText: "",
      });
      const lineProductIds = priced.map((p) => p.productId);
      const eligibleRows = lineProductIds.length
        ? await db.execute(
            sql`SELECT id FROM products WHERE id IN (${sql.join(
              lineProductIds,
              sql`, `,
            )}) AND deposit_eligible = true`,
          )
        : { rows: [] as number[] };
      const eligibleCount = (eligibleRows.rows as unknown[]).length;
      if (depositTerms.enabled && eligibleCount === lineProductIds.length) {
        const percent = Math.min(90, Math.max(1, depositTerms.defaultPercent ?? 50));
        const discountedMerch = Math.max(0, subtotal - discountKobo);
        depositKobo = Math.round((discountedMerch * percent) / 100) + deliveryFee;
        // Never exceed the total, never below ₦100.
        depositKobo = Math.min(total, Math.max(100, depositKobo));
        paymentPlan = "deposit";
        if ((depositTerms.balanceDueDays ?? 0) > 0) {
          balanceDueAt = new Date(Date.now() + depositTerms.balanceDueDays * 86_400_000);
        }
      }
    }
    const balanceKobo = paymentPlan === "deposit" ? total - depositKobo : 0;

    const orderNumber = generateOrderNumber();
    const reference = `PSK-${orderNumber}`;

    // Attribute the order to the signed-in customer when one exists.
    const customer = await getCurrentCustomer();

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerName: data.name,
        phone: data.phone,
        email: data.email || null,
        state: data.state,
        city: data.city,
        address: data.address,
        deliveryNote: data.deliveryNote || null,
        giftNote: data.giftNote || null,
        subtotal,
        deliveryFee,
        discountKobo,
        voucherCode: voucherCodeForOrder,
        paymentPlan,
        depositKobo,
        balanceKobo,
        balanceDueAt,
        marketingConsent: data.marketingConsent,
        customerId: customer?.id ?? null,
        total,
        paymentStatus: "pending_payment",
        paymentReference: reference,
        status: "order_received",
        timeline: [{ status: "order_received", at: new Date().toISOString() }],
      })
      .returning();

    await db.insert(orderItems).values(
      priced.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        variantLabel: item.variantLabel,
        size: item.size,
        purchaseOption: item.purchaseOption,
        customization: {
          ...(item.customization ?? {}),
          ...(item.purchaseOption === "complete_package"
            ? { purchaseOption: "Complete Package" }
            : { purchaseOption: "Product Only" }),
        },
        imageUrl: item.imageUrl,
        unitPrice: item.unitPrice,
        unitCostKobo: item.unitCostKobo,
        quantity: item.quantity,
      })),
    );
    await db.insert(orderEvents).values({
      orderId: order.id,
      status: "order_received",
      note: "Order created, awaiting payment",
    });

    // Referral funnel: a referred visitor's click-session (or account) is
    // marked order_started server-side. No reward is created here.
    if (data.referralSessionId || customer) {
      const { markAttributionOrderStarted } = await import("./referrals.server");
      await markAttributionOrderStarted(
        data.referralSessionId || null,
        customer?.id ?? null,
        orderNumber,
      ).catch(() => {
        /* attribution must never block checkout */
      });
    }
    await db.insert(payments).values({
      orderId: order.id,
      reference,
      amountKobo: paymentPlan === "deposit" ? depositKobo : total,
      currency: "NGN",
      kind: paymentPlan === "deposit" ? "deposit" : "full",
      status: "initialized",
    });

    // Hold the voucher against this order before payment begins. If payment
    // fails, the hold is released and the voucher returns to the wallet.
    if (voucherId != null) {
      const hold = await holdVoucherForOrder(
        voucherId,
        order.id,
        customer?.id ?? null,
        discountKobo,
      );
      if (!hold.ok) {
        throw new Error(hold.reason ?? "The voucher could not be applied to this order.");
      }
    }

    // ── 100%-covered order ────────────────────────────────────────────
    // A voucher that covers the entire total completes server-side with no
    // Paystack charge (charging ₦0 is not possible).
    if (fullyCovered) {
      await confirmOrderPaid(order.id, reference, "voucher", "verify");
      return {
        orderNumber,
        fullyCovered: true,
        orderUrl: `/order/${orderNumber}`,
        reference,
      };
    }

    // A fully-covered order needs no gateway; otherwise Paystack is required.
    const provider = getPaymentProvider("paystack");
    if (!provider && !fullyCovered) {
      throw new Error(
        "Online payment is not yet active. Please contact us on WhatsApp to complete your order.",
      );
    }

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const init = await provider!.initialize({
      email: data.email || `${orderNumber}@dreamzfk.order`,
      amountKobo: paymentPlan === "deposit" ? depositKobo : total,
      reference,
      callbackUrl: `${siteUrl}/checkout/callback?orderNumber=${encodeURIComponent(orderNumber)}`,
      metadata: {
        order_number: orderNumber,
        phone: data.phone,
        payment_plan: paymentPlan,
        ...(paymentPlan === "deposit"
          ? { deposit_kobo: depositKobo, balance_kobo: balanceKobo }
          : {}),
      },
    });

    return {
      orderNumber,
      authorizationUrl: init.authorizationUrl,
      reference,
      paymentPlan,
      depositKobo,
      balanceKobo,
    };
  });

/**
 * Verify a payment reference and, on success, credit the order.
 * Called from the callback page — safe to re-run (idempotent).
 * The verified amount must match the ledger row's expected charge exactly;
 * the currency must be NGN. A deposit moves the order to deposit_paid; only
 * the final balance clears it to paid.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { orderNumber: string }) => data)
  .handler(async ({ data }) => {
    const provider = getPaymentProvider("paystack");
    if (!provider) throw new Error("Payment service is not active");

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, data.orderNumber))
      .limit(1);
    if (!order) throw new Error("We could not find that order");

    if (order.paymentStatus === "paid") {
      return { verified: true, orderNumber: order.orderNumber, fullyPaid: true };
    }

    if (!order.paymentReference) throw new Error("Order has no payment reference");

    const [ledgerRow] = await db
      .select({ amountKobo: payments.amountKobo, kind: payments.kind, status: payments.status })
      .from(payments)
      .where(eq(payments.reference, order.paymentReference))
      .limit(1);
    if (!ledgerRow) throw new Error("Order has no payment record");

    const result = await provider.verify(order.paymentReference);
    if (
      result.success &&
      result.currency === "NGN" &&
      result.amountKobo === ledgerRow.amountKobo
    ) {
      await confirmOrderPaid(order.id, order.paymentReference, result.channel ?? "paystack", "verify");
      const [after] = await db
        .select({ paymentStatus: orders.paymentStatus, balanceKobo: orders.balanceKobo })
        .from(orders)
        .where(eq(orders.id, order.id))
        .limit(1);
      return {
        verified: true,
        orderNumber: order.orderNumber,
        fullyPaid: after?.paymentStatus === "paid",
        balanceKobo: after?.balanceKobo ?? 0,
      };
    }

    if (!result.success && (result.rawStatus === "failed" || result.rawStatus === "abandoned")) {
      await db
        .update(orders)
        .set({ paymentStatus: result.rawStatus === "failed" ? "failed" : "pending_payment", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      // A failed payment releases the voucher hold back into the wallet.
      if (result.rawStatus === "failed") {
        const { releaseVoucherForOrder } = await import("./vouchers.server");
        const [held] = await db
          .select({ voucherId: voucherRedemptions.voucherId })
          .from(voucherRedemptions)
          .where(
            sql`${voucherRedemptions.orderId} = ${order.id} AND ${voucherRedemptions.status} = 'held'`,
          )
          .limit(1);
        if (held) await releaseVoucherForOrder(held.voucherId, order.id);
      }
    }

    return { verified: false, orderNumber: order.orderNumber };
  });

/**
 * Pay the outstanding balance on a deposit-plan order. A fresh ledger row is
 * created with its own reference — the webhook and verification resolve it
 * back to the order. The amount charged is ALWAYS the server's view of the
 * outstanding balance, never a figure supplied by the browser.
 */
export const initializeBalancePayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderNumber: z.string().min(4).max(40) }))
  .handler(async ({ data }) => {
    const provider = getPaymentProvider("paystack");
    if (!provider) {
      throw new Error(
        "Online payment is not yet active. Please contact us on WhatsApp to complete your balance payment.",
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, data.orderNumber.trim().toUpperCase()))
      .limit(1);
    if (!order) throw new Error("We could not find that order");

    if (order.paymentStatus === "paid") {
      return { fullyPaid: true as const, orderNumber: order.orderNumber };
    }
    if (order.paymentPlan !== "deposit") {
      throw new Error("This order is not on a deposit plan");
    }
    if (order.paymentStatus !== "deposit_paid") {
      throw new Error("The deposit for this order has not been confirmed yet");
    }

    const outstanding = Math.max(0, order.total - (order.paidKobo ?? 0));
    if (outstanding <= 0) {
      throw new Error("Nothing outstanding on this order");
    }

    const reference = `PSKB-${order.orderNumber}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    await db.insert(payments).values({
      orderId: order.id,
      reference,
      amountKobo: outstanding,
      currency: "NGN",
      kind: "balance",
      status: "initialized",
    });

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const init = await provider.initialize({
      email: order.email || `${order.orderNumber}@dreamzfk.order`,
      amountKobo: outstanding,
      reference,
      callbackUrl: `${siteUrl}/checkout/callback?orderNumber=${encodeURIComponent(order.orderNumber)}`,
      metadata: { order_number: order.orderNumber, payment_plan: "balance" },
    });

    return { fullyPaid: false as const, authorizationUrl: init.authorizationUrl, reference };
  });

/**
 * Track an order by order number + phone or email (privacy-preserving).
 * Only returns a safe projection — never the raw database record.
 */
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderNumber: z.string().min(4).max(40),
      contact: z.string().min(5).max(120),
    }),
  )
  .handler(async ({ data }) => {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, data.orderNumber.trim().toUpperCase()))
      .limit(1);
    if (!order) return { found: false as const };

    const contactNormalized = data.contact.trim().toLowerCase();
    const contactDigits = contactNormalized.replace(/\D/g, "");
    const phoneMatches =
      contactDigits.length >= 7 &&
      order.phone.replace(/\D/g, "").endsWith(contactDigits);
    const emailMatches =
      !!order.email && order.email.toLowerCase() === contactNormalized;

    if (!phoneMatches && !emailMatches) return { found: false as const };

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const events = await db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(orderEvents.createdAt, orderEvents.id);

    return {
      found: true as const,
      order: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentPlan: order.paymentPlan,
        depositKobo: order.depositKobo,
        balanceKobo: order.balanceKobo,
        paidKobo: order.paidKobo,
        balanceDueAt: order.balanceDueAt?.toISOString() ?? null,
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        city: order.city,
        state: order.state,
        createdAt: order.createdAt?.toISOString() ?? null,
        items: items.map((i) => ({
          productName: i.productName,
          variantLabel: i.variantLabel,
          size: i.size,
          purchaseOption: i.purchaseOption,
          customization: i.customization ?? null,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
        })),
        events: events.map((e) => ({
          status: e.status,
          note: e.note,
          createdAt: e.createdAt?.toISOString() ?? null,
        })),
        latestUpdate:
          events.length > 0
            ? ORDER_STATUS_LABELS[events[events.length - 1].status] ??
              events[events.length - 1].status
            : ORDER_STATUS_LABELS.order_received,
      },
    };
  });

/**
 * Confirmation view for an order placed without a gateway redirect (a
 * fully-covered voucher order lands on /order/DFK-…). The projection shows
 * only what the confirmation page renders — no contact details, no delivery
 * address. Order numbers embed a random suffix, so enumeration is impractical.
 */
export const lookupMyOrderNumber = createServerFn({ method: "GET" })
  .inputValidator((orderNumber: string) => orderNumber)
  .handler(async ({ data }) => {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, data.trim().toUpperCase()))
      .limit(1);
    if (!order) return { found: false as const };
    const items = await db
      .select({
        productName: orderItems.productName,
        variantLabel: orderItems.variantLabel,
        unitPrice: orderItems.unitPrice,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    return {
      found: true as const,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        createdAt: order.createdAt?.toISOString() ?? null,
        items,
      },
    };
  });
