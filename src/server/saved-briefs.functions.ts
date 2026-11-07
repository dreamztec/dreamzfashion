import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { savedBriefs } from "../../db/schema";
import { getCurrentCustomer } from "./auth.server";

/**
 * SAVED DESIGN BRIEFS — genuine persistence for the Leather Atelier's
 * "Save Design Brief" action. A brief is saved ONLY for a signed-in
 * customer, ONLY after the row exists in the database. The storefront
 * never shows a "saved" state unless this table says so.
 */

const PayloadSchema = z.object({
  answers: z.record(z.string(), z.unknown()).default({}),
  designSummary: z.string().max(4000).optional().or(z.literal("")),
  renderPrompt: z.string().max(8000).optional().or(z.literal("")),
  artisanBrief: z.string().max(4000).optional().or(z.literal("")),
});

const SaveSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().max(20).optional().or(z.literal("")),
  piece: z.string().max(80).optional().or(z.literal("")),
  payload: PayloadSchema,
});

export const saveBriefDraft = createServerFn({ method: "POST" })
  .inputValidator(SaveSchema)
  .handler(async ({ data }) => {
    const customer = await getCurrentCustomer().catch(() => null);
    if (!customer) {
      return { ok: false as const, reason: "signin" as const };
    }
    const [row] = await db
      .insert(savedBriefs)
      .values({
        customerId: customer.id,
        title: data.title,
        category: data.category || null,
        piece: data.piece || null,
        payload: data.payload as Record<string, unknown>,
      })
      .returning();
    return { ok: true as const, id: row.id };
  });

export const getMySavedBriefs = createServerFn({ method: "GET" }).handler(async () => {
  const customer = await getCurrentCustomer().catch(() => null);
  if (!customer) return { unauthenticated: true as const, briefs: [] };
  const rows = await db
    .select()
    .from(savedBriefs)
    .where(eq(savedBriefs.customerId, customer.id))
    .orderBy(desc(savedBriefs.id))
    .limit(30);
  return {
    unauthenticated: false as const,
    briefs: rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      piece: r.piece,
      status: r.status,
      createdAt: r.createdAt?.toISOString() ?? null,
      renderPrompt: (r.payload as { renderPrompt?: string }).renderPrompt ?? "",
      designSummary: (r.payload as { designSummary?: string }).designSummary ?? "",
    })),
  };
});

export const deleteSavedBrief = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const customer = await getCurrentCustomer().catch(() => null);
    if (!customer) return { ok: false as const, reason: "signin" as const };
    await db
      .delete(savedBriefs)
      .where(and(eq(savedBriefs.id, data.id), eq(savedBriefs.customerId, customer.id)));
    return { ok: true as const };
  });
