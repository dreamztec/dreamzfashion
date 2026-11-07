import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyDesigns } from "@/server/account.functions";
import { getMySavedBriefs } from "@/server/saved-briefs.functions";

export const Route = createFileRoute("/account/designs")({
  component: MyDesigns,
});

interface DesignLike {
  requestNumber: string;
  status: string;
  createdAt: string | null;
  aiSummary: string | null;
}

interface SavedBriefLike {
  id: number;
  title: string;
  category: string | null;
  piece: string | null;
  status: string;
  createdAt: string | null;
  designSummary: string;
  renderPrompt: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Received",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  archived: "Archived",
};

function MyDesigns() {
  const [designs, setDesigns] = useState<DesignLike[] | null>(null);
  const [saved, setSaved] = useState<SavedBriefLike[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyDesigns()
      .then((res) => {
        if (cancelled) return;
        if ("unauthenticated" in res) setFailed(true);
        else setDesigns(res.designs);
      })
      .catch(() => setFailed(true));
    getMySavedBriefs()
      .then((res) => {
        if (cancelled) return;
        const r = res as { unauthenticated?: boolean; briefs?: SavedBriefLike[] };
        if (r.unauthenticated || !r.briefs) return;
        setSaved(r.briefs);
      })
      .catch(() => {
        /* the submitted list above still renders */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="text-stone">Please sign in to view your designs.</p>;
  if (!designs) return <div className="skeleton h-48 w-full" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-editorial text-3xl">My Designs</h1>
        <Link to="/custom" className="btn-lux btn-lux-outline !py-2.5 !px-6">
          Design Your Dream
        </Link>
      </div>
      {designs.length === 0 ? (
        <p className="text-stone leading-relaxed max-w-lg">
          No design requests yet. Start in the DREAMZ Design Lab — describe the
          piece you imagine and our design assistant will shape it with you.
          Requests made with the same email as this account will appear here.
        </p>
      ) : (
        <div className="space-y-4">
          {designs.map((d) => (
            <div key={d.requestNumber} className="border border-ink/10 px-5 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-editorial text-xl">{d.requestNumber}</p>
                <p className="text-xs uppercase tracking-btn text-stone">{STATUS_LABELS[d.status] ?? d.status}</p>
              </div>
              {d.aiSummary && <p className="text-sm text-stone mt-2 leading-relaxed">{d.aiSummary}</p>}
              <p className="text-[0.66rem] text-stone mt-1">
                {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Briefs saved from the atelier but not yet sent to the house */}
      {saved && saved.length > 0 && (
        <div className="mt-12">
          <h2 className="font-editorial text-2xl mb-2">Saved Design Briefs</h2>
          <p className="text-xs text-stone mb-6">
            Briefs you saved in the Leather Atelier. Nothing here has been sent
            to DREAMZ yet — send one from the atelier when you are ready for a
            quote.
          </p>
          <div className="space-y-4">
            {saved.map((b) => (
              <div key={b.id} className="border border-ink/10 bg-white/50 px-5 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-editorial text-xl">{b.title}</p>
                  <p className="text-[0.66rem] uppercase tracking-btn text-stone">
                    {b.piece ?? "Leather brief"}
                    {b.createdAt ? ` · saved ${new Date(b.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}` : ""}
                  </p>
                </div>
                {b.designSummary && <p className="text-sm text-stone mt-2 leading-relaxed">{b.designSummary}</p>}
                {b.renderPrompt && (
                  <details className="mt-3">
                    <summary className="text-xs underline cursor-pointer hover:text-ink">View render prompt</summary>
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed mt-3 border border-ink/10 p-4 bg-ivory max-h-72 overflow-y-auto">{b.renderPrompt}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
          <Link to="/custom" className="btn-lux btn-lux-outline !py-2.5 !px-6 mt-6 inline-block">
            Continue a Brief in the Atelier
          </Link>
        </div>
      )}
    </div>
  );
}
