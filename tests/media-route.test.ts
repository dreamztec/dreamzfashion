import { describe, expect, it } from "vitest";
import { resolveMediaKey } from "../src/lib/media-key";

/**
 * The media route streams admin uploads from Netlify Blobs. A wrong splat
 * param key made every /api/media/… request 404, so uploaded images never
 * displayed anywhere — the Media Library grid, product pages, and the Image
 * CDN transforms all went through this route.
 */
describe("resolveMediaKey", () => {
  it("resolves the TanStack `_splat` wildcard param", () => {
    expect(resolveMediaKey({ _splat: "media/123-photo.png" })).toBe(
      "media/123-photo.png",
    );
  });

  it("strips leading slashes", () => {
    expect(resolveMediaKey({ _splat: "/media/123-photo.png" })).toBe(
      "media/123-photo.png",
    );
  });

  it("rejects keys outside the media prefix", () => {
    expect(resolveMediaKey({ _splat: "other/123.png" })).toBeNull();
    expect(resolveMediaKey({ _splat: "" })).toBeNull();
  });

  it("rejects path traversal", () => {
    expect(resolveMediaKey({ _splat: "media/../secrets" })).toBeNull();
  });

  it("rejects missing or non-string params", () => {
    expect(resolveMediaKey(undefined)).toBeNull();
    expect(resolveMediaKey(null)).toBeNull();
    expect(resolveMediaKey({})).toBeNull();
  });

  it("ignores the legacy `params._` key the route used to read", () => {
    // Regression: the handler read `params._`, which TanStack never sets
    // for a `$` splat route, so every image request 404'd. That shape alone
    // must not resolve; the canonical `_splat` does.
    expect(resolveMediaKey({ _: "media/a.png" })).toBeNull();
    expect(resolveMediaKey({ _splat: "media/a.png" })).toBe("media/a.png");
  });
});
