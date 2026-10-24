import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyRoyaleRequests } from "@/server/account.functions";

export const Route = createFileRoute("/account/royale")({
  component: MyRoyale,
});

interface RoyaleRow {
  requestNumber: string;
  productType: string;
  occasion: string | null;
  status: string;
  createdAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Received",
  contacted: "Contacted",
  consultation: "In consultation",
  quoted: "Quoted",
  won: "Commissioned",
  archived: "Archived",
};

function MyRoyale() {
  const [requests, setRequests] = useState<RoyaleRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyRoyaleRequests()
      .then((res) => {
        if (cancelled) return;
        if ("unauthenticated" in res) setFailed(true);
        else setRequests(res.requests);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="text-stone">Please sign in to view your requests.</p>;
  if (!requests) return <div className="skeleton h-48 w-full" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-editorial text-3xl">Royale Requests</h1>
        <Link to="/royale/request" className="btn-lux btn-lux-outline !py-2.5 !px-6">
          Start a Design
        </Link>
      </div>
      {requests.length === 0 ? (
        <p className="text-stone leading-relaxed max-w-lg">
          No Royale requests yet. When you begin a commission, its reference
          and status will appear here.
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.requestNumber} className="border border-ink/10 px-5 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-editorial text-xl">{r.requestNumber}</p>
                <p className="text-xs uppercase tracking-btn text-stone">
                  {STATUS_LABELS[r.status] ?? r.status}
                </p>
              </div>
              <p className="text-sm text-stone mt-2">
                {r.productType}
                {r.occasion ? ` · ${r.occasion}` : ""}
              </p>
              <p className="text-[0.66rem] text-stone mt-1">
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
