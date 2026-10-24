import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { corporateEnquiries, corporateQuotes, payments } from "../../db/schema";
import { generateCorporateNumber, isValidNigerianPhone } from "@/lib/format";
import { getPaymentProvider } from "./payments.server";

/**
 * Corporate & bulk orders — public enquiry intake with rate limiting, and
 * token-gated quote retrieval. Quotes are always server-issued records; the
 * customer page cannot mutate anything except recording acceptance.
 */

const EnquirySchema = z.object({
  companyName: z.string().min(2).max(160),
  contactPerson: z.string().min(2).max(120),
  email: z.string().email().max(140),
  phone: z
    .string()
    .refine(isValidNigerianPhone, "Please enter a valid Nigerian phone number"),
  productInterests: z.string().min(2).max(400),
  quantity: z.string().min(1).max(80),
  budgetRange: z.string().max(80).optional().or(z.literal("")),
  deadline: z.string().max(60).optional().or(z.literal("")),
  deliveryLocation: z.string().min(2).max(200),
  brandingRequirements: z.string().max(1000).optional().or(z.literal("")),
  referenceUrl: z
    .string()
    .max(400)
    .optional()
    .or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});

/** Coarse per-IP throttle: max 3 corporate enquiries per hour per IP. */
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
  return entry.count > 3;
}

export const submitCorporateEnquiry = createServerFn({ method: "POST" })
  .inputValidator(EnquirySchema)
  .handler(async ({ data }) => {
    if (rateLimited()) {
      throw new Error("Too many enquiries from this connection — please try again later.");
    }
    const [row] = await db
      .insert(corporateEnquiries)
      .values({
        enquiryNumber: generateCorporateNumber("CEN"),
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        productInterests: data.productInterests,
        quantity: data.quantity,
        budgetRange: data.budgetRange || "",
        deadline: data.deadline || null,
        deliveryLocation: data.deliveryLocation,
        brandingRequirements: data.brandingRequirements || null,
        referenceUrl: data.referenceUrl || null,
        message: data.message || null,
      })
      .returning();
    return { ok: true as const, enquiryNumber: row.enquiryNumber };
  });

/**
 * Fetch a quote for the customer-facing page. Requires BOTH the quote number
 * and the access token issued when the quote was created — guessing a quote
 * number alone reveals nothing.
 */
export const getCorporateQuote = createServerFn({ method: "GET" })
  .inputValidator((data: { quoteNumber: string; token: string }) => data)
  .handler(async ({ data }) => {
    const [quote] = await db
      .select()
      .from(corporateQuotes)
      .where(eq(corporateQuotes.quoteNumber, data.quoteNumber.trim().toUpperCase()))
      .limit(1);
    if (!quote || quote.accessToken !== data.token) {
      return { found: false as const };
    }
    return {
      found: true as const,
      quote: {
        quoteNumber: quote.quoteNumber,
        companyName: quote.companyName,
        contactPerson: quote.contactPerson,
        email: quote.email,
        lines: quote.lines,
        brandingChargeKobo: quote.brandingChargeKobo,
        deliveryChargeKobo: quote.deliveryChargeKobo,
        subtotalKobo: quote.subtotalKobo,
        totalKobo: quote.totalKobo,
        validUntil: quote.validUntil?.toISOString() ?? null,
        milestones: quote.milestones,
        terms: quote.terms,
        deliveryExpectation: quote.deliveryExpectation,
        status: quote.status,
        acceptedAt: quote.acceptedAt?.toISOString() ?? null,
      },
    };
  });

/** Record the customer's acceptance of a quote (token-gated, idempotent). */
export const acceptCorporateQuote = createServerFn({ method: "POST" })
  .inputValidator((data: { quoteNumber: string; token: string }) => data)
  .handler(async ({ data }) => {
    const [quote] = await db
      .select()
      .from(corporateQuotes)
      .where(eq(corporateQuotes.quoteNumber, data.quoteNumber.trim().toUpperCase()))
      .limit(1);
    if (!quote || quote.accessToken !== data.token) {
      throw new Error("We could not match that quote link.");
    }
    if (quote.status === "accepted" || quote.status === "production" || quote.status === "delivered") {
      return { ok: true as const, alreadyAccepted: true };
    }
    if (quote.status !== "sent") {
      throw new Error("This quote is not open for acceptance. Please contact us.");
    }
    if (quote.validUntil && quote.validUntil.getTime() < Date.now()) {
      throw new Error("This quote has expired — please contact us for a fresh quotation.");
    }
    await db
      .update(corporateQuotes)
      .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(corporateQuotes.id, quote.id));
    if (quote.enquiryId) {
      await db
        .update(corporateEnquiries)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(corporateEnquiries.id, quote.enquiryId));
    }
    return { ok: true as const, alreadyAccepted: false };
  });

/**
 * Pay a quote milestone (or the full amount when no milestones are set) via
 * Paystack. The chargeable amount is computed server-side from the quote's
 * milestone percentages — the browser only picks which milestone to settle.
 */
export const initializeQuotePayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      quoteNumber: z.string().min(6).max(40),
      token: z.string().min(8).max(64),
      milestoneIndex: z.number().int().min(0).max(5),
    }),
  )
  .handler(async ({ data }) => {
    const provider = getPaymentProvider("paystack");
    if (!provider) {
      throw new Error(
        "Online payment is not yet active. Please contact us to arrange payment.",
      );
    }
    const [quote] = await db
      .select()
      .from(corporateQuotes)
      .where(eq(corporateQuotes.quoteNumber, data.quoteNumber.trim().toUpperCase()))
      .limit(1);
    if (!quote || quote.accessToken !== data.token) {
      throw new Error("We could not match that quote link.");
    }
    if (quote.status !== "accepted") {
      throw new Error("Accept the quote before paying.");
    }
    const milestones = quote.milestones ?? [];
    if (milestones.length === 0) {
      throw new Error("This quote has no payment milestones configured yet.");
    }
    const milestone = milestones[data.milestoneIndex];
    if (!milestone) throw new Error("Unknown payment milestone.");

    // Idempotency: a milestone that already has a successful charge is never
    // charged twice.
    const [settled] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(payments)
      .where(
        sql`${payments.corporateQuoteId} = ${quote.id} AND ${payments.kind} = 'quote_milestone' AND ${payments.status} = 'success'`,
      );
    const milestoneIndex = data.milestoneIndex;
    if (Number(settled?.c ?? 0) > milestoneIndex) {
      throw new Error("That milestone has already been paid.");
    }

    const amountKobo = Math.round((quote.totalKobo * milestone.percent) / 100);
    const reference = `PSKQ-${quote.quoteNumber}-${milestoneIndex + 1}`;
    await db.insert(payments).values({
      orderId: 0, // quote payments are tracked against the quote, not a shop order
      reference,
      amountKobo,
      currency: "NGN",
      kind: "quote_milestone",
      corporateQuoteId: quote.id,
      status: "initialized",
    });

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const init = await provider.initialize({
      email: quote.email,
      amountKobo,
      reference,
      callbackUrl: `${siteUrl}/corporate/quote/${encodeURIComponent(quote.quoteNumber)}?t=${encodeURIComponent(data.token)}`,
      metadata: { quote_number: quote.quoteNumber, milestone: milestone.label },
    });
    return { authorizationUrl: init.authorizationUrl, reference };
  });
