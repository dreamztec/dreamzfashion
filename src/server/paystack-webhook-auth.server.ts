import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validates both current Paystack signing-secret webhooks and the deprecated
 * x-paystack-signature flow without ever accepting an unsigned event.
 *
 * Paystack-Signature: t=<unix-sec>,v1=<whk-id>:<sha512-hex>
 * x-paystack-signature: <sha512-hex> computed using PAYSTACK_SECRET_KEY.
 */
function constantTimeHexMatch(received: string, calculated: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(received) || !/^[a-f0-9]{128}$/.test(calculated)) return false;
  const a = Buffer.from(received, "hex");
  const b = Buffer.from(calculated, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PaystackSignatureInput = {
  rawBody: string;
  newSignature?: string | null;
  legacySignature?: string | null;
  webhookSecret?: string | null;
  legacySecretKey?: string | null;
  nowMilliseconds?: number;
};

/** A true result authenticates the exact raw body that must be processed. */
export function verifyPaystackWebhookSignature(input: PaystackSignatureInput): boolean {
  const {
    rawBody,
    newSignature,
    legacySignature,
    webhookSecret,
    legacySecretKey,
    nowMilliseconds = Date.now(),
  } = input;

  if (webhookSecret && newSignature) {
    const parts = newSignature.split(",").map((part) => part.trim());
    const timestampPart = parts.find((part) => part.startsWith("t="));
    const tString = timestampPart?.slice(2) ?? "";
    if (!/^\d{10,}$/.test(tString)) return false;
    const t = Number(tString);
    if (!Number.isSafeInteger(t) || Math.abs(nowMilliseconds / 1000 - t) > 300) return false;
    const expected = createHmac("sha512", webhookSecret).update(`${t}.${rawBody}`).digest("hex");
    return parts.some((part) => {
      const match = /^v1=(whk_[A-Za-z0-9_-]+):([a-fA-F0-9]{128})$/.exec(part);
      return Boolean(match && constantTimeHexMatch(match[2], expected));
    });
  }

  // When the new signing secret is configured, do not fall back from an
  // invalid new-format signature to the legacy signature.
  if (newSignature && webhookSecret) return false;

  // Legacy event signing remains supported until the merchant has generated
  // a dedicated whsec_ webhook signing key in the Paystack dashboard.
  if (legacySecretKey && legacySignature) {
    const expected = createHmac("sha512", legacySecretKey).update(rawBody).digest("hex");
    return constantTimeHexMatch(legacySignature, expected);
  }
  return false;
}
