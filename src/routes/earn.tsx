import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { applyAsPartner, getPublicPartnerTerms } from "@/server/partner.functions";
import { RainbowRule } from "@/components/brand";
import { BRAND } from "@/lib/config";
import { CONTACT, waLink } from "@/lib/contact";

export const Route = createFileRoute("/earn")({
  loader: () => getPublicPartnerTerms(),
  head: () => ({
    meta: [
      { title: `Earn with DREAMZ — Free Sales & Creator Programme — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Join DREAMZ for free, receive an approved code/link and earn commission on qualifying verified product sales. No paid membership is required.",
      },
    ],
  }),
  headers: () => ({
    "Netlify-CDN-Cache-Control": "public, durable, max-age=300, stale-while-revalidate=1800",
  }),
  staleTime: 60_000,
  component: EarnPage,
});

function EarnPage() {
  const terms = Route.useLoaderData();
  return (
    <div>
      <section className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-12 text-center">
        <p className="overline-label mb-4">EARN WITH DREAMZ</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">
          Refer customers. Create content. Earn from real sales.
        </h1>
        <RainbowRule className="mx-auto mt-7" />
        <p className="text-stone mt-7 leading-relaxed max-w-2xl mx-auto">
          Joining is free. You do not pay DREAMZ for the right to earn commission.
          Approved members receive a code/link and earn only when a qualifying
          customer order is successfully paid and completed.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 pb-16">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="border border-ink/15 p-7">
            <p className="overline-label mb-2">Free Scout</p>
            <h2 className="font-editorial text-2xl">Sell from your network</h2>
            <p className="mt-3 text-sm text-stone leading-relaxed">
              Share DREAMZ products through WhatsApp, social media, personal
              contacts or communities using your approved code/link.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>• Free to apply.</li>
              <li>• Unique code/link after approval.</li>
              <li>• Dashboard for attributed qualifying sales.</li>
              <li>• Scout commission: <strong>{terms.scoutRateLabel}</strong> on qualifying verified sales.</li>
            </ul>
          </article>

          <article className="border border-ink/15 p-7">
            <p className="overline-label mb-2">Creator</p>
            <h2 className="font-editorial text-2xl">Create content and sell</h2>
            <p className="mt-3 text-sm text-stone leading-relaxed">
              Creators use the same free sales-code system and may also be considered
              for separate DREAMZ campaign collaborations based on content quality,
              audience fit and performance.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>• No creator joining fee.</li>
              <li>• Creator commission: <strong>{terms.creatorRateLabel}</strong> on qualifying verified sales.</li>
              <li>• Campaign collaborations are negotiated separately.</li>
              <li>• No payment for recruiting other members.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-16">
          <div className="text-center mb-10">
            <p className="overline-label mb-3">How it works</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Sales first. Earnings second.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Apply free", "Tell us who you are and how you plan to share DREAMZ."],
              ["02", "Get approved", "Receive your code/link and access to approved product content."],
              ["03", "Customers buy", "Your code/link is attached to qualifying DREAMZ orders."],
              ["04", "Earn", "Eligible commission clears according to the published return and payout rules."],
            ].map(([n, title, body]) => (
              <article key={n} className="border border-ink/10 bg-ivory p-6">
                <p className="font-editorial text-2xl text-gold">{n}</p>
                <h3 className="mt-3 uppercase tracking-btn text-xs">{title}</h3>
                <p className="mt-2 text-sm text-stone leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-xs text-stone text-center max-w-2xl mx-auto leading-relaxed">
            Commission is calculated on eligible merchandise after discounts. Refunds
            and cancellations can reverse unpaid earnings. Results are never guaranteed.
          </p>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl px-5 sm:px-8 py-16">
        <EarnApplication scoutRateLabel={terms.scoutRateLabel} creatorRateLabel={terms.creatorRateLabel} />
      </section>

      <section className="border-t border-ink/10">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-14">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="border border-ink/10 p-7">
              <p className="overline-label mb-2">Need more business support?</p>
              <h2 className="font-editorial text-2xl">Partner with DREAMZ</h2>
              <p className="mt-3 text-sm text-stone">
                Optional annual support plans provide tools, training and marketing
                support. They do not buy commission rights or guarantee income.
              </p>
              <Link to="/partner-with-dreamz" className="btn-lux btn-lux-outline mt-6">
                See Partner Memberships
              </Link>
            </div>
            <div className="border border-ink/10 p-7">
              <p className="overline-label mb-2">Own a retail business?</p>
              <h2 className="font-editorial text-2xl">Sell DREAMZ</h2>
              <p className="mt-3 text-sm text-stone">
                Apply separately for bulk, approved credit or commission/consignment
                stock. No paid Partner Membership is required.
              </p>
              <Link to="/partnerships" className="btn-lux btn-lux-outline mt-6">
                See Retail Models
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EarnApplication({
  scoutRateLabel,
  creatorRateLabel,
}: {
  scoutRateLabel: string;
  creatorRateLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [earningType, setEarningType] = useState<"scout" | "creator">("scout");
  const [result, setResult] = useState<Awaited<ReturnType<typeof applyAsPartner>> | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please confirm you accept the earning programme terms.");
      return;
    }
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await applyAsPartner({
        data: {
          sellingMode: "digital",
          earningType,
          partnerPlan: "scout",
          physicalModel: "undecided",
          introducerCode: String(fd.get("introducerCode") || ""),
          displayName: String(fd.get("displayName") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          socialProfile: String(fd.get("socialProfile") || ""),
          storeName: "",
          businessName: "",
          audience: String(fd.get("audience") || ""),
          message: String(fd.get("message") || ""),
          agreedTerms: true,
        },
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your application.");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const msg = [
      `Hello ${BRAND.shortName}, I submitted a free Earn with DREAMZ application.`,
      result.applicationCode ? `Application code: ${result.applicationCode}` : "",
      "Please confirm the next step.",
    ].filter(Boolean).join("\n");
    return (
      <div className="border border-ink/15 px-8 py-12 text-center">
        <p className="text-forest text-3xl mb-4">✓</p>
        <h2 className="font-editorial text-3xl">Application received</h2>
        <p className="mt-3 text-sm text-stone">
          No membership payment is required. DREAMZ will review your application.
        </p>
        <a href={waLink(msg)} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-primary mt-7">
          Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 sm:px-10 py-10">
      <p className="overline-label mb-3 text-center">Free Application</p>
      <h2 className="font-editorial text-3xl text-center">Join Earn with DREAMZ</h2>
      <p className="mt-3 text-sm text-stone text-center">
        No subscription. No inventory purchase required. No recruitment commission.
      </p>

      <div className="mt-8">
        <label htmlFor="earn-type" className="input-lux-label">How would you like to earn?</label>
        <select
          id="earn-type"
          className="input-lux"
          value={earningType}
          onChange={(e) => setEarningType(e.target.value as "scout" | "creator")}
        >
          <option value="scout">Scout — refer customers ({scoutRateLabel})</option>
          <option value="creator">Creator — create content and sell ({creatorRateLabel})</option>
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 mt-8">
        <div>
          <label htmlFor="earn-name" className="input-lux-label">Full name</label>
          <input id="earn-name" name="displayName" required minLength={2} className="input-lux" />
        </div>
        <div>
          <label htmlFor="earn-email" className="input-lux-label">Email</label>
          <input id="earn-email" name="email" type="email" required className="input-lux" />
        </div>
        <div>
          <label htmlFor="earn-phone" className="input-lux-label">Phone</label>
          <input id="earn-phone" name="phone" type="tel" required className="input-lux" placeholder="0803 000 0000" />
        </div>
        <div>
          <label htmlFor="earn-social" className="input-lux-label">Social profile (optional)</label>
          <input id="earn-social" name="socialProfile" className="input-lux" placeholder="Instagram, TikTok, website…" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="earn-audience" className="input-lux-label">How do you plan to share or sell DREAMZ?</label>
          <textarea id="earn-audience" name="audience" rows={3} className="input-lux" />
        </div>
        <div>
          <label htmlFor="earn-introducer" className="input-lux-label">Introduced by a DREAMZ member? (optional)</label>
          <input id="earn-introducer" name="introducerCode" className="input-lux" placeholder="Code" />
        </div>
        <div>
          <label htmlFor="earn-message" className="input-lux-label">Anything else</label>
          <input id="earn-message" name="message" className="input-lux" />
        </div>
      </div>

      <label className="mt-6 flex items-start gap-2.5 text-xs text-stone leading-relaxed">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>
          I understand that joining is free; earnings come only from eligible,
          verified product sales; refunds/cancellations can reverse unpaid earnings;
          and no income is guaranteed.
        </span>
      </label>

      {error && <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>}
      <button type="submit" disabled={busy} className="btn-lux btn-lux-primary w-full mt-6">
        {busy ? "Sending…" : "Apply Free"}
      </button>
      <p className="mt-4 text-center text-xs text-stone">Questions? WhatsApp {CONTACT.phoneDisplay}</p>
    </form>
  );
}
