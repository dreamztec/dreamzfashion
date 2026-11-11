import { Link, createFileRoute } from "@tanstack/react-router";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { getDreamLeaderboard } from "@/server/designer.functions";
import { BRAND, SITE_URL } from "@/lib/config";
import { DREAM_CHALLENGE } from "@/lib/dream-contest";

export const Route = createFileRoute("/dreams")({
  loader: () => getDreamLeaderboard(),
  head: () => ({
    meta: [
      { title: `DREAMZ ₦1M Dream Design Challenge — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Design your dream leather product, publish it with a unique Dream Code, track real market response and compete for a planned ₦1,000,000 prize pool across the top five designs.",
      },
      { property: "og:title", content: "DREAMZ ₦1M Dream Design Challenge" },
      {
        property: "og:description",
        content: "₦500k cash + ₦500k DREAMZ products across the top five designs, plus paid Studio passes. Best design wins — not just the most likes.",
      },
      { property: "og:image", content: SITE_URL + "/img/dfk-dreamz-logo.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/dreams" }],
  }),
  component: DreamLeaderboard,
});

const naira = (value: number) => "₦" + value.toLocaleString("en-NG");

function DreamLeaderboard() {
  const designs = Route.useLoaderData();
  const isPending = DREAM_CHALLENGE.status === "pending_approval";

  return (
    <div>
      <header className="relative overflow-hidden bg-ink text-ivory">
        <div className="absolute inset-x-0 top-0 h-1.5 rainbow-rule" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 pb-14 sm:pb-18">
          <div className="grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <img
                src="/img/dfk-dreamz-logo.webp"
                alt="DREAMZ"
                className="h-20 w-auto max-w-[230px] object-contain bg-white rounded-xl p-2"
              />
              <p className="overline-label !text-gold-soft mt-6">DREAMZ Open Atelier · Dream Design Challenge</p>
              <h1 className="font-editorial text-5xl sm:text-7xl uppercase leading-[.95] mt-3">
                Design Your Dream.
                <span className="block text-gold-soft">Let the best designs win.</span>
              </h1>
            </div>
            <div className="lg:pb-1">
              <p className="font-editorial text-6xl sm:text-8xl text-gold-soft">{naira(DREAM_CHALLENGE.totalPrizeNaira)}</p>
              <p className="text-xl sm:text-2xl uppercase tracking-btn mt-2">Total prize pool*</p>
              <p className="mt-4 text-sm sm:text-base text-ivory/75 leading-relaxed max-w-2xl">
                {naira(DREAM_CHALLENGE.totalCashNaira)} cash + {naira(DREAM_CHALLENGE.totalProductNaira)} in DREAMZ products,
                shared across the top five designs — plus paid DREAMZ Studio passes.
              </p>
              <p className="mt-5 text-sm text-ivory/70 max-w-2xl">
                Create in the Studio, publish with a unique Dream Code, share your design and validate real demand.
                Final winners are judged on design quality — engagement is only one part of the decision.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/custom"
                  search={{ design: undefined, t: undefined, start: "1", brief: undefined }}
                  className="btn-lux btn-lux-gold"
                >
                  Design My Dream
                </Link>
                <Link to="/dream-challenge-rules" className="btn-lux border border-ivory/35 text-ivory hover:border-ivory">
                  Read Full Rules
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-8 text-[0.66rem] text-ivory/55 max-w-3xl">
            *The design and ordering offer is live. Prize-challenge activation is subject to required promotional registration/approval and the published rules. Proposed close: 31 December 2026.
          </p>
        </div>
      </header>

      <section className="border-b border-ink/10 bg-ivory">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
            <div>
              <p className="overline-label mb-2">Top 5 Prize Structure</p>
              <h2 className="font-editorial text-3xl sm:text-5xl">₦500k cash. ₦500k products. Five winners.</h2>
            </div>
            <p className="text-xs text-stone max-w-md">
              Paid Studio access is a bonus and is not counted inside the ₦1,000,000 cash-and-product prize pool.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {DREAM_CHALLENGE.prizes.map((prize, index) => (
              <article key={prize.place} className="relative overflow-hidden border border-ink/10 bg-white p-5">
                <div className={"absolute inset-x-0 top-0 h-1 " + ["bg-gold", "bg-brand-blue", "bg-forest", "bg-brand-red", "bg-rainbow-plum"][index]} />
                <p className="text-[0.62rem] uppercase tracking-btn text-stone">{prize.place}{prize.place === 1 ? "st" : prize.place === 2 ? "nd" : prize.place === 3 ? "rd" : "th"} place</p>
                <p className="font-editorial text-2xl mt-3">{naira(prize.cashNaira)} cash</p>
                <p className="text-sm mt-2">+ {naira(prize.productNaira)} DREAMZ products</p>
                <p className="text-[0.62rem] uppercase tracking-btn text-gold mt-4">+ {prize.studioPlan}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-ivory-deep/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14 grid gap-10 lg:grid-cols-[1fr_.95fr]">
          <div>
            <p className="overline-label mb-2">How It Works</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">From dream to a trackable product.</h2>
            <ol className="mt-7 grid gap-4 sm:grid-cols-2">
              {[
                ["01", "Design", "Create your dream leather product in the DREAMZ Studio using real leather, colour and construction references."],
                ["02", "Publish", "Upload your generated product image, name it and receive a unique public Dream Code and shareable landing page."],
                ["03", "Order", `Confirm production with at least ${DREAM_CHALLENGE.minimumDepositPercent}% of the final approved quote.`],
                ["04", "Track", "Views, verified-account likes, recorded shares and DREAMZ-verified orders stay attached to the design."],
              ].map(([n, title, copy]) => (
                <li key={n} className="border border-ink/10 bg-ivory p-5">
                  <p className="font-editorial text-2xl text-gold">{n}</p>
                  <h3 className="font-editorial text-xl mt-2">{title}</h3>
                  <p className="text-sm text-stone leading-relaxed mt-2">{copy}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="overline-label mb-2">How Winners Are Chosen</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Best design wins — not just the most likes.</h2>
            <div className="mt-7 border border-ink/10 bg-white divide-y divide-ink/10">
              {DREAM_CHALLENGE.judging.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-5 px-5 py-4">
                  <span className="text-sm">{item.label}</span>
                  <span className="font-editorial text-xl">{item.points} pts</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone leading-relaxed">
              The market-response portion uses tracked activity as evidence of demand. It does not replace the judging panel.
              Suspicious, duplicate, cancelled or manipulated activity may be excluded.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-ivory">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14 grid gap-8 lg:grid-cols-3">
          <article className="border border-ink/10 p-6">
            <p className="overline-label">Production Deposit</p>
            <h2 className="font-editorial text-3xl mt-2">{DREAM_CHALLENGE.minimumDepositPercent}% minimum</h2>
            <p className="text-sm text-stone leading-relaxed mt-3">
              Production begins only after DREAMZ confirms the final design, measurements, feasibility and price, and receives the minimum production deposit.
            </p>
          </article>
          <article className="border border-ink/10 p-6">
            <p className="overline-label">Balance on Delivery</p>
            <h2 className="font-editorial text-3xl mt-2">Eligible GIGL COD / TOD</h2>
            <p className="text-sm text-stone leading-relaxed mt-3">
              Where the destination and order qualify, the remaining balance may be collected through GIG Logistics COD/TOD. Otherwise DREAMZ will confirm payment before dispatch.
            </p>
          </article>
          <article className="border border-ink/10 p-6">
            <p className="overline-label">Showcase / Auction</p>
            <h2 className="font-editorial text-3xl mt-2">Only with creator terms</h2>
            <p className="text-sm text-stone leading-relaxed mt-3">
              Selected designs may be invited to a DREAMZ showcase, limited release or auction. Commercial use is never automatic; creator consent and separate commercial terms are required.
            </p>
          </article>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-ink text-ivory">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
          <div className="grid gap-6 md:grid-cols-4 text-center">
            <div>
              <p className="font-editorial text-3xl">{DREAM_CHALLENGE.scoring.verifiedOrder} pts</p>
              <p className="text-[0.6rem] uppercase tracking-btn text-ivory/55 mt-1">Verified order signal</p>
            </div>
            <div>
              <p className="font-editorial text-3xl">{DREAM_CHALLENGE.scoring.verifiedAccountLike} pts</p>
              <p className="text-[0.6rem] uppercase tracking-btn text-ivory/55 mt-1">Verified-account like</p>
            </div>
            <div>
              <p className="font-editorial text-3xl">{DREAM_CHALLENGE.scoring.recordedShare} pt</p>
              <p className="text-[0.6rem] uppercase tracking-btn text-ivory/55 mt-1">Recorded share</p>
            </div>
            <div>
              <p className="font-editorial text-3xl">0 pts</p>
              <p className="text-[0.6rem] uppercase tracking-btn text-ivory/55 mt-1">Views shown only</p>
            </div>
          </div>
          <p className="text-xs text-ivory/60 leading-relaxed text-center mt-6 max-w-3xl mx-auto">
            These numbers create a transparent market-signal score for the public leaderboard. Final challenge judging uses the published 100-point design rubric above.
          </p>
        </div>
      </section>

      {isPending && (
        <section className="border-b border-gold/30 bg-gold/5">
          <div className="mx-auto max-w-5xl px-5 sm:px-8 py-7 text-center">
            <p className="overline-label !text-gold">Promotion Status</p>
            <h2 className="font-editorial text-3xl mt-2">Design now. Prize activation follows required approval.</h2>
            <p className="text-sm text-stone mt-3 max-w-3xl mx-auto leading-relaxed">
              The DREAMZ Studio, ordering and public design pages are live. The cash/product prize competition will be activated only under the published rules and required promotional approval.
            </p>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="overline-label mb-3">Market Pulse</p>
          <h2 className="font-editorial text-4xl sm:text-5xl">Top 100 Dream Designs</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            This leaderboard shows tracked market response. It is not the final judging table.
          </p>
        </div>
        {designs.length === 0 ? (
          <div className="border border-ink/10 p-10 text-center max-w-xl mx-auto">
            <h2 className="font-editorial text-3xl">The leaderboard is open.</h2>
            <p className="text-sm text-stone mt-3">The first published community designs will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((design) => {
              const payload = design.payload as Record<string, unknown>;
              const preview =
                payload.visualPreview && typeof payload.visualPreview === "object"
                  ? (payload.visualPreview as Record<string, unknown>)
                  : {};
              const generatedImageUrl =
                typeof payload.generatedImageUrl === "string" ? payload.generatedImageUrl : null;
              return (
                <Link
                  key={design.id}
                  to="/dream/$slug"
                  params={{ slug: design.publicSlug || "" }}
                  className="group border border-ink/10 bg-white/50 overflow-hidden"
                >
                  <div className="relative">
                    <DesignConceptPreview
                      compact
                      preview={{
                        piece: typeof preview.piece === "string" ? preview.piece : design.piece,
                        material: typeof preview.material === "string" ? preview.material : null,
                        texture: typeof preview.texture === "string" ? preview.texture : null,
                        primaryColour: typeof preview.primaryColour === "string" ? preview.primaryColour : null,
                        secondaryColour: typeof preview.secondaryColour === "string" ? preview.secondaryColour : null,
                        image: generatedImageUrl || (typeof preview.image === "string" ? preview.image : null),
                        construction:
                          preview.construction && typeof preview.construction === "object"
                            ? (preview.construction as Record<string, string>)
                            : null,
                      }}
                    />
                    <span className="absolute left-3 top-3 bg-ink text-ivory px-3 py-1.5 text-[0.62rem] uppercase tracking-btn">
                      #{design.rank}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-[0.6rem] uppercase tracking-btn text-gold">{design.displayName}</p>
                    <h3 className="font-editorial text-2xl mt-1">{design.title}</h3>
                    <div className="grid grid-cols-4 gap-2 mt-5 text-center border-t border-ink/10 pt-4">
                      <div><p className="font-editorial text-lg">{design.verifiedOrders}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Orders</p></div>
                      <div><p className="font-editorial text-lg">{design.likeCount}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Likes</p></div>
                      <div><p className="font-editorial text-lg">{design.shareCount}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Shares</p></div>
                      <div><p className="font-editorial text-lg">{design.viewCount}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Views</p></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 text-xs uppercase tracking-btn">
                      <span>Market signal {design.contestScore}</span>
                      <span className={design.prizeEligible ? "text-forest" : "text-stone"}>
                        {design.prizeEligible ? "Verified order ✓" : "Needs verified order"}
                      </span>
                    </div>
                    <p className="mt-2 text-[0.6rem] uppercase tracking-btn text-stone group-hover:text-ink">View dream →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/custom"
            search={{ design: undefined, t: undefined, start: "1", brief: undefined }}
            className="btn-lux btn-lux-primary"
          >
            Start My Dream Design
          </Link>
          <Link to="/dream-challenge-rules" className="btn-lux btn-lux-outline">
            Rules, Tracking & Prize Terms
          </Link>
        </div>
      </section>
    </div>
  );
}
