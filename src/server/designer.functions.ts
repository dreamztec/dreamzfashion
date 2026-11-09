
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../../db/index";
import {
  analyticsEvents,
  designApprovalFeedback,
  designLikes,
  designOrderIntents,
  designerProfiles,
  designerUpgradeRequests,
  referrers,
  savedBriefs,
} from "../../db/schema";
import { getCurrentCustomer } from "./auth.server";
import { getDesignerPlan, type DesignerPlanId } from "@/lib/designer-plans";
import { dreamContestScore, isDreamPrizeEligible } from "@/lib/dream-contest";

const PayloadSchema = z.object({
  answers: z.record(z.string(), z.unknown()).default({}),
  designSummary: z.string().max(6000).optional().or(z.literal("")),
  renderPrompt: z.string().max(12000).optional().or(z.literal("")),
  artisanBrief: z.string().max(6000).optional().or(z.literal("")),
  visualPreview: z.record(z.string(), z.unknown()).optional(),
  referenceIds: z.array(z.string().regex(/^ref_[A-Z0-9]{20}$/)).max(4).optional(),
});

const SaveDesignSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1).max(120),
  category: z.string().max(30).optional().or(z.literal("")),
  piece: z.string().max(80).optional().or(z.literal("")),
  payload: PayloadSchema,
  publish: z.boolean().default(false),
  projectMode: z.enum(["self", "gift", "client", "family"]).default("self"),
  clientLabel: z.string().max(120).optional().or(z.literal("")),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomSuffix(length = 8): string {
  return randomUUID().replace(/-/g, "").slice(0, length);
}

function effectivePlan(profile: { plan: string; planExpiresAt: Date | null }): DesignerPlanId {
  if (profile.plan !== "free" && profile.planExpiresAt && profile.planExpiresAt.getTime() < Date.now()) {
    return "free";
  }
  return (["free", "creator", "studio", "pro"].includes(profile.plan) ? profile.plan : "free") as DesignerPlanId;
}

function dreamSeedFromPayload(payload: z.infer<typeof PayloadSchema>): string {
  const answers = payload.answers || {};
  const meanings = answers.meaning;
  if (Array.isArray(meanings) && meanings.length && typeof meanings[0] === "string") return meanings[0];
  const customMeaning = answers.customMeaning;
  if (typeof customMeaning === "string" && customMeaning.trim()) return customMeaning.trim().slice(0, 60);
  return "";
}

type CurrentCustomer = NonNullable<Awaited<ReturnType<typeof getCurrentCustomer>>>;

function publicPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const answers =
    payload.answers && typeof payload.answers === "object"
      ? (payload.answers as Record<string, unknown>)
      : {};
  const safeAnswers = {
    category: typeof answers.category === "string" ? answers.category : null,
    piece: typeof answers.piece === "string" ? answers.piece : null,
    meaning: Array.isArray(answers.meaning)
      ? answers.meaning.filter((value): value is string => typeof value === "string").slice(0, 3)
      : [],
    customMeaning: typeof answers.customMeaning === "string" ? answers.customMeaning.slice(0, 120) : "",
    feel: Array.isArray(answers.feel)
      ? answers.feel.filter((value): value is string => typeof value === "string").slice(0, 4)
      : [],
    primaryColour: typeof answers.primaryColour === "string" ? answers.primaryColour : "",
    secondaryColour: typeof answers.secondaryColour === "string" ? answers.secondaryColour : "",
    material: typeof answers.material === "string" ? answers.material : "",
    texture: typeof answers.texture === "string" ? answers.texture : "",
  };

  const summaryLines = [
    safeAnswers.piece ? `Product: ${safeAnswers.piece}` : "",
    safeAnswers.meaning.length || safeAnswers.customMeaning
      ? `Meaning: ${[...safeAnswers.meaning, safeAnswers.customMeaning].filter(Boolean).join(" — ")}`
      : "",
    safeAnswers.feel.length ? `Character: ${safeAnswers.feel.join(", ")}` : "",
    safeAnswers.primaryColour
      ? `Colours: ${safeAnswers.primaryColour}${safeAnswers.secondaryColour ? ` + ${safeAnswers.secondaryColour}` : ""}`
      : "",
    safeAnswers.material ? `Leather: ${safeAnswers.material}` : "",
    safeAnswers.texture ? `Finish: ${safeAnswers.texture}` : "",
  ].filter(Boolean);

  const rawPreview =
    payload.visualPreview && typeof payload.visualPreview === "object"
      ? (payload.visualPreview as Record<string, unknown>)
      : {};
  const rawConstruction =
    rawPreview.construction && typeof rawPreview.construction === "object"
      ? (rawPreview.construction as Record<string, unknown>)
      : {};
  const allowedConstructionKeys = [
    "soleType",
    "buckleStyle",
    "hardwareFinish",
    "heelType",
    "closure",
    "toeShape",
    "stitchColour",
    "edgeFinish",
  ];
  const safeConstruction = Object.fromEntries(
    allowedConstructionKeys
      .map((key) => [key, typeof rawConstruction[key] === "string" ? String(rawConstruction[key]).slice(0, 80) : ""])
      .filter(([, value]) => Boolean(value)),
  );
  // Public Dream pages always rebuild from the neutral Studio silhouette.
  // Old catalogue-image references are deliberately discarded.
  const previewImage = null;

  return {
    answers: safeAnswers,
    designSummary: summaryLines.join("\n"),
    visualPreview: {
      piece: safeAnswers.piece,
      material: safeAnswers.material,
      texture: safeAnswers.texture,
      primaryColour: safeAnswers.primaryColour,
      secondaryColour: safeAnswers.secondaryColour,
      image: previewImage,
      construction: safeConstruction,
    },
  };
}

