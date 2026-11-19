import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index";
import { orderItems, orders, payments, settings } from "../../../db/schema";

/** Temporary boolean-only check. No contact, prices, customer name, token or bank data returned. */
export const Route = createFileRoute("/api/vanity-import-health")({
  server: {
    handlers: {
      GET: async () => {
        let ready = false;
        try {
          const [order] = await db.select().from(orders)
            .where(eq(orders.orderNumber,"DFK-VF-261110-01")).limit(1);
          if(order){
            const [items, ledger, share] = await Promise.all([
              db.select({sku:orderItems.sku}).from(orderItems)
                .where(eq(orderItems.orderId, order.id)),
              db.select({status:payments.status,gateway:payments.gateway,amountKobo:payments.amountKobo})
                .from(payments).where(eq(payments.orderId,order.id)),
              db.select({value:settings.value}).from(settings)
                .where(eq(settings.key,"shared_order:DFK-VF-261110-01")).limit(1)
            ]);
            const meta=(share[0]?.value??{}) as Record<string,unknown>;
            const milestone=(meta.itemStatuses??{}) as Record<string,string>;
            ready =
              items.length===4 &&
              ["VF-01","VF-02","VF-03","VF-04"].every(id=>items.some(x=>x.sku===id)) &&
              order.paymentStatus==="deposit_paid" &&
              order.total===75000000 && order.paidKobo===37500000 &&
              order.status==="production" &&
              ledger.some(x=>x.status==="success" && x.gateway==="manual" && x.amountKobo===37500000) &&
              meta.progressPercent===25 &&
              typeof meta.tokenHash==="string" &&
              milestone["VF-01"]?.startsWith("Delivered") &&
              ["VF-02","VF-03","VF-04"].every(id=>milestone[id]?.startsWith("Remaining")) &&
              !meta.deliveryDate;
          }
        }catch{ready=false;}
        return Response.json({ready},{headers:{"Cache-Control":"no-store"}});
      }
    }
  }
});
