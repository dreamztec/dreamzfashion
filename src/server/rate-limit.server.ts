import { getStore } from "@netlify/blobs";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Minimal fixed-window rate limiter backed by Netlify Blobs, so counters are
 * shared across function instances. Windows are keyed by their start time;
 * old window keys are tiny and simply accumulate as harmless garbage.
 *
 * The limiter is fail-open: if the blob store is unreachable, the protected
 * feature keeps working (an outage must never take checkout or admin sign-in
 * down); the throttle is best-effort abuse resistance, not a hard guarantee.
 */

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Client IP for a server-function handler (no Request object available). */
export function clientIp(): string {
  try {
    return clientIpFromHeaders(getRequest().headers);
  } catch {
    return "unknown";
  }
}

/** Client IP for a raw API-route handler. */
export function clientIpFromRequest(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

export async function consumeRateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const key = `${bucket}/${identity || "unknown"}/${windowStart}`;
  try {
    const store = getStore({ name: "dfk-rate-limits", consistency: "strong" });
    const raw = await store.get(key, { type: "text" });
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    if (count >= limit) {
      return { ok: false, retryAfterSeconds: windowStart + windowSeconds - now };
    }
    await store.set(key, String(count + 1));
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
