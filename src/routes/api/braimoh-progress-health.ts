import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index";
import { orders, settings } from "../../../db/schema";

// Temporary boolean-only production verification; no private order details.
export const Route = createFileRoute("/api/braimoh-progress-health")({
  server: {
    handlers: {
      GET: async () => {
        let ready = false;
        try {
          const [row] = await db.select({ value: settings.value }).from(settings)
            .where(eq(settings.key, "shared_order:DFK-BRA-261112-VIII")).limit(1);
          const [order] = await db.select({
            paymentStatus: orders.paymentStatus,
            paidKobo: orders.paidKobo,
            total: orders.total,
            status: orders.status,
          }).from(orders)
            .where(eq(orders.orderNumber, "DFK-BRA-261112-VIII")).limit(1);
          const record = (row?.value ?? {}) as Record<string,unknown>;
          ready = record.progressPercent === 98 &&
            record.deliveryDate === "2026-11-26" &&
            typeof record.tokenHash === "string" &&
            (record.publicNote as string)?.includes("98%") &&
            order?.total === 27999200 &&
            order?.paidKobo === 13999200 &&
            order?.status === "production";
        } catch { ready = false; }
        return Response.json({ ready }, { headers: { "Cache-Control":"no-store" } });
      },
    },
  },
});
