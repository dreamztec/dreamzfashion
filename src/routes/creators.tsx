import { Link, createFileRoute } from "@tanstack/react-router";
import { getPublicPartnerTerms } from "@/server/partner.functions";
import { RainbowRule } from "@/components/brand";
import { BRAND } from "@/lib/config";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/creators")({
  loader: () => getPublicPartnerTerms(),
  head: () => ({
    meta: [
      { title: `DREAMZ Creator Programme — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Join the DREAMZ creator programme free, earn on qualifying verified product sales, and become eligible for separately negotiated campaign collaborations.",
      },
    ],
  }),
  component: CreatorsPage,
});

const STEPS: Array<[string, string]> = [
  ["Apply free", "Creators do not pay a joining fee or buy a subscription to qualify for sales commission."],
  ["Receive approval and your code", "Approved creators receive a unique code/link and access to approved DREAMZ product content."],
  ["Create and share", "Use your audience, content and community to introduce customers to real DREAMZ products."],
  ["Customers order", "Qualifying orders are attributed through the approved code/link system."],
  ["Commission is recorded", "Commission is created only after the relevant order is verified as fully paid."],
  ["Earnings clear", "After fulfilment and the return window, eligible earnings can be requested according to the published payout rules."],
];

function CreatorsPage() {
  const t = Route.useLoaderData();
  return (
    <div>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-32 pb-10 text-center">
        <p className="overline-label mb-4">DREAMZ CREATOR PROGRAMME</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">Create. Share. Earn on real sales.</h1>
        <RainbowRule className="mx-auto mt-7" />
        <p className="text-stone mt-7 leading-relaxed">
          The creator programme is part of <strong>Earn with DREAMZ</strong> and
          is free to join. Sales commission comes from qualifying verified
          customer orders — not from paying a fee, recruiting people or merely
          receiving a code.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 pb-14">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="border border-ink/10 px-6 py-7">
              <p className="font-editorial text-2xl text-gold mb-2">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="uppercase tracking-btn text-[0.7rem] mb-2">{title}</h2>
              <p className="text-sm text-stone leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-14">
          <h2 className="font-editorial text-3xl mb-6 text-center">Current sales terms</h2>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Commission rate</dt>
              <dd className="font-editorial text-2xl">{t.creatorRateLabel}</dd>
              {!t.rateConfigured && (
                <p className="text-xs text-stone mt-1">DREAMZ sets the rate before a creator is activated.</p>
              )}
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Calculated on</dt>
              <dd>Eligible merchandise value after discounts; delivery fees are excluded.</dd>
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Becomes available</dt>
              <dd>
                {t.returnWindowDays} day{t.returnWindowDays === 1 ? "" : "s"} after delivery, if the order is not refunded or cancelled.
              </dd>
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Payouts</dt>
              <dd>
                Requested from your dashboard and reviewed by DREAMZ.
                {t.payoutThresholdKobo > 0 ? ` Minimum ${formatNaira(t.payoutThresholdKobo)}.` : ""}
              </dd>
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4 sm:col-span-2">
              <dt className="input-lux-label">Buying with your own code</dt>
              <dd>
                Self-purchases never earn commission.{" "}
                {t.selfPurchaseBenefitBps > 0
                  ? `Approved creators receive a ${(t.selfPurchaseBenefitBps / 100).toFixed(0)}% creator purchase benefit on their own orders instead.`
                  : "No creator purchase benefit is currently offered."}
              </dd>
            </div>
          </dl>
          <ul className="mt-8 text-sm text-stone leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Unpaid order requests earn nothing until payment is confirmed.</li>
            <li>Referral links count for {t.attributionWindowDays} days after the click.</li>
            <li>Refunds and cancellations reverse the related unpaid commission.</li>
            <li>Your dashboard does not expose customer contact or delivery details.</li>
            {t.termsNote && <li>{t.termsNote}</li>}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 sm:px-8 py-16 text-center">
        <p className="overline-label mb-3">Creator Collaborations</p>
        <h2 className="font-editorial text-3xl">Campaign work is separate.</h2>
        <p className="mt-4 text-stone leading-relaxed max-w-2xl mx-auto">
          DREAMZ may separately commission creators for campaign content, shoots,
          launches or appearances. Those collaborations are individually scoped
          and negotiated. There is no public fixed creator-fee ladder and no
          campaign payment is promised simply because you join the sales programme.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/earn" hash="apply" className="btn-lux btn-lux-primary">
            Apply Free
          </Link>
          <Link to="/partner-with-dreamz" className="btn-lux btn-lux-outline">
            Optional Business Support
          </Link>
        </div>
      </section>
    </div>
  );
}
