import { Link, createFileRoute } from "@tanstack/react-router";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { getDreamLeaderboard } from "@/server/designer.functions";
import { BRAND } from "@/lib/config";
import { DREAM_CHALLENGE } from "@/lib/dream-contest";

export const Route = createFileRoute("/dreams")({
  loader: () => getDreamLeaderboard(),
  head: () => ({
    meta: [
      { title: `Top 100 Dream Designs — ${BRAND.name}` },
      {
        name: "description",
        content:
          "See the DREAMZ community designs attracting real attention and verified orders. Design your own leather piece and share it.",
      },
    ],
  }),
  component: DreamLeaderboard,
});

function DreamLeaderboard() {
  const designs = Route.useLoaderData();

  return (
    <div>
      <header className="mx-auto max-w-5xl px-5 sm:px-8 pt-28 pb-10 text-center">
        <p className="overline-label mb-3">DREAMZ Open Atelier · Community Ranking</p>
        <h1 className="font-editorial text-4xl sm:text-6xl uppercase leading-tight">Top 100 Dreams</h1>
        <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-stone leading-relaxed">
          Design something original in leather, publish it and share it. Community love matters,
          but real verified orders matter most.
        </p>

        <div className="mt-7 grid grid-cols-3 gap-px border border-ink/10 bg-ink/10 max-w-xl mx-auto">
          <div className="bg-ivory p-4">
            <p className="text-[0.56rem] uppercase tracking-btn text-stone">1st</p>
            <p className="font-editorial text-2xl mt-1">₦{(DREAM_CHALLENGE.prizes[0].amountNaira / 1000).toLocaleString("en-NG")}k</p>
          </div>
          <div className="bg-ivory p-4">
            <p className="text-[0.56rem] uppercase tracking-btn text-stone">2nd</p>
            <p className="font-editorial text-2xl mt-1">₦{(DREAM_CHALLENGE.prizes[1].amountNaira / 1000).toLocaleString("en-NG")}k</p>
          </div>
          <div className="bg-ivory p-4">
            <p className="text-[0.56rem] uppercase tracking-btn text-stone">3rd</p>
            <p className="font-editorial text-2xl mt-1">₦{(DREAM_CHALLENGE.prizes[2].amountNaira / 1000).toLocaleString("en-NG")}k</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-stone">
          Planned DREAMZ prize pool: ₦{DREAM_CHALLENGE.totalPrizeNaira.toLocaleString("en-NG")} · Target close: 31 December 2026.
          Prize activation and eligibility remain subject to the published challenge terms and required promotional approval.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/custom"
            search={{ design: undefined, t: undefined, start: "1", brief: undefined }}
            className="btn-lux btn-lux-primary"
          >
            Design My Dream
          </Link>
          <Link to="/studio-plans" className="btn-lux btn-lux-outline">
            Studio Plans
          </Link>
        </div>
      </header>

      <section className="border-y border-ink/10 bg-ivory-deep/60">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-7">
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div>
              <p className="font-editorial text-2xl">{DREAM_CHALLENGE.scoring.verifiedOrder} pts</p>
              <p className="text-[0.6rem] uppercase tracking-btn text-stone mt-1">Each verified order</p>
            </div>
            <div>
              <p className="font-editorial text-2xl">{DREAM_CHALLENGE.scoring.verifiedAccountLike} pts</p>
              <p className="text-[0.6rem] uppercase tracking-btn text-stone mt-1">Each verified-account like</p>
            </div>
            <div>
              <p className="font-editorial text-2xl">{DREAM_CHALLENGE.scoring.recordedShare} pt</p>
              <p className="text-[0.6rem] uppercase tracking-btn text-stone mt-1">Each recorded share</p>
            </div>
          </div>
          <p className="text-xs text-stone leading-relaxed text-center mt-5 max-w-3xl mx-auto">
            Views are shown for transparency but do not add points. At least one DREAMZ-verified order is required
            to be eligible for a cash prize. A WhatsApp click is only interest: it becomes an order only after DREAMZ
            verifies the real sale. Suspicious activity, cancelled orders and self-manipulation can be excluded under the final challenge terms.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
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
                        image: typeof preview.image === "string" ? preview.image : null,
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
                    <h2 className="font-editorial text-2xl mt-1">{design.title}</h2>
                    <div className="grid grid-cols-4 gap-2 mt-5 text-center border-t border-ink/10 pt-4">
                      <div><p className="font-editorial text-lg">{design.verifiedOrders}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Orders</p></div>
                      <div><p className="font-editorial text-lg">{design.likeCount}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Likes</p></div>
                      <div><p className="font-editorial text-lg">{design.shareCount}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Shares</p></div>
                      <div><p className="font-editorial text-lg">{design.viewCount}</p><p className="text-[0.5rem] uppercase tracking-btn text-stone">Views</p></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 text-xs uppercase tracking-btn">
                      <span>Score {design.contestScore}</span>
                      <span className={design.prizeEligible ? "text-forest" : "text-stone"}>
                        {design.prizeEligible ? "Prize eligible" : "Needs 1 verified order"}
                      </span>
                    </div>
                    <p className="mt-2 text-[0.6rem] uppercase tracking-btn text-stone group-hover:text-ink">View dream →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
