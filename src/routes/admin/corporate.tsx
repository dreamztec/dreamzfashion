import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  adminListCorporateEnquiries,
  adminListCorporateQuotes,
  adminSaveCorporateQuote,
  adminUpdateCorporateEnquiry,
  adminUpdateCorporateQuoteStatus,
} from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/admin/corporate")({
  component: AdminCorporate,
});

type Enquiry = Awaited<ReturnType<typeof adminListCorporateEnquiries>>[number];
type Quote = Awaited<ReturnType<typeof adminListCorporateQuotes>>[number];

const ENQUIRY_FLOW = ["new", "qualified", "quoted", "accepted", "production", "delivered", "closed"] as const;

function AdminCorporate() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState("");
  const [quoteFor, setQuoteFor] = useState<Enquiry | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEnquiries(await adminCall(adminListCorporateEnquiries));
      setQuotes(await adminCall(adminListCorporateQuotes));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load corporate pipeline.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateEnquiry = async (id: number, patch: { status?: string; nextAction?: string }) => {
    try {
      await adminCall(adminUpdateCorporateEnquiry, { id, ...patch });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-2">Corporate Orders</h1>
      <p className="text-sm text-stone mb-8">
        Enquiry → qualification → quote → acceptance → payment → production → delivery.
      </p>
      {error && <p className="mb-6 text-sm text-oxblood">{error}</p>}
      {shareUrl && (
        <p className="mb-6 text-sm border border-gold/40 bg-gold/10 px-4 py-3 break-all">
          Quote created. Share this link with the client:{" "}
          <code>{shareUrl}</code>
        </p>
      )}

      <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Enquiries</h2>
      {enquiries.length === 0 ? (
        <p className="text-sm text-stone border border-ink/10 px-5 py-8 text-center mb-12">
          No corporate enquiries yet.
        </p>
      ) : (
        <ul className="space-y-4 mb-14">
          {enquiries.map((e) => (
            <li key={e.id} className="border border-ink/10 px-5 py-5">
              <div className="flex flex-wrap justify-between gap-4 items-start">
                <div>
                  <p className="font-medium">
                    {e.companyName} <span className="text-xs text-stone">· {e.enquiryNumber}</span>
                  </p>
                  <p className="text-xs text-stone mt-1">
                    {e.contactPerson} · {e.phone} · {e.email}
                  </p>
                  <p className="text-sm mt-2">
                    Wants: {e.productInterests} · Qty: {e.quantity}
                    {e.budgetRange ? ` · Budget: ${e.budgetRange}` : ""}
                    {e.deadline ? ` · Deadline: ${e.deadline}` : ""}
                  </p>
                  <p className="text-sm text-stone mt-1">Deliver to: {e.deliveryLocation}</p>
                  {e.brandingRequirements && (
                    <p className="text-sm text-stone mt-1">Branding: {e.brandingRequirements}</p>
                  )}
                  {e.message && <p className="text-sm text-stone mt-1">“{e.message}”</p>}
                  {e.quotes.length > 0 && (
                    <p className="text-xs mt-2">
                      Quotes:{" "}
                      {e.quotes
                        .map((q) => `${q.quoteNumber} (${formatNaira(q.totalKobo)}, ${q.status})`)
                        .join(" · ")}
                    </p>
                  )}
                  {e.nextAction && <p className="text-xs text-gold mt-2">Next: {e.nextAction}</p>}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <select
                    className="input-lux !py-2 text-xs w-44"
                    value={e.status}
                    onChange={(ev) => updateEnquiry(e.id, { status: ev.target.value })}
                    aria-label={`Status for ${e.companyName}`}
                  >
                    {ENQUIRY_FLOW.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setQuoteFor(e)}
                    className="btn-lux btn-lux-outline !py-2 !px-4 text-xs"
                  >
                    Create Quote
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">All Quotes</h2>
      {quotes.length === 0 ? (
        <p className="text-sm text-stone border border-ink/10 px-5 py-8 text-center">
          No quotes yet.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10">
          {quotes.map((q) => (
            <li key={q.id} className="px-5 py-4 flex flex-wrap justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{q.quoteNumber} — {q.companyName}</p>
                <p className="text-xs text-stone">
                  {formatNaira(q.totalKobo)}
                  {q.validUntil ? ` · valid until ${new Date(q.validUntil).toLocaleDateString("en-NG")}` : ""}
                  {` · ${q.milestones.length} milestone(s)`} · {q.status}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <select
                  className="input-lux !py-1.5 text-xs w-36"
                  value={q.status}
                  onChange={(ev) =>
                    adminCall(adminUpdateCorporateQuoteStatus, { id: q.id, status: ev.target.value }).then(load)
                  }
                  aria-label={`Status for ${q.quoteNumber}`}
                >
                  {["draft", "sent", "accepted", "production", "delivered", "expired"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <code className="text-xs text-stone">/corporate/quote/{q.quoteNumber}?t={q.accessToken}</code>
              </div>
            </li>
          ))}
        </ul>
      )}

      {quoteFor && (
        <QuoteBuilder
          enquiry={quoteFor}
          onClose={() => {
            setQuoteFor(null);
            setShareUrl(null);
            void load();
          }}
          onCreated={(url) => setShareUrl(url)}
        />
      )}
    </div>
  );
}

function QuoteBuilder({
  enquiry,
  onClose,
  onCreated,
}: {
  enquiry: Enquiry;
  onClose: () => void;
  onCreated: (shareUrl: string) => void;
}) {
  const [lines, setLines] = useState([
    { description: `${enquiry.productInterests}`, quantity: 10, unitPriceKobo: 0 },
  ]);
  const [branding, setBranding] = useState("0");
  const [delivery, setDelivery] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [milestones, setMilestones] = useState([
    { label: "Deposit (confirmation)", percent: 50, note: "" },
    { label: "Balance (before dispatch)", percent: 50, note: "" },
  ]);
  const [terms, setTerms] = useState(
    "Prices are valid until the date stated. Production begins after the first milestone clears. Delivery follows the agreed expectation.",
  );
  const [deliveryExpectation, setDeliveryExpectation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total =
    lines.reduce((s, l) => s + l.quantity * l.unitPriceKobo, 0) +
    (Number(branding) || 0) * 100 +
    (Number(delivery) || 0) * 100;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await adminCall(adminSaveCorporateQuote, {
        enquiryId: enquiry.id,
        companyName: enquiry.companyName,
        contactPerson: enquiry.contactPerson,
        email: enquiry.email,
        phone: enquiry.phone,
        lines,
        brandingChargeKobo: Math.round((Number(branding) || 0) * 100),
        deliveryChargeKobo: Math.round((Number(delivery) || 0) * 100),
        validUntil: validUntil || "",
        milestones: milestones.filter((m) => m.percent > 0),
        terms,
        deliveryExpectation,
        send: true,
      });
      onCreated(res.shareUrl ?? "");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quote.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-ink/40 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Quote builder">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl bg-ivory border border-ink/15 p-8">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-editorial text-2xl">Quote — {enquiry.companyName}</h2>
          <button type="button" onClick={onClose} aria-label="Close quote builder" className="p-1 text-stone">✕</button>
        </div>

        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto] mb-2 items-end">
            <input
              className="input-lux"
              value={l.description}
              onChange={(e) =>
                setLines((ls) => ls.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
              }
              placeholder="Line description"
              required
            />
            <input
              className="input-lux"
              type="number"
              min="1"
              value={l.quantity}
              onChange={(e) =>
                setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x)))
              }
              aria-label="Quantity"
              required
            />
            <input
              className="input-lux"
              type="number"
              min="0"
              value={l.unitPriceKobo ? l.unitPriceKobo / 100 : ""}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((x, j) => (j === i ? { ...x, unitPriceKobo: Math.round((Number(e.target.value) || 0) * 100) } : x)),
                )
              }
              placeholder="Unit ₦"
              aria-label="Unit price"
            />
            <button
              type="button"
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
              className="text-stone text-xs"
              aria-label="Remove line"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, { description: "", quantity: 1, unitPriceKobo: 0 }])}
          className="text-xs uppercase tracking-btn mb-6"
        >
          + Add line
        </button>

        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <div>
            <label className="input-lux-label">Branding charge (₦)</label>
            <input className="input-lux" type="number" min="0" value={branding} onChange={(e) => setBranding(e.target.value)} />
          </div>
          <div>
            <label className="input-lux-label">Delivery charge (₦)</label>
            <input className="input-lux" type="number" min="0" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </div>
          <div>
            <label className="input-lux-label">Valid until</label>
            <input className="input-lux" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div>
            <label className="input-lux-label">Delivery expectation</label>
            <input className="input-lux" value={deliveryExpectation} onChange={(e) => setDeliveryExpectation(e.target.value)} placeholder="e.g. 3–4 weeks after first payment" />
          </div>
        </div>

        <p className="input-lux-label">Payment milestones</p>
        {milestones.map((m, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_auto] mb-2 items-end">
            <input
              className="input-lux"
              value={m.label}
              onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              placeholder="Milestone label"
            />
            <input
              className="input-lux"
              type="number"
              min="1"
              max="100"
              value={m.percent}
              onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, percent: Number(e.target.value) || 1 } : x)))}
              aria-label="Percent"
            />
            <button
              type="button"
              onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))}
              className="text-stone text-xs"
              aria-label="Remove milestone"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setMilestones((ms) => [...ms, { label: "", percent: 50, note: "" }])}
          className="text-xs uppercase tracking-btn mb-6"
        >
          + Add milestone
        </button>

        <div className="mb-6">
          <label className="input-lux-label">Terms</label>
          <textarea className="input-lux" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>

        <p className="text-sm mb-6">
          Quote total: <strong className="font-editorial text-xl">{formatNaira(total)}</strong>
        </p>

        {error && <p role="alert" className="text-sm text-oxblood mb-4">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="btn-lux btn-lux-primary">
            {busy ? "Creating…" : "Create & Mark Sent"}
          </button>
          <button type="button" onClick={onClose} className="btn-lux btn-lux-outline">Cancel</button>
        </div>
      </form>
    </div>
  );
}
