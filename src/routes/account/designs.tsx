import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyDesigns } from "@/server/account.functions";
import { getMySavedBriefs } from "@/server/saved-briefs.functions";
import { getMyDesignerState } from "@/server/designer.functions";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";

export const Route = createFileRoute("/account/designs")({
  component: MyDesigns,
});

type DesignerState = Awaited<ReturnType<typeof getMyDesignerState>>;
type SubmittedState = Awaited<ReturnType<typeof getMyDesigns>>;

interface LegacyBrief {
  id: number;
  title: string;
  category: string | null;
  piece: string | null;
  status: string;
  createdAt: string | null;
  designSummary: string;
  renderPrompt: string;
}

function MyDesigns() {
  const [studio, setStudio] = useState<DesignerState | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedState | null>(null);
  const [legacy, setLegacy] = useState<LegacyBrief[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getMyDesignerState(),
      getMyDesigns().catch(() => null),
      getMySavedBriefs().catch(() => null),
    ])
      .then(([studioState, requestState, legacyState]) => {
        if (cancelled) return;
        if (studioState.unauthenticated) {
          setFailed(true);
          return;
        }
        setStudio(studioState);
        if (requestState) setSubmitted(requestState);
        if (legacyState && !legacyState.unauthenticated) {
          const linkedIds = new Set(studioState.designs.map((design) => design.id));
          setLegacy((legacyState.briefs as LegacyBrief[]).filter((brief) => !linkedIds.has(brief.id)));
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="text-stone">Please sign in to view your designs.</p>;
  if (!studio) return <div className="skeleton h-64 w-full" />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="overline-label mb-2">DREAMZ Visual Studio</p>
          <h1 className="font-editorial text-3xl">My Designs</h1>
          <p className="text-xs text-stone mt-2">
            {studio.used} of {studio.plan.designLimit} design slots used · {studio.remaining} remaining
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/account/designer" className="btn-lux btn-lux-outline !py-2.5 !px-5">My Dreamer Page</Link>
          <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary !py-2.5 !px-5">
            New Design
          </Link>
        </div>
      </div>

      {studio.designs.length === 0 ? (
        <div className="border border-ink/10 p-8 text-center">
          <h2 className="font-editorial text-2xl">Your first three designs are free.</h2>
          <p className="text-sm text-stone mt-3 max-w-lg mx-auto">
            Pick a leather piece visually, choose leather and colours, save it privately, change it later or publish it to your automatic Dreamer page.
          </p>
          <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary inline-block mt-5">
            Design My Dream
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {studio.designs.map((design) => {
            const payload = design.payload as Record<string, unknown>;
            const preview = payload.visualPreview && typeof payload.visualPreview === "object"
              ? (payload.visualPreview as Record<string, unknown>)
              : {};
            const summary = typeof payload.designSummary === "string" ? payload.designSummary : "";
            return (
              <article key={design.id} className="border border-ink/10 bg-white/40 overflow-hidden">
                <DesignConceptPreview
                  compact
                  preview={{
                    piece: typeof preview.piece === "string" ? preview.piece : design.piece,
                    material: typeof preview.material === "string" ? preview.material : null,
                    primaryColour: typeof preview.primaryColour === "string" ? preview.primaryColour : null,
                    secondaryColour: typeof preview.secondaryColour === "string" ? preview.secondaryColour : null,
                    image: typeof preview.image === "string" ? preview.image : null,
                  }}
                />
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.6rem] uppercase tracking-btn text-gold">Version {design.designVersion}</p>
                    <p className="text-[0.6rem] uppercase tracking-btn text-stone">
                      {design.visibility === "public"
                        ? "Public · " + design.viewCount + " views · " + design.shareCount + " shares · " + design.likeCount + " likes"
                        : "Private"}
                    </p>
                  </div>
                  <h2 className="font-editorial text-2xl mt-1">{design.title}</h2>
                  {design.clientLabel && <p className="text-xs text-stone mt-1">{design.clientLabel}</p>}
                  {design.approvalStatus && (
                    <p className="text-[0.62rem] uppercase tracking-btn mt-2 text-forest">
                      Client review: {design.approvalStatus.replace("_", " ")}
                    </p>
                  )}
                  {summary && <p className="text-xs text-stone mt-3 leading-relaxed line-clamp-4">{summary}</p>}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to="/custom"
                      search={{ design: undefined, t: undefined, start: "1", brief: design.id }}
                      className="btn-lux btn-lux-outline !py-2 !px-4"
                    >
                      Edit Design
                    </Link>
                    {design.visibility === "public" && design.publicSlug && (
                      <Link to="/dream/$slug" params={{ slug: design.publicSlug }} className="btn-lux btn-lux-primary !py-2 !px-4">
                        View / Share
                      </Link>
                    )}
                    {design.approvalToken && (
                      <a href={"/approve/" + design.approvalToken} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-outline !py-2 !px-4">
                        Client Approval Link
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {studio.remaining === 0 && (
        <div className="mt-8 border border-gold/40 bg-gold/5 p-6">
          <h2 className="font-editorial text-2xl">Ready for more creation space?</h2>
          <p className="text-sm text-stone mt-2">
            Your current {studio.plan.name} limit is full. Upgrade for more saved designs and, on Studio plans, client and family workflows.
          </p>
          <Link to="/studio-plans" className="btn-lux btn-lux-primary inline-block mt-4">See Studio Plans</Link>
        </div>
      )}

      {legacy.length > 0 && (
        <section className="mt-12 border-t border-ink/10 pt-9">
          <h2 className="font-editorial text-2xl">Earlier Saved Briefs</h2>
          <p className="text-xs text-stone mt-2 mb-5">These were created before the visual Dreamer portfolio. They remain safely stored and are not public.</p>
          <div className="space-y-3">
            {legacy.map((brief) => (
              <div key={brief.id} className="border border-ink/10 p-4">
                <h3 className="font-editorial text-xl">{brief.title}</h3>
                {brief.designSummary && <p className="text-xs text-stone mt-2 whitespace-pre-wrap">{brief.designSummary}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {submitted && "designs" in submitted && submitted.designs.length > 0 && (
        <section className="mt-12 border-t border-ink/10 pt-9">
          <h2 className="font-editorial text-2xl">Sent to DREAMZ</h2>
          <p className="text-xs text-stone mt-2 mb-5">Formal atelier requests you previously submitted to the house.</p>
          <div className="space-y-3">
            {submitted.designs.map((request) => (
              <div key={request.requestNumber} className="border border-ink/10 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-editorial text-xl">{request.requestNumber}</h3>
                  <span className="text-[0.6rem] uppercase tracking-btn text-stone">{request.status}</span>
                </div>
                {request.aiSummary && <p className="text-xs text-stone mt-2">{request.aiSummary}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
