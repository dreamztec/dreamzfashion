import { getSetting } from "@/server/catalog.server";

/**
 * The ONE rewards calculation for the whole site.
 *
 * Dreamz Points exist here and nowhere else. Until the owner enables the
 * programme in Admin → Settings (and supplies verified values), every helper
 * reports disabled and the UI renders no points — artwork figures are never
 * hard-coded into logic.
 */

export type RewardsConfig = {
  enabled: boolean;
  pointsPerNaira: number; // points earned per ₦1,000 spent
  pointsValueKobo: number; // value of one point in kobo
  eligibleCategorySlugs: string[];
  expiryDays: number;
  redemptionNote: string;
};

export const REWARDS_OFF: RewardsConfig = {
  enabled: false,
  pointsPerNaira: 0,
  pointsValueKobo: 0,
  eligibleCategorySlugs: [],
  expiryDays: 0,
  redemptionNote: "",
};

export async function getRewardsConfig(): Promise<RewardsConfig> {
  const cfg = await getSetting<RewardsConfig>("rewards", REWARDS_OFF);
  return {
    ...REWARDS_OFF,
    ...cfg,
    // A programme with zero value per point or zero earn rate is not live.
    enabled: Boolean(cfg?.enabled) && cfg.pointsPerNaira > 0 && cfg.pointsValueKobo > 0,
  };
}

export function pointsForOrder(totalKobo: number, cfg: RewardsConfig): number {
  if (!cfg.enabled) return 0;
  return Math.floor((totalKobo / 100000) * cfg.pointsPerNaira);
}

export function pointsValueKobo(points: number, cfg: RewardsConfig): number {
  if (!cfg.enabled) return 0;
  return points * cfg.pointsValueKobo;
}

// ── TisasNG client — DOCUMENTED endpoints only ───────────────────────
//
// Official information available to this project:
//   Base URL:  https://account.tisasng.com/api
//   Auth:      X-API-KEY header, secret read from TISASNG_KEY
//   Documented endpoint: POST /balance  → { gifting: "50000.00", reward: "12450.00" }
//
// NO other endpoints (/redeem, /reward, /validate, /customer, /token/claim…)
// are documented, so none are implemented. Anything that would need an
// undocumented endpoint stays behind a feature flag and reports honestly.

const TISASNG_BASE_URL = "https://account.tisasng.com/api";

export function tisasngConfigured(): boolean {
  return Boolean(process.env.TISASNG_KEY);
}

/**
 * Verify the connection with the documented balance endpoint.
 * Server-side only — the response (including merchant balances) is never
 * returned to the browser; it is logged to external_reward_transactions.
 */
export async function tisasngCheckBalance(): Promise<{
  ok: boolean;
  error?: string;
  result?: Record<string, unknown>;
}> {
  const key = process.env.TISASNG_KEY;
  if (!key) return { ok: false, error: "TisasNG is not configured" };
  try {
    const res = await fetch(`${TISASNG_BASE_URL}/balance`, {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { ok: false, error: `TisasNG responded ${res.status}` };
    }
    const result = (await res.json()) as Record<string, unknown>;
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

/**
 * Whether the TisasNG gifting flow may be attempted. The official Gift Tokens
 * request/response specification is NOT yet available to this project, so
 * gifting is disabled — the internal DREAMZ ledger records rewards, and the
 * external gift step stays pending until the specification arrives.
 */
export function tisasngGiftingAvailable(): boolean {
  return false;
}
