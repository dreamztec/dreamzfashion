import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  decideDesignOrderIntentAdmin,
  decideDesignerUpgradeAdmin,
  listDesignOrderIntentsAdmin,
  listDesignerUpgradeRequestsAdmin,
} from "@/server/designer-admin.functions";
import { adminCall } from "@/lib/admin-client";
import { getDesignerPlan, designerPlanPriceLabel } from "@/lib/designer-plans";

export const Route = createFileRoute("/admin/studio")({
  component: AdminDreamStudio,
});

type UpgradeRow = Awaited<ReturnType<typeof listDesignerUpgradeRequestsAdmin>>[number];
type OrderRow = Awaited<ReturnType<typeof listDesignOrderIntentsAdmin>>[number];

function AdminDreamStudio() {
  const [rows, setRows] = useState<UpgradeRow[] | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [upgradeRows, orderRows] = await Promise.all([
        adminCall(listDesignerUpgradeRequestsAdmin),
        adminCall(listDesignOrderIntentsAdmin),
      ]);
      setRows(upgradeRows);
      setOrders(orderRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Dream Studio administration.");
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

  const verifyOrder = async (id: number, status: "verified" | "cancelled") => {
    const orderReference =
      status === "verified"
        ? window.prompt("Enter the real DREAMZ order/reference number. Leave blank only if you have independently verified the sale.") || ""
        : "";
    setWorking(id);
    try {
      const result = await adminCall(decideDesignOrderIntentAdmin, { id, status, orderReference });
      if (!result.ok) throw new Error("This design interest could not be updated.");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Order verification failed.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl">Dream Studio</h1>
      <p className="text-sm text-stone mt-2 max-w-3xl">
        Manage Studio upgrades and verify real orders coming from community-created designs.
        A WhatsApp click is only interest; it does not count as a contest order until DREAMZ confirms the actual order here.
      </p>

      {error && <p className="text-sm text-oxblood mt-6">{error}</p>}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="overline-label">Commerce verification</p>
            <h2 className="font-editorial text-2xl mt-1">Design order interest</h2>
          </div>
          <p className="text-xs text-stone">Verified orders carry the strongest leaderboard weight.</p>
        </div>
        {!orders ? (
          <div className="skeleton h-48" />
        ) : orders.length === 0 ? (
          <p className="border border-ink/10 p-8 text-sm text-stone text-center">No design order interest yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((row) => (
              <article key={row.id} className="border border-ink/10 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-editorial text-xl">{row.designTitle}</p>
                    <p className="text-xs text-stone mt-1">
                      {row.designerName || "DREAMZ Dreamer"} · /dream/{row.publicSlug || ""}
                    </p>
                    <p className="text-[0.62rem] uppercase tracking-btn mt-2">
                      {row.status}{row.orderReference ? " · " + row.orderReference : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {row.status !== "verified" && (
                      <button
                        type="button"
                        disabled={working === row.id}
                        onClick={() => void verifyOrder(row.id, "verified")}
                        className="btn-lux btn-lux-primary !py-2 !px-4"
                      >
                        Verify Real Order
                      </button>
                    )}
                    {row.status !== "cancelled" && (
                      <button
                        type="button"
                        disabled={working === row.id}
                        onClick={() => void verifyOrder(row.id, "cancelled")}
                        className="btn-lux btn-lux-outline !py-2 !px-4"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14 border-t border-ink/10 pt-10">
        <p className="overline-label">Creator access</p>
        <h2 className="font-editorial text-2xl mt-1 mb-2">Studio upgrade requests</h2>
        <p className="text-sm text-stone mb-7 max-w-3xl">
          Approve only after DREAMZ has independently confirmed payment. Approval activates the requested 90-day pass; this control never processes payment itself.
        </p>

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
      </section>
    </div>
  );
}
