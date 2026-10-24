/**
 * Resolve the blob key from the route params of the `/api/media/$` splat
 * route. TanStack Router exposes a lone `$` wildcard as `params._splat`;
 * anything else is not a media key.
 *
 * Returns the validated key (always under `media/`, never escaping with
 * `..`) or null when the request does not address stored media.
 */
export function resolveMediaKey(params: unknown): string | null {
  const raw =
    params != null && typeof params === "object"
      ? (params as Record<string, unknown>)._splat ??
        (params as Record<string, unknown>).splat
      : undefined;
  if (typeof raw !== "string") return null;
  const key = raw.replace(/^\/+/, "");
  if (!key.startsWith("media/") || key.includes("..")) return null;
  return key;
}
