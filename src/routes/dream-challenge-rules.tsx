import { Link, createFileRoute } from "@tanstack/react-router";
import { BRAND, SITE_URL } from "@/lib/config";
import { DREAM_CHALLENGE } from "@/lib/dream-contest";

export const Route = createFileRoute("/dream-challenge-rules")({
  head: () => ({
    meta: [
      { title: `DREAMZ Dream Design Challenge Rules — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Prize structure, judging criteria, Dream Code tracking, production deposit terms, market-response rules and promotion status for the DREAMZ Dream Design Challenge.",
      },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/dream-challenge-rules" }],
  }),
  component: DreamChallengeRules,
});

const naira = (value: number) => "₦" + value.toLocaleString("en-NG");

function DreamChallengeRules() {
  return (
    <div>
      <header className="bg-ink text-ivory">
        <div className="h-1.5 rainbow-rule" aria-hidden="true" />
        <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-28 pb-12">
          <img src="/img/dfk-dreamz-logo.webp" alt="DREAMZ" className="h-16 w-auto max-w-[200px] rounded-lg bg-white p-2 object-contain" />
          <p className="overline-label !text-gold-soft mt-6">DREAMZ Dream Design Challenge</p>
          <h1 className="font-editorial text-4xl sm:text-6xl mt-2">Rules, prize terms & tracking.</h1>
          <p className="mt-5 text-sm sm:text-base text-ivory/70 leading-relaxed max-w-3xl">
            These rules are written to keep the design competition understandable, measurable and fair.
            The design and ordering service is live. The prize competition activates only after required promotional approval.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 sm:px-8 py-14">
        <section className="border border-gold/30 bg-gold/5 p-6">
          <p className="overline-label !text-gold">Current Status</p>
          <h2 className="font-editorial text-3xl mt-2">Prize activation pending required promotional approval.</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            Customers may use the DREAMZ Studio, publish Dream pages and place ordinary product orders now.
            No cash/product prize is awarded until the challenge is formally activated under these published terms and applicable approval requirements.
          </p>
        </section>

        <section className="mt-10">
          <p className="overline-label">1 · Prize Pool</p>
          <h2 className="font-editorial text-3xl mt-2">{naira(DREAM_CHALLENGE.totalPrizeNaira)} total cash-and-product pool.</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            The pool is exactly {naira(DREAM_CHALLENGE.totalCashNaira)} cash and {naira(DREAM_CHALLENGE.totalProductNaira)} in DREAMZ product value.
            Paid Studio passes are additional benefits and are not counted inside the ₦1,000,000.
          </p>
          <div className="mt-6 overflow-x-auto border border-ink/10">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-ivory-deep text-left text-[0.62rem] uppercase tracking-btn text-stone">
                <tr>
                  <th className="p-4">Place</th>
                  <th className="p-4">Cash</th>
                  <th className="p-4">DREAMZ products</th>
                  <th className="p-4">Bonus Studio access</th>
                </tr>
              </thead>
              <tbody>
                {DREAM_CHALLENGE.prizes.map((prize) => (
                  <tr key={prize.place} className="border-t border-ink/10">
                    <td className="p-4 font-medium">{prize.place}</td>
                    <td className="p-4">{naira(prize.cashNaira)}</td>
                    <td className="p-4">{naira(prize.productNaira)}</td>
                    <td className="p-4">{prize.studioPlan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <p className="overline-label">2 · Entry & Production</p>
          <h2 className="font-editorial text-3xl mt-2">Design first. Production is a real order.</h2>
          <div className="mt-5 space-y-3 text-sm text-stone leading-relaxed">
            <p>Entrants create an original leather-product concept in the DREAMZ Studio and publish the completed Dream page with its generated product image and unique Dream Code.</p>
            <p>For prize eligibility after activation, at least one DREAMZ-verified production order must be attached to the design. A verified order means DREAMZ has confirmed the client, final quote and a production deposit of at least {DREAM_CHALLENGE.minimumDepositPercent}%.</p>
            <p>The remaining balance may be paid on delivery through eligible GIG Logistics COD/TOD routes and order types. Where COD/TOD is not available or approved for that delivery, DREAMZ will confirm the remaining payment before dispatch.</p>
            <p>One person may publish multiple designs within their Studio plan limit, but one person may occupy only one winning position; their highest-scoring judged design is used.</p>
          </div>
        </section>

        <section className="mt-12">
          <p className="overline-label">3 · Judging</p>
          <h2 className="font-editorial text-3xl mt-2">The winner is the best design, not the biggest following.</h2>
          <div className="mt-6 border border-ink/10 divide-y divide-ink/10">
            {DREAM_CHALLENGE.judging.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-5 p-4">
                <span className="text-sm">{item.label}</span>
                <strong>{item.points} points</strong>
              </div>
            ))}
          </div>
          <p className="text-sm text-stone mt-4 leading-relaxed">
            DREAMZ will publish the judging panel and final judging date before prize activation.
            Market response contributes only 15 of 100 judging points. No amount of likes, shares or purchases automatically guarantees a winning position.
          </p>
        </section>

        <section className="mt-12">
          <p className="overline-label">4 · Dream Code Tracking</p>
          <h2 className="font-editorial text-3xl mt-2">Every public design has its own measurable trail.</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            DREAMZ tracks the public Dream Code, views, verified-account likes, recorded shares and DREAMZ-verified orders.
            The public leaderboard is a market-response indicator, not the final judging table. Views carry no market-signal points.
            Duplicate, automated, cancelled, fraudulent, self-manipulated or otherwise unreliable activity may be removed.
          </p>
        </section>

        <section className="mt-12">
          <p className="overline-label">5 · Originality & Rights</p>
          <h2 className="font-editorial text-3xl mt-2">Create something you have the right to share.</h2>
          <div className="mt-4 space-y-3 text-sm text-stone leading-relaxed">
            <p>Entries must be original and must not copy protected third-party logos, branded ornaments, copyrighted artwork or another creator's design.</p>
            <p>Publishing a Dream page gives DREAMZ permission to display and promote that submitted design and story in connection with the challenge and DREAMZ marketing. It does not automatically transfer the creator's unrelated intellectual-property rights.</p>
            <p>A selected design may be invited to a showcase, auction, collaboration or limited production run only under separate written creator/commercial terms. Auction or resale rights are not automatic.</p>
          </div>
        </section>

        <section className="mt-12">
          <p className="overline-label">6 · Prize Products</p>
          <h2 className="font-editorial text-3xl mt-2">Product value is not cash.</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            DREAMZ product prizes are redeemed as DREAMZ products or approved custom-production value up to the stated amount.
            They are not exchangeable for cash. Final materials and designs remain subject to measurements, leather availability and production feasibility.
          </p>
        </section>

        <section className="mt-12">
          <p className="overline-label">7 · Timing & Verification</p>
          <h2 className="font-editorial text-3xl mt-2">Dates become binding when the challenge is activated.</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            The current proposed close date is 31 December 2026. DREAMZ may adjust the activation or closing date before launch to satisfy regulatory, operational or fairness requirements.
            Final dates, judging panel, claim procedure and winner-announcement timing will be published before activation. Identity and order records may be verified before a prize is released.
          </p>
        </section>

        <section className="mt-12 border-t border-ink/10 pt-10">
          <p className="text-xs text-stone leading-relaxed">
            Nothing in these challenge rules removes consumer rights that apply to a purchase. Product quotations, production feasibility, delivery, returns and refunds remain governed by the applicable DREAMZ order terms and consumer law.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link to="/dreams" className="btn-lux btn-lux-primary">View the Challenge</Link>
            <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-outline">
              Design My Dream
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