async function ensureDesignerProfile(
  customer: CurrentCustomer,
  dreamSeed = "",
) {
  const [existing] = await db
    .select()
    .from(designerProfiles)
    .where(eq(designerProfiles.customerId, customer.id))
    .limit(1);
  if (existing) return existing;

  const safeSeed = slugify(dreamSeed) || slugify(customer.fullName) || "dreamer";
  const slug = safeSeed + "-" + randomSuffix(8);
  const displayName = customer.fullName.trim() || "DREAMZ Dreamer";
  const dreamStatement = dreamSeed ? "My dream: " + dreamSeed : "";

  const [created] = await db
    .insert(designerProfiles)
    .values({
      customerId: customer.id,
      slug,
      displayName,
      dreamStatement,
      plan: "free",
      isPublic: true,
    })
    .returning();
  return created;
}

async function approvedEarnCode(customerId: number): Promise<string | null> {
  const [row] = await db
    .select({ code: referrers.code })
    .from(referrers)
    .where(and(eq(referrers.customerId, customerId), eq(referrers.status, "approved")))
    .limit(1);
  return row?.code || null;
}

async function countLikes(briefId: number): Promise<number> {
  const rows = await db.select({ id: designLikes.id }).from(designLikes).where(eq(designLikes.briefId, briefId));
  return rows.length;
}

async function designOrderStats(briefId: number): Promise<{ interestCount: number; verifiedOrders: number }> {
  const rows = await db
    .select({ status: designOrderIntents.status })
    .from(designOrderIntents)
    .where(eq(designOrderIntents.briefId, briefId));
  let interestCount = 0;
  let verifiedOrders = 0;
  for (const row of rows) {
    if (row.status !== "cancelled") interestCount += 1;
    if (row.status === "verified") verifiedOrders += 1;
  }
  return { interestCount, verifiedOrders };
}

async function profileDesigns(profileId: number) {
  const rows = await db
    .select()
    .from(savedBriefs)
    .where(eq(savedBriefs.designerProfileId, profileId))
    .orderBy(desc(savedBriefs.updatedAt))
    .limit(200);
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      piece: row.piece,
      status: row.status,
      visibility: row.visibility,
      publicSlug: row.publicSlug,
      projectMode: row.projectMode,
      clientLabel: row.clientLabel,
      designVersion: row.designVersion,
      approvalToken: row.approvalToken,
      approvalStatus: row.approvalStatus,
      viewCount: row.viewCount,
      shareCount: row.shareCount,
      createdAt: row.createdAt?.toISOString() || null,
      updatedAt: row.updatedAt?.toISOString() || null,
      payload: row.payload,
      likeCount: row.visibility === "public" ? await countLikes(row.id) : 0,
    })),
  );
}

