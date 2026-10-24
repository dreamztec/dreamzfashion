import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { partnerProfiles, products, referrers } from "../../db/schema";
import { generateUniqueReferralCode } from "./referrals.server";
import { isValidNigerianPhone } from "@/lib/format";
import { getCurrentCustomer } from "./auth.server";

/**
 * Public partner application + partner dashboard functions.
 * Applications go to the referrers table with track referral|creator|trade;
 * admin approval unlocks links/storefronts. No rate is promised anywhere —
 * terms come from admin configuration after approval.
 */

const ApplySchema = z.object({
  track: z.enum(["referral", "creator", "trade"]),
  displayName: z.string().min(2).max(120),
  email: z.string().email().max(140),
  phone: z
    .string()
    .refine(isValidNigerianPhone, "Please enter a valid Nigerian phone number"),
  socialProfile: z.string().max(300).optional().or(z.literal("")),
  storeName: z.string().max(120).optional().or(z.literal("")),
  businessName: z.string().max(160).optional().or(z.literal("")),
  audience: z.string().max(600).optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
  agreedTerms: z.literal(true),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(): boolean {
  let ip = "unknown";
  try {
    ip = getRequest().headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    /* no request context */
  }
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 4;
}

export const applyAsPartner = createServerFn({ method: "POST" })
  .inputValidator(ApplySchema)
  .handler(async ({ data }) => {
    if (rateLimited()) {
      throw new Error("Too many applications — please try again later.");
    }
    // A signed-in customer applying becomes their own referrer record
    // (self-referral purchases never earn — guarded at payment time).
    const customer = await getCurrentCustomer().catch(() => null);

    // One pending application per email: re-applying updates the existing row.
    const [existing] = await db
      .select({ id: referrers.id })
      .from(referrers)
      .where(eq(referrers.email, data.email.toLowerCase()))
      .limit(1);
    if (existing) {
      await db
        .update(referrers)
        .set({
          track: data.track,
          displayName: data.displayName,
          phone: data.phone,
          socialProfile: data.socialProfile || null,
          agreedTerms: true,
          updatedAt: new Date(),
        })
        .where(eq(referrers.id, existing.id));
      return { ok: true as const, resubmitted: true };
    }

    const code = await generateUniqueReferralCode();
    await db.insert(referrers).values({
      code,
      track: data.track,
      // New partner types sit in review; status stays pending until the
      // house approves. Customer link is attached when signed in.
      customerId: customer?.id ?? null,
      status: "pending",
      displayName: data.displayName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      school: data.track === "trade" ? data.businessName || null : null,
      socialProfile: data.socialProfile || null,
      agreedTerms: true,
    });
    return { ok: true as const, resubmitted: false };
  });

// ── Partner dashboard (identity-gated to their own records) ──────────

function getReferrerIdForSession(): Promise<number | null> {
  return (async () => {
    const customer = await getCurrentCustomer();
    if (!customer) return null;
    const [row] = await db
      .select({ id: referrers.id })
      .from(referrers)
      .where(eq(referrers.customerId, customer.id))
      .limit(1);
    return row?.id ?? null;
  })();
}

export const getMyPartnerDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const referrerId = await getReferrerIdForSession();
  if (!referrerId) return { partner: false as const };
  const { getPartnerDashboard } = await import("./partners.server");
  const data = await getPartnerDashboard(referrerId);
  if (!data) return { partner: false as const };
  return { partner: true as const, data };
});

export const requestMyPayout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ destination: z.string().min(4).max(200) }))
  .handler(async ({ data }) => {
    const referrerId = await getReferrerIdForSession();
    if (!referrerId) throw new Error("No partner account found");
    const { requestPayout } = await import("./partners.server");
    await requestPayout(referrerId, data.destination);
    return { ok: true as const };
  });

/** Creator updates their storefront presentation (content only — never pricing). */
export const saveMyStorefront = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      storeName: z.string().min(2).max(120),
      bio: z.string().max(1000).optional().or(z.literal("")),
      instagram: z.string().max(200).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const referrerId = await getReferrerIdForSession();
    if (!referrerId) throw new Error("No partner account found");
    const [existing] = await db
      .select({ id: partnerProfiles.id })
      .from(partnerProfiles)
      .where(eq(partnerProfiles.referrerId, referrerId))
      .limit(1);
    if (!existing) throw new Error("Your storefront is created after approval");
    await db
      .update(partnerProfiles)
      .set({
        storeName: data.storeName,
        bio: data.bio || null,
        instagram: data.instagram || null,
        updatedAt: new Date(),
      })
      .where(eq(partnerProfiles.id, existing.id));
    return { ok: true as const };
  });

/**
 * Creator submits an original design (a named-collection request). Goes into
 * design_requests tagged with the partner — DREAMZ reviews feasibility,
 * cost, price and commission before anything is published.
 */
export const submitCreatorDesign = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productType: z.string().min(2).max(80),
      collectionName: z.string().min(2).max(120),
      description: z.string().min(10).max(2000),
      colors: z.string().max(200).optional().or(z.literal("")),
      materials: z.string().max(200).optional().or(z.literal("")),
      referenceUrl: z.string().max(400).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const referrerId = await getReferrerIdForSession();
    if (!referrerId) throw new Error("No partner account found");
    const [partner] = await db
      .select({ status: referrers.status })
      .from(referrers)
      .where(eq(referrers.id, referrerId))
      .limit(1);
    if (!partner || partner.status !== "approved") {
      throw new Error("Design submissions open after approval");
    }
    const { designRequests } = await import("../../db/schema");
    const { generateRequestNumber } = await import("@/lib/format");
    await db.insert(designRequests).values({
      requestNumber: generateRequestNumber(),
      customerName: `Partner #${referrerId}`,
      specification: {
        source: "creator_partner",
        referrerId,
        productType: data.productType,
        collectionName: data.collectionName,
        description: data.description,
        colors: data.colors || "",
        materials: data.materials || "",
        referenceUrl: data.referenceUrl || "",
      },
      status: "new",
    });
    return { ok: true as const };
  });

/** Curated products for the storefront editor (approved catalogue only). */
export const listCuratableProducts = createServerFn({ method: "GET" }).handler(async () => {
  const referrerId = await getReferrerIdForSession();
  if (!referrerId) throw new Error("No partner account found");
  const rows = await db
    .select({ id: products.id, name: products.name, tier: products.tier })
    .from(products)
    .where(eq(products.status, "published"))
    .limit(200);
  return rows;
});
