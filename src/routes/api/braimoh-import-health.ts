import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index";
import { orderItems, orders, payments, settings } from "../../../db/schema";

/** Temporary existence-only check. Never serves order details or any token. */
export const Route = createFileRoute("/api/braimoh-import-health")({
  server: {
    handlers: {
      GET: async () => {
        let ready = false;
        try {
          const [order] = await db.select().from(orders)
            .where(eq(orders.orderNumber, "DFK-BRA-261112-VIII")).limit(1);
          if (order) {
            const [items,ledger,share] = await Promise.all([
              db.select({id:orderItems.id}).from(orderItems).where(eq(orderItems.orderId,order.id)),
              db.select({status:payments.status,gateway:payments.gateway,amountKobo:payments.amountKobo})
                .from(payments).where(eq(payments.orderId,order.id)),
              db.select({value:settings.value}).from(settings)
                .where(eq(settings.key,"shared_order:DFK-BRA-261112-VIII")).limit(1),
            ]);
            const meta=(share[0]?.value??{}) as Record<string,unknown>;
            ready = items.length===8 && order.paymentStatus==="deposit_paid"
              && order.paidKobo===13999200 && order.total===27999200
              && order.status==="production"
              && ledger.some(x=>x.status==="success" && x.gateway==="manual" && x.amountKobo===13999200)
              && meta.progressPercent===47 && typeof meta.tokenHash==="string";
          }
        }catch {ready=false;}
        return Response.json({ready},{headers:{"Cache-Control":"no-store"}});
      }
    }
  }
});
