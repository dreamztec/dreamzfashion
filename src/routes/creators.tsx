import { Link, createFileRoute } from "@tanstack/react-router";
import { getPublicPartnerTerms } from "@/server/partner.functions";
import { RainbowRule } from "@/components/brand";
import { BRAND } from "@/lib/config";
import { formatNaira } from "@/lib/format";
import { CAMPAIGN_TIERS } from "@/lib/campaign-tiers";

export const Route = createFileRoute("/creators")({
  loader: () => getPublicPartnerTerms(),
  head: () => ({
    meta: [
      { title: `Creators & Partners — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Become a DREAMZ creator — free to apply. Earn commission on qualifying sales, and collaborate on paid campaign tiers from Spark to Icon.",
      },
    ],
  }),
  component: CreatorsPage,
});

const STEPS: Array<[string, string]> = [
  ["Apply to become a DREAMZ creator", "Free to apply. Tell us where you share and who you reach. No purchase is required."],
  ["Receive approval and your code", "Once approved you get a unique creator code (not case-sensitive) and a shareable link, with copy buttons in your dashboard."],
  ["Share samples and your link", "Share DREAMZ samples, products and custom designs with your audience, together with your code or link."],
  ["Customers order with your code", "Customers type your code at checkout, or arrive through your link. A code typed at checkout takes precedence over a link."],
  ["Eligible completed sales earn commission", "When an order is verified as fully paid, a pending commission is recorded once — duplicates are impossible."],
  ["Approved earnings become available", "After delivery and the return window, pending commission becomes available. Request a payout; the house reviews it and records the actual transfer reference."],
];

function CreatorsPage() {
  const t = Route.useLoaderData();
  return (
    <div>
      <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-32 pb-10 text-center">
        <p className="overline-label mb-4">Creators &amp; Partners</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">Share DREAMZ. Earn on real sales.</h1>
        <RainbowRule className="mx-auto mt-7" />
        <p className="text-stone mt-7 leading-relaxed">
          You are paid from <strong>qualifying sales</strong> — verified,
          fully paid and fulfilled orders placed with your code or link. Simply
          receiving a code, sharing it, or a customer entering it does not earn
          anything on its own.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-5 sm:px-8 pb-14">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="border border-ink/10 px-6 py-7">
              <p className="font-editorial text-2xl text-gold mb-2">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="uppercase tracking-btn text-[0.7rem] mb-2">{title}</h2>
              <p className="text-sm text-stone leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </div>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-14">
          <h2 className="font-editorial text-3xl mb-6 text-center">Current terms</h2>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Commission rate</dt>
              <dd className="font-editorial text-2xl">{t.rateLabel}</dd>
              {!t.rateConfigured && (
                <p className="text-xs text-stone mt-1">The house sets the rate before any creator is activated.</p>
              )}
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Calculated on</dt>
              <dd>Merchandise value after discounts — delivery fees excluded.</dd>
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Becomes available</dt>
              <dd>
                {t.returnWindowDays} day{t.returnWindowDays === 1 ? "" : "s"} after delivery (return window), if the order isn't refunded or cancelled.
              </dd>
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4">
              <dt className="input-lux-label">Payouts</dt>
              <dd>
                Requested from your dashboard, reviewed by the house, paid by
                manual transfer.{t.payoutThresholdKobo > 0 ? ` Minimum ${formatNaira(t.payoutThresholdKobo)}.` : ""}
              </dd>
            </div>
            <div className="border border-ink/10 bg-ivory px-5 py-4 sm:col-span-2">
              <dt className="input-lux-label">Buying with your own code</dt>
              <dd>
                Self-purchases never earn commission.{" "}
                {t.selfPurchaseBenefitBps > 0
                  ? `Approved creators get a ${(t.selfPurchaseBenefitBps / 100).toFixed(0)}% creator purchase benefit on their own orders instead.`
                  : "No creator purchase benefit is offered at the moment."}
              </dd>
            </div>
          </dl>
          <ul className="mt-8 text-sm text-stone leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Unpaid order requests earn nothing until they are paid; the order keeps your code while it waits.</li>
            <li>Referral links count for {t.attributionWindowDays} days after the click.</li>
            <li>Refunds and cancellations reverse the related commission.</li>
            <li>Your dashboard shows order numbers and values only — never customers' names, phone numbers or addresses.</li>
            {t.termsNote && <li>{t.termsNote}</li>}
          </ul>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/earn" hash="apply" className="btn-lux btn-lux-primary">
              Apply to become a creator
            </Link>
            <Link to="/account/partner" className="btn-lux btn-lux-outline">
              Creator dashboard
            </Link>
          </div>
        </div>
      </section>
      {/* ── Campaign tiers (collaboration values, not joining fees) ── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-16">
          <div className="text-center mb-10">
            <p className="overline-label mb-3">Campaign Tiers</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Seven ways to create with DREAMZ</h2>
            <div className="rule-gold mx-auto mt-6" />
            <p className="text-stone mt-6 max-w-2xl mx-auto leading-relaxed">
              These are paid <strong>collaboration campaigns</strong> — what a
              DREAMZ campaign with a creator costs. They are not joining fees:
              applying to the creator programme is free, and no one ever pays to
              become a seller. Creator selection depends on audience quality,
              content quality, reach, conversion history and negotiated scope.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {CAMPAIGN_TIERS.map((tier) => (
              <article key={tier.level} className="border border-ink/15 bg-ivory px-6 py-6">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="overline-label !text-gold-soft">
                    {tier.level} — {tier.name}
                  </p>
                  <p className="font-editorial text-xl">{tier.price}</p>
                </div>
                <p className="text-xs text-stone mt-2">{tier.audience}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {tier.deliverables.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span aria-hidden="true" className="text-gold">·</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-8 text-xs text-stone text-center max-w-2xl mx-auto leading-relaxed">
            Deliverables are indicative. Every campaign is agreed in writing —
            nothing on this page guarantees views, revenue or conversions.
            The sales-code commission system above is separate and unaffected.
          </p>
        </div>
      </section>
    </div>
  );
}
