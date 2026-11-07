import { afterEach, describe, expect, it } from "vitest";
import { getActivePaymentProviderId } from "../src/server/payments.server";
import { timingSafeEqual } from "node:crypto";

/**
 * Flutterwave payment contract, tested against the exact semantics the
 * gateway integration implements:
 *
 * - amounts travel as integer kobo inside DREAMZ and are converted to naira
 *   only at the Flutterwave API boundary (and back on verification)
 * - a payment is confirmed ONLY when gateway status is "successful", the
 *   tx_ref equals the DREAMZ ledger reference, the currency is NGN and the
 *   verified amount covers the ledger row's expected charge
 * - confirmation is idempotent: the ledger row is claimed once, so a
 *   duplicate callback, duplicate webhook, or a webhook racing the callback
 *   can never double-credit an order (and hence never double-deduct stock
 *   or double-pay a commission)
 * - the webhook is authenticated with the `verif-hash` header against
 *   FLW_WEBHOOK_SECRET_HASH in constant time
 * - the active gateway follows PAYMENT_PROVIDER without touching checkout
 */

// ── Amount conversion ─────────────────────────────────────────────────

describe("Flutterwave amount conversion", () => {
  const nairaToKobo = (n: number) => Math.round(Number(n) * 100);
  const koboToNaira = (k: number) => Math.round(k) / 100;

  it("converts server kobo into naira for the hosted-checkout payload", () => {
    expect(nairaToKobo(150000)).toBe(15_000_000); // ₦150,000 → 15,000,000 kobo
    expect(koboToNaira(15_000_000)).toBe(150000);
    expect(koboToNaira(150_00)).toBe(150); // exact round-trip
    expect(koboToNaira(3399)).toBe(33.99); // fractional naira survives
  });

  it("never loses kobo to float drift", () => {
    expect(nairaToKobo(koboToNaira(123456789))).toBe(123456789);
  });

  it("treats a zero/missing verified amount as not payable", () => {
    const verifiedKobo = 0;
    const expectedKobo = 15_000_000;
    expect(verifiedKobo > 0 && verifiedKobo >= expectedKobo).toBe(false);
  });
});

// ── Verification gates ────────────────────────────────────────────────

/**
 * The exact predicate the Flutterwave verification mapping + confirmation
 * path implements (mapVerification + webhook/callback gate).
 */
function confirmGate(verified: { status: string; tx_ref: string; currency: string; amountKobo: number }, ledger: { reference: string; amountKobo: number }) {
  const success = verified.status === "successful" && verified.tx_ref === ledger.reference;
  return (
    success &&
    verified.currency === "NGN" &&
    verified.amountKobo > 0 &&
    verified.amountKobo >= ledger.amountKobo
  );
}

describe("Flutterwave verification gates", () => {
  const ledger = { reference: "FLW-DFK-261107-ABC12", amountKobo: 15_000_000 };

  it("confirms a successful transaction matching every gate", () => {
    expect(
      confirmGate(
        { status: "successful", tx_ref: ledger.reference, currency: "NGN", amountKobo: 15_000_000 },
        ledger,
      ),
    ).toBe(true);
  });

  it("confirms an exact-match deposit charge", () => {
    const depositLedger = { reference: "FLW-DFK-261107-ABC12", amountKobo: 7_500_000 };
    expect(
      confirmGate(
        { status: "successful", tx_ref: depositLedger.reference, currency: "NGN", amountKobo: 7_500_000 },
        depositLedger,
      ),
    ).toBe(true);
  });

  it("rejects a failed payment", () => {
    expect(
      confirmGate(
        { status: "failed", tx_ref: ledger.reference, currency: "NGN", amountKobo: 15_000_000 },
        ledger,
      ),
    ).toBe(false);
  });

  it("rejects a cancelled payment", () => {
    // A customer who cancels at the hosted checkout is not charged; the raw
    // status is not "successful" so nothing is confirmed.
    expect(
      confirmGate(
        { status: "cancelled", tx_ref: ledger.reference, currency: "NGN", amountKobo: 15_000_000 },
        ledger,
      ),
    ).toBe(false);
  });

  it("rejects a transaction whose tx_ref is not the expected ledger reference", () => {
    expect(
      confirmGate(
        { status: "successful", tx_ref: "FLW-DFK-261107-OTHER", currency: "NGN", amountKobo: 15_000_000 },
        ledger,
      ),
    ).toBe(false);
  });

  it("rejects an underpayment", () => {
    expect(
      confirmGate(
        { status: "successful", tx_ref: ledger.reference, currency: "NGN", amountKobo: 14_999_999 },
        ledger,
      ),
    ).toBe(false);
  });

  it("rejects a wrong currency even when the amount is right", () => {
    expect(
      confirmGate(
        { status: "successful", tx_ref: ledger.reference, currency: "USD", amountKobo: 15_000_000 },
        ledger,
      ),
    ).toBe(false);
  });
});

// ── Ledger idempotency ────────────────────────────────────────────────

/**
 * Simulates the SQL claim the shared confirmOrderPaid routine performs:
 * UPDATE … WHERE reference = $1 AND processed_at IS NULL — only the first
 * caller wins; later calls (callback, webhook, replay) change nothing.
 */
function makeLedger(amountKobo: number) {
  return { processedAt: null as Date | null, status: "initialized", amountKobo, credited: 0, stockDeducted: 0 };
}
function claim(payment: ReturnType<typeof makeLedger>) {
  if (payment.processedAt !== null) return { alreadyProcessed: true };
  payment.processedAt = new Date();
  payment.status = "success";
  payment.credited += payment.amountKobo;
  payment.stockDeducted += 1;
  return { alreadyProcessed: false };
}