export const getMyDesignerState = createServerFn({ method: "GET" }).handler(async () => {
  const customer = await getCurrentCustomer().catch(() => null);
  if (!customer) {
    return {
      unauthenticated: true as const,
      profile: null,
      plan: getDesignerPlan("free"),
      designs: [],
      used: 0,
      remaining: 3,
      pendingUpgrade: null,
    };
  }

  const [profile] = await db
    .select()
    .from(designerProfiles)
    .where(eq(designerProfiles.customerId, customer.id))
    .limit(1);

  if (!profile) {
    const free = getDesignerPlan("free");
    return {
      unauthenticated: false as const,
      profile: null,
      earnCode: await approvedEarnCode(customer.id),
      plan: free,
      designs: [],
      used: 0,
      remaining: free.designLimit,
      pendingUpgrade: null,
    };
  }

  const planId = effectivePlan(profile);
  const plan = getDesignerPlan(planId);
  const designs = await profileDesigns(profile.id);
  const [pendingUpgrade] = await db
    .select()
    .from(designerUpgradeRequests)
    .where(and(eq(designerUpgradeRequests.designerProfileId, profile.id), eq(designerUpgradeRequests.status, "pending")))
    .orderBy(desc(designerUpgradeRequests.createdAt))
    .limit(1);

  return {
    unauthenticated: false as const,
    earnCode: await approvedEarnCode(customer.id),
    profile: {
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      dreamStatement: profile.dreamStatement,
      bio: profile.bio,
      plan: planId,
      isPublic: profile.isPublic,
      foundingNumber: profile.id <= 200 ? profile.id : null,
    },
    plan,
    designs,
    used: designs.length,
    remaining: Math.max(0, plan.designLimit - designs.length),
    pendingUpgrade: pendingUpgrade
      ? { requestedPlan: pendingUpgrade.requestedPlan, createdAt: pendingUpgrade.createdAt?.toISOString() || null }
      : null,
  };
});

export const getMyDesignerDraft = createServerFn({ method: "GET" })
  .inputValidator(z.number().int().positive())
  .handler(async ({ data: id }) => {
    const customer = await getCurrentCustomer().catch(() => null);
    if (!customer) return { found: false as const, reason: "signin" as const };
    const [row] = await db
      .select()
      .from(savedBriefs)
      .where(and(eq(savedBriefs.id, id), eq(savedBriefs.customerId, customer.id)))
      .limit(1);
    if (!row) return { found: false as const, reason: "missing" as const };
    return {
      found: true as const,
      design: {
        id: row.id,
        title: row.title,
        category: row.category,
        piece: row.piece,
        payload: row.payload,
        visibility: row.visibility,
        publicSlug: row.publicSlug,
        projectMode: row.projectMode,
        clientLabel: row.clientLabel,
        designVersion: row.designVersion,
        approvalToken: row.approvalToken,
        approvalStatus: row.approvalStatus,
      },
    };
  });

