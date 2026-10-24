export interface IdentityClaims {
  id: string;
  email: string;
  confirmed_at: string;
  user_metadata?: { full_name?: unknown; name?: unknown; phone?: unknown; [key: string]: unknown };
  app_metadata?: { roles?: string[]; [key: string]: unknown };
}

export async function validateIdentitySession(token: string): Promise<IdentityClaims | null> {
  try {
    const configuredUrl = process.env.NETLIFY_IDENTITY_URL ?? process.env.URL ?? process.env.SITE_URL ?? "https://dreamzfashion.dreamz-gc.com";
    const response = await fetch(new URL("/.netlify/identity/user", configuredUrl), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (typeof user.id !== "string" || !user.id || typeof user.email !== "string" || !user.email
      || typeof user.confirmed_at !== "string" || !user.confirmed_at) return null;
    return user as IdentityClaims;
  } catch {
    return null;
  }
}
