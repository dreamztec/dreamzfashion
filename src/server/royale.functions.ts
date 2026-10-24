import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { royaleRequests, settings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { isValidNigerianPhone } from "@/lib/format";
import { getCurrentCustomer } from "./auth.server";

/**
 * Parse "₦250,000", "250000", "25,000.50" into kobo. There is deliberately
 * no upper bound — Royale budgets have no ceiling.
 */
function parseBudgetToKobo(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = String(input).replace(/[₦,\s]/g, "");
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

const RoyaleSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().refine(isValidNigerianPhone, "Please enter a valid Nigerian phone number"),
  email: z.string().email().max(140).optional().or(z.literal("")),
  productType: z.string().min(1).max(80),
  designDirection: z.string().max(600).optional().or(z.literal("")),
  colors: z.string().max(200).optional().or(z.literal("")),
  materials: z.string().max(200).optional().or(z.literal("")),
  size: z.string().max(40).optional().or(z.literal("")),
  monogram: z.string().max(30).optional().or(z.literal("")),
  hardware: z.string().max(80).optional().or(z.literal("")),
  sole: z.string().max(80).optional().or(z.literal("")),
  finishing: z.string().max(120).optional().or(z.literal("")),
  occasion: z.string().max(200).optional().or(z.literal("")),
  budgetMin: z.string().max(20).nullable().optional(),
  budgetMax: z.string().max(20).nullable().optional(),
  deadline: z.string().max(60).optional().or(z.literal("")),
  referenceUrl: z.string().max(400).optional().or(z.literal("")),
  inspirationNotes: z.string().max(800).optional().or(z.literal("")),
});

function generateRoyaleReference(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RY-${y}${m}${d}-${rand}`;
}

export const submitRoyaleRequest = createServerFn({ method: "POST" })
  .inputValidator(RoyaleSchema)
  .handler(async ({ data }) => {
    const [site] = await db.select().from(settings).where(eq(settings.key, "site")).limit(1);
    const whatsappNumber =
      ((site?.value as Record<string, unknown> | undefined)?.whatsappNumber as string) ||
      process.env.DFK_WHATSAPP_NUMBER ||
      "2349038560517";

    // Attribute the request to the signed-in customer when one is present.
    const customer = await getCurrentCustomer();

    const requestNumber = generateRoyaleReference();
    await db.insert(royaleRequests).values({
      requestNumber,
      customerId: customer?.id ?? null,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      productType: data.productType,
      designDirection: data.designDirection || null,
      colors: data.colors || null,
      materials: data.materials || null,
      size: data.size || null,
      monogram: data.monogram || null,
      hardware: data.hardware || null,
      sole: data.sole || null,
      finishing: data.finishing || null,
      occasion: data.occasion || null,
      budgetMin: parseBudgetToKobo(data.budgetMin),
      // null budgetMax = No Maximum — never a hard-coded ceiling
      budgetMax: parseBudgetToKobo(data.budgetMax),
      deadline: data.deadline || null,
      referenceImageUrl: data.referenceUrl || null,
      inspirationNotes: data.inspirationNotes || null,
    });

    return { requestNumber, whatsappNumber };
  });
