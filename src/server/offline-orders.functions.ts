import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { orderEvents, orderItems, orders, payments } from "../../db/schema";
import { generateOrderNumber, isValidNigerianPhone } from "@/lib/format";
import { requireAdminRole } from "./admin-auth.server";
import { confirmOrderPaid } from "./commerce.internal";

/**
 * Manual order intake for real sales made outside the online cart.
 * An offline order enters the very SAME order/line/event tables used by
 * Paystack checkout so /track-order and existing admin workflows work.
 *
 * Only a privileged employee can register a sale. Nothing in this module
 * initiates a transfer or asserts that a bank payment came through Paystack.
 */
const UUID = z.string().uuid();
const OfflineOrderInput = z.object({
  requestId: UUID,
  source: z.enum(["walk_in", "whatsapp", "instagram", "phone", "event", "other"]),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().refine(isValidNigerianPhone, "Enter a valid Nigerian phone number"),
  email: z.union([z.string().email().max(140), z.literal("")]).default(""),
  state: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(6).max(400),
  deliveryNote: z.string().max(400).default(""),
  adminNote: z.string().max(500).default(""),
  deliveryFeeKobo: z.number().int().min(0).max(100_000_000),
  items: z.array(z.object({
    productName: z.string().trim().min(2).max(160),
    variantLabel: z.string().trim().max(120).default(""),
    size: z.string().trim().max(30).default(""),
    quantity: z.number().int().min(1).max(100),
    unitPriceKobo: z.number().int().positive().max(200_000_000),
  })).min(1).max(30),
});

export const adminCreateOfflineOrder = createServerFn({ method: "POST" })
  .inputValidator(OfflineOrderInput)
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales", "operations"]);

    // Request-id uniqueness stops a double tap from creating duplicate sales.
    const [existing] = await db.select({ orderNumber: orders.orderNumber })
      .from(orders).where(eq(orders.clientRequestId, data.requestId)).limit(1);
    if (existing) return { orderNumber: existing.orderNumber, duplicate: true, trackingUrl: `/track-order?order=${encodeURIComponent(existing.orderNumber)}` };

    const subtotal = data.items.reduce((sum, item) => sum + item.unitPriceKobo * item.quantity, 0);
    const total = subtotal + data.deliveryFeeKobo;
    if (!Number.isSafeInteger(total) || total <= 0 || total > 2_000_000_000) {
      throw new Error("Check your amounts: the order total is invalid.");
    }

    const orderNumber = generateOrderNumber();
    const now = new Date();
    const sourceLabel = {
      walk_in: "Walk-in",
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      phone: "Telephone",
      event: "Event",
      other: "Other offline channel",
    }[data.source];
    const timeline = [{
      status: "order_received",
      at: now.toISOString(),
      note: `Offline order registered from ${sourceLabel}`,
    }];

    let orderId: number;
    try {
      const [created] = await db.insert(orders).values({
        orderNumber,
        clientRequestId: data.requestId,
        customerName: data.customerName,
        phone: data.phone,
        email: data.email || null,
        state: data.state,
        city: data.city,
        address: data.address,
        deliveryNote: data.deliveryNote || null,
        subtotal,
        deliveryFee: data.deliveryFeeKobo,
        total,
        paidKobo: 0,
        balanceKobo: total,
        paymentPlan: "full",
        paymentStatus: "requested",
        paymentMethod: null,
        status: "order_received",
        timeline,
        adminNotes: `Source: ${sourceLabel}${data.adminNote ? ` | ${data.adminNote}` : ""}`,
        marketingConsent: false,
      }).returning();
      orderId = created.id;
    } catch (err) {
      // Concurrent identical requests can race on unique clientRequestId.
      const [duplicate] = await db.select({ orderNumber: orders.orderNumber })
        .from(orders).where(eq(orders.clientRequestId, data.requestId)).limit(1);
      if (duplicate) return { orderNumber: duplicate.orderNumber, duplicate: true, trackingUrl: `/track-order?order=${encodeURIComponent(duplicate.orderNumber)}` };
      throw err;
    }

    await db.insert(orderItems).values(data.items.map(item => ({
      orderId,
      productId: null, // External or bespoke items need not be in the storefront catalogue.
      productName: item.productName,
      variantLabel: item.variantLabel || null,
      size: item.size || null,
      quantity: item.quantity,
      unitPrice: item.unitPriceKobo,
      unitCostKobo: null,
      purchaseOption: "product_only",
      customization: { "Order source": sourceLabel },
    })));
    await db.insert(orderEvents).values({
      orderId,
      status: "order_received",
      note: `Order received through ${sourceLabel}; payment not yet recorded.`,
    });

    return { orderNumber, duplicate: false, trackingUrl: `/track-order?order=${encodeURIComponent(orderNumber)}` };
  });

