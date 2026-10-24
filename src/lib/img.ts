/**
 * Netlify Image CDN helper.
 * Transforms local site images on the edge (WebP/AVIF, resize, crop) without
 * build-time processing. Falls back to the plain URL when the CDN route is
 * unavailable (e.g. local dev outside Netlify).
 */
export function img(
  url: string,
  opts: { w?: number; h?: number; fit?: "cover" | "contain" | "fill"; q?: number } = {},
): string {
  const params = new URLSearchParams();
  params.set("url", url);
  if (opts.w) params.set("w", String(opts.w));
  if (opts.h) params.set("h", String(opts.h));
  if (opts.fit) params.set("fit", opts.fit);
  if (opts.q) params.set("q", String(opts.q));
  return `/.netlify/images?${params.toString()}`;
}

/**
 * Responsive srcSet for a source image at multiple widths.
 */
export function imgSrcSet(
  url: string,
  widths: number[] = [480, 768, 1080, 1600],
  opts: { fit?: "cover" | "contain" | "fill"; q?: number } = {},
): string {
  return widths
    .map((w) => `${img(url, { ...opts, w })} ${w}w`)
    .join(", ");
}
/**
 * Image URLs the storefront may render. Admin uploads (Netlify Blobs, served
 * from /api/media/), the house's own product photography bundled under
 * /img/products/, and absolute https URLs. Anything else — notably the
 * legacy root-level /img/*.jpg placeholders — renders the neutral
 * "Image coming soon" state instead of a broken or unapproved image.
 */
export function isDisplayableImageUrl(url: string | null | undefined): url is string {
  return (
    !!url &&
    (url.startsWith("/api/media/") || url.startsWith("/img/products/") || url.startsWith("https://"))
  );
}