export const saveDesignerDesign = createServerFn({ method: "POST" })
  .inputValidator(SaveDesignSchema)
  .handler(async ({ data }) => {
    const customer = await getCurrentCustomer().catch(() => null);
    if (!customer) return { ok: false as const, reason: "signin" as const };

    const profile = await ensureDesignerProfile(customer, dreamSeedFromPayload(data.payload));
    const planId = effectivePlan(profile);
    const plan = getDesignerPlan(planId);

    if ((data.projectMode === "client" || data.projectMode === "family") && !["studio", "pro"].includes(planId)) {
      return { ok: false as const, reason: "upgrade" as const, requiredPlan: "studio" as const };
    }

    if (data.id) {
      const [existing] = await db
        .select()
        .from(savedBriefs)
        .where(and(eq(savedBriefs.id, data.id), eq(savedBriefs.customerId, customer.id)))
        .limit(1);
      if (!existing) return { ok: false as const, reason: "missing" as const };

      const publicSlug =
        data.publish && !existing.publicSlug
          ? (slugify(data.title) || "dream-design") + "-" + randomSuffix(7)
          : existing.publicSlug;
      const isApprovalProject = data.projectMode === "client" || data.projectMode === "family";
      const approvalToken = isApprovalProject
        ? existing.approvalToken || randomSuffix(32).toUpperCase()
        : null;
      const approvalStatus = isApprovalProject ? "pending" : null;

      const [updated] = await db
        .update(savedBriefs)
        .set({
          designerProfileId: profile.id,
          title: data.title,
          category: data.category || null,
          piece: data.piece || null,
          payload: data.payload as Record<string, unknown>,
          visibility: data.publish ? "public" : "private",
          publicSlug,
          projectMode: data.projectMode,
          clientLabel: data.clientLabel || null,
          designVersion: (existing.designVersion || 1) + 1,
          approvalToken,
          approvalStatus,
          updatedAt: new Date(),
        })
        .where(eq(savedBriefs.id, existing.id))
        .returning();

      if (data.publish) {
        await db.insert(analyticsEvents).values({
          eventName: "dream_design_published",
          metadata: { briefId: updated.id, designerProfileId: profile.id, projectMode: data.projectMode },
        });
      }

      const designs = await profileDesigns(profile.id);
      return {
        ok: true as const,
        id: updated.id,
        publicSlug: updated.publicSlug,
        visibility: updated.visibility,
        profileSlug: profile.slug,
        approvalToken: updated.approvalToken,
        approvalStatus: updated.approvalStatus,
        plan,
        remaining: Math.max(0, plan.designLimit - designs.length),
      };
    }

    const existingDesigns = await db
      .select({ id: savedBriefs.id })
      .from(savedBriefs)
      .where(eq(savedBriefs.designerProfileId, profile.id));

    if (existingDesigns.length >= plan.designLimit) {
      return {
        ok: false as const,
        reason: "limit" as const,
        plan,
        used: existingDesigns.length,
        limit: plan.designLimit,
      };
    }

    const publicSlug = data.publish
      ? (slugify(data.title) || "dream-design") + "-" + randomSuffix(7)
      : null;
    const isApprovalProject = data.projectMode === "client" || data.projectMode === "family";
    const approvalToken = isApprovalProject ? randomSuffix(32).toUpperCase() : null;
    const approvalStatus = isApprovalProject ? "pending" : null;

    const [created] = await db
      .insert(savedBriefs)
      .values({
        customerId: customer.id,
        designerProfileId: profile.id,
        publicSlug,
        visibility: data.publish ? "public" : "private",
        projectMode: data.projectMode,
        clientLabel: data.clientLabel || null,
        designVersion: 1,
        approvalToken,
        approvalStatus,
        title: data.title,
        category: data.category || null,
        piece: data.piece || null,
        payload: data.payload as Record<string, unknown>,
        status: "draft",
      })
      .returning();

    await db.insert(analyticsEvents).values({
      eventName: data.publish ? "dream_design_published" : "dream_design_saved",
      metadata: { briefId: created.id, designerProfileId: profile.id, plan: planId, projectMode: data.projectMode },
    });

    return {
      ok: true as const,
      id: created.id,
      publicSlug: created.publicSlug,
      visibility: created.visibility,
      profileSlug: profile.slug,
      approvalToken: created.approvalToken,
      approvalStatus: created.approvalStatus,
      plan,
      remaining: Math.max(0, plan.designLimit - existingDesigns.length - 1),
    };
  });

export const updateDesignerProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      displayName: z.string().min(1).max(80),
      dreamStatement: z.string().max(180).optional().or(z.literal("")),
      bio: z.string().max(600).optional().or(z.literal("")),
      isPublic: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const customer = await getCurrentCustomer().catch(() => null);
    if (!customer) return { ok: false as const, reason: "signin" as const };
    const profile = await ensureDesignerProfile(customer);
    const [updated] = await db
      .update(designerProfiles)
      .set({
        displayName: data.displayName.trim(),
        dreamStatement: data.dreamStatement?.trim() || "",
        bio: data.bio?.trim() || "",
        isPublic: data.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(designerProfiles.id, profile.id))
      .returning();
    return { ok: true as const, slug: updated.slug };
  });

