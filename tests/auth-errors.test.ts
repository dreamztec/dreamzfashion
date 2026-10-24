import { describe, expect, it } from "vitest";
import { AuthError, MissingIdentityError } from "@netlify/identity";
import { humanizeAuthError } from "../src/lib/auth-errors";

describe("Safe customer authentication errors", () => {
  it("reports duplicate signup", () => {
    expect(humanizeAuthError(new AuthError("A user with this email address has already been registered", 422), "signup")).toContain("already registered");
  });
  it("distinguishes an unverified email from wrong credentials", () => {
    expect(humanizeAuthError(new AuthError("Email not confirmed", 400))).toContain("verify your email");
    expect(humanizeAuthError(new AuthError("Invalid login credentials", 400))).toBe("Email or password is incorrect.");
  });
  it("handles SDK-wrapped HTTP failures", () => {
    expect(humanizeAuthError(new AuthError("Invalid", undefined, { cause: { status: 401 } }))).toBe("Email or password is incorrect.");
  });
  it("handles weak passwords, disabled registration, rate limits, and network failures", () => {
    expect(humanizeAuthError(new AuthError("Password should be at least 8 characters", 422), "signup")).toContain("stronger password");
    expect(humanizeAuthError(new AuthError("Signups not allowed", 403), "signup")).toContain("not open");
    expect(humanizeAuthError(new AuthError("Too many requests", 429))).toContain("Too many attempts");
    expect(humanizeAuthError(new TypeError("Failed to fetch"))).toContain("Check your connection");
  });
  it("never exposes raw provider details", () => {
    expect(humanizeAuthError(new AuthError("Internal provider diagnostic"))).not.toContain("Internal provider");
    expect(humanizeAuthError(new MissingIdentityError())).toContain("not available");
  });
  it("reports expired reset and invitation sessions without raw token errors", () => {
    expect(humanizeAuthError(new AuthError("Expired token", 401), "update")).toContain("request a new link");
  });
});
