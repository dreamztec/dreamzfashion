import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { settings, vouchers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { claimVoucherToCustomer, lookupVoucher } from "./vouchers.server";
import { getCurrentCustomer } from "./auth.server";
import { appendLedger } from "./rewards-ledger.server";
import { consumeRateLimit, clientIp } from "./rate-limit.server";

/**
 * Voucher endpoints for the storefront. Codes are validated server-side;
 * the voucher table is never enumerated publicly.
 */

const CodeSchema = z.object({
  code: z.string().min(4).max(40),
});

/** Shared throttle: codes are checked unauthenticated, so attempts must be
 * rate-limited or the endpoint becomes a brute-forceable free-money oracle. */
async function voucherThrottle() {
  return consumeRateLimit("voucher-lookup", clientIp(), 10, 5 * 60);
}

/** Validate a printed voucher code and return a customer-safe projection. */
export const validateVoucherCode = createServerFn({ method: "POST" })
  .inputValidator(CodeSchema)
  .handler(async ({ data }) => {
    const limit = await voucherThrottle();
    if (!limit.ok) {
      return { ok: false as const, reason: "Too many voucher checks. Please try again shortly." };
    }
    const check = await lookupVoucher(data.code);
    if (!check.ok || !check.voucher) {
      return { ok: false as const, reason: check.reason ?? "We couldn't validate this voucher." };
    }
    const v = check.voucher;
    // Fixed/credit vouchers render as value; percentage vouchers as %.
    return {
      ok: true as const,
      voucher: {
        code: v.code,
        type: v.type,
        // percentage vouchers carry basis points in `value`
        valueLabel:
          v.type === "percentage"
            ? `${Math.round(v.value / 100)}% off`
            : `₦${Math.round(v.value / 100).toLocaleString("en-NG")}`,
        minimumSpendKobo: v.minimumSpend,
        expiresAt: v.expiresAt,
        status: v.status,
      },
    };
  });

/** Claim a voucher into the signed-in customer's wallet. */
export const claimVoucherCode = createServerFn({ method: "POST" })
  .inputValidator(CodeSchema)
  .handler(async ({ data }) => {
    const limit = await voucherThrottle();
    if (!limit.ok) {
      return { ok: false as const, reason: "Too many voucher checks. Please try again shortly." };
    }
    const customer = await getCurrentCustomer();
    if (!customer) {
      return {
        ok: false as const,
        reason: "Create a DREAMZ account or sign in to keep this voucher in your wallet.",
        requireAuth: true,
      };
    }
    const check = await lookupVoucher(data.code);
    if (!check.ok || !check.voucher) {
      return { ok: false as const, reason: check.reason ?? "We couldn't validate this voucher." };
    }
    const claim = await claimVoucherToCustomer(check.voucher.id, customer.id);
    if (!claim.ok) {
      return { ok: false as const, reason: claim.reason ?? "This voucher could not be claimed." };
    }
    // A campaign voucher may grant points at claim time — config-driven only.
    const [row] = await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.id, check.voucher.id))
      .limit(1);
    if (row?.type === "campaign_reward" && row.value > 0) {
      const [cfgRow] = await db.select().from(settings).where(eq(settings.key, "rewards")).limit(1);
      const cfg = cfgRow?.value as { enabled?: boolean } | undefined;
      if (cfg?.enabled) {
        await appendLedger({
          customerId: customer.id,
          currency: "points",
          type: "voucher_claimed",
          amount: Math.round(row.value / 100),
          status: "approved",
          source: "dreamz",
          reference: row.code,
          note: `Voucher ${row.code} claimed`,
        });
      }
    }
    return { ok: true as const, code: check.voucher.code };
  });