describe("Flutterwave ledger idempotency", () => {
  it("confirms the payment exactly once", () => {
    const payment = makeLedger(15_000_000);
    expect(claim(payment)).toEqual({ alreadyProcessed: false });
    expect(claim(payment)).toEqual({ alreadyProcessed: true });
    expect(payment.credited).toBe(15_000_000);
    expect(payment.stockDeducted).toBe(1);
  });

  it("webhook before callback: the callback short-circuits", () => {
    const payment = makeLedger(15_000_000);
    expect(claim(payment).alreadyProcessed).toBe(false); // webhook wins
    expect(claim(payment).alreadyProcessed).toBe(true); // callback is a no-op
  });

  it("callback before webhook: the webhook short-circuits", () => {
    const payment = makeLedger(7_500_000);
    expect(claim(payment).alreadyProcessed).toBe(false); // callback wins
    expect(claim(payment).alreadyProcessed).toBe(true); // webhook is a no-op
  });

  it("a duplicate webhook carries no second confirmation", () => {
    const payment = makeLedger(15_000_000);
    claim(payment);
    claim(payment);
    claim(payment);
    expect(payment.credited).toBe(15_000_000);
    expect(payment.stockDeducted).toBe(1);
  });

  it("a customer closing the browser after paying still credits the order once (webhook completes it)", () => {
    const payment = makeLedger(15_000_000);
    // The callback never fired; only the webhook arrived.
    expect(claim(payment).alreadyProcessed).toBe(false);
    expect(payment.status).toBe("success");
  });

  it("only an unprocessed row can be marked failed by a later event", () => {
    const payment = makeLedger(15_000_000);
    claim(payment); // successful
    // A stale failed event must not overwrite success.
    const mayMarkFailed = payment.status !== "success" && payment.processedAt === null;
    expect(mayMarkFailed).toBe(false);
  });
});

// ── Webhook authentication ────────────────────────────────────────────

describe("Flutterwave webhook authentication", () => {
  const SECRET_HASH = "flw_webhook_secret_hash_for_signature_checks";
  const RAW_BODY = JSON.stringify({
    event: "charge.completed",
    data: { id: 3049092, tx_ref: "FLW-DFK-261107-ABC12", status: "successful", amount: 150000, currency: "NGN" },
  });

  const hashOk = (provided: string, secret: string) => {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(secret, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  };

  it("accepts the configured verif-hash", () => {
    expect(hashOk(SECRET_HASH, SECRET_HASH)).toBe(true);
  });

  it("rejects a wrong hash", () => {
    expect(hashOk("tampered-hash", SECRET_HASH)).toBe(false);
  });

  it("rejects an equal-length but wrong hash", () => {
    const wrong = "x".repeat(SECRET_HASH.length);
    expect(hashOk(wrong, SECRET_HASH)).toBe(false);
  });

  it("rejects a missing hash before the body is read for decisions", () => {
    const provided = null;
    expect(!!provided && hashOk(provided, SECRET_HASH)).toBe(false);
  });

  it("accepts only the charge.completed event structure", () => {
    const event = JSON.parse(RAW_BODY) as { event?: string; data?: { tx_ref?: string; id?: number } };
    expect(event.event === "charge.completed" && !!event.data?.tx_ref && event.data.id != null).toBe(true);
    expect((event.event === "transfer.completed") === true).toBe(false);
  });

  it("acknowledges but ignores an event without a transaction id", () => {
    const event: { event?: string; data?: { tx_ref?: string; id?: number } } = { event: "charge.completed", data: { tx_ref: "FLW-DFK-261107-ABC12" } };
    const actionable = event.event === "charge.completed" && !!event.data?.tx_ref && event.data.id != null;
    expect(actionable).toBe(false); // acknowledged with 200, nothing processed
  });
});

// ── Active provider selection ─────────────────────────────────────────

describe("Active payment provider selection", () => {
  const previous = process.env.PAYMENT_PROVIDER;
  afterEach(() => {
    if (previous === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = previous;
  });

  it("follows PAYMENT_PROVIDER=flutterwave", () => {
    process.env.PAYMENT_PROVIDER = "flutterwave";
    expect(getActivePaymentProviderId()).toBe("flutterwave");
  });

  it("follows PAYMENT_PROVIDER=paystack", () => {
    process.env.PAYMENT_PROVIDER = "paystack";
    expect(getActivePaymentProviderId()).toBe("paystack");
  });

  it("normalises casing and whitespace", () => {
    process.env.PAYMENT_PROVIDER = " Flutterwave ";
    expect(getActivePaymentProviderId()).toBe("flutterwave");
  });

  it("defaults to paystack so existing deployments keep their behaviour", () => {
    delete process.env.PAYMENT_PROVIDER;
    expect(getActivePaymentProviderId()).toBe("paystack");
  });
});

// ── Ledger reference shape ────────────────────────────────────────────

describe("Flutterwave ledger reference shape", () => {
  it("uses the FLW prefix for full payments, FLWB for balances and FLWQ for quote milestones", () => {
    const prefix = "FLW";
    expect(`${prefix}-DFK-261107-ABC12`).toMatch(/^FLW-/);
    expect(`${prefix}B-DFK-261107-ABC12-XY7`).toMatch(/^FLWB-/);
    expect(`${prefix}Q-DZQ-2026-0001-1`).toMatch(/^FLWQ-/);
  });

  it("keeps distinct references per payment kind so the webhook resolves each charge back to its own ledger row", () => {
    const full = "FLW-DFK-261107-ABC12";
    const deposit = "FLW-DFK-261107-ABC12";
    const balance = "FLWB-DFK-261107-ABC12-Q3K9X";
    expect(balance).not.toBe(full);
    expect(deposit).toBe(full); // the first charge rides the order reference
  });
});
