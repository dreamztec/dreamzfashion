import { getStore } from "@netlify/blobs";

/**
 * Netlify Blobs store for admin-uploaded media. Requires the site's blob
 * infrastructure (present on Netlify; local dev emulates it).
 */
export function getBlobStore() {
  return getStore({ name: "dfk-media", consistency: "strong" });
}
