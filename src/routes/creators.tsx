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
  headers: () => ({
    "Netlify-CDN-Cache-Control": "public, durable, max-age=300, stale-while-revalidate=1800",
  }),
  staleTime: 60_000,
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

      <section className="border-t border-ink/10 bg-ivory-deep">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
          <p className="overline-label mb-3">CREATE × DREAMZ</p>
          <h2 className="font-editorial text-4xl sm:text-5xl">Your story can become a real leather collection.</h2>
          <p className="mt-5 max-w-3xl text-stone leading-relaxed">
            For influencers, artists, athletes, cultural figures and community builders:
            propose a shoe, bag or leather accessory that reflects your identity.
            DREAMZ reviews feasibility, samples, pricing and production, then launches selected designs
            with a dedicated story, campaign and trackable sales route.
          </p>
          <div className="grid gap-5 md:grid-cols-4 mt-9">
            {[
              ["01", "Pitch your concept", "Share your story, audience and design idea. Applications are free."],
              ["02", "Design & validate", "DREAMZ checks materials, sample requirements, cost, margin and production capacity."],
              ["03", "Agree rights & rewards", "Sign a capsule agreement covering your image, design rights, marketing, royalties and delivery."],
              ["04", "Launch & earn", "Share the approved collection. DREAMZ fulfils orders; eligible sales and payouts are tracked."],
            ].map(([n,heading,body]) => (
              <article key={n} className="border border-ink/10 bg-ivory p-6">
                <p className="font-editorial text-3xl text-oxblood">{n}</p>
                <h3 className="font-editorial text-2xl mt-2">{heading}</h3>
                <p className="text-sm text-stone mt-3 leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-5 md:grid-cols-2 mt-7">
            <article className="border border-ink/10 bg-ivory p-7">
              <h3 className="font-editorial text-3xl">What a selected creator gets</h3>
              <ul className="text-sm text-stone mt-4 space-y-2">
                <li>✓ A co-designed, production-reviewed collection proposal</li>
                <li>✓ Approved co-branded story and shareable collection page</li>
                <li>✓ A creator code and dashboard where eligible</li>
                <li>✓ DREAMZ order handling, artisan coordination and fulfilment</li>
                <li>✓ A written royalty or sales-commission schedule before launch</li>
              </ul>
            </article>
            <article className="border border-ink/10 bg-ivory p-7">
              <h3 className="font-editorial text-3xl">How creator earnings work</h3>
              <p className="text-sm text-stone mt-4 leading-relaxed">
                Free referrals use the published verified-sales commission rate: <strong>{t.creatorRateLabel}</strong>.
                For specially approved co-designed pieces, a <strong>proposed 5% design royalty</strong>
                on eligible net merchandise receipts may be negotiated in a signed agreement.
                An agreed term, product scope, refunds, usage rights and payment schedule apply.
              </p>
              <p className="text-xs text-stone mt-4 leading-relaxed">
                These are separate commercial arrangements: royalty and referral commission do not automatically stack on the same order.
                Design submission or a social-media following does not guarantee selection, sales, income or a free sample.
                Paid/sponsored content needs appropriate disclosure and advertising compliance.
              </p>
            </article>
          </div>
          <div className="flex gap-3 flex-wrap mt-8">
            <Link to="/custom" search={{design:undefined,t:undefined,start:"1",brief:undefined}} className="btn-lux btn-lux-outline">Start your leather concept</Link>
            <Link to="/earn" hash="apply" className="btn-lux btn-lux-primary">Apply free as a creator</Link>
            <Link to="/partner-with-dreamz" className="btn-lux btn-lux-outline">All partnerships</Link>
          </div>
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
          <Link to="/partner-with-dreamz" className="btn-lux btn-lux-outline">Explore collaborations</Link>
        </div>
      </section>
    </div>
  );
}
