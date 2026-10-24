import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { syncTaskProgress } from "./commerce.internal";
import {
  customers,
  designRequests,
  orderItems,
  orders,
  referralClicks,
  referralPrograms,
  referralRewards,
  referrers,
  rewardAccounts,
  rewardLedger,
  royaleRequests,
  tisasngConnections,
  campaigns,
  taskProgress,
} from "../../db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireCustomer, UnauthorizedError } from "./auth.server";
import { getRewardsConfig } from "./rewards.server";
import { verifyTisasngConnection } from "./rewards-ledger.server";
import { generateUniqueReferralCode, markAttributionRegistered } from "./referrals.server";
import { listCustomerVouchers } from "./vouchers.server";

/**
 * Every function here resolves the customer from the VERIFIED authenticated
 * session (Netlify Identity JWT in the nf_jwt cookie). A user id from the
 * browser is never trusted — customers can only ever read their own data.
 */

function isUnauthorized(err: unknown): boolean {
  return err instanceof UnauthorizedError;
}

/** Wrap a handler so unauthenticated callers get a clean result, not a 500. */
function withAuth<T>(fn: () => Promise<T>): Promise<T | { unauthenticated: true }> {
  return fn().catch((err) => {
    if (isUnauthorized(err)) return { unauthenticated: true } as const;
    throw err;
  });
}

// ── Profile ──────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  fullName: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(60).optional(),
});

export const saveMyProfile = createServerFn({ method: "POST" })
  .inputValidator(ProfileSchema)
  .handler(async ({ data }) => {
    const customer = await requireCustomer();
    await db
      .update(customers)
      .set({
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.city !== undefined ? { city: data.city || null } : {}),
        ...(data.state !== undefined ? { state: data.state || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id));
    return { ok: true };
  });

// ── My orders ────────────────────────────────────────────────────────

export const getMyOrders = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.id))
      .limit(50);
    const withItems = await Promise.all(
      rows.map(async (o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        createdAt: o.createdAt?.toISOString() ?? null,
        items: await db
          .select({
            productName: orderItems.productName,
            variantLabel: orderItems.variantLabel,
            imageUrl: orderItems.imageUrl,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, o.id)),
      })),
    );
    return { orders: withItems };
  }),
);

// ── Dashboard overview ───────────────────────────────────────────────

