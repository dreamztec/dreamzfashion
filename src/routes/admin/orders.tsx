import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { adminListOrders, adminUpdateOrder, adminExportOrdersCsv, adminRecordRefund } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira, parseNairaToKobo, NIGERIAN_STATES, ORDER_STATUS_LABELS } from "@/lib/format";
import { adminCreateOfflineOrder, adminRecordOfflinePayment } from "@/server/offline-orders.functions";
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
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<string | null>(null);
  const canRecordPayment = typeof window !== "undefined" && sessionStorage.getItem("dfk-admin-role") === "owner";
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
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowOfflineForm(v => !v)} className="btn-lux btn-lux-primary !py-2.5 !px-5 text-xs">
            {showOfflineForm ? "Close Offline Order Form" : "+ Add Offline / Cash Order"}
          </button>
          <button onClick={exportCsv} className="btn-lux btn-lux-outline !py-2.5 !px-5 text-xs">
            Export CSV
          </button>
        </div>
      </div>
      <p className="text-xs text-stone mb-6">
        Orders with an outstanding balance (deposit plans) cannot advance to
        dispatch without payment or an explicit override — the dashboard will
        ask you to confirm.
      </p>
      {error && <p role="alert" className="mb-6 text-sm text-oxblood">{error}</p>}
      {showOfflineForm && (
        <OfflineOrderForm onCreated={async (newOrderNumber) => {
          await load();
          setExpanded(newOrderNumber);
        }} />
      )}

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
                    {canRecordPayment && o.paymentStatus !== "paid" && o.paymentStatus !== "refunded" && o.status !== "cancelled" && (
                      <button type="button" onClick={() => setPaymentOrder(paymentOrder === o.orderNumber ? null : o.orderNumber)} className="mt-3 border border-forest/40 text-forest px-3 py-2 text-xs hover:border-forest">
                        {paymentOrder === o.orderNumber ? "Close payment form" : "Record confirmed cash / transfer / POS payment"}
                      </button>
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
                            {item.messageSnapshot && (
                              <p className="text-xs text-stone mt-0.5" dir={(item.messageSnapshot as { rtl?: boolean }).rtl ? "rtl" : "ltr"}>
                                Meaning: “{(item.messageSnapshot as { text?: string }).text}” —{" "}
                                {(item.messageSnapshot as { placementLabel?: string }).placementLabel ?? ""}
                              </p>
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

                  {paymentOrder === o.orderNumber && canRecordPayment && (
                    <div className="lg:col-span-2">
                      <ManualPaymentForm
                        orderNumber={o.orderNumber}
                        outstandingKobo={Math.max(0, o.total - (o.paidKobo ?? 0))}
                        onRecorded={async () => { setPaymentOrder(null); await load(); }}
                      />
                    </div>
                  )}
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
type OfflineDraftLine = { productName: string; variantLabel: string; size: string; quantity: string; unitPrice: string };
const emptyOfflineItem = (): OfflineDraftLine => ({ productName: "", variantLabel: "", size: "", quantity: "1", unitPrice: "" });

function OfflineOrderForm({ onCreated }: { onCreated: (orderNumber: string) => Promise<void> }) {
  const [items, setItems] = useState<OfflineDraftLine[]>([emptyOfflineItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ orderNumber: string; trackingUrl: string; phone: string } | null>(null);
  const requestIdRef = useRef(crypto.randomUUID());

  const changeLine = (i: number, key: keyof OfflineDraftLine, value: string) =>
    setItems(rows => rows.map((row, index) => index === i ? { ...row, [key]: value } : row));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const priced = items.map((item) => ({
        productName: item.productName.trim(),
        variantLabel: item.variantLabel.trim(),
        size: item.size.trim(),
        quantity: Number(item.quantity),
        unitPriceKobo: parseNairaToKobo(item.unitPrice),
      }));
      if (priced.some(x => x.unitPriceKobo === null || x.unitPriceKobo <= 0)) {
        throw new Error("Enter a valid selling price for every item.");
      }
      const deliveryFeeKobo = parseNairaToKobo(String(fd.get("deliveryFee") ?? "0"));
      if (deliveryFeeKobo === null) throw new Error("Enter a valid delivery charge.");
      const result = await adminCall(adminCreateOfflineOrder, {
        requestId: requestIdRef.current,
        source: String(fd.get("source") || "walk_in"),
        customerName: String(fd.get("customerName") || ""),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || ""),
        state: String(fd.get("state") || ""),
        city: String(fd.get("city") || ""),
        address: String(fd.get("address") || ""),
        deliveryNote: String(fd.get("deliveryNote") || ""),
        adminNote: String(fd.get("adminNote") || ""),
        deliveryFeeKobo,
        items: priced,
      });
      setCreated({ orderNumber: result.orderNumber, trackingUrl: result.trackingUrl, phone: String(fd.get("phone") || "") });
      await onCreated(result.orderNumber);
      requestIdRef.current = crypto.randomUUID();
      setItems([emptyOfflineItem()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register offline order.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-10 border border-ink/15 bg-white/60 p-5 sm:p-7" aria-label="Register offline order">
      <p className="overline-label mb-2">OFFLINE SALES INTAKE</p>
      <h2 className="font-editorial text-3xl">Register an order taken outside the website</h2>
      <p className="text-sm text-stone mt-3 mb-6 leading-relaxed">
        Use for WhatsApp, walk-in, Instagram, phone or event sales. The order enters DREAMZ tracking
        as <strong>unpaid</strong>; an owner must separately record actual received cash, transfer or POS funds.
        Use a known customer phone number so they can verify their order.
      </p>
      {created && (
        <div role="status" className="border border-forest/40 bg-forest/5 p-4 mb-6 text-sm">
          <p className="font-medium text-forest">Order registered: {created.orderNumber}</p>
          <p className="text-stone mt-1">Share the tracking page with the customer. They will enter the same phone number or email used here.</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <a href={created.trackingUrl} className="underline" target="_blank" rel="noopener noreferrer">Open tracking page</a>
            <button type="button" className="underline" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${created.trackingUrl}`)}>Copy tracking link</button>
            <a
              href={`https://wa.me/${created.phone.replace(/\D/g, "").replace(/^0/, "234")}?text=${encodeURIComponent(`Your DREAMZ order ${created.orderNumber} has been registered. Track it here: ${window.location.origin}${created.trackingUrl} — enter the phone number used for your order.`)}`}
              target="_blank" rel="noopener noreferrer" className="underline"
            >Send via WhatsApp</a>
          </div>
        </div>
      )}
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="off-source" className="input-lux-label">Order source</label>
          <select id="off-source" name="source" className="input-lux">
            <option value="whatsapp">WhatsApp</option><option value="walk_in">Walk-in / Cash</option>
            <option value="instagram">Instagram</option><option value="phone">Phone</option>
            <option value="event">Event / Pop-up</option><option value="other">Other</option>
          </select></div>
        <div><label htmlFor="off-name" className="input-lux-label">Customer full name *</label><input id="off-name" required name="customerName" minLength={2} maxLength={120} className="input-lux" /></div>
        <div><label htmlFor="off-phone" className="input-lux-label">Customer phone *</label><input id="off-phone" required name="phone" type="tel" placeholder="0803 000 0000" className="input-lux" /></div>
        <div><label htmlFor="off-email" className="input-lux-label">Email (optional)</label><input id="off-email" name="email" type="email" className="input-lux" /></div>
        <div><label htmlFor="off-state" className="input-lux-label">Delivery state *</label>
          <select id="off-state" name="state" required className="input-lux" defaultValue="">
            <option value="" disabled>Select state</option>{NIGERIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
          </select></div>
        <div><label htmlFor="off-city" className="input-lux-label">City *</label><input id="off-city" required name="city" minLength={2} className="input-lux" /></div>
        <div className="sm:col-span-2"><label htmlFor="off-address" className="input-lux-label">Address / pickup instructions *</label><input id="off-address" required name="address" minLength={6} className="input-lux" placeholder="Customer address or Pickup at DREAMZ showroom" /></div>
        <div className="sm:col-span-2"><label htmlFor="off-delivery-note" className="input-lux-label">Delivery instructions (optional)</label><input id="off-delivery-note" name="deliveryNote" className="input-lux" maxLength={400}/></div>
        <div className="sm:col-span-2 border-t border-ink/10 pt-5">
          <p className="overline-label mb-3">PRODUCTS / CUSTOM WORK</p>
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="border border-ink/10 p-4 grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2"><label className="input-lux-label" htmlFor={`off-product-${i}`}>Item name *</label><input id={`off-product-${i}`} value={item.productName} onChange={e=>changeLine(i, "productName", e.target.value)} className="input-lux" required maxLength={160} placeholder="e.g. Black Oxford / custom leather tote" /></div>
                <div><label className="input-lux-label" htmlFor={`off-size-${i}`}>Size</label><input id={`off-size-${i}`} value={item.size} onChange={e=>changeLine(i, "size", e.target.value)} className="input-lux" maxLength={30}/></div>
                <div><label className="input-lux-label" htmlFor={`off-variant-${i}`}>Colour / variant</label><input id={`off-variant-${i}`} value={item.variantLabel} onChange={e=>changeLine(i, "variantLabel", e.target.value)} className="input-lux" maxLength={120}/></div>
                <div><label className="input-lux-label" htmlFor={`off-qty-${i}`}>Quantity</label><input id={`off-qty-${i}`} type="number" min={1} max={100} required value={item.quantity} onChange={e=>changeLine(i, "quantity", e.target.value)} className="input-lux"/></div>
                <div className="sm:col-span-2"><label className="input-lux-label" htmlFor={`off-price-${i}`}>Unit price (₦) *</label><input id={`off-price-${i}`} inputMode="decimal" value={item.unitPrice} onChange={e=>changeLine(i, "unitPrice", e.target.value)} className="input-lux" required placeholder="65000" /></div>
                {items.length>1 && <div className="flex items-end"><button type="button" className="text-oxblood underline text-xs" onClick={()=>setItems(old=>old.filter((_,j)=>j!==i))}>Remove line</button></div>}
              </div>
            ))}
          </div>
          <button type="button" disabled={items.length>=30} onClick={()=>setItems(old=>[...old,emptyOfflineItem()])} className="mt-3 text-xs underline">+ Add another product</button>
        </div>
        <div><label htmlFor="off-delivery" className="input-lux-label">Delivery fee (₦)</label><input id="off-delivery" name="deliveryFee" defaultValue="0" className="input-lux" inputMode="decimal" required/></div>
        <div><label htmlFor="off-note" className="input-lux-label">Private order note</label><input id="off-note" name="adminNote" maxLength={500} className="input-lux" placeholder="Original invoice or internal reference" /></div>
        <div className="sm:col-span-2">
          <p className="text-xs text-stone mb-3">No cash is collected or marked as paid by registering an order. The customer can track it immediately after creation.</p>
          {error && <p role="alert" className="text-oxblood text-sm mb-3">{error}</p>}
          <button type="submit" disabled={busy} className="btn-lux btn-lux-primary">{busy ? "Registering…" : "Register Offline Order"}</button>
        </div>
      </form>
    </section>
  );
}

function ManualPaymentForm({ orderNumber, outstandingKobo, onRecorded }: { orderNumber: string; outstandingKobo: number; onRecorded: () => Promise<void> }) {
  const [method, setMethod] = useState("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(crypto.randomUUID());

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const amountKobo = parseNairaToKobo(String(fd.get("amount") || ""));
      if (amountKobo === null || amountKobo <= 0) throw new Error("Enter the verified amount received.");
      const res = await adminCall(adminRecordOfflinePayment, {
        orderNumber, amountKobo, method,
        externalReference: String(fd.get("reference") || ""),
        note: String(fd.get("note") || ""),
        requestId: requestIdRef.current,
        confirmedReceived: fd.get("confirmed") === "on",
      });
      if (!res.ok) throw new Error("Could not record the payment.");
      requestIdRef.current = crypto.randomUUID();
      await onRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The payment could not be recorded.");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="border border-forest/30 p-5 bg-white/60 grid sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <h3 className="font-editorial text-2xl">Confirm an offline payment</h3>
        <p className="text-xs text-stone mt-2">
          Owner-only. Check the actual cash receipt, terminal settlement or bank statement before confirming.
          This creates an internal manual payment record, not a Paystack transaction.
          Outstanding: <strong>{formatNaira(outstandingKobo)}</strong>.
        </p>
      </div>
      <div><label className="input-lux-label" htmlFor="pay-method">Payment method *</label>
        <select id="pay-method" className="input-lux" value={method} onChange={e=>setMethod(e.target.value)}>
          <option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option>
          <option value="pos">POS terminal</option><option value="external_payment">Other verified external payment</option>
        </select></div>
      <div><label className="input-lux-label" htmlFor="pay-amount">Amount actually received (₦) *</label>
        <input id="pay-amount" name="amount" className="input-lux" required inputMode="decimal" placeholder={(outstandingKobo/100).toFixed(2)}/></div>
      <div><label className="input-lux-label" htmlFor="pay-ref">{method==="cash" ? "Receipt / cash book reference (optional)" : "Verified transaction / receipt reference *"}</label>
        <input id="pay-ref" name="reference" className="input-lux" required={method!=="cash"} minLength={method==="cash"?undefined:4} maxLength={120}/></div>
      <div><label className="input-lux-label" htmlFor="pay-note">Internal note</label><input id="pay-note" name="note" className="input-lux" maxLength={300}/></div>
      <label className="sm:col-span-2 flex gap-2 text-sm items-start">
        <input type="checkbox" name="confirmed" required className="mt-1" />
        <span>I personally checked the money received and confirm this is a real payment. I understand that this will update the customer's public payment status.</span>
      </label>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-oxblood">{error}</p>}
      <div className="sm:col-span-2"><button type="submit" disabled={busy || outstandingKobo<=0} className="btn-lux btn-lux-primary">{busy ? "Recording…" : "Record Verified Offline Payment"}</button></div>
    </form>
  );
}
