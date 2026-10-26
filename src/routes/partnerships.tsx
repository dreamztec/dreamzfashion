import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { submitPartnershipEnquiry } from "@/server/enquiry.functions";
import { getSiteSettings } from "@/server/catalog.functions";
import { WhatsAppCTAButton, CallCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/partnerships")({
  loader: async () => {
    const settings = await getSiteSettings();
    return {
      whatsappNumber:
        (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "",
    };
  },
  head: () => ({
    meta: [
      { title: `Sell DREAMZ — Retail Partnership Programme — ${BRAND.name}` },
      {
        name: "description",
        content:
          "SELL DREAMZ: bulk sales (20% discount), credit sales (10% discount) and commission sales (15% commission) partnerships for boutiques, footwear retailers, supermarkets and lifestyle stores.",
      },
    ],
  }),
  component: PartnershipsPage,
});

const TARGET_PARTNERS = [
  "Boutiques",
  "Fashion stores",
  "Footwear retailers",
  "Supermarkets",
  "Salons",
  "Gift shops",
  "Lifestyle stores",
  "Pharmacies where appropriate",
  "Corporate retailers",
];

const PARTNERSHIP_MODELS = [
  {
    id: "bulk" as const,
    letter: "A",
    name: "Bulk Sales Partner",
    benefit: "20% discount",
    summary:
      "Your outlet purchases DREAMZ products in bulk at a 20% discount and resells through your store.",
    terms: [
      "Payment before delivery, unless otherwise approved.",
      "Products are resold through the partner's outlet.",
      "Products follow approved DREAMZ retail pricing rules.",
      "A DREAMZ display shelf may be supplied.",
      "The partner maintains stock records.",
    ],
  },
  {
    id: "credit" as const,
    letter: "B",
    name: "Credit Sales Partner",
    benefit: "10% discount",
    summary:
      "An approved retailer receives products and display inventory under a credit arrangement at a 10% discount.",
    terms: [
      "An approved credit period applies.",
      "Payment is due according to the agreed schedule.",
      "Stock may be withdrawn for non-payment or breach.",
      "The partner maintains proper stock records.",
    ],
  },
  {
    id: "commission" as const,
    letter: "C",
    name: "Commission Sales Partner",
    benefit: "15% commission on verified sales",
    summary:
      "DREAMZ supplies approved products and display stock; the partner sells and earns a commission on verified sales.",
    terms: [
      "Unsold goods remain DREAMZ / DFK property.",
      "DREAMZ retains ownership until the product is sold.",
      "Sales are reconciled monthly.",
      "Commission is paid on verified sales.",
      "The partner remains accountable for consignment inventory.",
    ],
  },
];

const GENERAL_TERMS = [
  "Display shelves supplied by DREAMZ remain company property.",
  "Shelves are for approved DREAMZ merchandise only.",
  "Shelves are returned when the partnership ends.",
  "Partners record stock, shortages and damage.",
  "DREAMZ may inspect company-owned consignment stock.",
  "Either party may terminate with 7 days' written notice.",
  "DREAMZ may terminate immediately for serious breach.",
];

const BUSINESS_TYPES = [
  "Fashion Boutique",
  "Footwear Store",
  "Supermarket",
  "Gift Shop",
  "Salon",
  "Lifestyle Store",
  "Pharmacy",
  "Corporate Retailer",
  "Online Retailer",
  "Other",
];

const PRODUCT_INTERESTS = [
  "Footwear",
  "Bags",
  "Accessories",
  "Complete Sets",
  "Mixed Selection",
];

