import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { adminListOrders, adminUpdateOrder, adminExportOrdersCsv, adminRecordRefund } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira, ORDER_STATUS_LABELS } from "@/lib/format";
export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type AdminOrder = Awaited<ReturnType<typeof adminListOrders>>[number];
type AdminOrderStatus = Parameters<
  typeof import("@/server/admin.functions").adminUpdateOrder
>[0]["data"]["status"];

const FLOW = [
  "order_received",
  "payment_confirmed",
  "size_details_confirmed",
  "processing",
  "production",
  "quality_control",
  "ready_for_dispatch",
  "dispatched",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await adminCall(adminListOrders));
    } catch {
      setError("Could not load orders. Is ADMIN_SECRET configured?");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (
    orderNumber: string,
    status: AdminOrderStatus,
    note: string,
    overrideOutstandingBalance = false,
  ) => {
    try {
      await adminCall(adminUpdateOrder, { orderNumber, status, note, overrideOutstandingBalance });
      setError(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
      // Offer an explicit owner override when the balance is outstanding.
      if (msg.includes("unpaid") && window.confirm(`${msg}\n\nDispatch anyway and record the override?`)) {
        await adminCall(adminUpdateOrder, {
          orderNumber,
          status,
          note,
          overrideOutstandingBalance: true,
        });
        setError(null);
        await load();
      }
    }
  };

  const exportCsv = async () => {
    try {
      const { csv } = await adminCall(adminExportOrdersCsv);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dreamz-orders.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-editorial text-3xl">Orders</h1>
        <button onClick={exportCsv} className="btn-lux btn-lux-outline !py-2.5 !px-5 text-xs">
          Export CSV
        </button>
      </div>
      <p className="text-xs text-stone mb-6">
        Orders with an outstanding balance (deposit plans) cannot advance to
        dispatch without payment or an explicit override — the dashboard will
        ask you to confirm.
      </p>
      {error && <p className="mb-6 text-sm text-oxblood">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-center text-stone text-sm py-16 border border-ink/10">
          No orders yet. Orders appear here the moment a customer checks out.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.orderNumber} className="border border-ink/10">
              <button
                onClick={() => setExpanded(expanded === o.orderNumber ? null : o.orderNumber)}
                aria-expanded={expanded === o.orderNumber}
                className="w-full px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-ink/[0.02]"
              >
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-stone">
                    {o.customerName} · {o.city}, {o.state} ·{" "}
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-NG") : ""}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span>{formatNaira(o.total)}</span>
                  <span className={`text-xs uppercase tracking-btn ${o.paymentStatus === "paid" ? "text-forest" : o.paymentStatus === "deposit_paid" ? "text-gold" : "text-stone"}`}>
                    {o.paymentStatus}
                    {o.paymentStatus === "deposit_paid" &&
                      ` · balance ${formatNaira(Math.max(0, o.total - (o.paidKobo ?? 0)))}`}
                  </span>
                  <span className="text-xs uppercase tracking-btn text-gold">
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
              </button>

              {expanded === o.orderNumber && (
                <div className="border-t border-ink/10 px-5 py-5 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="overline-label mb-3">Customer</h3>
                    <p className="text-sm leading-relaxed">
                      {o.customerName}
                      <br />
                      {o.phone}
                      {o.email && <><br />{o.email}</>}
                      <br />
                      {o.address}, {o.city}, {o.state}
                      {o.deliveryNote && <><br /><span className="text-stone">Note: {o.deliveryNote}</span></>}
                    </p>
                    {o.referralCode && (
                      <p className="text-xs text-stone mt-3">
                        Partner code {o.referralCode} ({o.attributionSource === "checkout_code" ? "typed at checkout" : "creator link"}) ·{" "}
                        {o.attributionOutcome ?? "recorded"}
                      </p>
                    )}
                    {o.paymentStatus === "requested" && (
                      <p className="text-xs text-gold mt-3">
                        Unpaid order request — confirm details and send the customer a payment link. Nothing is charged until payment is verified.
                      </p>
                    )}
                    {["paid", "deposit_paid"].includes(o.paymentStatus) && (
                      <button
                        type="button"
                        className="mt-3 border border-ink/20 px-3 py-1.5 text-xs hover:border-ink"
                        onClick={() => {
                          const reference = window.prompt(
                            "Refunds are made in Paystack or by bank transfer. Enter the actual refund reference to record it (this also reverses partner commissions):",
                          );
                          if (!reference) return;
                          adminCall(adminRecordRefund, { orderNumber: o.orderNumber, reference })
                            .then(load)
                            .catch((err: unknown) => alert(err instanceof Error ? err.message : "Could not record refund"));
                        }}
                      >
                        Record refund
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="overline-label mb-3">Items</h3>
                    <ul className="text-sm space-y-2 mb-4">
                      {o.items.map((item, i) => (
                        <li key={i} className="flex justify-between gap-4">
                          <div>
                            <p>{item.productName}</p>
                            {item.variantLabel && (
                              <p className="text-xs text-stone">{item.variantLabel}</p>
                            )}
                            {item.customization && (
                              <p className="text-xs text-gold uppercase tracking-wide">Custom piece</p>
                            )}
                            <p className="text-xs text-stone">Qty {item.quantity}</p>
                          </div>
                          <span className="whitespace-nowrap">
                            {formatNaira(item.unitPrice * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <h3 className="overline-label mb-3">Move To</h3>
                    <div className="flex flex-wrap gap-2">
                      {FLOW.filter((s) => s !== o.status).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            const note = window.prompt("Optional note for this update:") ?? "";
                            updateStatus(o.orderNumber, s, note);
                          }}
                          className="border border-ink/20 px-3 py-1.5 text-xs hover:border-ink"
                        >
                          {ORDER_STATUS_LABELS[s] ?? s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <h3 className="overline-label mb-3">Payments</h3>
                    {(o.payments ?? []).length === 0 ? (
                      <p className="text-sm text-stone mb-6">No payment attempts recorded.</p>
                    ) : (
                      <ul className="text-sm space-y-2 mb-6">
                        {(o.payments ?? []).map((p, i) => (
                          <li key={i} className="flex flex-wrap justify-between gap-3 border border-ink/10 px-3 py-2">
                            <div>
                              <p className="font-medium">{p.reference}</p>
                              <p className="text-xs text-stone">
                                {p.gateway} · {p.status}{p.kind ? ` · ${p.kind}` : ""}{p.channel ? ` · ${p.channel}` : ""}
                                {p.processedAt ? ` · confirmed ${new Date(p.processedAt).toLocaleString("en-NG")}` : ""}
                              </p>
                            </div>
                            <span className="whitespace-nowrap">{formatNaira(p.amountKobo)} {p.currency}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <h3 className="overline-label mb-3">Timeline</h3>
                    <ol className="text-sm space-y-1.5">
                      {(o.timeline ?? []).map((t, i) => (
                        <li key={i} className="text-stone">
                          <span className="text-ink">{ORDER_STATUS_LABELS[t.status] ?? t.status}</span>
                          {" — "}
                          {new Date(t.at).toLocaleString("en-NG")}
                          {t.note ? ` · ${t.note}` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}