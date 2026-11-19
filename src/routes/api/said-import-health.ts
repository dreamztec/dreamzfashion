import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index";
import { orderItems, orders, payments, settings } from "../../../db/schema";

/** Temporary existence-only validation. No token, customer information or bank details. */
export const Route = createFileRoute("/api/said-import-health")({
  server: {
    handlers: {
      GET: async () => {
        let ready = false;
        try {
          const [order] = await db.select().from(orders)
            .where(eq(orders.orderNumber,"DFK-SAID-161126")).limit(1);
          if (order) {
            const [items, ledger, share] = await Promise.all([
              db.select({sku:orderItems.sku,unitPrice:orderItems.unitPrice})
                .from(orderItems).where(eq(orderItems.orderId, order.id)),
              db.select({status:payments.status,gateway:payments.gateway,amountKobo:payments.amountKobo})
                .from(payments).where(eq(payments.orderId,order.id)),
              db.select({value:settings.value}).from(settings)
                .where(eq(settings.key,"shared_order:DFK-SAID-161126")).limit(1),
            ]);
            const meta=(share[0]?.value??{}) as Record<string,unknown>;
            const milestones=(meta.itemStatuses??{}) as Record<string,string>;
            ready =
              items.length===2 &&
              items.some(x=>x.sku==="SAID-01" && x.unitPrice===1500000) &&
              items.some(x=>x.sku==="SAID-06" && x.unitPrice===3500000) &&
              order.paymentStatus==="deposit_paid" &&
              order.total===5000000 && order.paidKobo===3500000 &&
              order.deliveryFee===0 && order.balanceKobo===1500000 &&
              order.status==="production" &&
              ledger.some(x=>x.status==="success" && x.gateway==="manual" && x.amountKobo===3500000) &&
              meta.progressPercent===98 && meta.deliveryDate==="2026-11-20" &&
              typeof meta.tokenHash==="string" &&
              !!milestones["SAID-01"] && !!milestones["SAID-06"];
          }
        } catch { ready=false; }
        return Response.json({ready},{headers:{"Cache-Control":"no-store"}});
      },
    },
  },
});
