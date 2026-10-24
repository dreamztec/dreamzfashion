import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyOrders } from "@/server/account.functions";
import { formatNaira, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/account/orders")({
  component: MyOrders,
});

interface MyOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  createdAt: string | null;
  items: Array<{ productName: string; variantLabel: string | null; imageUrl: string | null; quantity: number; unitPrice: number }>;
}

function MyOrders() {
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyOrders()
      .then((res) => {
        if (cancelled) return;
        if ("unauthenticated" in res) setFailed(true);
        else setOrders(res.orders);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="text-stone">Please sign in to view your orders.</p>;
  if (!orders) return <div className="skeleton h-48 w-full" />;

  if (orders.length === 0) {
    return (
      <div>
        <h1 className="font-editorial text-3xl mb-4">My Orders</h1>
        <p className="text-stone mb-8">
          No orders yet — your verified orders will appear here with their full
          timeline.
        </p>
        <a href="/shop" className="btn-lux btn-lux-primary">Browse the Collection</a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-editorial text-3xl mb-8">My Orders</h1>
      <div className="space-y-5">
        {orders.map((o) => (
          <div key={o.orderNumber} className="border border-ink/10 px-5 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <p className="font-editorial text-xl">{o.orderNumber}</p>
              <p className="text-xs uppercase tracking-btn text-stone">
                {ORDER_STATUS_LABELS[o.status] ?? o.status} · {PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus}
              </p>
            </div>
            <div className="space-y-1.5 mb-3">
              {o.items.map((item, i) => (
                <p key={i} className="text-sm text-stone">
                  {item.quantity} × {item.productName}
                  {item.variantLabel ? ` — ${item.variantLabel}` : ""} · {formatNaira(item.unitPrice)}
                </p>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="text-stone">Total </span>
                <span className="font-editorial text-lg">{formatNaira(o.total)}</span>
              </p>
              <a href={`/track-order?order=${encodeURIComponent(o.orderNumber)}`} className="nav-link text-[0.68rem] uppercase tracking-btn">
                Track Order
              </a>
            </div>
            <p className="text-[0.66rem] text-stone mt-2">
              {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
