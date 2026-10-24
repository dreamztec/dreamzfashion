import { createFileRoute } from "@tanstack/react-router";
import { adminOverview, adminTisasngStatus } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/overview")({
  loader: async () => {
    try {
      return { data: await adminCall(adminOverview), error: null as string | null };
    } catch {
      return {
        data: null,
        error:
          "Could not load the overview. Set the ADMIN_SECRET environment variable and sign in to enable the dashboard.",
      };
    }
  },
  component: AdminOverview,
});

function AdminOverview() {
  const { data, error } = Route.useLoaderData() as {
    data: Awaited<ReturnType<typeof adminOverview>> | null;
    error: string | null;
  };

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="font-editorial text-3xl mb-8">Overview</h1>
        <p className="text-sm border border-ink/15 px-5 py-6">{error}</p>
      </div>
    );
  }

  const stats = [
    { label: "Paid Sales (excl. cancelled)", value: formatNaira(data.revenue) },
    { label: "Cash Received (settled)", value: formatNaira(data.cashReceived) },
    { label: "Outstanding Balances", value: formatNaira(data.outstandingBalances) },
    { label: "Average Order Value", value: formatNaira(data.averageOrderValue) },
    {
      label: "Checkout Conversion",
      value:
        data.checkoutConversion == null
          ? "—"
          : `${Math.round(data.checkoutConversion * 100)}%`,
    },
    {
      label: "Repeat Purchase Rate",
      value: data.repeatPurchaseRate == null ? "—" : `${Math.round(data.repeatPurchaseRate * 100)}%`,
    },
    { label: "Unfulfilled Paid Orders", value: String(data.unfulfilledOrders) },
    { label: "Pending Commissions", value: formatNaira(data.pendingCommissions) },
    {
      label: "Goods Contribution",
      value: `${formatNaira(data.contribution.goodsContribution)}${data.contribution.incomplete ? " (incomplete)" : ""}`,
    },
    { label: "Paid Orders", value: String(data.paidOrders) },
    { label: "Awaiting Payment", value: String(data.pendingOrders) },
    { label: "Published Pieces", value: `${data.published} / ${data.products}` },
    { label: "New Bespoke Requests", value: String(data.bespokeRequests) },
    { label: "New Corporate Enquiries", value: String(data.corporateEnquiries ?? 0) },
    { label: "New Feedback", value: String(data.feedback) },
    { label: "New Partnership Enquiries", value: String(data.partnershipEnquiries) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-8">Overview</h1>
      <TisasngStatusCard />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-ink/10 border border-ink/10 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-ivory px-6 py-7">
            <p className="overline-label mb-2">{s.label}</p>
            <p className="font-editorial text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone mb-12 max-w-2xl">
        Contribution = paid revenue minus recorded product costs. It is
        labelled <em>incomplete</em> while any sold item lacks a recorded
        internal cost. Revenue is never presented as profit — delivery
        subsidy, discounts, fees and commissions sit inside these figures.
        Conversion denominator: orders that reached checkout (created → paid).
      </p>

      <div className="grid gap-8 lg:grid-cols-2 mt-12">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone">Recent Orders</h2>
            <a href="/admin/orders" className="text-xs uppercase tracking-btn text-gold hover:underline">
              Manage Orders
            </a>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-stone border border-ink/10 px-5 py-8 text-center">
              No orders yet. Orders will appear here as customers check out.
            </p>
          ) : (
            <ul className="divide-y divide-ink/10 border border-ink/10">
              {data.recentOrders.map((o) => (
                <li key={o.orderNumber} className="px-5 py-3.5 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-stone">{o.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p>{formatNaira(o.total)}</p>
                    <p className={`text-xs ${o.paymentStatus === "paid" ? "text-forest" : "text-stone"}`}>
                      {o.paymentStatus}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Quick Links</h2>
          <ul className="divide-y divide-ink/10 border border-ink/10 text-sm">
            {[
              ["Add a product", "/admin/products"],
              ["Manage the media library", "/admin/media"],
              ["Review partnership enquiries", "/admin/partnerships"],
              ["Update order status", "/admin/orders"],
              ["Edit homepage & contact details", "/admin/settings"],
              ["Review bespoke requests", "/admin/bespoke"],
              ["Review feedback", "/admin/feedback"],
            ].map(([label, href]) => (
              <li key={href}>
                <a href={href} className="px-5 py-3.5 flex justify-between items-center hover:bg-ink/[0.03]">
                  {label}
                  <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        </section>      </div>
    </div>
  );
}

function TisasngStatusCard() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof adminTisasngStatus>> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    adminCall(adminTisasngStatus)
      .then(setStatus)
      .catch(() => setError(true));
  }, []);
  return (
    <div className="border border-ink/10 px-5 py-5 mb-10 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="overline-label mb-1">{status?.provider ?? "TisasNG"} Integration</p>
        {error ? (
          <p className="text-sm text-stone">Status unavailable.</p>
        ) : !status ? (
          <p className="text-sm text-stone">Checking…</p>
        ) : (
          <p className="text-sm">
            {status.connected ? (
              <>
                <span className="text-forest font-medium">Connected</span>
                <span className="text-stone"> — verified against the documented balance endpoint.</span>
              </>
            ) : (
              <span className="text-stone">
                {status.configured ? "Configured, but the check did not pass. Verify TISASNG_KEY." : "TISASNG_KEY not present in this environment."}
              </span>
            )}
            {status.connected && !status.giftingAvailable && (
              <span className="block text-xs text-stone mt-1">
                Gift-token issuing awaits the official TisasNG Gift Tokens specification.
              </span>
            )}
          </p>
        )}
      </div>
      <a href="/admin/settings" className="text-xs uppercase tracking-btn text-gold hover:underline">
        Settings
      </a>
    </div>
  );
}