import { afterEach, describe, expect, it, vi } from "vitest";
import { validateIdentitySession } from "../src/server/identity.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Identity session validation", () => {
  it("asks this project's Identity API to authenticate the session, rather than decoding claims", async () => {
    vi.stubEnv("NETLIFY_IDENTITY_URL", "https://dreamzfashion.dreamz-gc.com/.netlify/identity");
    const identityUser = { id: "identity-customer", email: "customer@example.com", confirmed_at: "2026-10-05T00:00:00Z" };
    const request = vi.fn().mockResolvedValue(Response.json(identityUser));
    vi.stubGlobal("fetch", request);
    expect(await validateIdentitySession("opaque-session")).toEqual(identityUser);
    expect(request.mock.calls[0][0].href).toBe("https://dreamzfashion.dreamz-gc.com/.netlify/identity/user");
    expect(request.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error", headers: { Authorization: "Bearer opaque-session" } });
  });

  it.each([401, 403, 404, 500])("rejects Identity API status %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    expect(await validateIdentitySession("invalid-session")).toBeNull();
  });

  it.each([
    { sub: "forged-subject", email: "customer@example.com", confirmed_at: "confirmed" },
    { id: "customer", email: "customer@example.com" },
    { id: "", email: "customer@example.com", confirmed_at: "confirmed" },
    { id: "customer", email: "", confirmed_at: "confirmed" },
  ])("rejects incomplete or unverified users", async (user) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(user)));
    expect(await validateIdentitySession("session")).toBeNull();
  });

  it("fails closed on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await validateIdentitySession("session")).toBeNull();
  });
});
