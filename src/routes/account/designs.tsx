import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyDesigns } from "@/server/account.functions";

export const Route = createFileRoute("/account/designs")({
  component: MyDesigns,
});

interface DesignLike {
  requestNumber: string;
  status: string;
  createdAt: string | null;
  aiSummary: string | null;
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
    </div>
  );
}
