import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { db } from "../../db/index";
import { customers, rewardAccounts } from "../../db/schema";
import { eq } from "drizzle-orm";
import { validateIdentitySession, type IdentityClaims } from "./identity.server";
export type { IdentityClaims } from "./identity.server";

export async function getCurrentCustomer() {
  const authorization = getRequestHeader("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : getCookie("nf_jwt");
  if (!token) return null;
  const claims = await validateIdentitySession(token);
  if (!claims) return null;

  const [existing] = await db.select().from(customers).where(eq(customers.identityUserId, claims.id)).limit(1);
  if (existing) {
    await db.insert(rewardAccounts).values({ customerId: existing.id }).onConflictDoNothing();
    if (existing.email.toLowerCase() !== claims.email.toLowerCase()) {
      const [updated] = await db.update(customers)
        .set({ email: claims.email.toLowerCase(), updatedAt: new Date() })
        .where(eq(customers.id, existing.id)).returning();
      return updated ?? null;
    }
    return existing;
  }

  const identityName = claims.user_metadata?.full_name ?? claims.user_metadata?.name;
  const [created] = await db.insert(customers).values({
    identityUserId: claims.id,
    email: claims.email.toLowerCase(),
    fullName: typeof identityName === "string" ? identityName.slice(0, 120) : "",
    phone: typeof claims.user_metadata?.phone === "string" ? claims.user_metadata.phone.slice(0, 20) : null,
    referralCode: `DZ${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
  }).onConflictDoNothing().returning();
  const customer = created ?? (await db.select().from(customers).where(eq(customers.identityUserId, claims.id)).limit(1))[0];
  if (!customer) return null;
  await db.insert(rewardAccounts).values({ customerId: customer.id }).onConflictDoNothing();
  return customer;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You need to be signed in to view this.");
    this.name = "UnauthorizedError";
  }
}

export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) throw new UnauthorizedError();
  return customer;
}

export async function isAdminClaims(claims: IdentityClaims): Promise<boolean> {
  return (claims.app_metadata?.roles ?? []).includes("admin");
}
