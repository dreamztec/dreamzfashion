import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { referrers } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { recordReferralVisit } from "./referrals.server";

/**
 * Public referral-attribution endpoints. Only an approved/pending referrer's
 * own code resolves here; nothing about earnings is exposed at click time.
 */

const VisitSchema = z.object({
  code: z.string().min(3).max(24),
  landingPath: z.string().max(200).optional().or(z.literal("")),
  // Optional in-site destination (a product page, storefront link, etc.).
  // Only same-site paths are honoured.
  to: z
    .string()
    .max(300)
    .refine((v) => v === "" || v.startsWith("/"), "Destination must be a site path")
    .optional()
    .or(z.literal("")),
});

export const recordReferralVisitFn = createServerFn({ method: "POST" })
  .inputValidator(VisitSchema)
  .handler(async ({ data }) => {
    const [referrer] = await db
      .select({ id: referrers.id })
      .from(referrers)
      .where(eq(referrers.code, data.code.toUpperCase()))
      .limit(1);
    if (!referrer) return { ok: false as const, referrerId: null };

    // The attribution session id is issued server-side (random, opaque).
    const { randomUUID } = await import("node:crypto");
    const sessionId = randomUUID();
    await recordReferralVisit(referrer.id, sessionId, data.landingPath || "/");

    return {
      ok: true as const,
      referrerId: referrer.id,
      sessionId,
      to: data.to && data.to.startsWith("/") ? data.to : "/",
    };
  });

/**
 * Bind a stored attribution to the signed-in customer at registration time.
 * Called by the account dashboard after signup.
 */
export const bindReferralRegistration = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sessionId: z.string().min(6).max(80) }))
  .handler(async ({ data }) => {
    const { markAttributionRegistered } = await import("./referrals.server");
    const { getCurrentCustomer } = await import("./auth.server");
    const customer = await getCurrentCustomer();
    if (!customer) return { ok: false as const };
    await markAttributionRegistered(data.sessionId, customer.id);
    return { ok: true as const };
  });

/** Resolve a referral code publicly (for share-link previews) — id only. */
export const resolveReferralCode = createServerFn({ method: "GET" })
  .inputValidator(z.object({ code: z.string().min(3).max(24) }))
  .handler(async ({ data }) => {
    const [referrer] = await db
      .select({ id: referrers.id, status: referrers.status })
      .from(referrers)
      .where(and(eq(referrers.code, data.code.toUpperCase())))
      .limit(1);
    if (!referrer || referrer.status === "suspended") return { exists: false as const };
    return { exists: true as const };
  });