function PartnershipsPage() {
  const { whatsappNumber } = Route.useLoaderData() as { whatsappNumber: string };
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submitPartnershipEnquiry({
        data: {
          businessName: String(fd.get("businessName") ?? ""),
          contactPerson: String(fd.get("contactPerson") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          city: String(fd.get("city") ?? ""),
          stateCountry: String(fd.get("stateCountry") ?? ""),
          businessType: String(fd.get("businessType") ?? ""),
          presence: String(fd.get("presence") ?? "store") as "store" | "online" | "both",
          productInterest: String(fd.get("productInterest") ?? ""),
          orderVolume: String(fd.get("orderVolume") ?? ""),
          partnershipCategory: String(fd.get("partnershipCategory") ?? "undecided") as
            | "bulk"
            | "credit"
            | "commission"
            | "undecided",
          message: String(fd.get("message") ?? ""),
        },
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your enquiry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[56svh] min-h-[400px] -mt-16 flex items-end overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 rainbow-rule"
          style={{ filter: "blur(90px)" }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 pb-14 text-ivory">
          <p className="overline-label !text-gold-soft mb-3">Retail Partnership Programme</p>
          <h1 className="font-editorial text-5xl sm:text-7xl leading-tight">SELL DREAMZ</h1>
          <p className="mt-4 max-w-xl text-ivory/85 leading-relaxed">
            Sell DREAMZ digitally, physically, or both. Physical partners can
            choose bulk, approved credit or commission/consignment stock after
            selecting a DREAMZ Partner Business Plan.
          </p>
        </div>
      </section>

      {/* The three partnership models */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
        <div className="text-center mb-12">
          <p className="overline-label mb-3">The Models</p>
          <h2 className="font-editorial text-3xl sm:text-4xl">Three ways to partner</h2>
          <div className="rule-gold mx-auto mt-6" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {PARTNERSHIP_MODELS.map((m) => (
            <article key={m.id} id={`model-${m.id}`} className="border border-ink/15 bg-ivory p-7 flex flex-col">
              <p className="overline-label mb-2">Category {m.letter}</p>
              <h3 className="font-editorial text-2xl">{m.name}</h3>
              <p className="mt-3 font-editorial text-xl text-gold-soft">{m.benefit}</p>
              <p className="text-sm text-stone mt-3 leading-relaxed">{m.summary}</p>
              <p className="mt-5 text-[0.68rem] uppercase tracking-btn text-stone">Terms</p>
              <ul className="mt-2 space-y-2 text-sm flex-1">
                {m.terms.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden="true" className="text-gold">·</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <a href="#apply" className="btn-lux btn-lux-outline mt-6 text-center">
                Apply — Category {m.letter}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-ink/10 bg-ivory-deep">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-12 text-center">
          <p className="overline-label mb-3">One Partner Account</p>
          <h2 className="font-editorial text-3xl">Choose Digital, Physical or Both</h2>
          <p className="text-sm text-stone mt-4 max-w-2xl mx-auto leading-relaxed">
            Start free as a Scout, or choose an optional 365-day Partner Business Plan
            from ₦25,000 to ₦1,000,000 for additional sales tools, content, display
            support and service. Paid plans do not restrict which available DREAMZ
            products you can sell and do not guarantee income.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/earn" hash="apply" className="btn-lux btn-lux-primary">
              Choose Your Partner Plan
            </Link>
            <Link to="/earn" className="btn-lux btn-lux-outline">
              See How Partner Earnings Work
            </Link>
          </div>
        </div>
      </section>

      {/* General retail terms */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-16">
          <p className="overline-label mb-3 text-center">General Retail Terms</p>
          <h2 className="font-editorial text-3xl text-center mb-10">Applying to every retail partnership</h2>
          <ul className="max-w-2xl mx-auto space-y-3 text-sm">
            {GENERAL_TERMS.map((t) => (
              <li key={t} className="flex gap-3 border-b border-ink/10 pb-3">
                <span aria-hidden="true" className="text-gold">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <p className="overline-label mb-3 text-center">Who we partner with</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone">
              {TARGET_PARTNERS.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20 items-start">
          <div>
            <p className="overline-label mb-3">Retail Enquiry</p>
            <h2 className="font-editorial text-3xl sm:text-4xl leading-tight">
              Already have a retail space?
            </h2>
            <div className="rule-gold mt-6 mb-6" />
            <p className="text-stone leading-relaxed">
              Use this form for a preliminary retail-space enquiry. Final seller
              onboarding, annual-plan selection and your Digital / Physical / Both
              choice happen through the unified Partner Network. Credit and
              consignment remain subject to DREAMZ approval, KYC and location review.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <WhatsAppCTAButton
                message={`Hello ${BRAND.shortName}, I'd like to become a DREAMZ retail partner.`}
                whatsappNumber={whatsappNumber}
                label="Ask about SELL DREAMZ"
              />
              <CallCTAButton label={`Call ${CONTACT.phoneDisplay}`} />
            </div>
            <p className="mt-6 text-xs text-stone leading-relaxed">
              Students, individuals, creators and store owners all use the same{" "}
              <Link to="/earn" className="underline hover:text-ink">DREAMZ Partner Network</Link>.
              The free Scout level requires no paid plan.
            </p>
          </div>

          <div>
            {submitted ? (
              <div className="border border-gold/40 bg-gold/5 px-8 py-12 text-center">
                <p className="overline-label mb-3">Application received</p>
                <h2 className="font-editorial text-3xl mb-4">Thank you.</h2>
                <p className="text-stone leading-relaxed max-w-md mx-auto mb-6">
                  Our partnerships team reviews every application personally and
                  will reach out on the details you provided.
                </p>
                <WhatsAppCTAButton
                  message={`Hello ${BRAND.shortName}, I have just submitted a SELL DREAMZ partnership application and would like to continue the conversation.`}
                  whatsappNumber={whatsappNumber}
                  label="Continue on WhatsApp"
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="border border-ink/15 p-6 sm:p-8 grid gap-4 sm:grid-cols-2 bg-white/40">
                <h2 className="sm:col-span-2 font-editorial text-2xl">Partnership application</h2>
                <div className="sm:col-span-2">
                  <label className="input-lux-label" htmlFor="pb-category">Partnership Model *</label>
                  <select id="pb-category" name="partnershipCategory" required defaultValue="undecided" className="input-lux">
                    <option value="undecided">Not sure yet — advise me</option>
                    <option value="bulk">Category A — Bulk Sales Partner (20% discount)</option>
                    <option value="credit">Category B — Credit Sales Partner (10% discount)</option>
                    <option value="commission">Category C — Commission Sales Partner (15% commission)</option>
                  </select>
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-name">Business Name *</label>
                  <input id="pb-name" name="businessName" required className="input-lux" maxLength={140} />
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-person">Contact Person *</label>
                  <input id="pb-person" name="contactPerson" required className="input-lux" maxLength={120} />
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-phone">Phone *</label>
                  <input id="pb-phone" name="phone" type="tel" required className="input-lux" maxLength={24} />
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-email">Email *</label>
                  <input id="pb-email" name="email" type="email" required className="input-lux" maxLength={140} />
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-city">City *</label>
                  <input id="pb-city" name="city" required className="input-lux" maxLength={80} />
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-state">State/Country *</label>
                  <input id="pb-state" name="stateCountry" required className="input-lux" maxLength={80} />
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-type">Business Type *</label>
                  <select id="pb-type" name="businessType" required className="input-lux">
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-presence">Existing Store / Online / Both *</label>
                  <select id="pb-presence" name="presence" required className="input-lux">
                    <option value="store">Existing Store</option>
                    <option value="online">Online</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-interest">Product Interest *</label>
                  <select id="pb-interest" name="productInterest" required className="input-lux">
                    {PRODUCT_INTERESTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-lux-label" htmlFor="pb-volume">Estimated Order Volume *</label>
                  <input id="pb-volume" name="orderVolume" required className="input-lux" maxLength={80} placeholder="e.g. 10–20 pieces per month" />
                </div>
                <div className="sm:col-span-2">
                  <label className="input-lux-label" htmlFor="pb-msg">Message</label>
                  <textarea id="pb-msg" name="message" rows={4} className="input-lux" maxLength={1200} />
                </div>
                {error && (
                  <p role="alert" className="sm:col-span-2 text-sm text-oxblood">{error}</p>
                )}
                <div className="sm:col-span-2">
                  <button type="submit" disabled={saving} className="btn-lux btn-lux-primary w-full sm:w-auto">
                    {saving ? "Sending…" : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
            <p className="mt-6 text-xs text-stone leading-relaxed">
              Prefer to talk? Our client team answers on{" "}
              <WhatsAppCTAButton message={`Hello ${BRAND.shortName}, I have a partnerships question.`} whatsappNumber={whatsappNumber} label="WhatsApp" className="!py-1 !px-2 !inline-flex" />
              {" — or call "}
              <a href={CONTACT.phoneHref} className="underline hover:text-ink">
                {CONTACT.phoneDisplay}
              </a>
              {" or email "}
              <a href={`mailto:${CONTACT.email}`} className="underline hover:text-ink break-all">
                {CONTACT.email}
              </a>
              . We do not publish stockist locations until partnerships are confirmed.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 sm:px-8 pb-24 text-center">
        <p className="overline-label mb-4">Also exploring</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/creators" className="btn-lux btn-lux-outline">Creator Programme</Link>
          <Link to="/royale" className="btn-lux btn-lux-outline">Royale Commissions</Link>
        </div>
      </section>
    </div>
  );
}
