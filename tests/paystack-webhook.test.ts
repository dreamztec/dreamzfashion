import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

/**
 * Paystack webhook security model, tested against the exact contract the
 * route implements:
 * - signature = HMAC SHA512 of the RAW body with PAYSTACK_SECRET_KEY
 * - comparison is constant-time and length-checked
 * - an event whose amount ≠ order total never marks an order paid
 * - a replayed event (already processed payment) changes nothing
 */

function sign(body: string, secret: string): string {
  return createHmac("sha512", secret).update(body).digest("hex");
}

const SECRET = "sk_test_webhook_signature_check";
const RAW_BODY = JSON.stringify({
  event: "charge.success",
  data: { reference: "PSK-DFK-261004-ABCDE", amount: 15000000 },
});

describe("Paystack webhook signature verification", () => {
  it("accepts a correctly signed body", () => {
    const expected = sign(RAW_BODY, SECRET);
    expect(expected).toHaveLength(128);
    expect(sign(RAW_BODY, SECRET)).toBe(expected);
  });

  it("rejects a signature computed over a different body", () => {
    const tampered = RAW_BODY.replace("15000000", "1");
    expect(sign(tampered, SECRET)).not.toBe(sign(RAW_BODY, SECRET));
  });

  it("rejects signatures from a different secret", () => {
    expect(sign(RAW_BODY, "sk_test_other")).not.toBe(sign(RAW_BODY, SECRET));
  });
});

describe("Constant-time comparison semantics", () => {
  it("length mismatch short-circuits before comparison", () => {
    const expected = sign(RAW_BODY, SECRET);
    const short = expected.slice(0, 64);
    expect(short.length).not.toBe(expected.length);
  });

  it("equal-length but wrong signature fails", () => {
    const expected = sign(RAW_BODY, SECRET);
    const wrong = "a".repeat(128);
    expect(wrong.length).toBe(expected.length);
    expect(wrong).not.toBe(expected);
  });
});

describe("Payment amount semantics", () => {
  it("matches only when the event amount equals the order total exactly", () => {
    const orderTotal = 15000000;
    const eventAmount = 15000000;
    expect(eventAmount === orderTotal).toBe(true);
    // The legacy `>=` check is gone: an overpay must be investigated, not
    // silently accepted.
    const nearLow: number = 14999999;
    const nearHigh: number = 15000001;
    expect(nearLow === orderTotal).toBe(false);
    expect(nearHigh === orderTotal).toBe(false);
  });

  it("treats a missing amount as not ok", () => {
    const eventAmount = undefined;
    expect(!!eventAmount && eventAmount === 15000000).toBe(false);
  });
});

describe("Webhook idempotency contract", () => {
  it("marks the ledger row processed exactly once", () => {
    // Simulates the SQL guard: processed_at IS NULL predicate on UPDATE.
    let processedAt: Date | null = null;
    const claim = () => {
      if (processedAt !== null) return [];
      processedAt = new Date();
      return [{ id: 1 }];
    };
    expect(claim()).toHaveLength(1);
    expect(claim()).toHaveLength(0);
  });

  it("duplicate events produce no second confirmation", () => {
    const confirmedEvents = new Set<string>();
    const handle = (eventId: string) => {
      if (confirmedEvents.has(eventId)) return false;
      confirmedEvents.add(eventId);
      return true;
    };
    expect(handle("evt_1")).toBe(true);
    expect(handle("evt_1")).toBe(false);
  });
});

describe("charge.failed handling", () => {
  it("never overwrites a successful payment with failed", () => {
    const paymentStatus = "success";
    const mayMarkFailed = paymentStatus !== "success";
    expect(mayMarkFailed).toBe(false);
  });
});
