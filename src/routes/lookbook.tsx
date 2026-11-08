import { Link, createFileRoute } from "@tanstack/react-router";
import { ImageComingSoon } from "@/components/brand";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/lookbook")({
  head: () => ({
    meta: [
      { title: `Lookbook — ${BRAND.name}` },
      {
        name: "description",
        content: `The ${BRAND.name} lookbook — editorial campaigns and collection stories told through photography.`,
      },
    ],
  }),
  component: Lookbook,
});

const SPREADS = [
  {
    alt: "Boot of Many Colours — multicolour DREAMZ boot",
    eyebrow: "Campaign I",
    title: "The Lagos Walk",
    body: "Bold. Distinctive. Unapologetically you. Cut for movement through the city.",
    ctaTo: "/shop/footwear",
    ctaLabel: "Shop Footwear",
  },
  {
    alt: "Exotic Elegance bags in brown, black and grey",
    eyebrow: "Campaign II",
    title: "Held With Ease",
    body: "Distinct. Sophisticated. Unmistakably you. Everything in its place.",
    ctaTo: "/shop/bags",
    ctaLabel: "Shop Bags",
  },
  {
    alt: "The Gentleman Complete Combo — shoes, belt and leather pouch",
    eyebrow: "Campaign III",
    title: "The Occasion",
    body: "When the room matters, the details speak first. Refined essentials, effortless distinction.",
    ctaTo: "/royale",
    ctaLabel: "Commission Royale",
  },
] as const;

/**
 * House-uploaded editorial and reference photography — displayed publicly but
 * clearly distinguished from purchasable pieces. They are NOT product SKUs:
 * the campaign composition is Leather Wear editorial, and the colourway study
 * is a design reference for the leather cargo shorts colour variants.
 */
const EDITORIAL_IMAGES = [
  {
    url: "/img/products/vision-leather-ensemble-campaign.jpg",
    alt: "Vision Leather Ensemble — complete leather lifestyle composition of outerwear and coordinated accessories",
    eyebrow: "Leather Wear Campaign",
    title: "The Vision Ensemble",
    body: "Outerwear and coordinated leather accessories composed as one statement — campaign photography from the Leather Wear atelier.",
    ctaTo: "/shop/$category",
    ctaParams: { category: "leather-wear" },
    ctaSearch: {},
    ctaLabel: "Discover Leather Wear",
    note: "Campaign imagery — the pieces shown are styled together; shop each piece individually in Leather Wear.",
  },
  {
    url: "/img/products/cargo-shorts-colourway-reference.jpg",
    alt: "Cargo shorts colourway study — matching leather cargo-short constructions in multiple colourways",
    eyebrow: "Design Reference",
    title: "Cargo Colourway Study",
    body: "Matching cargo-short constructions studied across multiple leather colourways — the palette reference our artisans work from.",
    ctaTo: "/shop/$category",
    ctaParams: { category: "leather-wear" },
    ctaSearch: { sub: "Shorts" },
    ctaLabel: "Shop Leather Shorts",
    note: "Colourway reference — one design family, several colourways. Each colourway is ordered on its product page.",
  },
] as const;

function Lookbook() {
  return (
    <div>
      <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center pt-32 mb-16">
        <p className="overline-label mb-4">Editorial</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">Lookbook</h1>
        <div className="rule-gold mx-auto mt-8" />
      </div>

      <div className="space-y-20 lg:space-y-28 pb-8">
        {SPREADS.map((spread, i) => (
          <section key={spread.title} className="mx-auto max-w-6xl px-5 sm:px-8">
            <div
              className={`grid gap-8 lg:grid-cols-12 lg:gap-12 items-center ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="lg:col-span-8">
                <ImageComingSoon
                  aspect="aspect-[4/3] lg:aspect-[16/10]"
                  label={`${spread.title} — image coming soon`}
                />
              </div>
              <div className="lg:col-span-4 max-w-sm">
                <p className="overline-label mb-4">{spread.eyebrow}</p>
                <h2 className="font-editorial text-3xl sm:text-4xl leading-tight mb-5">
                  {spread.title}
                </h2>
                <p className="text-stone leading-relaxed mb-7">{spread.body}</p>
                <Link
                  to={spread.ctaTo === "/royale" ? "/royale" : "/shop/$category"}
                  params={spread.ctaTo === "/royale" ? undefined : { category: spread.ctaTo.replace("/shop/", "") }}
                  className="btn-lux btn-lux-outline"
                >
                  {spread.ctaLabel}
                </Link>
              </div>
            </div>
          </section>
        ))}

        {/* House photography — campaign + colourway references, clearly
            labelled as editorial rather than purchasable SKUs. */}
        {EDITORIAL_IMAGES.map((spread, i) => (
          <section key={spread.title} className="mx-auto max-w-6xl px-5 sm:px-8">
            <div
              className={`grid gap-8 lg:grid-cols-12 lg:gap-12 items-center ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="lg:col-span-8">
                <img
                  src={spread.url}
                  alt={spread.alt}
                  className="img-frame w-full aspect-[4/3] lg:aspect-[16/10]"
                  data-fit="cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="lg:col-span-4 max-w-sm">
                <p className="overline-label mb-4">{spread.eyebrow}</p>
                <h2 className="font-editorial text-3xl sm:text-4xl leading-tight mb-5">
                  {spread.title}
                </h2>
                <p className="text-stone leading-relaxed mb-3">{spread.body}</p>
                <p className="text-xs text-stone italic leading-relaxed mb-7">{spread.note}</p>
                <Link
                  to={spread.ctaTo}
                  params={spread.ctaParams}
                  search={{
                    tier: undefined,
                    min: undefined,
                    max: undefined,
                    size: undefined,
                    colour: undefined,
                    availability: undefined,
                    sort: undefined,
                    ...(spread.ctaSearch ?? {}),
                  } as never}
                  className="btn-lux btn-lux-outline"
                >
                  {spread.ctaLabel}
                </Link>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}