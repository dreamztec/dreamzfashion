import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { orderEvents, orderItems, orders, payments, voucherRedemptions } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import { getPaymentProvider } from "./payments.server";
import { getSetting } from "./catalog.server";
import { getCurrentCustomer } from "./auth.server";
import { holdVoucherForOrder } from "./vouchers.server";
import { priceOrder, PricingError, type PricedOrder } from "./order-pricing.server";
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
  customization: z.record(z.string().max(80), z.string().max(400)).nullable().optional(),
  designId: z.string().regex(/^DZD-[A-Z0-9]{8}$/).nullable().optional(),
  quantity: z.number().int().min(1).max(10),
});

const PreviewSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1).max(20),
  state: z.string().max(60).optional().or(z.literal("")),
  voucherCode: z.string().max(40).optional().or(z.literal("")),
  partnerCode: z.string().max(40).optional().or(z.literal("")),
  referralSessionId: z.string().max(80).optional().or(z.literal("")),
  email: z.string().max(140).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
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
  // Creator / partner code typed at checkout (case-insensitive). Takes
  // precedence over an earlier referral-link click.
  partnerCode: z.string().max(40).optional().or(z.literal("")),
  // "deposit" is honoured only when the server confirms every line is
  // deposit-eligible and the house has deposit terms configured.
  paymentPlan: z.enum(["full", "deposit"]).default("full"),
  // "pay" starts online payment; "request" sends an unpaid order request.
  // The server forces "request" whenever online payment is unavailable or
  // a line still needs a quote.
  mode: z.enum(["pay", "request"]).default("pay"),
  // Browser-generated key that makes a double-submit return the same order.
  clientRequestId: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
  // Explicit marketing consent, stored with the order (never inferred).
  marketingConsent: z.boolean().default(false),
  // First-party referral attribution session issued at /r/CODE click time.
  // Never a referrer id from the browser — the server re-resolves it.
  referralSessionId: z.string().min(6).max(80).optional().or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;

/** Whether online payment can actually be taken right now. */
function paymentAvailable(): boolean {
  return getPaymentProvider("paystack") !== null;
}

function publicPricing(priced: PricedOrder) {
  return {
    lines: priced.lines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      variantLabel: l.variantLabel,
      purchaseOption: l.purchaseOption,
      designId: l.designId,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      quoteRequired: l.quoteRequired,
    })),
    subtotal: priced.subtotal,
    delivery: priced.delivery,
    discountKobo: priced.discountKobo,
    voucherCode: priced.voucherCode,
    selfPurchaseBenefitKobo: priced.selfPurchaseBenefitKobo,
    partner: priced.partner
      ? {
          code: priced.partner.code,
          source: priced.partner.source,
          outcome: priced.partner.outcome,
          displayName: priced.partner.displayName,
        }
      : null,
    partnerCodeError: priced.partnerCodeError,
    total: priced.total,
    hasQuoteLines: priced.hasQuoteLines,
  };
}

/**
 * Server-priced checkout summary. The page shows these figures — never its
 * own arithmetic — so listing, cart, summary and order always agree.
 */
export const previewCheckout = createServerFn({ method: "POST" })
  .inputValidator(PreviewSchema)
  .handler(async ({ data }) => {
    const customer = await getCurrentCustomer();
    try {
      const priced = await priceOrder({
        items: data.items,
        state: data.state || null,
        voucherCode: data.voucherCode || null,
        partnerCode: data.partnerCode || null,
        referralSessionId: data.referralSessionId || null,
        buyer: { customerId: customer?.id ?? null, email: data.email || customer?.email || null, phone: data.phone || null },
      });
      return { ok: true as const, paymentAvailable: paymentAvailable(), pricing: publicPricing(priced) };
    } catch (err) {
      if (err instanceof PricingError) return { ok: false as const, paymentAvailable: paymentAvailable(), error: err.message };
      throw err;
    }
  });

/**
 * Create an order from the cart and either initialize Paystack payment or,
 * when payment is unavailable (or a line awaits a quote), record an unpaid
 * order request. Prices are ALWAYS recalculated server-side.
 */
