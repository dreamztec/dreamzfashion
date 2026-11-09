
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../../db/index";
import {
  analyticsEvents,
  designLikes,
  designerProfiles,
  designerUpgradeRequests,
  savedBriefs,
} from "../../db/schema";
import { getCurrentCustomer } from "./auth.server";
import { getDesignerPlan, type DesignerPlanId } from "@/lib/designer-plans";

const PayloadSchema = z.object({
  answers: z.record(z.string(), z.unknown()).default({}),
  designSummary: z.string().max(6000).optional().or(z.literal("")),
  renderPrompt: z.string().max(12000).optional().or(z.literal("")),
  artisanBrief: z.string().max(6000).optional().or(z.literal("")),
  visualPreview: z.record(z.string(), z.unknown()).optional(),
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

async function ensureDesignerProfile(
  customer: Awaited<ReturnType<typeof getCurrentCustomer>>,
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

async function countLikes(briefId: number): Promise<number> {
  const rows = await db.select({ id: designLikes.id }).from(designLikes).where(eq(designLikes.briefId, briefId));
  return rows.length;
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

      const [updated] = await db
        .update(savedBriefs)
        .set({
          designerProfileId: profile.id,
          title: data.title,
          category: data.category || null,
          piece: data.piece || null,
          payload: data.payload as Record<string, unknown>,
          visibility: data.publish ? "public" : existing.visibility,
          publicSlug,
          projectMode: data.projectMode,
          clientLabel: data.clientLabel || null,
          designVersion: (existing.designVersion || 1) + 1,
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
      rows.map(async (row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        piece: row.piece,
        publicSlug: row.publicSlug,
        designVersion: row.designVersion,
        updatedAt: row.updatedAt?.toISOString() || null,
        payload: row.payload,
        likeCount: await countLikes(row.id),
      })),
    );

    return {
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

    return {
      design: {
        id: design.id,
        title: design.title,
        category: design.category,
        piece: design.piece,
        projectMode: design.projectMode,
        designVersion: design.designVersion,
        payload: design.payload,
        updatedAt: design.updatedAt?.toISOString() || null,
        likeCount: await countLikes(design.id),
        likedByMe,
      },
      designer: {
        slug: profile.slug,
        displayName: profile.displayName,
        dreamStatement: profile.dreamStatement,
        foundingNumber: profile.id <= 200 ? profile.id : null,
      },
    };
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
