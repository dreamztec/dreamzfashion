import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  decideDesignerUpgradeAdmin,
  listDesignerUpgradeRequestsAdmin,
} from "@/server/designer-admin.functions";
import { adminCall } from "@/lib/admin-client";
import { getDesignerPlan, designerPlanPriceLabel } from "@/lib/designer-plans";

export const Route = createFileRoute("/admin/studio")({
  component: AdminDreamStudio,
});

type Row = Awaited<ReturnType<typeof listDesignerUpgradeRequestsAdmin>>[number];

function AdminDreamStudio() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await adminCall(listDesignerUpgradeRequestsAdmin));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Dream Studio upgrades.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (requestId: number, decision: "approve" | "reject") => {
    setWorking(requestId);
    try {
      const result = await adminCall(decideDesignerUpgradeAdmin, { requestId, decision });
      if (!result.ok) throw new Error("This request has already been decided or is no longer valid.");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl">Dream Studio</h1>
      <p className="text-sm text-stone mt-2 mb-8 max-w-3xl">
        Paid Creator Studio requests. Approve only after DREAMZ has independently confirmed payment.
        Approval activates the requested 90-day pass; this control never processes a payment itself.
      </p>

      {error && <p className="text-sm text-oxblood mb-6">{error}</p>}
      {!rows ? (
        <div className="skeleton h-64" />
      ) : rows.length === 0 ? (
        <p className="border border-ink/10 p-8 text-sm text-stone text-center">No Studio upgrade requests yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const plan = getDesignerPlan(row.requestedPlan);
            return (
              <article key={row.requestId} className="border border-ink/10 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-editorial text-xl">{row.displayName || "DREAMZ Dreamer"}</p>
                    <p className="text-xs text-stone mt-1">{row.email} · /dreamer/{row.slug}</p>
                    <p className="text-sm mt-3">
                      Requested <strong>{plan.name}</strong> · {designerPlanPriceLabel(plan)}
                    </p>
                    <p className="text-xs text-stone mt-1">
                      Current plan: {row.currentPlan}
                      {row.planExpiresAt ? " · expires " + new Date(row.planExpiresAt).toLocaleDateString("en-NG") : ""}
                    </p>
                    {row.note && <p className="text-xs text-stone mt-2">{row.note}</p>}
                    <p className="text-[0.62rem] uppercase tracking-btn text-stone mt-3">
                      Request status: {row.requestStatus}
                    </p>
                  </div>
                  {row.requestStatus === "pending" && (
                    <div className="flex gap-2 items-start">
                      <button
                        type="button"
                        disabled={working === row.requestId}
                        onClick={() => void decide(row.requestId, "approve")}
                        className="btn-lux btn-lux-primary !py-2 !px-4"
                      >
                        Confirm Paid & Activate
                      </button>
                      <button
                        type="button"
                        disabled={working === row.requestId}
                        onClick={() => void decide(row.requestId, "reject")}
                        className="btn-lux btn-lux-outline !py-2 !px-4"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
