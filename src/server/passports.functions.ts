import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { verifyRequestOrigin } from "@netlify/identity";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../../db/index";
import { productPassports, passportBookmarks, passportTickets } from "../../db/schema";
import { requireCustomer } from "./auth.server";
import { requireAdminRole } from "./admin-auth.server";
import { consumeRateLimit } from "./rate-limit.server";

const codeSchema = z.string().regex(/^DRZ-\d{6,12}$/);
const codeInput = z.object({ code: codeSchema });
function privateResponse() { setResponseHeader("Cache-Control", "private, no-store"); setResponseHeader("Netlify-CDN-Cache-Control", "no-store"); }
function mutation() { privateResponse(); verifyRequestOrigin(getRequest()); }
async function findPassport(code: string) {
  const [p] = await db.select().from(productPassports).where(eq(productPassports.code, code)).limit(1);
  if (!p) throw new Error("This product passport was not found. Check the number printed on your product.");
  return p;
}
function storyFields(p: typeof productPassports.$inferSelect) {
  return { code: p.code, title: p.title, collection: p.collection, category: p.category,
    story: p.story, encouragement: p.encouragement, materials: p.materials, care: p.care,
    lifespan: p.lifespan, productionStatus: p.productionStatus, imageUrl: p.imageUrl,
    updatedAt: p.updatedAt.toISOString() };
}
export const getPassport = createServerFn({ method: "GET" }).inputValidator(codeInput).handler(async ({ data }) => {
  privateResponse();
  const customer = await requireCustomer();
  const p = await findPassport(data.code);
  const [bookmark] = await db.select().from(passportBookmarks).where(and(eq(passportBookmarks.passportId, p.id), eq(passportBookmarks.customerId, customer.id))).limit(1);
  const tickets = await db.select().from(passportTickets).where(and(eq(passportTickets.passportId, p.id), eq(passportTickets.customerId, customer.id))).orderBy(desc(passportTickets.createdAt)).limit(50);
  return { ...storyFields(p), isOwner: p.ownerCustomerId === customer.id, canClaim: p.ownerCustomerId === null && !!p.claimHash,
    saved: !!bookmark, dream: bookmark?.dream ?? "", tickets: tickets.map(t => ({ id: t.id, kind: t.kind, message: t.message, status: t.status, reply: t.reply, createdAt: t.createdAt.toISOString() })) };
});
export const savePassportDream = createServerFn({ method: "POST" }).inputValidator(codeInput.extend({ dream: z.string().trim().max(1000) })).handler(async ({ data }) => {
  mutation(); const customer = await requireCustomer(); const p = await findPassport(data.code);
  await db.insert(passportBookmarks).values({ passportId: p.id, customerId: customer.id, dream: data.dream }).onConflictDoUpdate({ target: [passportBookmarks.passportId, passportBookmarks.customerId], set: { dream: data.dream } });
  return { ok: true };
});
export const listMyPassports = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse(); const customer = await requireCustomer();
  const saved = await db.select({ code: productPassports.code, title: productPassports.title }).from(passportBookmarks).innerJoin(productPassports, eq(passportBookmarks.passportId, productPassports.id)).where(eq(passportBookmarks.customerId, customer.id));
  const owned = await db.select({ code: productPassports.code, title: productPassports.title }).from(productPassports).where(eq(productPassports.ownerCustomerId, customer.id));
  return [...new Map([...saved, ...owned].map(p => [p.code, p])).values()];
});
export const claimPassport = createServerFn({ method: "POST" }).inputValidator(codeInput.extend({ claimCode: z.string().trim().min(12).max(100) })).handler(async ({ data }) => {
  mutation(); const customer = await requireCustomer();
  const limit = await consumeRateLimit("passport-claim", String(customer.id), 8, 3600);
  if (!limit.ok) throw new Error("Too many attempts. Please try again later or contact DREAMZ.");
  const hash = createHash("sha256").update(data.claimCode).digest("hex");
  const result = await db.update(productPassports).set({ ownerCustomerId: customer.id, claimHash: null, updatedAt: new Date() }).where(and(eq(productPassports.code, data.code), eq(productPassports.claimHash, hash), isNull(productPassports.ownerCustomerId))).returning({ id: productPassports.id });
  if (!result.length) throw new Error("That claim code is invalid or already used. Contact DREAMZ for help.");
  return { ok: true };
});
export const submitPassportTicket = createServerFn({ method: "POST" }).inputValidator(codeInput.extend({ kind: z.enum(["Care question", "Repair request", "Complaint", "Ownership help"]), message: z.string().trim().min(10).max(3000) })).handler(async ({ data }) => {
  mutation(); const customer = await requireCustomer(); const p = await findPassport(data.code);
  const limit = await consumeRateLimit("passport-support", String(customer.id), 10, 3600);
  if (!limit.ok) throw new Error("Please wait before sending another request.");
  const [ticket] = await db.insert(passportTickets).values({ passportId: p.id, customerId: customer.id, kind: data.kind, message: data.message }).returning();
  return { id: ticket.id };
});
const editSchema = z.object({ code: codeSchema.optional(), title: z.string().trim().min(2).max(160), collection: z.string().trim().max(100), category: z.string().trim().min(2).max(80), story: z.string().trim().min(20).max(8000), encouragement: z.string().trim().max(1000), materials: z.string().trim().max(3000), care: z.string().trim().min(10).max(6000), lifespan: z.string().trim().max(2000), productionStatus: z.enum(["In production", "Quality checked", "Delivered", "In service", "Retired"]), imageUrl: z.string().max(500).refine(v => !v || /^\/api\/media\/[a-zA-Z0-9/_\-.]+$/.test(v), "Use an approved /api/media/ image path.") });
export const adminListPassports = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse(); await requireAdminRole(["owner", "operations"]);
  const rows = await db.select().from(productPassports).orderBy(desc(productPassports.id)).limit(500);
  const tickets = await db.select().from(passportTickets).orderBy(desc(passportTickets.createdAt)).limit(200);
  return { rows: rows.map(p => ({ ...storyFields(p), id: p.id, claimed: p.ownerCustomerId !== null })), tickets: tickets.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })) };
});
export const adminSavePassport = createServerFn({ method: "POST" }).inputValidator(editSchema).handler(async ({ data }) => {
  mutation(); await requireAdminRole(["owner", "operations"]);
  const { code, ...fields } = data;
  if (code) { await findPassport(code); await db.update(productPassports).set({ ...fields, updatedAt: new Date() }).where(eq(productPassports.code, code)); return { code }; }
  // Sequence allocation is database-backed and safe across simultaneous staff requests.
  const { sql } = await import("drizzle-orm");
  const result = await db.execute(sql`SELECT nextval(pg_get_serial_sequence('product_passports','id')) AS id`);
  const id = Number(result.rows[0].id);
  const newCode = `DRZ-${String(id).padStart(6, "0")}`;
  await db.insert(productPassports).values({ ...fields, id, code: newCode });
  return { code: newCode };
});
export const adminIssuePassportClaim = createServerFn({ method: "POST" }).inputValidator(codeInput).handler(async ({ data }) => {
  mutation(); await requireAdminRole(["owner", "operations"]);
  const claimCode = randomBytes(18).toString("hex");
  const rows = await db.update(productPassports).set({ claimHash: createHash("sha256").update(claimCode).digest("hex"), updatedAt: new Date() }).where(and(eq(productPassports.code, data.code), isNull(productPassports.ownerCustomerId))).returning({ id: productPassports.id });
  if (!rows.length) throw new Error("Passport not found or already claimed.");
  return { claimCode };
});
export const adminReplyPassportTicket = createServerFn({ method: "POST" }).inputValidator(z.object({ id: z.number().int().positive(), status: z.enum(["Received", "In review", "Awaiting customer", "Resolved"]), reply: z.string().trim().max(3000) })).handler(async ({ data }) => {
  mutation(); await requireAdminRole(["owner", "operations"]);
  await db.update(passportTickets).set({ status: data.status, reply: data.reply, updatedAt: new Date() }).where(eq(passportTickets.id, data.id)); return { ok: true };
});