export const initializeCheckout = createServerFn({ method: "POST" })
  .inputValidator(CheckoutSchema)
  .handler(async ({ data }) => {
    // Idempotency: the same submission key always returns the same order.
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.clientRequestId, data.clientRequestId))
      .limit(1);
    if (existingOrder) {
      return {
        orderNumber: existingOrder.orderNumber,
        requested: existingOrder.paymentStatus === "requested",
        duplicate: true,
        orderUrl: `/order/${existingOrder.orderNumber}`,
      };
    }

    const customer = await getCurrentCustomer();
    let priced: PricedOrder;
    try {
      priced = await priceOrder({
        items: data.items,
        state: data.state,
        voucherCode: data.voucherCode || null,
        partnerCode: data.partnerCode || null,
        referralSessionId: data.referralSessionId || null,
        buyer: { customerId: customer?.id ?? null, email: data.email || customer?.email || null, phone: data.phone },
      });
    } catch (err) {
      if (err instanceof PricingError) throw new Error(err.message);
      throw err;
    }
    if (priced.partnerCodeError) throw new Error(priced.partnerCodeError);
    if (priced.total === null || priced.delivery.feeKobo === null) throw new Error("Select your delivery state.");
    const subtotal = priced.subtotal;
    const deliveryFee = priced.delivery.feeKobo;
    const discountKobo = priced.discountKobo;
    const total = priced.total;

    const provider = getPaymentProvider("paystack");
    // Unpaid order request: payment unavailable, customer chose it, or a
    // custom design still needs the house's quote.
    const isRequest = data.mode === "request" || !provider || priced.hasQuoteLines;
    const fullyCovered = !isRequest && total === 0;

    // ── Deposit plan (server-decided) ─────────────────────────────────
    let paymentPlan: "full" | "deposit" = "full";
    let depositKobo = 0;
    let balanceDueAt: Date | null = null;
    if (!isRequest && data.paymentPlan === "deposit" && !fullyCovered) {
      const depositTerms = await getSetting("deposits", {
        enabled: false,
        defaultPercent: 50,
        balanceDueDays: 14,
        termsText: "",
      });
      const lineProductIds = priced.lines.map((p) => p.productId);
      const eligibleRows = await db.execute(
        sql`SELECT id FROM products WHERE id IN (${sql.join(lineProductIds, sql`, `)}) AND deposit_eligible = true`,
      );
      const eligibleIds = new Set((eligibleRows.rows as Array<{ id: number }>).map((r) => r.id));
      if (depositTerms.enabled && lineProductIds.every((id) => eligibleIds.has(id))) {
        const percent = Math.min(90, Math.max(1, depositTerms.defaultPercent ?? 50));
        const discountedMerch = Math.max(0, subtotal - discountKobo - priced.selfPurchaseBenefitKobo);
        depositKobo = Math.round((discountedMerch * percent) / 100) + deliveryFee;
        depositKobo = Math.min(total, Math.max(100, depositKobo));
        paymentPlan = "deposit";
        if ((depositTerms.balanceDueDays ?? 0) > 0) {
          balanceDueAt = new Date(Date.now() + depositTerms.balanceDueDays * 86_400_000);
        }
      }
    }
    const balanceKobo = paymentPlan === "deposit" ? total - depositKobo : 0;

    const orderNumber = generateOrderNumber();
    const reference = isRequest ? null : `PSK-${orderNumber}`;
    const now = new Date().toISOString();
    const firstStatus = isRequest ? "order_requested" : "order_received";

    let order: typeof orders.$inferSelect;
    try {
      [order] = await db
        .insert(orders)
        .values({
          orderNumber,
          clientRequestId: data.clientRequestId,
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
          voucherCode: priced.voucherCode,
          paymentPlan,
          depositKobo,
          balanceKobo,
          balanceDueAt,
          marketingConsent: data.marketingConsent,
          customerId: customer?.id ?? null,
          total,
          paymentStatus: isRequest ? "requested" : "pending_payment",
          paymentReference: reference,
          status: firstStatus,
          timeline: [{ status: firstStatus, at: now }],
          referrerId: priced.partner?.referrerId ?? null,
          referralCode: priced.partner?.code ?? null,
          attributionSource: priced.partner?.source ?? null,
          attributionOutcome: priced.partner?.outcome ?? null,
          selfPurchaseBenefitKobo: priced.selfPurchaseBenefitKobo,
        })
        .returning();
    } catch (err) {
      // A concurrent duplicate submit lost the unique-key race.
      const [dupe] = await db.select().from(orders).where(eq(orders.clientRequestId, data.clientRequestId)).limit(1);
      if (dupe) {
        return { orderNumber: dupe.orderNumber, requested: dupe.paymentStatus === "requested", duplicate: true, orderUrl: `/order/${dupe.orderNumber}` };
      }
      throw err;
    }

    await db.insert(orderItems).values(
      priced.lines.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        variantLabel: item.variantLabel,
        size: item.size,
        purchaseOption: item.purchaseOption,
        customization: {
          ...(item.customization ?? {}),
          purchaseOption: item.purchaseOption === "complete_package" ? "Complete Package" : "Product Only",
          ...(item.quoteRequired ? { pricing: "Quote required" } : {}),
        },
        imageUrl: item.imageUrl,
        unitPrice: item.unitPrice,
        unitCostKobo: item.unitCostKobo,
        quantity: item.quantity,
      })),
    );
    await db.insert(orderEvents).values({
      orderId: order.id,
      status: firstStatus,
      note: isRequest
        ? "Order request received — unpaid. The house confirms details and sends a payment link."
        : "Order created, awaiting payment",
    });

    // Referral funnel bookkeeping (no reward is created here).
    if (data.referralSessionId || customer) {
      const { markAttributionOrderStarted } = await import("./referrals.server");
      await markAttributionOrderStarted(data.referralSessionId || null, customer?.id ?? null, orderNumber).catch(() => {
        /* attribution must never block checkout */
      });
    }

    if (isRequest) {
      return {
        orderNumber,
        requested: true,
        duplicate: false,
        orderUrl: `/order/${orderNumber}`,
        reason: !provider ? "payment_unavailable" : priced.hasQuoteLines ? "quote_required" : "customer_choice",
      };
    }

    await db.insert(payments).values({
      orderId: order.id,
      reference: reference!,
      amountKobo: paymentPlan === "deposit" ? depositKobo : total,
      currency: "NGN",
      kind: paymentPlan === "deposit" ? "deposit" : "full",
      status: "initialized",
    });

    if (priced.voucherId != null) {
      const hold = await holdVoucherForOrder(priced.voucherId, order.id, customer?.id ?? null, discountKobo);
      if (!hold.ok) throw new Error(hold.reason ?? "The voucher could not be applied to this order.");
    }

    if (fullyCovered) {
      await confirmOrderPaid(order.id, reference!, "voucher", "verify");
      return { orderNumber, requested: false, duplicate: false, fullyCovered: true, orderUrl: `/order/${orderNumber}`, reference };
    }

    const siteUrl = process.env.SITE_URL || process.env.URL || "http://localhost:3000";
    const init = await provider!.initialize({
      email: data.email || `${orderNumber}@dreamzfk.order`,
      amountKobo: paymentPlan === "deposit" ? depositKobo : total,
      reference: reference!,
      callbackUrl: `${siteUrl}/checkout/callback?orderNumber=${encodeURIComponent(orderNumber)}`,
      metadata: {
        order_number: orderNumber,
        phone: data.phone,
        payment_plan: paymentPlan,
        ...(paymentPlan === "deposit" ? { deposit_kobo: depositKobo, balance_kobo: balanceKobo } : {}),
      },
    });

    return {
      orderNumber,
      requested: false,
      duplicate: false,
      authorizationUrl: init.authorizationUrl,
      reference,
      paymentPlan,
      depositKobo,
      balanceKobo,
    };
  });

