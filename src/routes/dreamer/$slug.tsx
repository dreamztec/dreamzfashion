import { Link, createFileRoute } from "@tanstack/react-router";
import { getPublicDesignerProfile } from "@/server/designer.functions";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/dreamer/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicDesignerProfile({ data: params.slug });
    if (!result) throw new Error("Dreamer not found");
    return result;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.profile.displayName || "DREAMZ Dreamer"} — DREAMZ Open Atelier` },
      {
        name: "description",
        content: loaderData?.profile.dreamStatement || "A DREAMZ Dreamer designing leather ideas and sharing them with the world.",
      },
    ],
  }),
  component: DreamerPage,
});

function publicPreview(payload: Record<string, unknown>) {
  const visual = payload.visualPreview;
  return visual && typeof visual === "object" ? (visual as Record<string, unknown>) : {};
}

function publicSummary(payload: Record<string, unknown>): string {
  return typeof payload.designSummary === "string" ? payload.designSummary : "";
}

function DreamerPage() {
  const { profile, designs, earnCode } = Route.useLoaderData();

  return (
    <div>
      <header className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-12 text-center">
        <p className="overline-label mb-4">DREAMZ Open Atelier</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">{profile.displayName}</h1>
        {profile.foundingNumber && (
          <p className="mt-4 inline-flex border border-gold/40 bg-gold/5 px-3 py-1.5 text-[0.62rem] uppercase tracking-btn text-gold">
            Founding Dreamer #{String(profile.foundingNumber).padStart(3, "0")}
          </p>
        )}
        {profile.dreamStatement && <p className="mt-5 text-lg text-stone">{profile.dreamStatement}</p>}
        {profile.bio && <p className="mt-4 max-w-2xl mx-auto text-sm text-stone leading-relaxed">{profile.bio}</p>}
        <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary">
            Design Your Dream
          </Link>
          <Link to="/studio-plans" className="btn-lux btn-lux-outline">
            Creator Studio Plans
          </Link>
        </div>
      </header>

      <section className="border-t border-ink/10 bg-ivory">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 sm:py-18">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="overline-label mb-2">Designs by {profile.displayName}</p>
              <h2 className="font-editorial text-3xl sm:text-4xl">Dreams in leather</h2>
            </div>
            <p className="text-xs text-stone">{designs.length} public design{designs.length === 1 ? "" : "s"}</p>
          </div>

          {designs.length === 0 ? (
            <div className="border border-ink/10 p-10 text-center">
              <h3 className="font-editorial text-2xl">The first design is coming.</h3>
              <p className="text-sm text-stone mt-2">Saved private designs never appear here until the Dreamer chooses to publish them.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map((design) => {
                const payload = design.payload as Record<string, unknown>;
                const preview = publicPreview(payload);
                const summary = publicSummary(payload);
                return (
                  <a
                    key={design.id}
                    href={
                      earnCode
                        ? "/r/" + encodeURIComponent(earnCode) + "?to=" + encodeURIComponent("/dream/" + (design.publicSlug || ""))
                        : "/dream/" + (design.publicSlug || "")
                    }
                    className="group border border-ink/10 bg-white/50"
                  >
                    <DesignConceptPreview
                      compact
                      preview={{
                        piece: typeof preview.piece === "string" ? preview.piece : design.piece,
                        material: typeof preview.material === "string" ? preview.material : null,
                        primaryColour: typeof preview.primaryColour === "string" ? preview.primaryColour : null,
                        secondaryColour: typeof preview.secondaryColour === "string" ? preview.secondaryColour : null,
                        image: typeof preview.image === "string" ? preview.image : null,
                        construction:
                          preview.construction && typeof preview.construction === "object"
                            ? (preview.construction as Record<string, string>)
                            : null,
                      }}
                    />
                    <div className="p-5">
                      <p className="text-[0.6rem] uppercase tracking-btn text-gold">Version {design.designVersion}</p>
                      <h3 className="font-editorial text-2xl mt-1">{design.title}</h3>
                      {summary && <p className="mt-2 text-xs text-stone leading-relaxed line-clamp-3">{summary}</p>}
                      <div className="mt-4 flex items-center justify-between text-[0.64rem] uppercase tracking-btn text-stone">
                        <span>{design.likeCount} {design.likeCount === 1 ? "like" : "likes"}</span>
                        <span className="group-hover:text-ink">View dream →</span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          <p className="text-center text-xs text-stone mt-12 max-w-2xl mx-auto leading-relaxed">
            These are community-created concepts made with the {BRAND.shortName} design studio. DREAMZ reviews material availability, construction and final pricing before any piece is produced.
          </p>
        </div>
      </section>
    </div>
  );
}
