import { coverHeight, img, isDisplayableImageUrl } from "@/lib/img";

/**
 * Brand presentation built from type, not image files. The house uploads
 * approved artwork later; until then the wordmark and neutral placeholders
 * carry the brand.
 */

export function Wordmark({
  size = "md",
  tone = "dark",
  tagline = false,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "dark" | "light";
  tagline?: boolean;
}) {
  const scale = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl sm:text-7xl",
  }[size];
  return (
    <span className="inline-flex flex-col items-center select-none">
      <span
        className={`font-editorial ${scale} tracking-[0.3em] uppercase leading-none ${
          tone === "light" ? "text-ivory" : "text-ink"
        }`}
      >
        DREAMZ
      </span>
      {tagline && (
        <span
          className={`mt-2 text-[0.6rem] uppercase tracking-luxe ${
            tone === "light" ? "text-ivory/70" : "text-stone"
          }`}
        >
          Your Dream Outfit
        </span>
      )}
    </span>
  );
}

/** Restrained rainbow hairline — the house's quiet signature. */
export function RainbowRule({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`rainbow-rule inline-block h-[2px] w-24 ${className}`}
    />
  );
}

/**
 * Neutral placeholder for products and editorial slots awaiting approved
 * imagery. No stock photos, no AI images — an honest "coming soon" surface
 * the administrator replaces by uploading real media in the admin dashboard.
 */
export function ImageComingSoon({
  aspect = "aspect-square",
  label = "Image coming soon",
  className = "",
}: {
  aspect?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`img-frame bg-linen flex items-center justify-center ${aspect} ${className}`}
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <RainbowRule />
        <span className="text-[0.62rem] uppercase tracking-luxe text-stone">
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Product media with graceful fallback: renders uploaded media when a real
 * URL exists (Blobs uploads, external CDN), otherwise the neutral placeholder.
 *
 * Defaults follow the house photography rule: the ENTIRE product stays
 * visible ("contain") — toes, heels, soles, handles, straps and buckles are
 * never cropped. Lifestyle/editorial callers may opt into "cover".
 *
 * Responsive widths suit Retina phones without shipping huge originals:
 * 640 / 960 / 1280 / 1600 through the Netlify Image CDN.
 */
const MEDIA_WIDTHS = [640, 960, 1280, 1600];

/** Width/height ratio for an `aspect-*` utility (4:5 frame → 0.8). */
export function aspectRatioOf(aspect: string): number {
  if (/aspect-square/.test(aspect)) return 1;
  const m = aspect.match(/aspect-\[(\d+)\/(\d+)\]/);
  if (m) return Number(m[1]) / Number(m[2]);
  return 1;
}

export function ProductMedia({
  url,
  alt,
  aspect = "aspect-square",
  className = "",
  width,
  sizes,
  eager = false,
  fetchPriorityHint = false,
  fit = "contain",
}: {
  url?: string | null;
  alt: string;
  aspect?: string;
  className?: string;
  width?: number;
  sizes?: string;
  eager?: boolean;
  /** Mark as the LCP image (fetchpriority=high). */
  fetchPriorityHint?: boolean;
  fit?: "cover" | "contain";
}) {
  if (!isDisplayableImageUrl(url)) {
    return <ImageComingSoon aspect={aspect} className={className} />;
  }
  // A cover crop is requested from the Image CDN only when BOTH the target
  // width and a ratio-correct height travel with it; otherwise the plain
  // responsive resize goes out and CSS object-fit performs the crop.
  const ratio = aspectRatioOf(aspect);
  const dimensions = fit === "cover" ? { w: width ?? 960, h: coverHeight(width ?? 960, ratio) } : { w: width ?? 960 };
  return (
    <div className={`img-frame ${aspect} ${className}`} data-fit={fit}>
      <img
        src={img(url, { ...dimensions, fit })}
        srcSet={
          sizes
            ? MEDIA_WIDTHS.map((w) => {
                const h = fit === "cover" ? coverHeight(w, ratio) : undefined;
                return `${img(url, { w, h, fit })} ${w}w`;
              }).join(", ")
            : undefined
        }
        sizes={sizes}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={fetchPriorityHint ? "high" : undefined}
        decoding={eager ? "sync" : "async"}
        style={fit === "contain" ? { objectFit: "contain" } : undefined}
      />
    </div>
  );
}
