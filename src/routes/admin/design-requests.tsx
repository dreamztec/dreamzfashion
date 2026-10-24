import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { adminListDesignRequests, adminUpdateDesignRequestStatus } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/admin/design-requests")({
  component: AdminDesignRequests,
});

type DesignRequest = Awaited<ReturnType<typeof adminListDesignRequests>>[number];

const STATUSES = ["new", "contacted", "quoted", "won", "archived"] as const;

export function describeSpec(spec: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    productType: "Type",
    audience: "For",
    size: "Size",
    occasion: "Occasion",
    style: "Style",
    primaryColour: "Colour",
    secondaryColour: "Second colour",
    material: "Material",
    sole: "Sole",
    hardware: "Hardware",
    personalization: "Personalization",
    budget: "Budget",
    neededBy: "Needed by",
    description: "Brief",
  };
  return Object.entries(spec)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => `${labels[k] ?? k}: ${String(v)}`)
    .join(" · ");
}

function AdminDesignRequests() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await adminCall(adminListDesignRequests));
    } catch {
      setMessage("Could not load design requests. Is ADMIN_SECRET configured?");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: number, status: string) => {
    await adminCall(adminUpdateDesignRequestStatus, { id, status });
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-6">Design Requests</h1>
      <p className="text-sm text-stone mb-8 max-w-2xl">
        Leads captured from the Design Lab. Every request carries the customer's
        structured brief, the assistant's summary and any reference material —
        follow up directly.
      </p>
      {message && <p className="mb-6 text-sm border border-ink/15 px-4 py-3">{message}</p>}
      {requests.length === 0 ? (
        <p className="text-stone text-sm">No design requests yet.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const spec = (r.specification ?? {}) as Record<string, unknown>;
            return (
              <div key={r.id} className="border border-ink/10 p-5 bg-white/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {r.requestNumber}
                      {r.customerName ? ` — ${r.customerName}` : ""}
                    </p>
                    <p className="text-xs text-stone">
                      {r.phone || "No phone"}
                      {r.email ? ` · ${r.email}` : ""} ·{" "}
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("en-NG") : ""}
                    </p>
                  </div>
                  <select
                    className="text-xs border border-ink/15 px-2 py-1.5 bg-transparent uppercase tracking-btn"
                    value={r.status}
                    onChange={(ev) => setStatus(r.id, ev.target.value)}
                    aria-label={`Status for ${r.requestNumber}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{describeSpec(spec)}</p>
                {r.aiSummary && (
                  <p className="mt-2 text-sm text-stone leading-relaxed">
                    <span className="uppercase tracking-btn text-[0.65rem]">Assistant summary: </span>
                    {r.aiSummary}
                  </p>
                )}
                {r.referenceImageUrl && (
                  <p className="mt-2 text-sm">
                    <span className="text-stone">Reference image: </span>
                    <a href={r.referenceImageUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                      view
                    </a>
                  </p>
                )}
                {(r.budgetMin != null || r.budgetMax != null) && (
                  <p className="mt-2 text-sm text-stone">
                    Budget:{" "}
                    {r.budgetMin != null ? formatNaira(r.budgetMin) : "no minimum"}
                    {" – "}
                    {r.budgetMax != null ? formatNaira(r.budgetMax) : "no maximum"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
