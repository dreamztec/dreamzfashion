import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSharedOrder } from "@/server/shared-tracking.functions";
import { formatNaira, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/track/$orderNumber")({
  validateSearch: (search: Record<string, unknown>) => ({
    key: typeof search.key === "string" ? search.key : "",
  }),
  head: () => ({
    meta: [
      { title: "Private Order Tracking — DREAMZ Fashion" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
      { name: "description", content: "Private DREAMZ Fashion order tracking" },
    ],
  }),
  component: PrivateOrderTracking,
});

type SharedOrder = Extract<Awaited<ReturnType<typeof getSharedOrder>>, {found:true}>["order"];

function PrivateOrderTracking(){
  const {orderNumber}=Route.useParams();
  const {key}=Route.useSearch();
  const [order,setOrder]=useState<SharedOrder|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    setOrder(null);
    setLoading(true);
    setError("");
    getSharedOrder({data:{orderNumber,token:key}})
      .then(result=>{
        if(cancelled)return;
        if(result.found)setOrder(result.order);
        else setError("This tracking link has expired, is incomplete or cannot be verified.");
      })
      .catch(()=>{if(!cancelled)setError("We could not load the order. Please try again or contact DREAMZ.");})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[orderNumber,key]);

  return (
    <main className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-24">
      <header className="text-center mb-10">
        <p className="overline-label mb-3">DREAMZ FASHION · YOUR DREAM OUTFIT</p>
        <h1 className="font-editorial text-4xl sm:text-5xl">Your Order, Made with Care</h1>
        <p className="mt-4 text-stone text-sm">A private progress update from the DREAMZ workshop.</p>
      </header>

      {loading && <p role="status" className="text-center text-stone py-16">Loading your order…</p>}
      {error && !loading && (
        <section role="alert" className="border border-ink/15 p-7 text-center">
          <p className="text-oxblood">{error}</p>
          <Link to="/track-order" search={{order:orderNumber}} className="btn-lux btn-lux-outline mt-6">Track with phone or email</Link>
        </section>
      )}

      {order && !loading && (
        <>
          <section className="border border-ink/10 p-6 sm:p-10">
            <div className="flex gap-4 flex-wrap justify-between items-start">
              <div>
                <p className="overline-label mb-2">THE VIII WHITE SERIES</p>
                <h2 className="font-editorial text-3xl sm:text-4xl">{order.name}</h2>
                <p className="mt-3 text-xs text-stone uppercase tracking-wide">Tracking code: <strong className="text-ink">{order.orderNumber}</strong></p>
              </div>
              <span className="border border-forest/30 text-forest px-3 py-2 text-xs uppercase tracking-btn">
                {ORDER_STATUS_LABELS[order.status]??order.status.replaceAll("_"," ")}
              </span>
            </div>

            <div className="mt-10">
              <div className="flex justify-between items-end mb-3">
                <p className="overline-label">Production progress</p>
                <p className="font-editorial text-4xl text-forest">{order.progressPercent}%</p>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={order.progressPercent} aria-label="Production completion" className="w-full h-3 bg-ink/10 overflow-hidden rounded-full">
                <div className="h-full bg-forest rounded-full transition-all" style={{width:`${order.progressPercent}%`}} />
              </div>
              <p className="text-xs text-stone mt-3">Production estimate reported by DREAMZ, not a courier location.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 mt-10">
              <div className="bg-ivory-deep p-5">
                <p className="overline-label">Expected delivery</p>
                <p className="font-editorial text-2xl mt-2">
                  {order.deliveryDate ? new Date(`${order.deliveryDate}T12:00:00`).toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"}) : "To be confirmed"}
                </p>
                <p className="mt-2 text-xs text-stone">Scheduled delivery date, subject to final dispatch confirmation.</p>
              </div>
              <div className="bg-ivory-deep p-5">
                <p className="overline-label">Payment recorded</p>
                <p className="font-editorial text-2xl mt-2">{PAYMENT_STATUS_LABELS[order.paymentStatus]??order.paymentStatus}</p>
                <p className="mt-2 text-xs text-stone">
                  {order.paymentMethod==="bank_transfer" ? "Bank transfer recorded by DREAMZ." : "Payment status maintained by DREAMZ."}
                </p>
              </div>
            </div>
            {order.note && <p className="mt-8 border-l-2 border-gold pl-4 text-sm leading-relaxed text-ink">{order.note}</p>}
          </section>

          <section className="border border-ink/10 p-6 sm:p-10 mt-5">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
              <h2 className="font-editorial text-3xl">Your Eight Selected Designs</h2>
              <span className="text-xs text-stone">{order.items.length} pairs</span>
            </div>
            <ol className="divide-y divide-ink/10">
              {order.items.map((item,i)=>(
                <li key={item.sku??i} className="py-4 flex items-start justify-between gap-4 text-sm">
                  <div className="flex gap-3">
                    <span className="text-stone font-medium text-xs pt-1">{String(i+1).padStart(2,"0")}</span>
                    <div><p className="font-medium">{item.name}</p><p className="text-xs text-stone mt-1">Quantity: {item.quantity} pair</p></div>
                  </div>
                  <span className="tabular-nums whitespace-nowrap">{formatNaira(item.priceKobo*item.quantity)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 pt-5 border-t border-ink/15 grid gap-3 text-sm">
              <div className="flex justify-between"><span>Total order</span><strong>{formatNaira(order.totalKobo)}</strong></div>
              <div className="flex justify-between"><span>Deposit received</span><strong className="text-forest">{formatNaira(order.paidKobo)}</strong></div>
              <div className="flex justify-between"><span>Balance remaining</span><strong>{formatNaira(order.balanceKobo)}</strong></div>
            </div>
            <p className="mt-5 text-xs text-stone leading-relaxed">
              The recorded deposit reflects funds received, not the amount requested on an earlier proforma.
              Any remaining payment should be completed using a verified DREAMZ payment link or confirmed account instructions.
              Never share your card PIN or OTP.
            </p>
          </section>

          <footer className="text-center mt-9">
            <p className="text-sm text-stone">Thank you for trusting DREAMZ to make your dream outfit.</p>
            <p className="mt-3 text-xs text-stone">This link is private. Please do not post it publicly.</p>
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
              <button type="button" className="btn-lux btn-lux-outline" onClick={()=>void navigator.clipboard.writeText(order.orderNumber)}>Copy tracking code</button>
              <Link to="/" className="btn-lux btn-lux-outline">Visit DREAMZ Fashion</Link>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
