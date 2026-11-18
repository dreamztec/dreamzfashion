import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaystackWebhookSignature } from "../src/server/paystack-webhook-auth.server";

const body = JSON.stringify({
  event: "charge.success",
  data: { reference: "PSK-EXAMPLE", amount: 1500000, currency: "NGN" },
});
const legacySecretKey = "sk_test_fake_never_use";
const modernSecret = "whsec_fake_do_not_use";
const now = 1_800_000_000_000;
const unix = now / 1000;

const digest = (key: string, payload: string) =>
  createHmac("sha512", key).update(payload).digest("hex");

describe("Paystack webhook signature verification", () => {
  it("accepts Paystack's current timestamped webhook signing secret", () => {
    const signature = digest(modernSecret, `${unix}.${body}`);
    expect(verifyPaystackWebhookSignature({
      rawBody: body,
      newSignature: `t=${unix},v1=whk_key001:${signature}`,
      webhookSecret: modernSecret,
      legacySecretKey,
      nowMilliseconds: now,
    })).toBe(true);
  });

  it("accepts one valid key when a webhook signing secret is rotating", () => {
    const signature = digest(modernSecret, `${unix}.${body}`);
    expect(verifyPaystackWebhookSignature({
      rawBody: body,
      newSignature: `t=${unix},v1=whk_old:${"0".repeat(128)},v1=whk_new:${signature}`,
      webhookSecret: modernSecret,
      nowMilliseconds: now,
    })).toBe(true);
  });

  it("rejects tampering, expired signatures and invalid modern signatures", () => {
    const signature = digest(modernSecret, `${unix}.${body}`);
    const legitimate = `t=${unix},v1=whk_key001:${signature}`;
    expect(verifyPaystackWebhookSignature({
      rawBody: body + " ",
      newSignature: legitimate,
      webhookSecret: modernSecret, nowMilliseconds: now,
    })).toBe(false);
    expect(verifyPaystackWebhookSignature({
      rawBody: body, newSignature: legitimate,
      webhookSecret: modernSecret, nowMilliseconds: now + 301_000,
    })).toBe(false);
    // A forged new-format header cannot fall back to the older key.
    expect(verifyPaystackWebhookSignature({
      rawBody: body, newSignature: "t=bad,v1=whk_fake:aaaa",
      legacySignature: digest(legacySecretKey, body),
      legacySecretKey, webhookSecret: modernSecret, nowMilliseconds: now,
    })).toBe(false);
  });

  it("accepts legacy HMAC only with the actual server secret", () => {
    const signature = digest(legacySecretKey, body);
    expect(verifyPaystackWebhookSignature({
      rawBody: body, legacySignature: signature, legacySecretKey,
    })).toBe(true);
    expect(verifyPaystackWebhookSignature({
      rawBody: body + "!", legacySignature: signature, legacySecretKey,
    })).toBe(false);
    expect(verifyPaystackWebhookSignature({
      rawBody: body, legacySignature: "invalid", legacySecretKey,
    })).toBe(false);
    expect(verifyPaystackWebhookSignature({ rawBody: body })).toBe(false);
  });
});