export const requestDesignerUpgrade = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      requestedPlan: z.enum(["creator", "studio", "pro"]),
      note: z.string().max(500).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const customer = await getCurrentCustomer().catch(() => null);
    if (!customer) return { ok: false as const, reason: "signin" as const };
    const profile = await ensureDesignerProfile(customer);
    const [existing] = await db
      .select()
      .from(designerUpgradeRequests)
      .where(
        and(
          eq(designerUpgradeRequests.designerProfileId, profile.id),
          eq(designerUpgradeRequests.requestedPlan, data.requestedPlan),
          eq(designerUpgradeRequests.status, "pending"),
        ),
      )
      .limit(1);
    if (existing) return { ok: true as const, pending: true as const };

    await db.insert(designerUpgradeRequests).values({
      designerProfileId: profile.id,
      requestedPlan: data.requestedPlan,
      status: "pending",
      note: data.note || null,
    });
    return { ok: true as const, pending: true as const };
  });

export const getPublicDesignerProfile = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(3).max(80))
  .handler(async ({ data: slug }) => {
    const [profile] = await db
      .select()
      .from(designerProfiles)
      .where(and(eq(designerProfiles.slug, slug), eq(designerProfiles.isPublic, true)))
      .limit(1);
    if (!profile) return null;

    const rows = await db
      .select()
      .from(savedBriefs)
      .where(and(eq(savedBriefs.designerProfileId, profile.id), eq(savedBriefs.visibility, "public")))
      .orderBy(desc(savedBriefs.updatedAt))
      .limit(100);

    const designs = await Promise.all(
      rows.map(async (row) => {
        const likeCount = await countLikes(row.id);
        const orders = await designOrderStats(row.id);
        return {
          id: row.id,
          title: row.title,
          category: row.category,
          piece: row.piece,
          publicSlug: row.publicSlug,
          designVersion: row.designVersion,
          updatedAt: row.updatedAt?.toISOString() || null,
          payload: publicPayload(row.payload),
          likeCount,
          viewCount: row.viewCount,
          shareCount: row.shareCount,
          interestCount: orders.interestCount,
          verifiedOrders: orders.verifiedOrders,
          contestScore: dreamContestScore({ verifiedOrders: orders.verifiedOrders, likeCount, shareCount: row.shareCount }),
        };
      }),
    );

    return {
      earnCode: await approvedEarnCode(profile.customerId),
      profile: {
        slug: profile.slug,
        displayName: profile.displayName,
        dreamStatement: profile.dreamStatement,
        bio: profile.bio,
        foundingNumber: profile.id <= 200 ? profile.id : null,
      },
      designs,
    };
  });

export const getPublicDesign = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(3).max(100))
  .handler(async ({ data: slug }) => {
    const [design] = await db
      .select()
      .from(savedBriefs)
      .where(and(eq(savedBriefs.publicSlug, slug), eq(savedBriefs.visibility, "public")))
      .limit(1);
    if (!design || !design.designerProfileId) return null;

    const [profile] = await db
      .select()
      .from(designerProfiles)
      .where(and(eq(designerProfiles.id, design.designerProfileId), eq(designerProfiles.isPublic, true)))
      .limit(1);
    if (!profile) return null;

    const customer = await getCurrentCustomer().catch(() => null);
    let likedByMe = false;
    if (customer) {
      const [mine] = await db
        .select({ id: designLikes.id })
        .from(designLikes)
        .where(and(eq(designLikes.briefId, design.id), eq(designLikes.customerId, customer.id)))
        .limit(1);
      likedByMe = Boolean(mine);
    }

    const likeCount = await countLikes(design.id);
    const orders = await designOrderStats(design.id);

    return {
      design: {
        id: design.id,
        title: design.title,
        category: design.category,
        piece: design.piece,
        projectMode: design.projectMode,
        designVersion: design.designVersion,
        payload: publicPayload(design.payload),
        updatedAt: design.updatedAt?.toISOString() || null,
        likeCount,
        likedByMe,
        viewCount: design.viewCount,
        shareCount: design.shareCount,
        interestCount: orders.interestCount,
        verifiedOrders: orders.verifiedOrders,
        prizeEligible: isDreamPrizeEligible({ verifiedOrders: orders.verifiedOrders }),
        contestScore: dreamContestScore({ verifiedOrders: orders.verifiedOrders, likeCount, shareCount: design.shareCount }),
      },
      designer: {
        slug: profile.slug,
        displayName: profile.displayName,
        dreamStatement: profile.dreamStatement,
        foundingNumber: profile.id <= 200 ? profile.id : null,
        earnCode: await approvedEarnCode(profile.customerId),
      },
    };
  });

