import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { applyAsPartner } from "@/server/partner.functions";
import { RainbowRule } from "@/components/brand";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/earn")({
  head: () => ({
    meta: [
      { title: `Earn with DREAMZ — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Partner with DREAMZ: refer products, curate a creator storefront, or buy in volume as a trade partner. Free to apply.",
      },
    ],
  }),
  component: EarnPage,
});

const TRACKS = [
  {
    id: "referral" as const,
    title: "Referral Partner",
    for: "Students, customers and anyone who loves the craft",
    body: "Share your unique link. When someone buys through it, you earn on that order under the terms the house publishes. Free to apply, no purchase required, and recruiting other partners earns nothing — earnings come only from real product sales.",
    fields: ["audience"],
  },
  {
    id: "creator" as const,
    title: "Creator Partner",
    for: "Influencers and creators with an engaged audience",
    body: "Curate a storefront of approved DREAMZ pieces, share your direct purchase link, and co-design a named collection with the house. Designs are reviewed for feasibility, cost and delivery before anything goes live.",
    fields: ["socialProfile", "audience"],
  },
  {
    id: "trade" as const,
    title: "Trade Partner",
    for: "Resellers, boutiques and businesses buying in volume",
    body: "Receive quantity-based quotations with trade pricing agreed in advance. Trade pricing is quoted per order — no invented discounts.",
    fields: ["storeName", "audience"],
  },
];

function EarnPage() {
  return (
    <div>
      <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-32 pb-10 text-center">
        <p className="overline-label mb-4">Earn with DREAMZ</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">
          Recommend the craft. Share in the sales.
        </h1>
        <RainbowRule className="mx-auto mt-7" />
        <p className="text-stone mt-7 leading-relaxed">
          Three partner routes, one honest structure: earnings come from
          eligible product sales, commissions are only confirmed after the
          customer's return window closes, and payouts are reviewed by the
          house before any transfer.
        </p>
      </div>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 pb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {TRACKS.map((t) => (
            <div key={t.id} className="border border-ink/10 px-6 py-7 flex flex-col">
              <h2 className="font-editorial text-xl mb-1">{t.title}</h2>
              <p className="text-[0.65rem] uppercase tracking-btn text-stone mb-4">{t.for}</p>
              <p className="text-sm text-stone leading-relaxed flex-1">{t.body}</p>
              <a href={`#apply-${t.id}`} className="nav-link text-[0.68rem] uppercase tracking-btn mt-5 self-start">
                Apply
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 sm:px-8 pb-16">
        <div className="border border-ink/10 px-6 sm:px-10 py-10 mb-10">
          <h2 className="font-editorial text-2xl mb-4 text-center">How it works</h2>
          <ol className="text-sm text-stone space-y-2 list-decimal pl-5">
            <li>Apply below — free, no purchase required.</li>
            <li>The house reviews and approves your application.</li>
            <li>You receive your unique link (and storefront, for creators).</li>
            <li>Sales made through your link are tracked server-side.</li>
            <li>Commissions become eligible after fulfilment and the return window.</li>
            <li>You request a payout; the house reviews and transfers it.</li>
          </ol>
          <p className="mt-5 text-xs text-stone leading-relaxed">
            Attribution rules: a visitor who arrives through your link is
            attributed to you for the window configured by the house. Only
            their verified, fully-paid orders count. Refunds and cancellations
            reverse commissions. Rates and thresholds are set by the house —
            nothing is promised before they are configured.
          </p>
        </div>
        <ApplyForm />
      </section>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-14 text-center">
          <h2 className="font-editorial text-2xl sm:text-3xl mb-3">
            Already a partner?
          </h2>
          <p className="text-sm text-stone mb-8">
            Sign in to see your link, clicks, orders, commissions and payouts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/account/referrals" className="btn-lux btn-lux-primary">
              Referral Dashboard
            </Link>
            <Link to="/account/partner" className="btn-lux btn-lux-outline">
              Creator / Trade Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ApplyForm() {
  const [track, setTrack] = useState<"referral" | "creator" | "trade">("referral");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please confirm you accept the partner terms.");
      return;
    }
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await applyAsPartner({
        data: {
          track,
          displayName: String(fd.get("displayName") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          socialProfile: String(fd.get("socialProfile") || ""),
          storeName: String(fd.get("storeName") || ""),
          businessName: String(fd.get("businessName") || ""),
          audience: String(fd.get("audience") || ""),
          message: String(fd.get("message") || ""),
          agreedTerms: true,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the application.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="border border-ink/15 px-8 py-12 text-center" role="status">
        <p className="text-forest text-3xl mb-4" aria-hidden="true">✓</p>
        <h2 className="font-editorial text-2xl mb-3">Application received</h2>
        <p className="text-sm text-stone">
          The house reviews partner applications and will contact you on
          approval with your unique link and terms.
        </p>
      </div>
    );
  }

  const active = TRACKS.find((t) => t.id === track)!;

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 sm:px-10 py-10" id="apply">
      <h2 className="font-editorial text-2xl mb-6 text-center">Apply</h2>

      <p className="input-lux-label">Partner route</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {TRACKS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTrack(t.id)}
            aria-pressed={track === t.id}
            className={`text-left border px-4 py-3 text-sm transition-colors ${
              track === t.id ? "border-ink bg-ink/[0.03]" : "border-ink/20 hover:border-ink/50"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone mb-6">{active.body}</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className="input-lux-label">Full name</label>
          <input id="p-name" name="displayName" required minLength={2} className="input-lux" />
        </div>
        <div>
          <label htmlFor="p-email" className="input-lux-label">Email</label>
          <input id="p-email" name="email" type="email" required className="input-lux" />
        </div>
        <div>
          <label htmlFor="p-phone" className="input-lux-label">Phone</label>
          <input id="p-phone" name="phone" type="tel" required className="input-lux" placeholder="0803 000 0000" />
        </div>
        {track === "trade" ? (
          <div>
            <label htmlFor="p-business" className="input-lux-label">Business name</label>
            <input id="p-business" name="businessName" className="input-lux" />
          </div>
        ) : (
          <div>
            <label htmlFor="p-social" className="input-lux-label">
              Social profile {track === "creator" ? "(required)" : "(optional)"}
            </label>
            <input
              id="p-social"
              name="socialProfile"
              required={track === "creator"}
              className="input-lux"
              placeholder="Instagram, TikTok, YouTube…"
            />
          </div>
        )}
        {track === "creator" && (
          <div className="sm:col-span-2">
            <label htmlFor="p-store" className="input-lux-label">Preferred storefront name</label>
            <input id="p-store" name="storeName" className="input-lux" placeholder="e.g. Ada's Edit" />
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="p-audience" className="input-lux-label">
            {track === "trade" ? "Tell us about your business" : "Tell us about your audience"}
          </label>
          <textarea id="p-audience" name="audience" rows={3} className="input-lux" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-message" className="input-lux-label">Anything else</label>
          <textarea id="p-message" name="message" rows={2} className="input-lux" />
        </div>
      </div>

      <label className="mt-6 flex items-start gap-2.5 text-xs text-stone leading-relaxed">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>
          I accept the partner terms: earnings come only from eligible product
          sales through my own link; commission rates are set by the house;
          payouts require review; and self-referrals do not earn.
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>
      )}
      <button type="submit" disabled={busy} className="btn-lux btn-lux-primary w-full mt-6">
        {busy ? "Sending…" : "Submit Application"}
      </button>
    </form>
  );
}
