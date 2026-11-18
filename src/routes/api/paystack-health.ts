import { createFileRoute } from "@tanstack/react-router";

/** Temporary deployment-only diagnostic.
 * No credentials, balances, customer data or gateway response body are returned.
 * Remove this route after verifying the production integration.
 */
export const Route = createFileRoute("/api/paystack-health")({
  server: {
    handlers: {
      GET: async () => {
        const enabled = String(process.env.ONLINE_PAYMENTS_ENABLED || "").toLowerCase() === "true";
        const key = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
        const live = /^sk_live_[A-Za-z0-9]+$/.test(key);
        const callbackOrigin = (() => {
          try { return new URL(process.env.SITE_URL || process.env.URL || "").origin === "https://dreamzfashion.dreamz-gc.com"; }
          catch { return false; }
        })();
        const result = (ready: boolean, code: string) =>
          Response.json({ gateway: "paystack", ready, code, onlineEnabled: enabled, liveCredentialsConfigured: live, callbackOriginMatches: callbackOrigin }, { headers: { "Cache-Control": "no-store" } });
        if (!enabled) return result(false, "online_payments_disabled");
        if (!live) return result(false, "live_key_missing_or_invalid");
        try {
          const response = await fetch("https://api.paystack.co/balance", {
            method: "GET",
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(7_000),
          });
          // No balance amount or body is read or returned.
          if (response.ok) return result(callbackOrigin, callbackOrigin ? "ready" : "callback_origin_mismatch");
          return result(false, response.status === 401 ? "credentials_rejected" : "gateway_validation_failed");
        } catch {
          return result(false, "gateway_unreachable");
        }
      },
    },
  },
});