export const getMyOverview = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();

    const [account] = await db
      .select()
      .from(rewardAccounts)
      .where(eq(rewardAccounts.customerId, customer.id))
      .limit(1);

    const [counts] = await db
      .select({
        orderCount: sql<number>`count(*) FILTER (WHERE ${orders.paymentStatus} = 'paid')`,
      })
      .from(orders)
      .where(eq(orders.customerId, customer.id));

    // Referral earnings by status (this customer's referrer row).
    const [referrer] = await db
      .select()
      .from(referrers)
      .where(eq(referrers.customerId, customer.id))
      .limit(1);

    let referralEarnings = { availableKobo: 0, pendingKobo: 0, approvedKobo: 0, count: 0 };
    if (referrer) {
      const [sums] = await db
        .select({
          available: sql<number>`COALESCE(sum(${referralRewards.amountKobo}) FILTER (WHERE ${referralRewards.status} = 'paid' OR ${referralRewards.status} = 'redeemed'), 0)`,
          pending: sql<number>`COALESCE(sum(${referralRewards.amountKobo}) FILTER (WHERE ${referralRewards.status} = 'pending'), 0)`,
          approved: sql<number>`COALESCE(sum(${referralRewards.amountKobo}) FILTER (WHERE ${referralRewards.status} = 'approved'), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(referralRewards)
        .where(eq(referralRewards.referrerId, referrer.id));
      if (sums) {
        referralEarnings = {
          availableKobo: Number(sums.available),
          pendingKobo: Number(sums.pending),
          approvedKobo: Number(sums.approved),
          count: Number(sums.count),
        };
      }
    }

    const vouchers = await listCustomerVouchers(customer.id);
    const availableVouchers = vouchers.filter((v) => v.status === "available" || v.status === "claimed");

    const rewardsCfg = await getRewardsConfig();

    // Next reward: the closest uncompleted task across active campaigns.
    const nextReward = await getNextTaskSnapshot(customer.id);

    return {
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        state: customer.state,
        referralCode: customer.referralCode,
        isStudentAmbassador: customer.isStudentAmbassador,
      },
      points: {
        available: account?.pointsAvailable ?? 0,
        pending: account?.pointsPending ?? 0,
        lifetime: account?.pointsLifetime ?? 0,
        enabled: rewardsCfg.enabled,
        note: rewardsCfg.redemptionNote,
      },
      creditKobo: { available: account?.creditKobo ?? 0, pending: account?.creditPendingKobo ?? 0 },
      orders: { count: Number(counts?.orderCount ?? 0) },
      referrals: {
        hasReferrerRow: Boolean(referrer),
        status: referrer?.status ?? null,
        code: referrer?.code ?? customer.referralCode,
        track: referrer?.track ?? null,
        ...referralEarnings,
      },
      vouchers: {
        availableCount: availableVouchers.length,
        list: vouchers.slice(0, 6),
      },
      nextReward,
    };
  }),
);

async function getNextTaskSnapshot(customerId: number) {
  const rows = await db
    .select({
      campaignName: campaigns.name,
      campaignId: campaigns.id,
      config: campaigns.config,
      progress: taskProgress.progress,
      target: taskProgress.target,
      completed: taskProgress.completed,
      taskKey: taskProgress.taskKey,
    })
    .from(taskProgress)
    .innerJoin(campaigns, eq(taskProgress.campaignId, campaigns.id))
    .where(and(eq(taskProgress.customerId, customerId), eq(campaigns.status, "active")))
    .limit(20);
  const open = rows.filter((r) => !r.completed);
  if (open.length === 0) return null;
  const task = open[0];
  const cfg = task.config as {
    tasks?: Array<{ key: string; label: string }>;
    reward?: { type: string; label?: string };
  };
  const label = cfg.tasks?.find((t) => t.key === task.taskKey)?.label ?? task.taskKey;
  return {
    campaign: task.campaignName,
    campaignId: task.campaignId,
    taskLabel: label,
    progress: task.progress,
    target: task.target,
    reward: cfg.reward?.label ?? cfg.reward?.type ?? null,
  };
}

// ── Reward ledger + points ───────────────────────────────────────────

export const getMyRewards = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();
    const [account] = await db
      .select()
      .from(rewardAccounts)
      .where(eq(rewardAccounts.customerId, customer.id))
      .limit(1);
    const entries = await db
      .select()
      .from(rewardLedger)
      .where(eq(rewardLedger.customerId, customer.id))
      .orderBy(desc(rewardLedger.id))
      .limit(50);
    const cfg = await getRewardsConfig();
    return {
      account: {
        pointsAvailable: account?.pointsAvailable ?? 0,
        pointsPending: account?.pointsPending ?? 0,
        pointsLifetime: account?.pointsLifetime ?? 0,
        creditKobo: account?.creditKobo ?? 0,
        creditPendingKobo: account?.creditPendingKobo ?? 0,
      },
      cfg: { enabled: cfg.enabled, note: cfg.redemptionNote },
      entries: entries.map((e) => ({
        id: e.id,
        currency: e.currency,
        type: e.type,
        amount: e.amount,
        status: e.status,
        source: e.source,
        orderNumber: e.orderNumber,
        campaign: e.campaign,
        note: e.note,
        createdAt: e.createdAt?.toISOString() ?? null,
      })),
    };
  }),
);

// ── Vouchers ─────────────────────────────────────────────────────────

export const getMyVouchers = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();
    return { vouchers: await listCustomerVouchers(customer.id) };
  }),
);

// ── Referrals ────────────────────────────────────────────────────────

export const getMyReferrals = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();
    const [referrer] = await db
      .select()
      .from(referrers)
      .where(eq(referrers.customerId, customer.id))
      .limit(1);

    const programs = await db
      .select()
      .from(referralPrograms)
      .where(eq(referralPrograms.active, true));

    if (!referrer) {
      return {
        referrer: null,
        rewards: [],
        programs: programs.map((p) => ({
          id: p.id,
          track: p.track,
          name: p.name,
          description: p.description,
          eligibilityNote: p.eligibilityNote,
        })),
      };
    }

    const rewards = await db
      .select()
      .from(referralRewards)
      .where(eq(referralRewards.referrerId, referrer.id))
      .orderBy(desc(referralRewards.id))
      .limit(50);

    const [{ clickCount }] = await db
      .select({ clickCount: sql<number>`count(*)` })
      .from(referralClicks)
      .where(eq(referralClicks.referrerId, referrer.id));

    return {
      referrer: {
        code: referrer.code,
        track: referrer.track,
        status: referrer.status,
        clickCount: Number(clickCount),
      },
      rewards: rewards.map((r) => ({
        id: r.id,
        orderNumber: r.orderNumber,
        rewardType: r.rewardType,
        amountKobo: r.amountKobo,
        amountPoints: r.amountPoints,
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
      programs: programs.map((p) => ({
        id: p.id,
        track: p.track,
        name: p.name,
        description: p.description,
        eligibilityNote: p.eligibilityNote,
      })),
    };
  }),
);

export const becomeReferrer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      track: z.enum(["student", "public"]),
      displayName: z.string().min(2).max(120),
      school: z.string().max(160).optional().or(z.literal("")),
      socialProfile: z.string().max(240).optional().or(z.literal("")),
      agreedTerms: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const customer = await requireCustomer();
    if (!data.agreedTerms) {
      return { ok: false as const, error: "Please accept the programme agreement to continue." };
    }
    const [existing] = await db
      .select()
      .from(referrers)
      .where(eq(referrers.customerId, customer.id))
      .limit(1);
    if (existing) {
      return { ok: true as const, code: existing.code, status: existing.status };
    }

    // Student eligibility is 18+ by default for earnings programmes.
    const code = await generateUniqueReferralCode();
    const [program] = await db
      .select()
      .from(referralPrograms)
      .where(and(eq(referralPrograms.track, data.track), eq(referralPrograms.active, true)))
      .limit(1);

    const [created] = await db
      .insert(referrers)
      .values({
        customerId: customer.id,
        code,
        track: data.track,
        // Student applications start pending admin review; public referrers
        // activate immediately only when their programme allows it.
        status: data.track === "student" ? "pending" : "approved",
        displayName: data.displayName,
        email: customer.email,
        phone: customer.phone,
        school: data.school || null,
        socialProfile: data.socialProfile || null,
        agreedTerms: true,
        programId: program?.id ?? null,
      })
      .returning();

    if (data.track === "student") {
      await db
        .update(customers)
        .set({ isStudentAmbassador: false, studentSchool: data.school || null, updatedAt: new Date() })
        .where(eq(customers.id, customer.id));
    }

    return { ok: true as const, code: created.code, status: created.status };
  });

// ── Tasks & campaigns ────────────────────────────────────────────────

export const getMyTasks = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();
    await syncTaskProgress(customer.id);
    const rows = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        audience: campaigns.audience,
        config: campaigns.config,
        endsAt: campaigns.endsAt,
      })
      .from(campaigns)
      .where(eq(campaigns.status, "active"));
    const progress = await db
      .select()
      .from(taskProgress)
      .where(eq(taskProgress.customerId, customer.id));
    const progressByCampaign = new Map<number, typeof progress>();
    for (const p of progress) {
      const list = progressByCampaign.get(p.campaignId) ?? [];
      list.push(p);
      progressByCampaign.set(p.campaignId, list);
    }
    return {
      campaigns: rows.map((c) => {
        const cfg = c.config as {
          tasks?: Array<{ key: string; label: string; type: string; target?: number }>;
          reward?: { type: string; label?: string };
        };
        const mine = progressByCampaign.get(c.id) ?? [];
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          reward: cfg.reward?.label ?? null,
          endsAt: c.endsAt?.toISOString() ?? null,
          tasks: (cfg.tasks ?? []).map((t) => {
            const p = mine.find((x) => x.taskKey === t.key);
            return {
              key: t.key,
              label: t.label,
              progress: p?.progress ?? 0,
              target: t.target ?? 1,
              completed: p?.completed ?? false,
            };
          }),
          completedCount: (cfg.tasks ?? []).filter((t) => mine.find((x) => x.taskKey === t.key)?.completed).length,
          totalTasks: (cfg.tasks ?? []).length,
        };
      }),
    };
  }),
);

// ── My designs (Design Lab requests linked to the account) ───────────

export const getMyDesigns = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();
    const rows = await db
      .select({
        requestNumber: designRequests.requestNumber,
        status: designRequests.status,
        createdAt: designRequests.createdAt,
        aiSummary: designRequests.aiSummary,
      })
      .from(designRequests)
      .where(eq(designRequests.email, customer.email))
      .orderBy(desc(designRequests.id))
      .limit(30);
    return {
      designs: rows.map((r) => ({
        requestNumber: r.requestNumber,
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? null,
        aiSummary: r.aiSummary,
      })),
    };
  }),
);

// ── Royale requests ──────────────────────────────────────────────────

export const getMyRoyaleRequests = createServerFn({ method: "GET" }).handler(async () =>
  withAuth(async () => {
    const customer = await requireCustomer();
    const rows = await db
      .select()
      .from(royaleRequests)
      .where(eq(royaleRequests.customerId, customer.id))
      .orderBy(desc(royaleRequests.id))
      .limit(30);
    return {
      requests: rows.map((r) => ({
        requestNumber: r.requestNumber,
        productType: r.productType,
        occasion: r.occasion,
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
    };
  }),
);

// ── TisasNG connect ──────────────────────────────────────────────────

export const connectMyRewards = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      identity: z.string().min(3).max(120),
    }),
  )
  .handler(async ({ data }) => {
    const customer = await requireCustomer();

    // Feature flag: external TisasNG linking stays OFF until an official
    // customer lookup/linking endpoint is documented and verified.
    const linkingEnabled =
      String(process.env.TISASNG_LINKING_ENABLED ?? "").toLowerCase() === "true";
    if (!linkingEnabled) {
      return {
        ok: false as const,
        reason:
          "Connecting external rewards is coming soon. Your DREAMZ Rewards ledger is already active — you will be notified when external linking opens.",
        apiRequired: "TisasNG API capability/documentation still required: a documented customer lookup/linking endpoint.",
      };
    }

    // Only reachable when a documented linking endpoint exists; verify the
    // provided identity against TisasNG server-side first.
    const probe = await verifyTisasngConnection(customer.id);
    if (!probe.connected) {
      return {
        ok: false as const,
        reason:
          "We couldn't connect to DREAMZ Rewards right now. Your account has not been changed. Please try again.",
      };
    }
    const [existing] = await db
      .select()
      .from(tisasngConnections)
      .where(eq(tisasngConnections.customerId, customer.id))
      .limit(1);
    if (!existing) {
      await db.insert(tisasngConnections).values({
        customerId: customer.id,
        externalId: data.identity,
        status: "connected",
        lastVerifiedAt: new Date(),
      });
    }
    return { ok: true as const };
  });

/** Link a fresh signup to a referral attribution (session-based, server-side). */
export const completeReferralRegistration = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sessionId: z.string().min(6).max(64) }))
  .handler(async ({ data }) => {
    const customer = await requireCustomer();
    await markAttributionRegistered(data.sessionId, customer.id);
    return { ok: true };
  });
