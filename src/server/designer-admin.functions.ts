import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { customers, designOrderIntents, designerProfiles, designerUpgradeRequests, savedBriefs } from "../../db/schema";
import { requireAdminRole } from "./admin-auth.server";
import { getDesignerPlan } from "@/lib/designer-plans";

export const listDesignerUpgradeRequestsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner"]);
  const rows = await db
    .select({
      requestId: designerUpgradeRequests.id,
      requestedPlan: designerUpgradeRequests.requestedPlan,
      requestStatus: designerUpgradeRequests.status,
      note: designerUpgradeRequests.note,
      requestedAt: designerUpgradeRequests.createdAt,
      profileId: designerProfiles.id,
      slug: designerProfiles.slug,
      displayName: designerProfiles.displayName,
      currentPlan: designerProfiles.plan,
      planExpiresAt: designerProfiles.planExpiresAt,
      email: customers.email,
    })
    .from(designerUpgradeRequests)
    .innerJoin(designerProfiles, eq(designerUpgradeRequests.designerProfileId, designerProfiles.id))
    .innerJoin(customers, eq(designerProfiles.customerId, customers.id))
    .orderBy(desc(designerUpgradeRequests.createdAt))
    .limit(100);

  return rows.map((row) => ({
    ...row,
    requestedAt: row.requestedAt?.toISOString() || null,
    planExpiresAt: row.planExpiresAt?.toISOString() || null,
  }));
});

export const decideDesignerUpgradeAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      requestId: z.number().int().positive(),
      decision: z.enum(["approve", "reject"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    const [request] = await db
      .select()
      .from(designerUpgradeRequests)
      .where(eq(designerUpgradeRequests.id, data.requestId))
      .limit(1);
    if (!request) return { ok: false as const, reason: "missing" as const };
    if (request.status !== "pending") {
      return { ok: false as const, reason: "already_decided" as const };
    }

    if (data.decision === "reject") {
      await db
        .update(designerUpgradeRequests)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(designerUpgradeRequests.id, request.id));
      return { ok: true as const, status: "rejected" as const };
    }

    const plan = getDesignerPlan(request.requestedPlan);
    if (plan.id === "free" || plan.priceKobo <= 0) {
      return { ok: false as const, reason: "invalid_plan" as const };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (plan.durationDays || 90) * 86_400_000);
    await db
      .update(designerProfiles)
      .set({
        plan: plan.id,
        planExpiresAt: expiresAt,
        updatedAt: now,
      })
      .where(eq(designerProfiles.id, request.designerProfileId));
    await db
      .update(designerUpgradeRequests)
      .set({ status: "approved", updatedAt: now })
      .where(eq(designerUpgradeRequests.id, request.id));

    return {
      ok: true as const,
      status: "approved" as const,
      plan: plan.id,
      expiresAt: expiresAt.toISOString(),
    };
  });


export const listDesignOrderIntentsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales"]);
  const rows = await db
    .select({
      id: designOrderIntents.id,
      briefId: designOrderIntents.briefId,
      status: designOrderIntents.status,
      orderReference: designOrderIntents.orderReference,
      createdAt: designOrderIntents.createdAt,
      verifiedAt: designOrderIntents.verifiedAt,
      designTitle: savedBriefs.title,
      publicSlug: savedBriefs.publicSlug,
      designerName: designerProfiles.displayName,
      designerSlug: designerProfiles.slug,
    })
    .from(designOrderIntents)
    .innerJoin(savedBriefs, eq(designOrderIntents.briefId, savedBriefs.id))
    .leftJoin(designerProfiles, eq(savedBriefs.designerProfileId, designerProfiles.id))
    .orderBy(desc(designOrderIntents.createdAt))
    .limit(250);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt?.toISOString() || null,
    verifiedAt: row.verifiedAt?.toISOString() || null,
  }));
});

export const decideDesignOrderIntentAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      status: z.enum(["verified", "cancelled"]),
      orderReference: z.string().max(100).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    const [row] = await db
      .select()
      .from(designOrderIntents)
      .where(eq(designOrderIntents.id, data.id))
      .limit(1);
    if (!row) return { ok: false as const, reason: "missing" as const };

    await db
      .update(designOrderIntents)
      .set({
        status: data.status,
        orderReference: data.orderReference?.trim() || row.orderReference,
        verifiedAt: data.status === "verified" ? new Date() : null,
      })
      .where(eq(designOrderIntents.id, data.id));

    return { ok: true as const, status: data.status };
  });
