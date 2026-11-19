import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { orders, orderItems, orderEvents, settings } from "../../db/schema";
import { consumeRateLimit, clientIp } from "./rate-limit.server";
import { requireAdminRole } from "./admin-auth.server";

const SharedOrderSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{8,40}$/),
  token: z.string().regex(/^[a-f0-9]{32,64}$/),
});

type ShareSettings = {
  tokenHash?: string;
  progressPercent?: number;
  deliveryDate?: string;
  publicNote?: string;
  updatedAt?: string;
};

function tokenEquals(token: string, storedHash?: string) {
  if (!storedHash || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  const input = Buffer.from(createHash("sha256").update(token).digest("hex"), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return input.length === expected.length && timingSafeEqual(input, expected);
}

/**
 * A read-only order share by long unguessable bearer token.
 * No full delivery address, telephone, email, admin notes or Paystack IDs.
 * Guests cannot use this function to create or edit a payment.
 */
export const getSharedOrder = createServerFn({ method: "POST" })
  .inputValidator(SharedOrderSchema)
  .handler(async ({ data }) => {
    const limit = await consumeRateLimit("shared-order-lookup", clientIp(), 15, 15 * 60);
    if (!limit.ok) return { found: false as const };

    const [share] = await db.select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, `shared_order:${data.orderNumber}`))
      .limit(1);
    const meta = (share?.value || {}) as ShareSettings;
    if (!tokenEquals(data.token, meta.tokenHash)) return { found: false as const };

    const [order] = await db.select().from(orders)
      .where(eq(orders.orderNumber, data.orderNumber))
      .limit(1);
    if (!order) return { found: false as const };

    const items = await db.select().from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    const events = await db.select().from(orderEvents)
      .where(eq(orderEvents.orderId, order.id));
    const progressPercent = Number.isFinite(meta.progressPercent)
      ? Math.max(0, Math.min(100, Math.round(meta.progressPercent ?? 0)))
      : 0;

    return {
      found: true as const,
      order: {
        orderNumber: order.orderNumber,
        name: order.customerName,
        collection: "The VIII White Series",
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalKobo: order.total,
        paidKobo: order.paidKobo,
        balanceKobo: Math.max(0, order.total - (order.paidKobo ?? 0)),
        progressPercent,
        deliveryDate: meta.deliveryDate ?? null,
        note: meta.publicNote ?? "",
        progressUpdatedAt: meta.updatedAt ?? null,
        items: items.map(i=>({ name:i.productName,sku:i.sku,quantity:i.quantity,priceKobo:i.unitPrice })),
        events: events.filter(e=>[
          "production","quality_control","ready_for_dispatch","dispatched",
          "in_transit","out_for_delivery","delivered","completed"
        ].includes(e.status)).map(e=>({status:e.status,at:e.createdAt?.toISOString()??null})),
      },
    };
  });

/** Owner/production team can update an existing shared tracking status. */
export const adminUpdateSharedOrderProgress = createServerFn({ method:"POST" })
  .inputValidator(z.object({
    orderNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{8,40}$/),
    progressPercent: z.number().int().min(0).max(100),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    publicNote: z.string().trim().max(300),
  }))
  .handler(async ({ data }) => {
    await requireAdminRole(["owner","operations"]);
    const key = `shared_order:${data.orderNumber}`;
    const [row] = await db.select({value:settings.value}).from(settings).where(eq(settings.key,key)).limit(1);
    if (!row) throw new Error("This order has no shareable tracking record.");
    const value=(row.value??{}) as ShareSettings;
    if (!value.tokenHash) throw new Error("The tracking token is missing.");
    const updatedAt=new Date().toISOString();
    await db.update(settings).set({
      value: {...value,progressPercent:data.progressPercent,deliveryDate:data.deliveryDate,publicNote:data.publicNote,updatedAt},
      updatedAt:new Date()
    }).where(eq(settings.key,key));
    return {ok:true};
  });

/** Metadata only: no token or private payment data is returned to staff. */
export const adminGetSharedOrderProgress = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    orderNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{8,40}$/),
  }))
  .handler(async ({data}) => {
    await requireAdminRole(["owner","operations"]);
    const [row] = await db.select({value: settings.value}).from(settings)
      .where(eq(settings.key,`shared_order:${data.orderNumber}`)).limit(1);
    if (!row) throw new Error("No private tracking record exists for this order.");
    const meta = (row.value??{}) as ShareSettings;
    return {
      progressPercent: Math.max(0,Math.min(100,Math.round(meta.progressPercent??0))),
      deliveryDate: meta.deliveryDate??"",
      publicNote: meta.publicNote??"",
    };
  });