/**
 * Pay for an order request once online payment is live. The amount is the
 * server's recorded total (never a browser figure), the saved partner
 * attribution is kept, and quote lines must be priced by the house first.
 */
export const initializeRequestPayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderNumber: z.string().min(4).max(40), contact: z.string().min(5).max(120) }))
  .handler(async ({ data }) => {
    const provider = getPaymentProvider("paystack");
    if (!provider) throw new Error("Online payment is not active yet — the DREAMZ team will send you a payment link.");
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, data.orderNumber.trim().toUpperCase())).limit(1);
    if (!order) throw new Error("We could not find that order");
    const contact = data.contact.trim().toLowerCase();
    const digitsIn = contact.replace(/\D/g, "");
    const matches =
      (digitsIn.length >= 7 && order.phone.replace(/\D/g, "").endsWith(digitsIn)) ||
      (!!order.email && order.email.toLowerCase() === contact);
    if (!matches) throw new Error("We could not find that order");
    if (order.paymentStatus !== "requested") throw new Error("This order is not awaiting a payment link.");
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    if (items.some((i) => i.unitPrice <= 0)) throw new Error("Part of this order is still being quoted by the house.");
    if (order.total <= 0) throw new Error("Nothing to pay on this order.");

    const reference = `PSK-${order.orderNumber}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await db.insert(payments).values({ orderId: order.id, reference, amountKobo: order.total, currency: "NGN", kind: "full", status: "initialized" });
    await db
      .update(orders)
      .set({ paymentStatus: "pending_payment", paymentReference: reference, updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    const siteUrl = process.env.SITE_URL || process.env.URL || "http://localhost:3000";
    const init = await provider.initialize({
      email: order.email || `${order.orderNumber}@dreamzfk.order`,
      amountKobo: order.total,
      reference,
      callbackUrl: `${siteUrl}/checkout/callback?orderNumber=${encodeURIComponent(order.orderNumber)}`,
      metadata: { order_number: order.orderNumber, payment_plan: "full", from_request: true },
    });
    return { authorizationUrl: init.authorizationUrl };
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
        purchaseOption: orderItems.purchaseOption,
        customization: orderItems.customization,
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
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discountKobo: order.discountKobo,
        voucherCode: order.voucherCode,
        selfPurchaseBenefitKobo: order.selfPurchaseBenefitKobo,
        referralCode: order.referralCode,
        attributionOutcome: order.attributionOutcome,
        total: order.total,
        createdAt: order.createdAt?.toISOString() ?? null,
        items,
      },
    };
  });
