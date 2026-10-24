/**
 * Client-side admin session.
 * The access key lives in sessionStorage and is attached to every privileged
 * server call via the `x-admin-key` header — the server re-verifies it on
 * every request; the header alone never grants anything.
 */
const SESSION_KEY = "dfk-admin-session";

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SESSION_KEY) ?? "";
}

export function setAdminKey(value: string) {
  sessionStorage.setItem(SESSION_KEY, value);
}

export function clearAdminKey() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * How every admin server function is invoked: with the full request context
 * so the `x-admin-key` header reaches the server-side verification.
 */
export async function adminCall<T>(fn: (args: never) => Promise<T>, data?: unknown): Promise<T> {
  return fn({ data, headers: { "x-admin-key": getAdminKey() } } as never);
}
