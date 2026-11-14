import { Link } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { campaignTotals, STATEMENT_REVIEW, DREAMER_TARGET, type CampaignData } from "@/lib/campaign-tracker";
import { formatNaira } from "@/lib/format";

export function CampaignTracker({ data, full = false }: { data: CampaignData; full?: boolean }) {
  const totals = campaignTotals(data);
  const [shareStatus, setShareStatus] = useState("");
  const updated = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" }).format(new Date(data.updatedAt));
  async function share() {
    const url = window.location.origin + "/our-progress";
    try {
      if (navigator.share) await navigator.share({ title: "DREAMZ Fashion · Our Progress", text: "One million people. One million dream outfits. Follow our journey.", url });
      else { await navigator.clipboard.writeText(url); setShareStatus("Campaign link copied."); }
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setShareStatus("Share this page using your browser’s share button."); }
  }
  return <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16" aria-labelledby="campaign-title">
    <div className="rainbow-rule h-1.5 mb-8" aria-hidden="true" />
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-3xl">
        <p className="overline-label !text-brand-purple">DESIGN YOUR DREAM · OUR JOURNEY</p>
        <h2 id="campaign-title" className="font-editorial text-4xl sm:text-6xl mt-3">Dream outfits. Real progress.</h2>
        <p className="mt-4 text-base sm:text-lg">We’re working toward helping <strong>1,000,000 people achieve their dreams</strong>. Every identifiable customer payment helps move the DREAMZ billion-naira journey forward. We count people only once, even when they pay in instalments.</p>
      </div>
      <p className="text-xs text-stone">Confirmed by DREAMZ<br/>Updated {updated}</p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {[
        ["Identified customer receipts", formatNaira(totals.receivedKobo), "Money received, including the two 50% deposits", "var(--color-brand-green)"],
        ["People behind the receipts", data.dreamers.toLocaleString("en-NG"), "Distinct named payers; repeat payments count once", "var(--color-brand-blue)"],
        ["Incoming payments recorded", totals.receiptCount.toLocaleString("en-NG"), "One entry per identifiable receipt; not new people", "var(--color-gold)"],
        ["People still to reach", totals.dreamersRemaining.toLocaleString("en-NG"), "Our goal: 1,000,000 people", "var(--color-brand-purple)"],
      ].map(([label, value, note, colour]) => <div key={label} className="campaign-card bg-white border-x border-b border-ink/10 p-5 sm:p-6" style={{ "--card-colour": colour } as CSSProperties}>
        <p className="text-xs uppercase tracking-wider font-semibold">{label}</p>
        <p className="font-sans font-bold text-2xl sm:text-3xl mt-4 break-words tabular-nums">{value}</p>
        <p className="text-xs text-stone mt-3">{note}</p>
      </div>)}
    </div>
    <div className="mt-7">
      <div><div className="flex justify-between text-xs mb-3"><span>People backing the DREAMZ journey · 1 million goal</span><strong>{totals.dreamerPercent.toFixed(4)}%</strong></div><progress className="campaign-progress" aria-label="Identified individuals toward one million people" value={Math.min(data.dreamers,DREAMER_TARGET)} max={DREAMER_TARGET}/></div>
      <div className="mt-5"><div className="flex justify-between text-xs mb-3"><span>Identified customer receipts · ₦1 billion vision</span><strong>{totals.billionReceiptsPercent.toFixed(4)}%</strong></div><progress className="campaign-progress" aria-label="Customer-attributed cash receipts toward one billion naira" value={Math.min(totals.billionReceiptsPercent,100)} max={100}/></div>
    </div>
    <p className="text-sm text-stone mt-5">These figures are based on bank credits attributed to individual customers by DREAMZ, not total bank inflows, accounting revenue, profit or completed deliveries. Unpaid balances are excluded. The people counter counts distinct identified payers, not payments, products or independently verified Studio designs.</p>
    {full && <section className="mt-8 border border-ink/15 bg-white p-6" aria-label="Statement reconciliation">
      <h3 className="font-editorial text-3xl">What the statements confirm</h3>
      <p className="mt-3 text-sm">Reviewed period: {STATEMENT_REVIEW.period}. Moniepoint ends 14 November; GTBank ends 13 November. Two 50% deposits are included once. {STATEMENT_REVIEW.identifiedPaymentEvents} individual payment events are attributed to {STATEMENT_REVIEW.identifiedIndividualPayers} distinct named payers; one payer appears twice. No bank account numbers or payer names are displayed.</p>
      <dl className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
        {[["Total credits across both accounts",STATEMENT_REVIEW.grossCreditsKobo],["Own-account transfers excluded",STATEMENT_REVIEW.ownTransfersKobo],["Transfers between business accounts excluded",STATEMENT_REVIEW.internalTransfersKobo],["Other inflows awaiting sales verification",STATEMENT_REVIEW.unclassifiedKobo]].map(([label,amount])=><div key={label}><dt className="text-stone">{label}</dt><dd className="font-semibold mt-1">{formatNaira(Number(amount),2)}</dd></div>)}
      </dl>
      <p className="mt-5 text-sm">The two statements show {formatNaira(STATEMENT_REVIEW.grossCreditsKobo,2)} in all bank credits, but that figure includes internal transfers and is <strong>not sales revenue</strong>. Excluding the owner's deposits and movements between DREAMZ accounts leaves {formatNaira(STATEMENT_REVIEW.confirmedReceiptsKobo + STATEMENT_REVIEW.unclassifiedKobo,2)} in outside-source inflows. Of that, only {formatNaira(totals.receivedKobo,2)} is currently attributed to individual customer receipts; the rest is held for review.</p>
      <p className="mt-3 text-sm">Credits from companies, transactions labelled as cash withdrawals, small unexplained/test transfers and logistics settlements cannot be claimed as sales without invoices or order evidence. A bank credit alone does not establish that an outfit was designed, produced or delivered.</p>
      <p className="mt-4 font-semibold">Indicative 1% Dream Fund allocation on these identified receipts: {formatNaira(Math.round(totals.receivedKobo/100),2)}.</p>
      <p className="mt-2 text-sm text-stone">This is a planning calculation only. The actual sales-eligible contribution and any completed fund transfer require separate reconciliation.</p>
    </section>}
    {full && <div className="mt-10">
      <h3 className="font-editorial text-3xl mb-5">Customer receipts reviewed</h3>
      <div className="grid md:grid-cols-2 gap-5">{data.entries.map((entry,i)=><article key={entry.id} className="border border-ink/15 bg-white p-6">
        <p className="text-xs uppercase tracking-wider text-brand-purple">RECEIPT {String(i+1).padStart(3,"0")}</p><h4 className="font-editorial text-3xl mt-2">{entry.project}</h4>
        <p className="font-bold text-2xl mt-5">{formatNaira(entry.receivedKobo)}</p>
        <p className="text-sm mt-2"><strong>{entry.depositPercent === null ? "Bank receipt recorded · order percentage not recorded" : `${entry.depositPercent}% ${entry.depositPercent===100?"payment":"deposit"} received`}</strong></p>
        <p className="text-sm text-stone mt-2">Received {new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Lagos"}).format(new Date(entry.receivedOn+"T12:00:00Z"))}</p>
        {entry.depositPercent !== null && entry.depositPercent < 100 && <p className="text-xs text-stone mt-4">The remaining balance is excluded from the cash total.</p>}
      </article>)}</div>
    </div>}
    <div className="flex flex-wrap gap-3 mt-8">
      <Link to="/custom" search={{start:"1",design:undefined,t:undefined,brief:undefined}} className="btn-lux btn-lux-primary">Design your dream outfit</Link>
      {full ? <button type="button" onClick={()=>void share()} className="btn-lux btn-lux-outline">Share the journey</button> : <Link to="/our-progress" className="btn-lux btn-lux-outline">See the progress & deposits →</Link>}
    </div>
    <div className="mt-8 border-t border-ink/15 pt-6 text-sm">
      <p className="font-semibold">Your purchase can help build the Dream Fund.</p>
      <p className="text-stone mt-2">DREAMZ commits 1% of every sale to the Dreams to Reality Dream Fund, with a goal of ₦1 billion to help people pursue their dreams. This contribution comes from DREAMZ’s sales proceeds; it is not an extra charge to you.</p>
      <p className="text-stone mt-2">The bank inflows above are a working customer-attribution record. A 1% commitment is not a completed transfer: fund receipts and support paid out will be reported separately. No transfer total has been confirmed yet.</p>
      <a href="https://mydreamnetwork.dreamz-gc.com/dream-fund" className="inline-block mt-3 underline underline-offset-4 font-semibold">Explore the Dream Fund ↗</a>
    </div>
    {shareStatus && <p role="status" className="text-sm mt-3">{shareStatus}</p>}
  </section>;
}
