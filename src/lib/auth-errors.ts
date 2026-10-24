import { AuthError, MissingIdentityError } from "@netlify/identity";

export function humanizeAuthError(error: unknown, operation: "login" | "signup" | "recovery" | "update" = "login"): string {
  if (error instanceof MissingIdentityError) return "Accounts are not available right now. Please try again shortly.";
  const cause = error instanceof AuthError ? error.cause : error;
  const detail = cause && typeof cause === "object" ? cause as { status?: number; message?: string } : {};
  const status = error instanceof AuthError ? error.status ?? detail.status : detail.status;
  const message = (error instanceof Error ? error.message : detail.message ?? "").toLowerCase();
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (/confirm|verif/.test(message) && operation === "login") return "Please verify your email before signing in. Check your inbox for your DREAMZ confirmation email.";
  if (operation === "signup" && /already|registered|exists/.test(message)) return "This email is already registered. Sign in or reset your password.";
  if (operation === "signup" && (status === 403 || /disabled|not allowed|invite.only/.test(message))) return "New signups are not open at the moment. Please contact DREAMZ support.";
  if (/password/.test(message) && /weak|short|least|length/.test(message)) return "Use a stronger password with at least 8 characters.";
  if (operation === "update" && (status === 401 || /expired|no user|invalid.*token/.test(message))) return "Your session or account link has expired. Please sign in or request a new link.";
  if (/fetch|network|timeout|load failed/.test(message) || status !== undefined && status >= 500) return "Unable to connect. Check your connection and try again.";
  if (operation === "login" && (status === 400 || status === 401 || /invalid|credentials/.test(message))) return "Email or password is incorrect.";
  if (status === 422 || status === 400) return "Please check your email and password and try again.";
  return "We couldn't complete this request. Please try again.";
}
