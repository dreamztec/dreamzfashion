import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../../db/index";
import { orderEvents, payments } from "../../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { confirmOrderPaid } from "../../../server/commerce.internal";
import { getPaymentProvider } from "../../../server/payments.server";

/**
 * Flutterwave webhook — server-to-server payment confirmation.
 *
 * Security:
 * - Flutterwave signs every webhook with the `verif-hash` header set in the
 *   dashboard. The header must equal FLW_WEBHOOK_SECRET_HASH (compared in
 *   constant time) before any payload content is trusted.
 * - The webhook is only a TRIGGER. Amount, status, currency and reference
 *   are never trusted from the event body: the transaction is re-verified
 *   against Flutterwave's own transaction-verification endpoint with the
 *   secret key, and the result must satisfy every gate below before
 *   anything is marked paid:
 *     1. gateway status is exactly "successful"
 *     2. tx_ref equals the DREAMZ ledger reference the charge was made on
 *     3. currency is NGN
 *     4. verified amount >= the ledger row's expected charge
 *     5. the ledger row belongs to the same DREAMZ order/payment
 *
 * Idempotency:
 * - Confirmation goes through the same single idempotent confirmOrderPaid
 *   routine the browser callback uses. The payments ledger row is claimed
 *   once (processed_at IS NULL guard); a duplicate webhook — arriving before,
 *   after or alongside the callback — changes nothing: no duplicate credit,
 *   no duplicate stock deduction, no duplicate commission.
 */
export const Route = createFileRoute("/api/webhooks/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretHash = process.env.FLW_WEBHOOK_SECRET_HASH;
        if (!secretHash || !process.env.FLW_SECRET_KEY) {
          return Response.json({ error: "Payment service inactive" }, { status: 503 });
        }

        const providedHash = request.headers.get("verif-hash");
        if (!providedHash) {
          return Response.json({ error: "Missing webhook signature" }, { status: 401 });
        }

        const { timingSafeEqual } = await import("node:crypto");
        const a = Buffer.from(providedHash, "utf8");
        const b = Buffer.from(secretHash, "utf8");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
        }

        let event: {
          event?: string;
          data?: {
            id?: number | string;
            tx_ref?: string;
            status?: string;
            amount?: number | string;
            currency?: string;
          };
        };
        try {
          event = JSON.parse(await request.text());
        } catch {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Only the charge-completed event family is accepted; anything else
        // is acknowledged so Flutterwave does not retry forever.
        if (event.event === "charge.completed" && event.data?.tx_ref && event.data.id != null) {
          const reference = event.data.tx_ref;
          const transactionId = String(event.data.id);

          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.reference, reference))
            .limit(1);

          // Unknown reference or already-processed payment: acknowledge and
          // do nothing (idempotent against replays and duplicates).
          if (payment && payment.status !== "success") {
            const provider = getPaymentProvider("flutterwave");
            if (!provider?.verifyById) {
              return Response.json({ error: "Payment service inactive" }, { status: 503 });
            }

            const result = await provider.verifyById(transactionId, reference);
            const amountOk =
              result.success &&
              result.currency === "NGN" &&
              result.amountKobo > 0 &&
              result.amountKobo >= payment.amountKobo;

            if (amountOk) {
              if (payment.kind === "quote_milestone") {
                // Corporate quote milestone: claim the ledger row atomically
                // and advance the quote — no shop order is involved.
                const claimed = await db
                  .update(payments)
                  .set({
                    status: "success",
                    channel: result.channel ?? "flutterwave",
                    processedAt: new Date(),
                    updatedAt: new Date(),
                    gatewayEventId: transactionId,
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
                  result.channel ?? "flutterwave",
                  "webhook",
                  transactionId,
                );
              }
            } else if (result.rawStatus === "successful") {
              // The gateway says successful but the verification failed the
              // amount/currency/reference gates — record it for the house
              // instead of silently marking anything paid.
              if (payment.orderId) {
                await db.insert(orderEvents).values({
                  orderId: payment.orderId,
                  status: "payment_amount_mismatch",
                  note: `Flutterwave verification for ${reference} did not match the expected charge (${payment.amountKobo} kobo, NGN). Verified amount: ${result.amountKobo} kobo ${result.currency}. Nothing was marked paid.`,
                });
              }
            }
          }
        }

        return Response.json({ received: true });
      },
    },
  },
});
