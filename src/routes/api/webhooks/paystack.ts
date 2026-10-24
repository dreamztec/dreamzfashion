import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../../db/index";
import { orderEvents, orders, payments } from "../../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { confirmOrderPaid } from "../../../server/commerce.internal";

/**
 * Paystack webhook — server-to-server payment confirmation.
 *
 * Security:
 * - Signature verified with HMAC SHA512 of the raw body using
 *   PAYSTACK_SECRET_KEY, in constant time, before anything is trusted.
 * - The exact amount in the event must match the ledger row's expected
 *   charge; a mismatched amount never marks anything paid.
 *
 * Idempotency:
 * - Every event is processed at most once. The payments ledger row carries
 *   processed_at + gateway_event_id; a replayed event (same reference, same
 *   or different event id) is acknowledged with 200 but changes nothing —
 *   no duplicate orders, no double stock deductions, no double fulfilment.
 */
export const Route = createFileRoute("/api/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
          return Response.json({ error: "Payment service inactive" }, { status: 503 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-paystack-signature");

        if (!signature) {
          return Response.json({ error: "Missing signature" }, { status: 401 });
        }

        // HMAC SHA512 verification (constant-time comparison)
        const { createHmac, timingSafeEqual } = await import("node:crypto");
        const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
        const a = Buffer.from(signature, "utf8");
        const b = Buffer.from(expected, "utf8");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return Response.json({ error: "Invalid signature" }, { status: 401 });
        }

        let event: {
          event: string;
          data?: { reference?: string; amount?: number; id?: number | string };
        };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        if (event.event === "charge.success" && event.data?.reference) {
          const reference = event.data.reference;

          // Resolve the ledger row first — every charge (full, deposit,
          // balance, quote milestone) has its own reference and amount.
          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.reference, reference))
            .limit(1);

          if (payment && payment.status !== "success") {
            // Amount must match the expected charge exactly (kobo).
            const amountOk =
              !!event.data.amount && event.data.amount === payment.amountKobo;
            if (amountOk) {
              if (payment.kind === "quote_milestone") {
                // Corporate quote milestone: claim the ledger row atomically
                // and advance the quote — no shop order is involved.
                const claimed = await db
                  .update(payments)
                  .set({
                    status: "success",
                    channel: "paystack",
                    processedAt: new Date(),
                    updatedAt: new Date(),
                    ...(event.data.id != null ? { gatewayEventId: String(event.data.id) } : {}),
                  })
                  .where(sql`${payments.reference} = ${reference} AND ${payments.processedAt} IS NULL`)
                  .returning({ id: payments.id });
                if (claimed.length > 0 && payment.corporateQuoteId) {
                  const { corporateQuotes } = await import("../../../../db/schema");
                  await db
                    .update(corporateQuotes)
                    .set({ status: "production", updatedAt: new Date() })
                    .where(sql`${corporateQuotes.id} = ${payment.corporateQuoteId} AND ${corporateQuotes.status} = 'accepted'`);
                }
              } else if (payment.orderId) {
                await confirmOrderPaid(
                  payment.orderId,
                  reference,
                  "paystack",
                  "webhook",
                  event.data.id != null ? String(event.data.id) : undefined,
                );
              }
            } else {
              // Amount mismatch on a shop order payment — record it only
              // when a real order is attached (quote payments have none).
              if (payment.orderId) {
                await db.insert(orderEvents).values({
                  orderId: payment.orderId,
                  status: "payment_amount_mismatch",
                  note: `Webhook amount ${event.data.amount ?? "unknown"} did not match the expected charge ${payment.amountKobo}. Nothing was marked paid.`,
                });
              }
            }
          }
        }

        if (event.event === "charge.failed" && event.data?.reference) {
          const [payment] = await db
            .select({ id: payments.id, status: payments.status })
            .from(payments)
            .where(eq(payments.reference, event.data.reference))
            .limit(1);
          // Only mark failed while success has not been recorded anywhere.
          if (payment && payment.status !== "success") {
            await db
              .update(payments)
              .set({ status: "failed", updatedAt: new Date() })
              .where(sql`${payments.id} = ${payment.id} AND ${payments.processedAt} IS NULL`);
            await db
              .update(orders)
              .set({ paymentStatus: "failed", updatedAt: new Date() })
              .where(
                sql`${orders.paymentReference} = ${event.data.reference} AND ${orders.paymentStatus} = 'pending_payment'`,
              );
          }
        }

        // Always 200 so Paystack does not retry forever on unrelated events
        return Response.json({ received: true });
      },
    },
  },
});
