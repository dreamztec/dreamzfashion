import { img, isDisplayableImageUrl } from "@/lib/img";

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
 */
export function ProductMedia({
  url,
  alt,
  aspect = "aspect-square",
  className = "",
  width,
  sizes,
  eager = false,
  fit = "cover",
}: {
  url?: string | null;
  alt: string;
  aspect?: string;
  className?: string;
  width?: number;
  sizes?: string;
  eager?: boolean;
  fit?: "cover" | "contain";
}) {
  if (!isDisplayableImageUrl(url)) {
    return <ImageComingSoon aspect={aspect} className={className} />;
  }
  return (
    <div className={`img-frame ${aspect} ${className}`}>
      <img
        src={img(url, { w: width ?? 760, fit })}
        srcSet={
          sizes
            ? [480, 760, 1080]
                .map((w) => `${img(url, { w, fit })} ${w}w`)
                .join(", ")
            : undefined
        }
        sizes={sizes}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={fit === "contain" ? { objectFit: "contain" } : undefined}
      />
    </div>
  );
}
