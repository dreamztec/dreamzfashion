import { createFileRoute, Link } from "@tanstack/react-router";
import { WaitlistSignup } from "@/components/WaitlistSignup";
import { RainbowRule } from "@/components/brand";

export const Route = createFileRoute("/dreamz-5")({
  head: () => ({
    meta: [
      { title: "DREAMZ 5-Year Experience — The Billion-Naira Collection" },
      {
        name: "description",
        content:
          "The DREAMZ 5-Year Experience: five years of leather craft, culminating in The Billion-Naira Collection on 12 June 2027. Join the free early-access list.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Brand",
          name: "DREAMZ",
          // The brand's five-year journey (12 June 2027 marks five years).
          // The legal entity's CAC incorporation date is a separate,
          // accurately-recorded fact and is not rewritten here.
          foundingDate: "2022-06-12",
          slogan: "The Billion-Naira Collection.",
        }),
      },
    ],
  }),
  component: Anniversary,
});

function Anniversary() {
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-40 pb-32 text-center">
      <p className="overline-label mb-4">The DREAMZ 5-Year Experience</p>
      <h1 className="font-editorial text-5xl sm:text-6xl leading-tight">
        The Billion-Naira Collection.
      </h1>
      <p className="overline-label mt-4 !text-gold-soft">12 June 2027</p>
      <RainbowRule className="mx-auto mt-8 mb-8" />
      <p className="text-stone leading-relaxed">
        Five years of DREAMZ leather craft — since 12 June 2022 — building
        toward our most ambitious collection yet. The Billion-Naira Collection
        is the name of that fifth-anniversary ambition: one commemorative
        collection, revealed on 12 June 2027. Join the free early-access list
        below — waitlist members see each piece first, before the public
        release. No payment, no obligation, and waitlist registrations are
        never counted as sales.
      </p>
      <div className="mt-10 max-w-md mx-auto text-left">
        <WaitlistSignup source="anniversary" />
      </div>
      <div className="mt-12 flex flex-wrap justify-center gap-4">
        <Link
          to="/shop"
          search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }}
          className="btn-lux btn-lux-primary"
        >
          Shop the Current Collection
        </Link>
        <Link to="/custom" search={{ design: undefined, t: undefined }} className="btn-lux btn-lux-outline">
          Enter the Leather Atelier
        </Link>
      </div>
    </div>
  );
}
