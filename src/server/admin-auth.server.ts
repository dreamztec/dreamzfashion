import { getRequest, getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { db } from "../../db/index";
import { adminUsers } from "../../db/schema";
import { sql } from "drizzle-orm";

/**
 * Server-only admin authentication. This module is NEVER imported by client
 * code — only from *.functions.ts handler bodies — so the request-context
 * imports never reach the browser bundle.
 *
 * Two ways to be an administrator:
 *  1. The master access key (ADMIN_SECRET) sent in `x-admin-key` — full
 *     owner-level access. This is the original mechanism and stays valid.
 *  2. A Netlify Identity session (nf_jwt cookie / Authorization header)
 *     whose verified email appears in the admin_users table with a role of
 *     owner, sales or operations. This is how the owner adds team members
 *     without sharing the master key.
 *
 * The browser never decides what it may call — the server re-resolves the
 * role on every request.
 */

export type AdminRole = "owner" | "sales" | "operations";

export async function resolveAdminRole(): Promise<AdminRole | null> {
  let token = "";
  try {
    token = getRequest().headers.get("x-admin-key") ?? "";
  } catch {
    token = "";
  }
  const secret = process.env.ADMIN_SECRET;
  if (secret && token && token === secret) return "owner";

  // Identity path.
  const authorization = getRequestHeader("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : getCookie("nf_jwt");
  if (jwt) {
    try {
      const { validateIdentitySession } = await import("./identity.server");
      const claims = await validateIdentitySession(jwt);
      if (claims) {
        const [row] = await db
          .select()
          .from(adminUsers)
          .where(sql`lower(${adminUsers.email}) = ${claims.email.toLowerCase()} AND ${adminUsers.active} = true`)
          .limit(1);
        if (row && (row.role === "owner" || row.role === "sales" || row.role === "operations")) {
          return row.role;
        }
      }
    } catch {
      /* identity unavailable — fall through */
    }
  }
  return null;
}

/** Legacy master-key-only gate (owner level). */
export function requireAdmin() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error(
      "Admin access is not configured. Set the ADMIN_SECRET environment variable to enable the dashboard.",
    );
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

export async function requireAdminRole(roles: AdminRole[]) {
  const role = await resolveAdminRole();
  if (!role) {
    throw new Error("Admin authentication failed. Please sign in again.");
  }
  if (!roles.includes(role)) {
    throw new Error("Your admin role does not permit this action.");
  }
}
