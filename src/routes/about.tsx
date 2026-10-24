import { Link, createFileRoute } from "@tanstack/react-router";
import { ImageComingSoon } from "@/components/brand";
import { BRAND } from "@/lib/config";
import { COMPANY, REGISTERED_BUSINESS_LINE } from "@/lib/contact";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About — ${BRAND.name}` },
      {
        name: "description",
        content: `${BRAND.name} is a contemporary African luxury fashion house specializing in bespoke and ready-to-wear leather footwear, bags and accessories. ${BRAND.tagline}.`,
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="pt-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center mb-16">
        <p className="overline-label mb-4">The House</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">
          {BRAND.name}
        </h1>
        <div className="rule-gold mx-auto mt-8" />
      </div>

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <ImageComingSoon
          aspect="aspect-[16/9]"
          label="The house workshop — image coming soon"
          className="mb-16"
        />

        <div className="max-w-2xl mx-auto space-y-14 pb-8">
          <section>
            <h2 className="font-editorial text-2xl sm:text-3xl mb-5">Origin</h2>
            <p className="text-stone leading-relaxed">
              {BRAND.shortName} began with a simple conviction: that world-class
              leather craftsmanship belongs to Africa, and that a Nigerian house
              can dress confidence without apology. From our workshop, we cut,
              stitch and finish each piece by hand — footwear, bags, belts and
              the small details that complete a person.
            </p>
          </section>

          <section>
            <h2 className="font-editorial text-2xl sm:text-3xl mb-5">Craftsmanship</h2>
            <p className="text-stone leading-relaxed">
              Every pair that leaves our workshop passes through hands, not just
              machines. Leather is selected by feel, patterns are cut to last,
              edges are painted and burnished, and finishing is judged by eye
              and thumb. We make slowly, in small runs, and we make to be worn
              for years.
            </p>
          </section>

          <section>
            <h2 className="font-editorial text-2xl sm:text-3xl mb-5">African Identity</h2>
            <p className="text-stone leading-relaxed">
              Our design language is contemporary but our roots are deliberate.
              {BRAND.shortName} pieces are made in Nigeria, by Nigerians, for
              people everywhere who understand that luxury is not a logo — it is
              the quiet certainty of something made properly.
            </p>
          </section>

          <section>
            <h2 className="font-editorial text-2xl sm:text-3xl mb-5">Personalisation</h2>
            <p className="text-stone leading-relaxed">
              No two people are the same, so no two DREAMZ pieces need to be.
              From colour and hardware to monograms and full bespoke
              commissions, we build pieces around the person who will wear them.
              Your dream outfit is exactly that — yours.
            </p>
          </section>

          <section>
            <h2 className="font-editorial text-2xl sm:text-3xl mb-5">The Journey Ahead</h2>
            <p className="text-stone leading-relaxed">
              We are building a house that will stand beside the great fashion
              names of the world — from Nigeria, with African identity at its
              core. The road is long, and we are early in the journey. What will
              not change is the standard: craftsmanship, personalization, and
              modern luxury, without compromise.
            </p>
          </section>

          <section>
            <h2 className="font-editorial text-2xl sm:text-3xl mb-5">Registered Business</h2>
            <p className="text-stone leading-relaxed">
              {COMPANY.legalName} (RC {COMPANY.rcNumber}) is a {COMPANY.entityType.toLowerCase()}{" "}
              incorporated in {COMPANY.country} on {COMPANY.incorporated}.
            </p>
            <p className="text-xs text-stone mt-4 leading-relaxed">
              {REGISTERED_BUSINESS_LINE}
            </p>
          </section>

          <div className="text-center pt-6">
            <div className="rule-gold mx-auto mb-8" />
            <p className="font-editorial text-2xl mb-8">{BRAND.tagline}</p>
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-primary">
              Shop Collection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}