/**
 * An OWNER manually attests to funds actually received outside Paystack.
 * The gateway is permanently recorded as 'manual', never 'paystack'.
 * Repeated submissions of the same external reference cannot double count.
 */
const ManualPaymentInput = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  amountKobo: z.number().int().positive().max(2_000_000_000),
  method: z.enum(["cash", "bank_transfer", "pos", "external_payment"]),
  externalReference: z.string().trim().max(120).default(""),
  note: z.string().max(300).default(""),
  requestId: UUID,
  confirmedReceived: z.literal(true),
});

export const adminRecordOfflinePayment = createServerFn({ method: "POST" })
  .inputValidator(ManualPaymentInput)
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    const referenceText = data.externalReference.trim();
    if (data.method !== "cash" && referenceText.length < 4) {
      throw new Error("Enter the transaction reference from the confirmed payment receipt or bank statement.");
    }
    const orderNumber = data.orderNumber.toUpperCase();
    const [order] = await db.select().from(orders)
      .where(eq(orders.orderNumber, orderNumber)).limit(1);
    if (!order) throw new Error("Order not found.");
    if (order.status === "cancelled" || ["paid", "refunded"].includes(order.paymentStatus)) {
      throw new Error("This order is already completed, cancelled or refunded. No additional payment can be recorded.");
    }

    const reference = referenceText
      ? `OFF-${createHash("sha256").update(`${data.method}:${referenceText.toUpperCase()}`).digest("hex").slice(0, 28).toUpperCase()}`
      : `OFF-CASH-${data.requestId}`;

    const [prior] = await db.select({ orderId: payments.orderId, status: payments.status })
      .from(payments).where(eq(payments.reference, reference)).limit(1);
    if (prior) {
      if (prior.orderId === order.id && prior.status === "success") {
        return { ok: true, alreadyRecorded: true, orderNumber, trackingUrl: `/track-order?order=${encodeURIComponent(orderNumber)}` };
      }
      if (prior.orderId === order.id && prior.status === "initialized") {
        await confirmOrderPaid(order.id, reference, data.method, "verify");
        return { ok: true, alreadyRecorded: true, orderNumber, trackingUrl: `/track-order?order=${encodeURIComponent(orderNumber)}` };
      }
      throw new Error("This payment reference has already been entered. Do not record it twice.");
    }

    // Never manually mark an order paid while an unresolved Paystack charge
    // could still settle and create duplicate received-cash entries.
    const attempts = await db.select({
      gateway: payments.gateway, status: payments.status, processedAt: payments.processedAt,
    }).from(payments).where(eq(payments.orderId, order.id));
    if (attempts.some(p => p.gateway === "paystack" && p.processedAt == null && p.status === "initialized")) {
      throw new Error("A Paystack payment is still pending for this order. Resolve it before recording offline money.");
    }

    const outstanding = order.total - (order.paidKobo ?? 0);
    if (data.amountKobo > outstanding) {
      throw new Error(`Amount exceeds the outstanding balance of ₦${(outstanding / 100).toLocaleString("en-NG")}.`);
    }
    if (outstanding <= 0) throw new Error("Nothing remains due on this order.");

    await db.insert(payments).values({
      orderId: order.id,
      reference,
      amountKobo: data.amountKobo,
      currency: "NGN",
      kind: data.amountKobo === outstanding ? "full" : "deposit",
      status: "initialized",
      gateway: "manual",
      channel: data.method,
      rawResult: {
        origin: "offline_admin_record",
        method: data.method,
        externalReference: referenceText || null,
        adminNote: data.note || null,
        confirmedReceived: true,
        recordedAt: new Date().toISOString(),
      },
    });
    await confirmOrderPaid(order.id, reference, data.method, "verify");

    // Do not expose bank references or private admin notes in the customer timeline.
    await db.insert(orderEvents).values({
      orderId: order.id,
      status: "offline_payment_recorded",
      note: `DREAMZ confirmed an offline ${data.method.replaceAll("_", " ")} payment.`,
    });
    return { ok: true, alreadyRecorded: false, orderNumber, trackingUrl: `/track-order?order=${encodeURIComponent(orderNumber)}` };
  });
