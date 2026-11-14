import { Link, createFileRoute } from "@tanstack/react-router";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { getDreamLeaderboard } from "@/server/designer.functions";
import { BRAND, SITE_URL } from "@/lib/config";


export const Route = createFileRoute("/dreams")({
  loader: () => getDreamLeaderboard(),
  head: () => ({
    meta: [
      { title: `DREAMZ Community Designs — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Design your dream leather product, share your story and explore community creations.",
      },
      { property: "og:title", content: "DREAMZ Community Designs" },
      {
        property: "og:description",
        content: "Original leather concepts and the dreams behind them.",
      },
      { property: "og:image", content: SITE_URL + "/img/dfk-logo.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/dreams" }],
  }),
  component: DreamLeaderboard,
});



function DreamLeaderboard() {
  const designs = Route.useLoaderData();


  return (
    <div>
      <header className="bg-ink text-ivory px-5 pt-28 pb-12 text-center">
        <p className="overline-label !text-gold-soft">DREAMZ COMMUNITY</p>
        <h1 className="font-editorial text-5xl mt-4">Dream it. Design it. Share it.</h1>
        <p className="max-w-2xl mx-auto mt-5">Explore original concepts and the people behind them. Our former prize challenge is no longer being promoted. Publishing a design or placing an order does not enter you into a cash giveaway.</p>
        <a href="https://mydreamnetwork.dreamz-gc.com/dream-fund" className="inline-block underline mt-5">Discover the separate Dream Fund: 1% of DREAMZ sales ↗</a>
      </header>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="overline-label mb-3">Market Pulse</p>
          <h2 className="font-editorial text-4xl sm:text-5xl">Community Dream Designs</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            Explore designs with tracked orders, likes and shares. These signals are not prize rankings.
          </p>
        </div>
        {designs.length === 0 ? (
          <div className="border border-ink/10 p-10 text-center max-w-xl mx-auto">
            <h2 className="font-editorial text-3xl">Make room for your dream.</h2>
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
          <Link to="/our-progress" className="btn-lux btn-lux-outline">
            About the Dream Fund
          </Link>
        </div>
      </section>
    </div>
  );
}