export const getClientApproval = createServerFn({ method: "GET" })
  .inputValidator(z.string().regex(/^[A-Z0-9]{32}$/))
  .handler(async ({ data: token }) => {
    const [design] = await db
      .select()
      .from(savedBriefs)
      .where(eq(savedBriefs.approvalToken, token))
      .limit(1);
    if (!design || !design.designerProfileId) return null;

    const [profile] = await db
      .select()
      .from(designerProfiles)
      .where(eq(designerProfiles.id, design.designerProfileId))
      .limit(1);
    if (!profile) return null;

    const feedback = await db
      .select()
      .from(designApprovalFeedback)
      .where(eq(designApprovalFeedback.briefId, design.id))
      .orderBy(desc(designApprovalFeedback.createdAt))
      .limit(10);

    return {
      design: {
        title: design.title,
        piece: design.piece,
        designVersion: design.designVersion,
        projectMode: design.projectMode,
        approvalStatus: design.approvalStatus || "pending",
        payload: publicPayload(design.payload),
      },
      designer: {
        displayName: profile.displayName,
        dreamStatement: profile.dreamStatement,
      },
      feedback: feedback.map((item) => ({
        decision: item.decision,
        message: item.message,
        createdAt: item.createdAt?.toISOString() || null,
      })),
    };
  });

export const submitClientApproval = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().regex(/^[A-Z0-9]{32}$/),
      decision: z.enum(["approved", "change_requested"]),
      message: z.string().max(1000).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const [design] = await db
      .select()
      .from(savedBriefs)
      .where(eq(savedBriefs.approvalToken, data.token))
      .limit(1);
    if (!design) return { ok: false as const, reason: "missing" as const };

    await db.insert(designApprovalFeedback).values({
      briefId: design.id,
      decision: data.decision,
      message: data.message?.trim() || null,
    });
    await db
      .update(savedBriefs)
      .set({ approvalStatus: data.decision, updatedAt: new Date() })
      .where(eq(savedBriefs.id, design.id));

    await db.insert(analyticsEvents).values({
      eventName: "dream_design_client_decision",
      metadata: { briefId: design.id, decision: data.decision },
    });

    return { ok: true as const, status: data.decision };
  });

export const recordDesignOrderIntent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string().min(3).max(100),
      sessionKey: z.string().regex(/^doi_[A-Za-z0-9_-]{12,80}$/),
    }),
  )
  .handler(async ({ data }) => {
    const [design] = await db
      .select({ id: savedBriefs.id, designerProfileId: savedBriefs.designerProfileId })
      .from(savedBriefs)
      .where(and(eq(savedBriefs.publicSlug, data.slug), eq(savedBriefs.visibility, "public")))
      .limit(1);
    if (!design) return { ok: false as const, reason: "missing" as const };

    const customer = await getCurrentCustomer().catch(() => null);
    await db
      .insert(designOrderIntents)
      .values({
        briefId: design.id,
        customerId: customer?.id ?? null,
        sessionKey: data.sessionKey,
        status: "intent",
      })
      .onConflictDoNothing();

    const stats = await designOrderStats(design.id);
    await db.insert(analyticsEvents).values({
      eventName: "dream_design_order_intent",
      metadata: { briefId: design.id, designerProfileId: design.designerProfileId },
    });
    return { ok: true as const, ...stats };
  });

