import { createFileRoute, notFound } from "@tanstack/react-router";
import { formatNaira, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import { lookupMyOrderNumber } from "@/server/checkout.functions";
import { orderInquiry, whatsappLink } from "@/components/whatsapp";

/**
 * Order confirmation page for orders placed without a Paystack redirect —
 * a voucher that covers the entire total completes server-side and lands
 * here. Only the order number appears in the URL; contact details stay out
 * of links, and the lookup is privacy-preserving server-side.
 */
export const Route = createFileRoute("/order/$orderNumber")({
  loader: async ({ params }) => {
    const result = await lookupMyOrderNumber({ data: params.orderNumber });
    if (!result.found) throw notFound();
    return result;
  },
  head: () => ({
    meta: [{ title: `Your order — ${BRAND.name}` }, { name: "robots", content: "noindex" }],
  }),
  component: OrderConfirmed,
});

function OrderConfirmed() {
  const { orderNumber } = Route.useParams();
  const view = Route.useLoaderData() as Awaited<ReturnType<typeof lookupMyOrderNumber>> & {
    found: true;
  };
  const o = view.order;
  const requested = o.paymentStatus === "requested";
  const quotePending = o.items.some((i) => i.unitPrice <= 0);
  const supportHref = whatsappLink(orderInquiry(o.orderNumber), null);

  return (
    <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center">
      <p className={`${requested ? "text-gold" : "text-forest"} text-4xl mb-6`} aria-hidden="true">✓</p>
      <h1 className="font-editorial text-4xl mb-4">
        {requested ? "Order request received" : "Order confirmed"}
      </h1>
      {requested ? (
        <p className="text-stone mb-2 leading-relaxed">
          Thank you — your request is saved. <strong>Nothing has been charged.</strong>{" "}
          The DREAMZ team will confirm availability, sizing
          {quotePending ? " and the price of your custom design" : ""}, then send
          a secure payment link. Production starts after payment is verified.
        </p>
      ) : o.paymentMethod === "voucher" ? (
        <p className="text-stone mb-2">
          Your voucher covered this order in full — nothing further to pay.
          Your order is now with our workshop.
        </p>
      ) : (
        <p className="text-stone mb-2">Your payment has been verified. Your order is now with our workshop.</p>
      )}
      <p className="text-sm text-ink mb-2">
        Your reference: <strong>{o.orderNumber}</strong>
      </p>
      <p className="text-sm text-stone mb-8">
        Status: {ORDER_STATUS_LABELS[o.status] ?? o.status} · Payment:{" "}
        {PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus}
      </p>
      <ul className="divide-y divide-ink/10 border border-ink/10 mb-8 text-sm text-left">
        {o.items.map((i, idx) => (
          <li key={idx} className="px-4 py-3 flex justify-between gap-4">
            <div>
              <p>{i.productName}</p>
              {i.variantLabel && <p className="text-xs text-stone">{i.variantLabel}</p>}
              <p className="text-xs text-stone">
                {i.purchaseOption === "complete_package" ? "Complete Package" : "Product Only"} · Qty {i.quantity}
              </p>
              {i.customization?.["Design ID"] && (
                <p className="text-xs text-stone">Design {i.customization["Design ID"]}</p>
              )}
            </div>
            <span className="whitespace-nowrap">
              {i.unitPrice > 0 ? formatNaira(i.unitPrice * i.quantity) : "Quote to follow"}
            </span>
          </li>
        ))}
        <li className="px-4 py-2 flex justify-between text-stone">
          <span>Subtotal</span>
          <span>{formatNaira(o.subtotal)}</span>
        </li>
        <li className="px-4 py-2 flex justify-between text-stone">
          <span>Delivery</span>
          <span>{o.deliveryFee === 0 ? "Free" : formatNaira(o.deliveryFee)}</span>
        </li>
        {o.discountKobo > 0 && (
          <li className="px-4 py-2 flex justify-between text-forest">
            <span>Voucher {o.voucherCode}</span>
            <span>−{formatNaira(o.discountKobo)}</span>
          </li>
        )}
        {o.selfPurchaseBenefitKobo > 0 && (
          <li className="px-4 py-2 flex justify-between text-forest">
            <span>Creator purchase benefit</span>
            <span>−{formatNaira(o.selfPurchaseBenefitKobo)}</span>
          </li>
        )}
        {o.referralCode && (
          <li className="px-4 py-2 flex justify-between text-stone">
            <span>Creator code</span>
            <span>{o.referralCode}</span>
          </li>
        )}
        <li className="px-4 py-3 flex justify-between font-medium">
          <span>{quotePending ? "Total so far" : "Total"}</span>
          <span>{formatNaira(o.total)}</span>
        </li>
      </ul>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href={`/track-order?order=${encodeURIComponent(o.orderNumber)}`} className="btn-lux btn-lux-primary">
          Track Your Order
        </a>
        <a href="/shop" className="btn-lux btn-lux-outline">
          Continue Shopping
        </a>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {supportHref && (
          <a href={supportHref} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-outline">
            WhatsApp Support
          </a>
        )}
        <a href={CONTACT.phoneHref} className="btn-lux btn-lux-outline">
          Call {CONTACT.phoneDisplay}
        </a>
      </div>
      <p className="mt-8 text-xs text-stone">
        Questions about {orderNumber}? Email{" "}
        <a href={`mailto:${CONTACT.email}`} className="underline hover:text-ink">
          {CONTACT.email}
        </a>
      </p>
    </div>
  );
}
