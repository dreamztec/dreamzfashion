import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { waitlist } from "../../db/schema";
import { resolveAdminRole } from "./admin-auth.server";

/**
 * Anniversary / early-access waitlist. Free to join; registrations are
 * recorded durably and counted separately from sales. A duplicate email per
 * source simply updates the existing row (idempotent, never double-counted).
 */
const WaitlistSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional().or(z.literal("")),
  phone: z
    .string()
    .max(24)
    .optional()
    .or(z.literal("")),
  interest: z.string().max(300).optional().or(z.literal("")),
  source: z.string().max(40).default("anniversary"),
  marketingConsent: z.boolean().default(false),
});

/** Coarse per-IP throttle: max 5 waitlist writes per minute per IP. */
const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(): boolean {
  let ip = "unknown";
  try {
    ip =
      getRequest().headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
  } catch {
    /* no request context */
  }
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator(WaitlistSchema)
  .handler(async ({ data }) => {
    if (rateLimited()) {
      throw new Error("Too many requests — please try again in a minute.");
    }
    const email = data.email.trim().toLowerCase();
    await db
      .insert(waitlist)
      .values({
        email,
        name: data.name || null,
        phone: data.phone || null,
        interest: data.interest || "",
        source: data.source || "anniversary",
        marketingConsent: data.marketingConsent,
      })
      .onConflictDoUpdate({
        target: [waitlist.email, waitlist.source],
        set: {
          name: data.name || null,
          phone: data.phone || null,
          interest: data.interest || "",
          marketingConsent: data.marketingConsent,
        },
      });
    return { ok: true as const };
  });

export const getWaitlistCount = createServerFn({ method: "GET" }).handler(
  async () => {
    const [row] = await db
      .select({ c: sql<number>`count(*)` })
      .from(waitlist);
    return { count: Number(row?.c ?? 0) };
  },
);

// ── Admin ─────────────────────────────────────────────────────────────

export const adminListWaitlist = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminRole(["owner", "sales"]);
    const rows = await db
      .select()
      .from(waitlist)
      .orderBy(desc(waitlist.createdAt))
      .limit(1000);
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? null,
    }));
  },
);

export const adminRemoveWaitlistEntry = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await requireAdminRole(["owner", "sales"]);
    await db.delete(waitlist).where(eq(waitlist.id, data.id));
    return { ok: true as const };
  });

export const adminExportWaitlistCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminRole(["owner", "sales"]);
  const rows = await db
    .select()
    .from(waitlist)
    .orderBy(desc(waitlist.id))
    .limit(5000);
  const header = "email,name,phone,interest,source,marketing_consent,created_at";
  const lines = rows.map((w) =>
    [
      w.email,
      w.name ?? "",
      w.phone ?? "",
      `"${w.interest.replace(/"/g, '""')}"`,
      w.source,
      w.marketingConsent ? "yes" : "no",
      w.createdAt?.toISOString() ?? "",
    ].join(","),
  );
  return { csv: [header, ...lines].join("\n") };
});

async function requireAdminRole(roles: Array<"owner" | "sales" | "operations">) {
  const role = await resolveAdminRole();
  if (!role) throw new Error("Admin authentication failed. Please sign in again.");
  if (!roles.includes(role)) throw new Error("Your admin role does not permit this action.");
}