export const getDreamLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db
    .select({
      id: savedBriefs.id,
      title: savedBriefs.title,
      piece: savedBriefs.piece,
      publicSlug: savedBriefs.publicSlug,
      payload: savedBriefs.payload,
      viewCount: savedBriefs.viewCount,
      shareCount: savedBriefs.shareCount,
      updatedAt: savedBriefs.updatedAt,
      profileSlug: designerProfiles.slug,
      displayName: designerProfiles.displayName,
      dreamStatement: designerProfiles.dreamStatement,
    })
    .from(savedBriefs)
    .innerJoin(designerProfiles, eq(savedBriefs.designerProfileId, designerProfiles.id))
    .where(and(eq(savedBriefs.visibility, "public"), eq(designerProfiles.isPublic, true)))
    .orderBy(desc(savedBriefs.updatedAt))
    .limit(300);

  const ranked = await Promise.all(
    rows.map(async (row) => {
      const likeCount = await countLikes(row.id);
      const orders = await designOrderStats(row.id);
      return {
        id: row.id,
        title: row.title,
        piece: row.piece,
        publicSlug: row.publicSlug,
        payload: publicPayload(row.payload),
        profileSlug: row.profileSlug,
        displayName: row.displayName,
        dreamStatement: row.dreamStatement,
        likeCount,
        shareCount: row.shareCount,
        viewCount: row.viewCount,
        interestCount: orders.interestCount,
        verifiedOrders: orders.verifiedOrders,
        contestScore: dreamContestScore({
          verifiedOrders: orders.verifiedOrders,
          likeCount,
          shareCount: row.shareCount,
        }),
        updatedAt: row.updatedAt?.toISOString() || null,
      };
    }),
  );

  return ranked
    .sort(
      (a, b) =>
        Number(b.prizeEligible) - Number(a.prizeEligible) ||
        b.contestScore - a.contestScore ||
        b.verifiedOrders - a.verifiedOrders ||
        b.likeCount - a.likeCount ||
        b.shareCount - a.shareCount,
    )
    .slice(0, 100)
    .map((item, index) => ({ ...item, rank: index + 1 }));
});

export const recordDesignView = createServerFn({ method: "POST" })
  .inputValidator(z.string().min(3).max(100))
  .handler(async ({ data: slug }) => {
    const [design] = await db
      .select({ id: savedBriefs.id })
      .from(savedBriefs)
      .where(and(eq(savedBriefs.publicSlug, slug), eq(savedBriefs.visibility, "public")))
      .limit(1);
    if (!design) return { ok: false as const };
    await db
      .update(savedBriefs)
      .set({ viewCount: sql`${savedBriefs.viewCount} + 1` })
      .where(eq(savedBriefs.id, design.id));
    return { ok: true as const };
  });

export const recordDesignShare = createServerFn({ method: "POST" })
  .inputValidator(z.string().min(3).max(100))
  .handler(async ({ data: slug }) => {
    const [design] = await db
      .select({ id: savedBriefs.id, designerProfileId: savedBriefs.designerProfileId })
      .from(savedBriefs)
      .where(and(eq(savedBriefs.publicSlug, slug), eq(savedBriefs.visibility, "public")))
      .limit(1);
    if (!design) return { ok: false as const };
    await db
      .update(savedBriefs)
      .set({ shareCount: sql`${savedBriefs.shareCount} + 1` })
      .where(eq(savedBriefs.id, design.id));
    await db.insert(analyticsEvents).values({
      eventName: "dream_design_shared",
      metadata: { briefId: design.id, designerProfileId: design.designerProfileId },
    });
    return { ok: true as const };
  });

export const toggleDesignLike = createServerFn({ method: "POST" })
  .inputValidator(z.string().min(3).max(100))
  .handler(async ({ data: slug }) => {
    const customer = await getCurrentCustomer().catch(() => null);
    if (!customer) return { ok: false as const, reason: "signin" as const };

    const [design] = await db
      .select()
      .from(savedBriefs)
      .where(and(eq(savedBriefs.publicSlug, slug), eq(savedBriefs.visibility, "public")))
      .limit(1);
    if (!design || !design.designerProfileId) return { ok: false as const, reason: "missing" as const };

    const [profile] = await db
      .select()
      .from(designerProfiles)
      .where(eq(designerProfiles.id, design.designerProfileId))
      .limit(1);
    if (profile?.customerId === customer.id) {
      return { ok: false as const, reason: "own_design" as const, likeCount: await countLikes(design.id) };
    }

    const [existing] = await db
      .select()
      .from(designLikes)
      .where(and(eq(designLikes.briefId, design.id), eq(designLikes.customerId, customer.id)))
      .limit(1);

    if (existing) {
      await db.delete(designLikes).where(eq(designLikes.id, existing.id));
      return { ok: true as const, liked: false as const, likeCount: await countLikes(design.id) };
    }

    await db.insert(designLikes).values({ briefId: design.id, customerId: customer.id });
    await db.insert(analyticsEvents).values({
      eventName: "dream_design_liked",
      metadata: { briefId: design.id, designerProfileId: design.designerProfileId },
    });
    return { ok: true as const, liked: true as const, likeCount: await countLikes(design.id) };
  });
