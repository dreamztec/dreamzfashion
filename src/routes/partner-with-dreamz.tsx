import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { applyAsPartner } from "@/server/partner.functions";
import { PARTNER_PLANS, getPartnerPlan, partnerPlanPriceLabel, type PartnerPlanId, type SellingMode } from "@/lib/partner-plans";
import { BRAND } from "@/lib/config";
import { CONTACT, waLink } from "@/lib/contact";

const PAID_PLANS = PARTNER_PLANS.filter((p) => p.feeKobo > 0);

export const Route = createFileRoute("/partner-with-dreamz")({
  head: () => ({
    meta: [
      { title: `Partner with DREAMZ — Business Support Membership — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Optional annual DREAMZ business-support memberships for sellers who want additional sales tools, training, marketing support and strategy help.",
      },
    ],
  }),
  component: PartnerWithDreamzPage,
});

function PartnerWithDreamzPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-12 text-center">
        <p className="overline-label mb-4">PARTNER WITH DREAMZ</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">
          Business support for people serious about selling DREAMZ.
        </h1>
        <p className="text-stone mt-7 leading-relaxed max-w-2xl mx-auto">
          These memberships are optional. You do not need a paid plan to earn
          commission or to apply as a retail seller. A plan pays for added
          tools, training, marketing support and access — not the right to earn.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {PAID_PLANS.map((plan) => (
            <article key={plan.id} className="border border-ink/15 p-7 flex flex-col">
              <p className="overline-label mb-2">{plan.name}</p>
              <p className="font-editorial text-3xl">{partnerPlanPriceLabel(plan)}</p>
              <p className="mt-3 text-sm text-stone leading-relaxed">{plan.summary}</p>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2">
                    <span className="text-gold">·</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <a href="#apply" className="btn-lux btn-lux-outline mt-6 text-center">
                Apply for {plan.name}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-14">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-ink/10 bg-ivory p-7">
              <p className="overline-label mb-2">Included</p>
              <h2 className="font-editorial text-2xl">What membership is for</h2>
              <ul className="mt-4 space-y-2 text-sm text-stone">
                <li>• Sales tools and approved campaign resources.</li>
                <li>• Training and business-support sessions.</li>
                <li>• Marketing and co-branded support according to plan.</li>
                <li>• Priority support and selected activation opportunities.</li>
              </ul>
            </div>
            <div className="border border-ink/10 bg-ivory p-7">
              <p className="overline-label mb-2">Not included</p>
              <h2 className="font-editorial text-2xl">What membership does not buy</h2>
              <ul className="mt-4 space-y-2 text-sm text-stone">
                <li>• No guaranteed income or sales.</li>
                <li>• No automatic credit or consignment stock.</li>
                <li>• No exclusive territory unless separately contracted.</li>
                <li>• No recruitment/downline commission.</li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-xs text-stone text-center max-w-2xl mx-auto leading-relaxed">
            Need a major distribution, sponsorship or co-branded arrangement?
            Those are strategic partnerships and are handled by custom proposal,
            not by a public subscription tier.
          </p>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl px-5 sm:px-8 py-16">
        <MembershipApplication />
      </section>

      <section className="border-t border-ink/10">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-14 grid gap-5 md:grid-cols-2">
          <div className="border border-ink/10 p-7">
            <p className="overline-label mb-2">Just want to earn?</p>
            <h2 className="font-editorial text-2xl">Earn with DREAMZ is free</h2>
            <p className="mt-3 text-sm text-stone">
              Apply for a code/link without buying a membership.
            </p>
            <Link to="/earn" className="btn-lux btn-lux-outline mt-6">Earn with DREAMZ</Link>
          </div>
          <div className="border border-ink/10 p-7">
            <p className="overline-label mb-2">Want stock for a store?</p>
            <h2 className="font-editorial text-2xl">Sell DREAMZ</h2>
            <p className="mt-3 text-sm text-stone">
              Retail stock models are a separate commercial relationship.
            </p>
            <Link to="/partnerships" className="btn-lux btn-lux-outline mt-6">See Retail Models</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function MembershipApplication() {
  const [planId, setPlanId] = useState<PartnerPlanId>("starter");
  const [sellingMode, setSellingMode] = useState<SellingMode>("digital");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof applyAsPartner>> | null>(null);
  const plan = useMemo(() => getPartnerPlan(planId), [planId]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please confirm you understand the membership terms.");
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
          physicalModel: "undecided",
          introducerCode: String(fd.get("introducerCode") || ""),
          displayName: String(fd.get("displayName") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          socialProfile: String(fd.get("socialProfile") || ""),
          storeName: "",
          businessName: String(fd.get("businessName") || ""),
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
      `Hello ${BRAND.shortName}, I submitted a Partner with DREAMZ membership application.`,
      result.applicationCode ? `Application code: ${result.applicationCode}` : "",
      `Plan: ${result.planName}`,
      `Annual value: ₦${(result.feeKobo / 100).toLocaleString("en-NG")}`,
      "Please confirm approval and the current payment instructions.",
    ].filter(Boolean).join("\n");
    return (
      <div className="border border-ink/15 px-8 py-12 text-center">
        <p className="text-forest text-3xl mb-4">✓</p>
        <h2 className="font-editorial text-3xl">Membership application received</h2>
        <p className="mt-3 text-sm text-stone">
          Do not make payment until DREAMZ confirms the application and current payment instructions.
        </p>
        <a href={waLink(msg)} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-primary mt-7">
          Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 sm:px-10 py-10">
      <p className="overline-label mb-3 text-center">Optional Annual Membership</p>
      <h2 className="font-editorial text-3xl text-center">Apply to Partner with DREAMZ</h2>

      <div className="grid gap-5 sm:grid-cols-2 mt-8">
        <div className="sm:col-span-2">
          <label className="input-lux-label" htmlFor="membership-plan">Plan</label>
          <select id="membership-plan" className="input-lux" value={planId} onChange={(e) => setPlanId(e.target.value as PartnerPlanId)}>
            {PAID_PLANS.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {partnerPlanPriceLabel(p)}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-stone">{plan.summary}</p>
        </div>

        <div className="sm:col-span-2">
          <label className="input-lux-label" htmlFor="membership-mode">How do you currently plan to sell?</label>
          <select id="membership-mode" className="input-lux" value={sellingMode} onChange={(e) => setSellingMode(e.target.value as SellingMode)}>
            <option value="digital">Digital / referral sales</option>
            <option value="physical">Physical retail</option>
            <option value="both">Both digital and physical</option>
          </select>
        </div>

        <div>
          <label htmlFor="member-name" className="input-lux-label">Full name</label>
          <input id="member-name" name="displayName" required minLength={2} className="input-lux" />
        </div>
        <div>
          <label htmlFor="member-email" className="input-lux-label">Email</label>
          <input id="member-email" name="email" type="email" required className="input-lux" />
        </div>
        <div>
          <label htmlFor="member-phone" className="input-lux-label">Phone</label>
          <input id="member-phone" name="phone" type="tel" required className="input-lux" placeholder="0803 000 0000" />
        </div>
        <div>
          <label htmlFor="member-business" className="input-lux-label">Business / brand name (optional)</label>
          <input id="member-business" name="businessName" className="input-lux" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="member-social" className="input-lux-label">Social profile / website (optional)</label>
          <input id="member-social" name="socialProfile" className="input-lux" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="member-audience" className="input-lux-label">What do you want the membership to help you achieve?</label>
          <textarea id="member-audience" name="audience" rows={3} className="input-lux" />
        </div>
        <div>
          <label htmlFor="member-introducer" className="input-lux-label">Introducer code (optional)</label>
          <input id="member-introducer" name="introducerCode" className="input-lux" />
        </div>
        <div>
          <label htmlFor="member-message" className="input-lux-label">Anything else</label>
          <input id="member-message" name="message" className="input-lux" />
        </div>
      </div>

      <label className="mt-6 flex items-start gap-2.5 text-xs text-stone leading-relaxed">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>
          I understand this fee pays for business-support benefits only. It does
          not guarantee income, buy commission rights, automatically grant stock
          or credit, or create any recruitment/downline entitlement.
        </span>
      </label>

      {error && <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>}
      <button type="submit" disabled={busy} className="btn-lux btn-lux-primary w-full mt-6">
        {busy ? "Sending…" : `Apply for ${plan.name}`}
      </button>
      <p className="mt-4 text-center text-xs text-stone">Questions? WhatsApp {CONTACT.phoneDisplay}</p>
    </form>
  );
}
