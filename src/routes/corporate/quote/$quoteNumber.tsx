import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  getCorporateQuote,
  acceptCorporateQuote,
  initializeQuotePayment,
} from "@/server/corporate.functions";
import { formatNaira } from "@/lib/format";
import { RainbowRule } from "@/components/brand";
import { BRAND } from "@/lib/config";

/**
 * Customer-facing corporate quotation. Access requires BOTH the quote number
 * and the token issued at creation — a guessed number reveals nothing.
 */
export const Route = createFileRoute("/corporate/quote/$quoteNumber")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: async ({ params, deps }) => {
    return getCorporateQuote({ data: { quoteNumber: params.quoteNumber, token: deps.t ?? "" } });
  },
  head: () => ({
    meta: [
      { title: `Quotation — ${BRAND.name}`, name: "robots", content: "noindex" },
    ],
  }),
  component: QuoteView,
});

type QuoteData = Awaited<ReturnType<typeof getCorporateQuote>>;

function QuoteView() {
  const data = Route.useLoaderData() as QuoteData;
  const search = Route.useSearch();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!data.found) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center">
        <h1 className="font-editorial text-3xl mb-4">Quote not found</h1>
        <p className="text-stone mb-8">
          This quotation link is incomplete or has been revoked. Please contact
          DREAMZ for a fresh link.
        </p>
        <a href="/corporate" className="btn-lux btn-lux-primary">Corporate Orders</a>
      </div>
    );
  }

  const q = data.quote;
  const isAccepted = accepted || q.status === "accepted" || q.status === "production" || q.status === "delivered";
  const expired = q.validUntil ? new Date(q.validUntil).getTime() < Date.now() : false;

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      await acceptCorporateQuote({
        data: { quoteNumber: q.quoteNumber, token: search.t ?? "" },
      });
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record acceptance.");
    } finally {
      setBusy(false);
    }
  };

  const payMilestone = async (index: number) => {
    setBusy(true);
    setError("");
    try {
      const res = await initializeQuotePayment({
        data: { quoteNumber: q.quoteNumber, token: search.t ?? "", milestoneIndex: index },
      });
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-32 pb-32">
      <div className="text-center mb-10">
        <p className="overline-label mb-2">Quotation {q.quoteNumber}</p>
        <h1 className="font-editorial text-3xl sm:text-4xl">Prepared for {q.companyName}</h1>
        <RainbowRule className="mx-auto mt-6" />
      </div>

      <div className="border border-ink/10">
        <ul className="divide-y divide-ink/10">
          {q.lines.map((l, i) => (
            <li key={i} className="px-5 py-4 flex justify-between gap-4 text-sm">
              <div>
                <p>{l.description}</p>
                <p className="text-xs text-stone mt-0.5">Qty {l.quantity}</p>
              </div>
              <span className="whitespace-nowrap">{formatNaira(l.quantity * l.unitPriceKobo)}</span>
            </li>
          ))}
          {q.brandingChargeKobo > 0 && (
            <li className="px-5 py-3 flex justify-between text-sm">
              <span>Branding &amp; packaging</span>
              <span>{formatNaira(q.brandingChargeKobo)}</span>
            </li>
          )}
          {q.deliveryChargeKobo > 0 && (
            <li className="px-5 py-3 flex justify-between text-sm">
              <span>Delivery</span>
              <span>{formatNaira(q.deliveryChargeKobo)}</span>
            </li>
          )}
          <li className="px-5 py-4 flex justify-between border-t border-ink/10">
            <span className="uppercase tracking-btn text-xs self-center">Total</span>
            <span className="font-editorial text-2xl">{formatNaira(q.totalKobo)}</span>
          </li>
        </ul>
      </div>

      <dl className="mt-6 space-y-2 text-sm">
        {q.validUntil && (
          <div className="flex justify-between">
            <dt className="text-stone">Quote valid until</dt>
            <dd>{new Date(q.validUntil).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</dd>
          </div>
        )}
        {q.deliveryExpectation && (
          <div className="flex justify-between">
            <dt className="text-stone">Delivery</dt>
            <dd className="text-right">{q.deliveryExpectation}</dd>
          </div>
        )}
      </dl>

      {q.milestones.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-3">Payment milestones</h2>
          <ul className="space-y-2 text-sm">
            {q.milestones.map((m, i) => (
              <li key={i} className="flex justify-between border border-ink/10 px-4 py-3">
                <span>
                  {m.label} — {m.percent}%
                  {m.note && <span className="block text-xs text-stone mt-0.5">{m.note}</span>}
                </span>
                <span className="whitespace-nowrap">{formatNaira(Math.round((q.totalKobo * m.percent) / 100))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {q.terms && (
        <div className="mt-8">
          <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-2">Terms</h2>
          <p className="text-sm text-stone leading-relaxed whitespace-pre-line">{q.terms}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 border border-oxblood/40 bg-oxblood/5 text-oxblood text-sm px-4 py-3">
          {error}
        </p>
      )}

      {q.status === "sent" && !expired && (
        <div className="mt-8 text-center">
          <button onClick={accept} disabled={busy} className="btn-lux btn-lux-primary w-full sm:w-auto">
            {busy ? "Recording…" : "Accept This Quote"}
          </button>
          <p className="mt-3 text-xs text-stone">
            Accepting confirms the quantities, prices, milestones and terms
            above. Payment follows per the milestones.
          </p>
        </div>
      )}

      {isAccepted && q.milestones.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-3">Pay a milestone</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            {q.milestones.map((m, i) => (
              <button
                key={i}
                onClick={() => payMilestone(i)}
                disabled={busy}
                className="btn-lux btn-lux-outline flex-1"
              >
                Pay {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {expired && q.status === "sent" && (
        <p className="mt-8 text-center text-sm text-oxblood">
          This quote has expired. Contact us for a fresh quotation.
        </p>
      )}
    </div>
  );
}
