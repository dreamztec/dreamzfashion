import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index";
import { partnershipEnquiries } from "../../db/schema";

const EnquirySchema = z.object({
  businessName: z.string().min(2).max(140),
  contactPerson: z.string().min(2).max(120),
  phone: z.string().min(7).max(24),
  email: z.string().email().max(140),
  city: z.string().min(2).max(80),
  stateCountry: z.string().min(2).max(80),
  businessType: z.string().min(2).max(80),
  presence: z.enum(["store", "online", "both"]),
  productInterest: z.string().min(2).max(80),
  orderVolume: z.string().min(1).max(80),
  message: z.string().max(1200).optional().or(z.literal("")),
});

export const submitPartnershipEnquiry = createServerFn({ method: "POST" })
  .inputValidator(EnquirySchema)
  .handler(async ({ data }) => {
    await db.insert(partnershipEnquiries).values({
      businessName: data.businessName,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      city: data.city,
      stateCountry: data.stateCountry,
      businessType: data.businessType,
      presence: data.presence,
      productInterest: data.productInterest,
      orderVolume: data.orderVolume,
      message: data.message || null,
    });
    return { ok: true };
  });

// ── Admin: partnership enquiries (CRM) ───────────────────────────────

function requireAdmin() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("Admin access is not configured.");
  }
  let token = "";
  try {
    token = getRequest().headers.get("x-admin-key") ?? "";
  } catch {
    token = "";
  }
  if (!token || token !== secret) {
    throw new Error("Admin authentication failed. Please sign in again.");
  }
}

export const adminListPartnershipEnquiries = createServerFn({ method: "GET" }).handler(
  async () => {
    requireAdmin();
    const rows = await db
      .select()
      .from(partnershipEnquiries)
      .orderBy(desc(partnershipEnquiries.createdAt))
      .limit(200);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null }));
  },
);

export const adminUpdateEnquiryStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), status: z.string().max(30) }))
  .handler(async ({ data }) => {
    requireAdmin();
    await db
      .update(partnershipEnquiries)
      .set({ status: data.status })
      .where(eq(partnershipEnquiries.id, data.id));
    return { ok: true };
  });
