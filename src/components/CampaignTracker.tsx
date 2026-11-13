import { Link } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { campaignTotals, CAMPAIGN_TARGET_KOBO, DREAMER_TARGET, type CampaignData } from "@/lib/campaign-tracker";
import { formatNaira } from "@/lib/format";

export function CampaignTracker({ data, full = false }: { data: CampaignData; full?: boolean }) {
  const totals = campaignTotals(data);
  const [shareStatus, setShareStatus] = useState("");
  const updated = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" }).format(new Date(data.updatedAt));
  async function share() {
    const url = window.location.origin + "/billion-naira-dream";
    try {
      if (navigator.share) await navigator.share({ title: "DREAMZ · Billion-Naira Dream", text: "One million people. One million dream outfits. Follow our journey.", url });
      else { await navigator.clipboard.writeText(url); setShareStatus("Campaign link copied."); }
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setShareStatus("Share this page using your browser’s share button."); }
  }
  return <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16" aria-labelledby="campaign-title">
    <div className="rainbow-rule h-1.5 mb-8" aria-hidden="true" />
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-3xl">
        <p className="overline-label !text-brand-purple">DESIGN YOUR DREAM · OUR JOURNEY</p>
        <h2 id="campaign-title" className="font-editorial text-4xl sm:text-6xl mt-3">The Billion-Naira Dream</h2>
        <p className="mt-4 text-base sm:text-lg">We’re working toward helping <strong>1,000,000 people design their dream outfit</strong>—and building DREAMZ Fashion toward ₦1 billion through the products we make together.</p>
      </div>
      <p className="text-xs text-stone">Confirmed by DREAMZ<br/>Updated {updated}</p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {[
        ["Cash received", formatNaira(totals.receivedKobo), "Deposits received toward the goal", "var(--color-brand-green)"],
        ["Still to receive", formatNaira(totals.remainingKobo), "Remaining to reach ₦1,000,000,000", "var(--color-brand-red)"],
        ["Dreamers so far", data.dreamers.toLocaleString("en-NG"), "People who have designed their outfit", "var(--color-brand-blue)"],
        ["More dreamers to reach", totals.dreamersRemaining.toLocaleString("en-NG"), "Our goal: at least 1,000,000 people", "var(--color-brand-purple)"],
      ].map(([label, value, note, colour]) => <div key={label} className="campaign-card bg-white border-x border-b border-ink/10 p-5 sm:p-6" style={{ "--card-colour": colour } as CSSProperties}>
        <p className="text-xs uppercase tracking-wider font-semibold">{label}</p>
        <p className="font-sans font-bold text-2xl sm:text-3xl mt-4 break-words tabular-nums">{value}</p>
        <p className="text-xs text-stone mt-3">{note}</p>
      </div>)}
    </div>
    <div className="grid md:grid-cols-2 gap-7 mt-7">
      <div><div className="flex justify-between text-xs mb-3"><span>₦1 billion goal</span><strong>{totals.moneyPercent.toFixed(4)}%</strong></div><progress className="campaign-progress" aria-label="Cash received toward one billion naira" value={Math.min(totals.receivedKobo, CAMPAIGN_TARGET_KOBO)} max={CAMPAIGN_TARGET_KOBO}/></div>
      <div><div className="flex justify-between text-xs mb-3"><span>1 million dreamers</span><strong>{totals.dreamerPercent.toFixed(4)}%</strong></div><progress className="campaign-progress" aria-label="Dreamers toward one million people" value={Math.min(data.dreamers,DREAMER_TARGET)} max={DREAMER_TARGET}/></div>
    </div>
    <p className="text-sm text-stone mt-5">Only money received counts here. Unpaid balances and full order values are not included. Dreamers are counted as people, not the number of items ordered.</p>
    {full && <div className="mt-10">
      <h3 className="font-editorial text-3xl mb-5">The first dreams taking shape</h3>
      <div className="grid md:grid-cols-2 gap-5">{data.entries.map((entry,i)=><article key={entry.id} className="border border-ink/15 bg-white p-6">
        <p className="text-xs uppercase tracking-wider text-brand-purple">DREAM {String(i+1).padStart(3,"0")}</p><h4 className="font-editorial text-3xl mt-2">{entry.project}</h4>
        <p className="font-bold text-2xl mt-5">{formatNaira(entry.receivedKobo)}</p>
        <p className="text-sm mt-2"><strong>{entry.depositPercent}% {entry.depositPercent===100?"payment":"deposit"} received</strong></p>
        <p className="text-sm text-stone mt-2">Received {new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Lagos"}).format(new Date(entry.receivedOn+"T12:00:00Z"))}</p>
        {entry.depositPercent < 100 && <p className="text-xs text-stone mt-4">The remaining balance is excluded from the cash total.</p>}
      </article>)}</div>
    </div>}
    <div className="flex flex-wrap gap-3 mt-8">
      <Link to="/custom" search={{start:"1",design:undefined,t:undefined,brief:undefined}} className="btn-lux btn-lux-primary">Design your dream outfit</Link>
      {full ? <button type="button" onClick={()=>void share()} className="btn-lux btn-lux-outline">Share the journey</button> : <Link to="/billion-naira-dream" className="btn-lux btn-lux-outline">See the progress & deposits →</Link>}
    </div>
    {shareStatus && <p role="status" className="text-sm mt-3">{shareStatus}</p>}
  </section>;
}
