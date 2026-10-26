import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { applyAsPartner } from "@/server/partner.functions";
import { RainbowRule } from "@/components/brand";
import { BRAND } from "@/lib/config";
import { CONTACT, waLink } from "@/lib/contact";
import {
  PARTNER_PLANS,
  getPartnerPlan,
  partnerPlanPriceLabel,
  type PartnerPlanId,
  type PhysicalModel,
  type SellingMode,
} from "@/lib/partner-plans";

export const Route = createFileRoute("/earn")({
  head: () => ({
    meta: [
      { title: `Sell DREAMZ — Partner Network — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Sell DREAMZ digitally or from a physical space. Start free as a Scout or choose an optional annual partner business plan for more tools and support.",
      },
    ],
  }),
  component: EarnPage,
});

const PHYSICAL_MODELS: Array<{
  id: PhysicalModel;
  title: string;
  benefit: string;
  copy: string;
}> = [
  {
    id: "bulk",
    title: "A — Bulk Sales",
    benefit: "20% trade discount",
    copy: "Buy approved stock before delivery and resell through your outlet.",
  },
  {
    id: "credit",
    title: "B — Credit Sales",
    benefit: "10% trade discount",
    copy: "Available only after DREAMZ approves your KYC, location and credit terms.",
  },
  {
    id: "commission",
    title: "C — Commission / Consignment",
    benefit: "15% on verified consignment sales",
    copy: "DREAMZ retains ownership of unsold consignment stock until it is sold.",
  },
];

function EarnPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-12 text-center">
        <p className="overline-label mb-4">SELL YOUR DREAMZ</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">
          Sell DREAMZ from your phone, your network or your space.
        </h1>
        <RainbowRule className="mx-auto mt-7" />
        <p className="text-stone mt-7 leading-relaxed max-w-2xl mx-auto">
          Start free as a Scout. Paid plans are optional 365-day business-support
          memberships that add tools, content, display support and service — they
          do not guarantee income and they never restrict which available DREAMZ
          products you may sell.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-14">
        <div className="grid gap-5 md:grid-cols-3">
          <article className="border border-ink/15 p-7">
            <p className="overline-label mb-2">Digital</p>
            <h2 className="font-editorial text-2xl">Sell without inventory</h2>
            <p className="mt-3 text-sm text-stone leading-relaxed">
              Share your code, link and approved product content through WhatsApp,
              Instagram, TikTok, campus communities, personal contacts or any
              suitable digital channel. DREAMZ handles the actual order and fulfilment.
            </p>
          </article>
          <article className="border border-ink/15 p-7">
            <p className="overline-label mb-2">Physical</p>
            <h2 className="font-editorial text-2xl">Sell from a real space</h2>
            <p className="mt-3 text-sm text-stone leading-relaxed">
              Boutiques, salons, offices, campus outlets and suitable retail
              spaces can apply for bulk, approved credit or consignment stock.
            </p>
          </article>
          <article className="border border-ink/15 p-7">
            <p className="overline-label mb-2">Both</p>
            <h2 className="font-editorial text-2xl">Combine both channels</h2>
            <p className="mt-3 text-sm text-stone leading-relaxed">
              Use your physical space while your unique link and code keep
              tracking qualifying digital sales from your audience.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
          <div className="text-center mb-10">
            <p className="overline-label mb-3">Annual Partner Plans</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Start free. Upgrade when the tools become useful.</h2>
            <p className="text-sm text-stone mt-5 max-w-2xl mx-auto leading-relaxed">
              Paid plans last 365 days from activation. Your membership starts
              only after DREAMZ confirms payment and approval. If a paid plan
              expires, your account and sales history remain; you can continue
              at Scout level until you renew.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_PLANS.map((plan) => (
              <article key={plan.id} className="border border-ink/15 bg-ivory px-5 py-6 flex flex-col">
                <p className="overline-label mb-2">{plan.name}</p>
                <p className="font-editorial text-2xl">{partnerPlanPriceLabel(plan)}</p>
                <p className="text-xs text-stone mt-3 leading-relaxed">{plan.summary}</p>
                <ul className="mt-5 space-y-2 text-xs flex-1">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-2">
                      <span className="text-gold" aria-hidden="true">·</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <a href="#apply" className="btn-lux btn-lux-outline mt-6 text-center">
                  {plan.feeKobo === 0 ? "Start Free" : `Choose ${plan.name}`}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 py-16">
        <div className="text-center mb-10">
          <p className="overline-label mb-3">For Physical Sellers</p>
          <h2 className="font-editorial text-3xl">Choose how stock works</h2>
          <p className="text-sm text-stone mt-4 max-w-2xl mx-auto">
            The annual plan and the stock model are separate. A higher annual
            plan does not automatically grant credit or consignment stock.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PHYSICAL_MODELS.map((m) => (
            <article key={m.id} className="border border-ink/15 p-6">
              <h3 className="font-editorial text-xl">{m.title}</h3>
              <p className="mt-2 text-gold-soft">{m.benefit}</p>
              <p className="mt-3 text-sm text-stone leading-relaxed">{m.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ink text-ivory">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-14 grid gap-8 md:grid-cols-2">
          <div>
            <p className="overline-label !text-gold-soft mb-3">How earnings work</p>
            <h2 className="font-editorial text-3xl">Real sales first.</h2>
            <ul className="mt-5 space-y-2 text-sm text-ivory/80">
              <li>• Share your link/code or sell through your approved space.</li>
              <li>• DREAMZ records the attribution on the order.</li>
              <li>• Commission is created only after verified full payment.</li>
              <li>• It clears after delivery and the configured return window.</li>
              <li>• Refunds and cancellations reverse unpaid commission.</li>
            </ul>
          </div>
          <div>
            <p className="overline-label !text-gold-soft mb-3">DREAMZ Payday</p>
            <h2 className="font-editorial text-3xl">Wednesday.</h2>
            <p className="mt-4 text-sm text-ivory/80 leading-relaxed">
              Eligible payout requests are processed in the weekly Wednesday
              payout cycle. Your dashboard separates pending, eligible and paid
              earnings. A configured minimum payout threshold must be reached
              before transfer.
            </p>
            <p className="mt-4 text-xs text-ivory/60 leading-relaxed">
              Results are not guaranteed. Sales depend on your marketing,
              audience, follow-up and successfully completed customer orders.
            </p>
          </div>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-4xl px-5 sm:px-8 py-16">
        <ApplyForm />
      </section>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-14 text-center">
          <h2 className="font-editorial text-2xl sm:text-3xl mb-3">Already approved?</h2>
          <p className="text-sm text-stone mb-8">
            Sign in to see your link, attributed orders, pending earnings,
            eligible earnings, storefront and payout history.
          </p>
          <Link to="/account/partner" className="btn-lux btn-lux-primary">
            Partner Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

function ApplyForm() {
  const [sellingMode, setSellingMode] = useState<SellingMode>("digital");
  const [planId, setPlanId] = useState<PartnerPlanId>("scout");
  const [physicalModel, setPhysicalModel] = useState<PhysicalModel>("undecided");
  const [result, setResult] = useState<Awaited<ReturnType<typeof applyAsPartner>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const plan = useMemo(() => getPartnerPlan(planId), [planId]);

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
      const res = await applyAsPartner({
        data: {
          sellingMode,
          partnerPlan: planId,
          physicalModel: sellingMode === "digital" ? "undecided" : physicalModel,
          introducerCode: String(fd.get("introducerCode") || ""),
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
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the application.");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const paymentMessage = [
      `Hello ${BRAND.shortName}, I submitted a Partner Network application.`,
      result.applicationCode ? `Application code: ${result.applicationCode}` : "",
      `Plan: ${result.planName}`,
      result.feeKobo > 0 ? `Annual plan value: ₦${(result.feeKobo / 100).toLocaleString("en-NG")}` : "",
      "Please confirm the next step" + (result.paymentRequested ? " and payment details." : "."),
    ].filter(Boolean).join("\n");

    return (
      <div className="border border-ink/15 px-8 py-12 text-center" role="status">
        <p className="text-forest text-3xl mb-4" aria-hidden="true">✓</p>
        <h2 className="font-editorial text-2xl mb-3">Application received</h2>
        <p className="text-sm text-stone max-w-lg mx-auto leading-relaxed">
          {result.paymentRequested
            ? "Your paid plan is not active yet. Continue on WhatsApp to receive the current payment instructions. The 365-day term starts only after DREAMZ confirms payment and approves the account."
            : "Your Scout application is now under review. No membership payment is required."}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
          <a href={waLink(paymentMessage)} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-primary">
            {result.paymentRequested ? "Request Payment Details on WhatsApp" : "Continue on WhatsApp"}
          </a>
          <Link to="/account/partner" className="btn-lux btn-lux-outline">
            Partner Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 sm:px-10 py-10">
      <p className="overline-label mb-3 text-center">Partner Application</p>
      <h2 className="font-editorial text-3xl mb-8 text-center">How do you want to sell DREAMZ?</h2>

      <div className="grid sm:grid-cols-3 gap-3 mb-7">
        {(["digital", "physical", "both"] as SellingMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSellingMode(mode)}
            aria-pressed={sellingMode === mode}
            className={`border px-4 py-4 text-sm capitalize transition-colors ${
              sellingMode === mode ? "border-ink bg-ink/[0.03]" : "border-ink/20 hover:border-ink/50"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="mb-7">
        <label className="input-lux-label" htmlFor="partner-plan">Annual plan</label>
        <select id="partner-plan" className="input-lux" value={planId} onChange={(e) => setPlanId(e.target.value as PartnerPlanId)}>
          {PARTNER_PLANS.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {partnerPlanPriceLabel(p)}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-stone">{plan.summary}</p>
      </div>

      {sellingMode !== "digital" && (
        <div className="mb-7">
          <label className="input-lux-label" htmlFor="physical-model">Preferred physical stock model</label>
          <select id="physical-model" className="input-lux" value={physicalModel} onChange={(e) => setPhysicalModel(e.target.value as PhysicalModel)}>
            <option value="undecided">Not sure yet — advise me</option>
            <option value="bulk">A — Bulk Sales (20% discount)</option>
            <option value="credit">B — Credit Sales (10% discount, approval required)</option>
            <option value="commission">C — Commission / Consignment (15%)</option>
          </select>
        </div>
      )}

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
        <div>
          <label htmlFor="p-social" className="input-lux-label">Social profile (optional)</label>
          <input id="p-social" name="socialProfile" className="input-lux" placeholder="Instagram, TikTok, website…" />
        </div>
        {sellingMode !== "digital" && (
          <div className="sm:col-span-2">
            <label htmlFor="p-business" className="input-lux-label">Business / space name</label>
            <input id="p-business" name="businessName" className="input-lux" placeholder="Boutique, salon, office, campus outlet…" />
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="p-audience" className="input-lux-label">Tell us how you plan to sell</label>
          <textarea id="p-audience" name="audience" rows={3} className="input-lux" />
        </div>
        <div>
          <label htmlFor="p-introducer" className="input-lux-label">Introduced by a DREAMZ partner? (optional)</label>
          <input id="p-introducer" name="introducerCode" className="input-lux" placeholder="Partner code" />
        </div>
        <div>
          <label htmlFor="p-message" className="input-lux-label">Anything else</label>
          <input id="p-message" name="message" className="input-lux" />
        </div>
      </div>

      <div className="mt-7 border border-ink/10 bg-ivory-deep px-5 py-4 text-xs text-stone leading-relaxed">
        <strong className="text-ink">Important:</strong> this is a product-sales
        programme, not an investment or recruitment scheme. Membership does not
        guarantee income. Partner-introduction rewards, where offered, are
        single-level only and do not create a downline.
      </div>

      <label className="mt-6 flex items-start gap-2.5 text-xs text-stone leading-relaxed">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>
          I accept that earnings come from eligible, verified product sales;
          refunds/cancellations can reverse unpaid earnings; paid-plan activation
          requires DREAMZ payment confirmation; and results are not guaranteed.
        </span>
      </label>

      {error && <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>}
      <button type="submit" disabled={busy} className="btn-lux btn-lux-primary w-full mt-6">
        {busy ? "Sending…" : plan.feeKobo > 0 ? `Apply for ${plan.name}` : "Apply as Free Scout"}
      </button>
      <p className="mt-4 text-center text-xs text-stone">
        Questions? WhatsApp {CONTACT.phoneDisplay}
      </p>
    </form>
  );
}
