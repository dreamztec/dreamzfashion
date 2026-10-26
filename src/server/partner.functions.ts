import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { partnerProfiles, products, referrers } from "../../db/schema";
import { generateUniqueReferralCode } from "./referrals.server";
import { isValidNigerianPhone } from "@/lib/format";
import { getPartnerPlan } from "@/lib/partner-plans";
import { normalizePartnerCode } from "@/lib/attribution";
import { getCurrentCustomer } from "./auth.server";

/**
 * Public partner application + partner dashboard functions.
 * Applications go to the referrers table with track referral|creator|trade;
 * admin approval unlocks links/storefronts. No rate is promised anywhere —
 * terms come from admin configuration after approval.
 */

const ApplySchema = z.object({
  sellingMode: z.enum(["digital", "physical", "both"]).default("digital"),
  partnerPlan: z.enum(["scout", "starter", "builder", "pro", "growth", "executive", "prestige", "flagship"]).default("scout"),
  physicalModel: z.enum(["undecided", "bulk", "credit", "commission"]).default("undecided"),
  introducerCode: z.string().max(24).optional().or(z.literal("")),
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
    const plan = getPartnerPlan(data.partnerPlan);
    // Digital sellers use the creator commission ledger; physical/both sellers
    // use the trade ledger. Neither path creates a downline.
    const track = data.sellingMode === "digital" ? "creator" : "trade";
    const requestedIntroducer = normalizePartnerCode(data.introducerCode);
    let introducerCode: string | null = null;
    if (requestedIntroducer) {
      const [introducer] = await db
        .select({ id: referrers.id, email: referrers.email })
        .from(referrers)
        .where(eq(referrers.code, requestedIntroducer))
        .limit(1);
      if (introducer && introducer.email?.toLowerCase() !== data.email.toLowerCase()) {
        introducerCode = requestedIntroducer;
      }
    }
    const membershipPaymentStatus = plan.feeKobo > 0 ? "payment_requested" : "not_required";

    // One pending application per email: re-applying updates the existing row.
    const [existing] = await db
      .select({
        id: referrers.id,
        status: referrers.status,
        code: referrers.code,
        partnerPlan: referrers.partnerPlan,
        membershipPaymentStatus: referrers.membershipPaymentStatus,
      })
      .from(referrers)
      .where(eq(referrers.email, data.email.toLowerCase()))
      .limit(1);
    if (existing && existing.status === "approved") {
      const existingPlan = getPartnerPlan(existing.partnerPlan);
      return {
        ok: true as const,
        resubmitted: true,
        applicationCode: existing.code,
        planId: existingPlan.id,
        planName: existingPlan.name,
        feeKobo: existingPlan.feeKobo,
        paymentRequested: existingPlan.feeKobo > 0 && !["paid", "waived"].includes(existing.membershipPaymentStatus),
      };
    }
    if (existing) {
      await db
        .update(referrers)
        .set({
          track,
          displayName: data.displayName,
          phone: data.phone,
          socialProfile: data.socialProfile || null,
          school: data.sellingMode === "digital" ? null : data.businessName || null,
          agreedTerms: true,
          sellingMode: data.sellingMode,
          partnerPlan: data.partnerPlan,
          physicalModel: data.sellingMode === "digital" ? "undecided" : data.physicalModel,
          membershipPaymentStatus,
          membershipStartsAt: null,
          membershipExpiresAt: null,
          introducerCode,
          updatedAt: new Date(),
        })
        .where(eq(referrers.id, existing.id));
      return {
        ok: true as const,
        resubmitted: true,
        applicationCode: null,
        planId: plan.id,
        planName: plan.name,
        feeKobo: plan.feeKobo,
        paymentRequested: plan.feeKobo > 0,
      };
    }

    const code = await generateUniqueReferralCode();
    await db.insert(referrers).values({
      code,
      track,
      // Every application sits in review. Paid plans start their 365-day term
      // only after DREAMZ records the membership payment as paid/waived.
      customerId: customer?.id ?? null,
      status: "pending",
      displayName: data.displayName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      school: data.sellingMode === "digital" ? null : data.businessName || null,
      socialProfile: data.socialProfile || null,
      agreedTerms: true,
      sellingMode: data.sellingMode,
      partnerPlan: data.partnerPlan,
      physicalModel: data.sellingMode === "digital" ? "undecided" : data.physicalModel,
      membershipPaymentStatus,
      introducerCode,
    });
    return {
      ok: true as const,
      resubmitted: false,
      applicationCode: code,
      planId: plan.id,
      planName: plan.name,
      feeKobo: plan.feeKobo,
      paymentRequested: plan.feeKobo > 0,
    };
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

/** Public partner terms for the Creators & Partners page — no private data. */
export const getPublicPartnerTerms = createServerFn({ method: "GET" }).handler(async () => {
  const { getPartnerSettingsFull } = await import("./order-pricing.server");
  const { formatRate } = await import("../lib/attribution");
  const t = await getPartnerSettingsFull();
  return {
    rateConfigured: t.commissionBps > 0,
    rateLabel: formatRate(t.commissionBps),
    returnWindowDays: t.returnWindowDays,
    payoutThresholdKobo: t.payoutThresholdKobo,
    attributionWindowDays: t.attributionWindowDays,
    selfPurchaseBenefitBps: t.selfPurchaseBenefitBps,
    termsNote: t.termsNote,
  };
});
