import { createFileRoute, Link } from "@tanstack/react-router";
import { WaitlistSignup } from "@/components/WaitlistSignup";
import { RainbowRule } from "@/components/brand";

export const Route = createFileRoute("/dreamz-5")({
  head: () => ({
    meta: [
      { title: "Fifth Anniversary Collection — DREAMZ" },
      {
        name: "description",
        content:
          "Five years of DREAMZ. Join the free early-access list for the fifth-anniversary collection, unveiled 12 June 2027.",
      },
    ],
  }),
  component: Anniversary,
});

function Anniversary() {
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-40 pb-32 text-center">
      <p className="overline-label mb-4">12 June 2027</p>
      <h1 className="font-editorial text-5xl sm:text-6xl leading-tight">
        The Fifth Anniversary Collection
      </h1>
      <RainbowRule className="mx-auto mt-8 mb-8" />
      <p className="text-stone leading-relaxed">
        Five years of DREAMZ. One commemorative collection. Join the free
        early-access list below — waitlist members see each piece first, before
        the public release. No payment, no obligation, and waitlist
        registrations are never counted as sales.
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
        <Link to="/custom" className="btn-lux btn-lux-outline">
          Design Yours
        </Link>
      </div>
    </div>
  );
}
