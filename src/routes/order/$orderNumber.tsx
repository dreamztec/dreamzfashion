import { createFileRoute, notFound } from "@tanstack/react-router";
import { formatNaira, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import { lookupMyOrderNumber } from "@/server/checkout.functions";

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
    meta: [{ title: `Order confirmed — ${BRAND.name}`, name: "robots", content: "noindex" }],
  }),
  component: OrderConfirmed,
});

function OrderConfirmed() {
  const { orderNumber } = Route.useParams();
  const view = Route.useLoaderData() as Awaited<ReturnType<typeof lookupMyOrderNumber>> & {
    found: true;
  };

  return (
    <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center">
      <p className="text-forest text-4xl mb-6" aria-hidden="true">✓</p>
      <h1 className="font-editorial text-4xl mb-4">Order confirmed</h1>
      <p className="text-stone mb-2">
        Your voucher covered this order in full — nothing further to pay.
        Your order is now with our workshop.
      </p>
      <p className="text-sm text-ink mb-2">
        Order <strong>{view.order.orderNumber}</strong>
      </p>
      <p className="text-sm text-stone mb-8">
        Status: {ORDER_STATUS_LABELS[view.order.status] ?? view.order.status} ·{" "}
        Payment: {PAYMENT_STATUS_LABELS[view.order.paymentStatus] ?? view.order.paymentStatus}
      </p>
      <ul className="divide-y divide-ink/10 border border-ink/10 mb-8 text-sm text-left">
        {view.order.items.map((i, idx) => (
          <li key={idx} className="px-4 py-3 flex justify-between gap-4">
            <div>
              <p>{i.productName}</p>
              {i.variantLabel && <p className="text-xs text-stone">{i.variantLabel}</p>}
              <p className="text-xs text-stone">Qty {i.quantity}</p>
            </div>
            <span className="whitespace-nowrap">{formatNaira(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
        <li className="px-4 py-3 flex justify-between font-medium">
          <span>Total</span>
          <span>{formatNaira(view.order.total)}</span>
        </li>
      </ul>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href={`/track-order?order=${encodeURIComponent(view.order.orderNumber)}`} className="btn-lux btn-lux-primary">
          Track Your Order
        </a>
        <a href="/shop" className="btn-lux btn-lux-outline">
          Continue Shopping
        </a>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(`Hello ${BRAND.shortName}, I have placed order ${view.order.orderNumber}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-lux btn-lux-outline"
        >
          WhatsApp Support
        </a>
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
