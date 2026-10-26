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
      </div>
    </div>
  );
}