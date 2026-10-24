import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { trackOrder, initializeBalancePayment, initializeRequestPayment } from "@/server/checkout.functions";
import { formatNaira, ORDER_STATUS_LABELS, TRACKING_FLOW, PAYMENT_STATUS_LABELS } from "@/lib/format";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/track-order")({
  validateSearch: (search: Record<string, unknown>) => ({
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  head: () => ({
    meta: [{ title: `Track Order — ${BRAND.name}` }],
  }),
  component: TrackOrder,
});

type TrackedOrder = Extract<Awaited<ReturnType<typeof trackOrder>>, { found: true }>["order"];

function TrackOrder() {
  const prefillOrder = Route.useSearch().order;
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderNumberInput, setOrderNumberInput] = useState(prefillOrder ?? "");
  const [contactInput, setContactInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // A signed-in customer coming from My Orders knows their own order — the
  // server still verifies ownership through their stored contact details.
  // Because the guest lookup needs phone/email, prefill the order number and
  // ask the customer to confirm their contact to complete the lookup.
  useEffect(() => {
    if (prefilled || !prefillOrder) return;
    setPrefilled(true);
    setOrderNumberInput(prefillOrder.toUpperCase());
  }, [prefilled, prefillOrder]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      const result = await trackOrder({
        data: { orderNumber: orderNumberInput, contact: contactInput },
      });
      if (result.found) {
        setOrder(result.order);
      } else {
        setNotFound(true);
      }
    } catch {
      setError("We could not check that right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = order
    ? TRACKING_FLOW.indexOf(order.status)
    : -1;
  const cancelled = order?.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl px-5 pt-32 pb-24">
      <div className="text-center mb-12">
        <p className="overline-label mb-3">Client Care</p>
        <h1 className="font-editorial text-4xl sm:text-5xl">Track Your Order</h1>
        <p className="text-stone mt-4 max-w-md mx-auto leading-relaxed">
          Enter your order number and the phone number or email used at checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2 mb-12">
        <div className="sm:col-span-2">
          <label htmlFor="orderNumber" className="input-lux-label">Order Number</label>
          <input
            id="orderNumber"
            required
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            className="input-lux uppercase"
            placeholder="DFK-260101-XXXXX"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contact" className="input-lux-label">Phone or Email</label>
          <input
            id="contact"
            required
            value={contactInput}
            onChange={(e) => setContactInput(e.target.value)}
            className="input-lux"
            placeholder="0803 000 0000"
          />
        </div>
        {error && (
          <p role="alert" className="sm:col-span-2 text-sm text-oxblood">{error}</p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" disabled={loading} className="btn-lux btn-lux-primary w-full">
            {loading ? "Checking…" : "Track Order"}
          </button>
        </div>
      </form>

      {notFound && (
        <div className="text-center border border-ink/10 px-6 py-10 mb-12">
          <h2 className="font-editorial text-2xl mb-3">We couldn't find that order</h2>
          <p className="text-stone text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            Please check the order number and contact details. If you have just
            paid, allow a few minutes and try again.
          </p>
          <a
            href={`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(`Hello ${BRAND.shortName}, I need help tracking my order.`)}`}
            className="btn-lux btn-lux-outline"
          >
            Message {BRAND.shortName} on WhatsApp
          </a>
        </div>
      )}

      {order && (
        <section aria-live="polite">
          <div className="border border-ink/10 px-6 sm:px-10 py-10">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
              <div>
                <p className="overline-label mb-1">Order</p>
                <h2 className="font-editorial text-3xl">{order.orderNumber}</h2>
                <p className="text-xs text-stone mt-1">
                  Placed {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="overline-label mb-1">Status</p>
                <p className={`font-editorial text-xl ${cancelled ? "text-oxblood" : "text-forest"}`}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </p>
                <p className="text-xs mt-1">
                  Payment:{" "}
                  <span className={order.paymentStatus === "paid" ? "text-forest" : "text-stone"}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </p>
                {order.latestUpdate && (
                  <p className="text-xs text-stone mt-1">Latest update: {order.latestUpdate}</p>
                )}
              </div>
            </div>

            {order.paymentStatus === "requested" && (
              <RequestedNotice orderNumber={order.orderNumber} contact={contactInput} />
            )}

            {/* Timeline */}
            {!cancelled && order.paymentStatus !== "requested" && (
              <ol className="mb-10" aria-label="Order progress">
                {TRACKING_FLOW.map((status, i) => {
                  const reached = currentIndex >= i;
                  const isCurrent = currentIndex === i;
                  return (
                    <li key={status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 rounded-full border ${
                            reached ? "bg-gold border-gold" : "border-ink/25 bg-transparent"
                          } ${isCurrent ? "ring-4 ring-gold/25" : ""}`}
                          aria-hidden="true"
                        />
                        {i < TRACKING_FLOW.length - 1 && (
                          <span
                            className={`w-px h-6 ${reached ? "bg-gold/60" : "bg-ink/15"}`}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className={`text-sm ${reached ? "text-ink" : "text-ink/35"}`}>
                          {ORDER_STATUS_LABELS[status] ?? status}
                          {isCurrent && (
                            <span className="ml-2 text-[0.6rem] uppercase tracking-btn text-gold">Current</span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Items */}
            <h3 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Pieces</h3>
            <ul className="divide-y divide-ink/10 mb-8">
              {order.items.map((item, i) => (
                <li key={i} className="py-3 flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.size && <p className="text-xs text-stone">Size {item.size}</p>}
                    {item.variantLabel && item.variantLabel !== item.size && (
                      <p className="text-xs text-stone">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-stone uppercase tracking-wide">
                      {item.purchaseOption === "complete_package" ? "Complete Package" : "Product Only"}
                    </p>
                    {item.customization && (
                      <p className="text-xs text-gold uppercase tracking-wide">Custom piece</p>
                    )}
                    <p className="text-xs text-stone">Qty {item.quantity}</p>
                  </div>
                  <span>{formatNaira(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>

            {/* Delivery summary (no full street address echo) */}
            <h3 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Delivery</h3>
            <p className="text-sm text-stone leading-relaxed">
              For {order.customerName} — {order.city}, {order.state}
            </p>

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone">Subtotal</dt>
                <dd>{formatNaira(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone">Delivery</dt>
                <dd>{order.deliveryFee === 0 ? "Free" : formatNaira(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-3">
                <dt className="uppercase tracking-btn text-xs self-center">Total</dt>
                <dd className="font-editorial text-xl">{formatNaira(order.total)}</dd>
              </div>
              {order.paymentPlan === "deposit" && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-stone">Deposit paid</dt>
                    <dd className="text-forest">{formatNaira(order.paidKobo)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone">Balance outstanding</dt>
                    <dd className={order.balanceKobo > 0 ? "text-oxblood" : "text-forest"}>
                      {formatNaira(Math.max(0, order.total - order.paidKobo))}
                    </dd>
                  </div>
                </>
              )}
            </dl>

            {order.paymentPlan === "deposit" && order.paymentStatus === "deposit_paid" && (
              <div className="mt-6 border border-ink/15 px-5 py-4">
                <p className="text-sm mb-3">
                  Balance outstanding: <strong>{formatNaira(Math.max(0, order.total - order.paidKobo))}</strong>
                  {order.balanceDueAt
                    ? ` — due by ${new Date(order.balanceDueAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`
                    : ""}
                  . Your piece dispatches once the balance is fully paid.
                </p>
                <PayBalanceButton orderNumber={order.orderNumber} />
              </div>
            )}

            <p className="mt-8 text-xs text-stone">
              Tracking number and live courier updates appear here once your
              order is dispatched by our logistics partner.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(`Hello ${BRAND.shortName}, I'd like to ask about my order ${order.orderNumber}.`)}`}
              className="btn-lux btn-lux-outline"
            >
              Questions about this order? WhatsApp us
            </a>
            <a href={CONTACT.phoneHref} className="btn-lux btn-lux-outline">
              Call {CONTACT.phoneDisplay}
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

/** Pay the outstanding balance on a deposit-plan order (server-priced). */
function PayBalanceButton({ orderNumber }: { orderNumber: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await initializeBalancePayment({ data: { orderNumber } });
      if (res.fullyPaid) window.location.reload();
      else if ("authorizationUrl" in res) window.location.href = res.authorizationUrl;
      else setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the balance payment.");
      setBusy(false);
    }
  };
  return (
    <div>
      <button onClick={pay} disabled={busy} className="btn-lux btn-lux-primary">
        {busy ? "Connecting…" : "Pay Balance Now"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-oxblood">
          {error}
        </p>
      )}
    </div>
  );
}


/**
 * Unpaid order request: nothing has been charged. When online payment is
 * live the customer can pay the recorded total; otherwise the house sends a
 * payment link. The server re-checks everything.
 */
function RequestedNotice({ orderNumber, contact }: { orderNumber: string; contact: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pay = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await initializeRequestPayment({ data: { orderNumber, contact } });
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Online payment is not available yet.");
      setBusy(false);
    }
  };
  return (
    <div className="mb-10 border border-gold/50 bg-gold/5 px-5 py-4 text-sm leading-relaxed">
      <p className="font-medium">Order request received — not paid yet</p>
      <p className="text-stone mt-1">
        Nothing has been charged. The DREAMZ team confirms availability,
        sizing and any custom-design quote, then sends you a secure payment
        link. Production starts after payment is verified.
      </p>
      <button type="button" onClick={pay} disabled={busy} className="btn-lux btn-lux-outline !py-2 !px-5 mt-3">
        {busy ? "Checking…" : "Pay online now"}
      </button>
      {message && <p role="status" className="text-xs text-stone mt-2">{message}</p>}
    </div>
  );
}
