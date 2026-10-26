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

/**
 * House promotional posters (product photo + name, prices and package text
 * printed on the artwork). They are approved originals and stay in each
 * gallery, but grids show them uncropped ("contain") and list clean product
 * photography first. Classified by visual inspection, 2026-10-24.
 */
const POSTER_FILES = new Set([
  "asiwaju-mule-black-white.jpg",
  "asiwaju-mule-brown.jpg",
  "boot-of-many-colours.jpg",
  "crimson-cross.jpg",
  "crimson-pin.jpg",
  "executive-leather-handbag.jpg",
  "exotic-elegance.jpg",
  "gentleman-complete-combo.jpg",
  "lagos-tassel.jpg",
  "lightning-strap-loafer.jpg",
  "onyx-stride.jpg",
  "onyx-wave.jpg",
  "pedra-satchel.jpg",
  "pinnacle-denim.jpg",
  "strap-twist.jpg",
  "terra-cove.jpg",
  "terra-cross.jpg",
  "verona-buckle-slide.jpg",
]);

export function isPosterArtwork(url: string | null | undefined): boolean {
  if (!url) return false;
  const file = url.split("/").pop() ?? "";
  return POSTER_FILES.has(file);
}

/**
 * Display fit for a product image. Product and catalogue photography shows
 * the WHOLE piece ("contain") — toes, heels, soles, handles, straps and
 * buckles are never cropped. Lifestyle/editorial scenes may crop ("cover"),
 * and the admin's per-product imageFit can force "cover".
 */
export function displayFit(
  kind: string | null | undefined,
  productFit: string | null | undefined,
): "cover" | "contain" {
  if (kind === "lifestyle") return "cover";
  if (productFit === "cover") return "cover";
  return "contain";
}
