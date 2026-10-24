import { Link } from "@tanstack/react-router";
import { ImageComingSoon } from "@/components/brand";

/**
 * Section that combines an editorial slot with copy. Until the house uploads
 * approved imagery, the media side shows the neutral "Image coming soon"
 * placeholder — no stock photos, no stand-ins.
 */
export function EditorialTile({
  alt,
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaTo,
  ctaParams,
  reverse = false,
  dark = false,
}: {
  image?: string;
  alt: string;
  eyebrow?: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaParams?: Record<string, string>;
  reverse?: boolean;
  dark?: boolean;
}) {
  return (
    <section className={dark ? "bg-ink text-ivory" : ""}>
      <div
        className={`mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24 grid gap-10 lg:grid-cols-2 lg:gap-16 items-center ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <ImageComingSoon
          aspect="aspect-[4/3] lg:aspect-[5/6]"
          label={`${alt} — image coming soon`}
        />
        <div className="lg:px-4 max-w-xl">
          {eyebrow && <p className="overline-label mb-4">{eyebrow}</p>}
          <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl leading-tight">
            {title}
          </h2>
          <div className={dark ? "rule-gold mt-6 mb-6" : "rainbow-rule mt-6 mb-6 h-[2px] w-24"} />
          {body && (
            <p className={`leading-relaxed ${dark ? "text-ivory/75" : "text-stone"}`}>
              {body}
            </p>
          )}
          {ctaLabel && ctaTo && (
            <Link
              to={ctaTo as "/shop"}
              params={ctaParams}
                  search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }}
              className={`btn-lux mt-8 inline-flex ${
                dark ? "btn-lux-light" : "btn-lux-outline"
              }`}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
