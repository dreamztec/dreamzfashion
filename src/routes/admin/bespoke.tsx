import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { adminListBespoke, adminUpdateBespokeStatus } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/bespoke")({
  component: AdminBespoke,
});

type BespokeRequest = Awaited<ReturnType<typeof adminListBespoke>>[number];

function AdminBespoke() {
  const [requests, setRequests] = useState<BespokeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await adminCall(adminListBespoke));
    } catch {
      setError("Could not load bespoke requests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: number, status: string) => {
    await adminCall(adminUpdateBespokeStatus, { id, status });
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-8">Bespoke Requests</h1>
      {error && <p className="mb-6 text-sm text-oxblood">{error}</p>}
      {requests.length === 0 ? (
        <p className="text-center text-stone text-sm py-16 border border-ink/10">
          No bespoke requests yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id} className="border border-ink/10 px-5 py-5">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium">{r.productType} — {r.name}</p>
                  <p className="text-xs text-stone">
                    {r.phone}
                    {r.email && ` · ${r.email}`}
                    {r.createdAt && ` · ${new Date(r.createdAt).toLocaleDateString("en-NG")}`}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  {r.status !== "contacted" && (
                    <button
                      onClick={() => setStatus(r.id, "contacted")}
                      className="border border-ink/20 px-3 py-1.5 hover:border-ink"
                    >
                      Mark Contacted
                    </button>
                  )}
                  {r.status !== "closed" && (
                    <button
                      onClick={() => setStatus(r.id, "closed")}
                      className="border border-ink/20 px-3 py-1.5 text-stone hover:border-ink"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                {r.color && <p><span className="text-stone">Colour:</span> {r.color}</p>}
                {r.material && <p><span className="text-stone">Material:</span> {r.material}</p>}
                {r.size && <p><span className="text-stone">Size:</span> {r.size}</p>}
                {r.budget && <p><span className="text-stone">Budget:</span> {r.budget}</p>}
                {r.deadline && <p><span className="text-stone">Deadline:</span> {r.deadline}</p>}
                {r.referenceUrl && (
                  <p>
                    <span className="text-stone">Reference:</span>{" "}
                    <a href={r.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                      view
                    </a>
                  </p>
                )}
              </div>
              {r.message && <p className="mt-3 text-sm text-stone leading-relaxed">{r.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}