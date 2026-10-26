import { createFileRoute } from "@tanstack/react-router";
import { adminOverview, adminReadiness, adminTisasngStatus } from "@/server/admin.functions";
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

  // The dashboard loading at all proves the store is live and the database
  // is connected — those two rows are stated, not probed.
  const readinessRows = [
    { label: "STORE", value: "Live" },
    { label: "DATABASE", value: "Connected" },
  ];

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
      <ReadinessPanel base={readinessRows} />
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

/**
 * Production-readiness strip. Everything here is an operational fact the
 * house acts on — configuration presence (never key values) and the four
 * catalogue-quality queues that need attention before a product earns
 * customer trust.
 */
function ReadinessPanel({ base }: { base: Array<{ label: string; value: string }> }) {
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof adminReadiness>> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    adminCall(adminReadiness)
      .then(setReadiness)
      .catch(() => setFailed(true));
  }, []);

  const flag = (ok: boolean, okText: string, badText: string) => (
    <span className={ok ? "text-forest font-medium" : "text-oxblood font-medium"}>
      {ok ? okText : badText}
    </span>
  );

  const rows: Array<{ label: string; value: React.ReactNode; note?: string; href?: string }> = [
    ...base.map((r) => ({ label: r.label, value: <span className="text-forest font-medium">{r.value}</span> as React.ReactNode })),
    {
      label: "PAYSTACK",
      value: readiness
        ? flag(readiness.paystackConfigured, "Connected", "Not Connected")
        : <span className="text-stone">Checking…</span>,
      note: readiness?.paystackConfigured
        ? undefined
        : "Set PAYSTACK_SECRET_KEY in the Netlify environment — online payment switches on automatically, no code change.",
    },
    {
      label: "AI ASSISTANT",
      value: readiness
        ? flag(readiness.aiTextConfigured, "Connected", "Fallback Mode")
        : <span className="text-stone">Checking…</span>,
      note: readiness?.aiTextConfigured
        ? undefined
        : "The assistant works from the live catalogue in fallback mode. Add NETLIFY_AI_GATEWAY_KEY and NETLIFY_AI_GATEWAY_BASE_URL to enable AI-written advice.",
    },
    {
      label: "AI CONCEPT GENERATION",
      value: readiness
        ? flag(readiness.aiConceptConfigured, "Connected", "Unavailable")
        : <span className="text-stone">Checking…</span>,
      note: readiness?.aiConceptConfigured
        ? undefined
        : "Concept sketches need the AI Gateway credentials above.",
    },
    {
      label: "PRODUCTS PUBLISHED",
      value: readiness ? String(readiness.published) : "…",
    },
    {
      label: "NEEDS CATEGORY CONFIRMATION",
      value: readiness ? String(readiness.needsCategoryConfirmationCount) : "…",
      href: "/admin/products",
      note: "Ambiguous pieces awaiting an admin collection decision — never auto-guessed.",
    },
    {
      label: "UNASSIGNED MEDIA",
      value: readiness ? String(readiness.unassignedMedia) : "…",
      href: "/admin/media",
      note: "Uploaded product images not yet attached to a product. Nothing is lost — assign or re-categorise them.",
    },
    {
      label: "PRODUCTS MISSING IMAGE",
      value: readiness ? String(readiness.productsMissingImage) : "…",
      href: "/admin/products",
      note: "Published pieces whose only imagery is the 'coming soon' placeholder.",
    },
    {
      label: "WAITING FOR CHECKOUT APPROVAL",
      value: readiness ? String(readiness.awaitingCheckoutApproval) : "…",
      href: "/admin/products",
      note: "Published pieces not yet approved for checkout — customers see 'Request a Quote'.",
    },
  ];

  return (
    <div className="border border-ink/10 mb-10">
      <p className="overline-label px-5 pt-4 pb-3">Production Readiness</p>
      <dl className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 border-t border-ink/10">
        {rows.map((r) => (
          <div key={r.label} className="px-5 py-4 border-b border-ink/5 sm:border-r last:border-r-0">
            <dt className="text-[0.62rem] uppercase tracking-btn text-stone">{r.label}</dt>
            <dd className="text-sm mt-1">
              {r.href ? (
                <a href={r.href} className="hover:underline">
                  {r.value}
                </a>
              ) : (
                r.value
              )}
            </dd>
            {r.note && <p className="text-[0.62rem] text-stone mt-1 leading-snug">{r.note}</p>}
          </div>
        ))}
      </dl>
      {failed && (
        <p className="text-xs text-stone px-5 py-2 border-t border-ink/5">
          Readiness figures unavailable right now.
        </p>
      )}
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