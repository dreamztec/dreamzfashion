import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { submitPartnershipEnquiry } from "@/server/enquiry.functions";
import { getSiteSettings } from "@/server/catalog.functions";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";

const TRACKS = [
  {
    id: "stockist",
    title: "Authorised Stockist",
    investment: "From ₦250,000 opening stock",
    summary: "For boutiques and stores buying approved DREAMZ products for resale.",
    features: ["Prepaid wholesale merchandise, not a joining fee", "Proposed trade discount up to 15% only on margin-approved SKUs", "Approved catalogues, product education and reordering support", "You operate your own store and set your own operating budget"],
    disclaimer: "SKU-specific wholesale prices and minimum order quantities are confirmed before payment. No automatic credit, consignment, territory or guaranteed retail profit.",
  },
  {
    id: "display",
    title: "DREAMZ Display Point",
    investment: "₦3m indicative startup budget",
    summary: "A proposed branded DREAMZ display inside an existing approved store.",
    features: ["Illustrative allocation: ₦2m opening inventory", "₦750k provisional display/fit-out budget", "₦250k provisional branded onboarding and training", "Brand presentation standards, initial support and reorder planning"],
    disclaimer: "A budget guide only. No fee is due through this page. Final costs, trademark use and operating rights require review and a signed contract.",
  },
  {
    id: "boutique",
    title: "DREAMZ Boutique Franchise",
    investment: "₦12m indicative startup budget",
    summary: "A proposed dedicated boutique for experienced retail operators.",
    features: ["Illustrative allocation: ₦7m opening inventory", "₦3m provisional shop design and fit-out", "₦2m provisional licensed brand setup, operating manuals and training", "Potential phased launch and performance reviews"],
    disclaimer: "Expression of interest only, not a franchise sale. DREAMZ must first complete legal/IP due diligence, operating manuals, location assessment and a negotiated agreement. No exclusivity, earnings or licensed rights are automatic.",
  },
];

export const Route = createFileRoute("/partnerships")({
  loader: async () => {
    const settings = await getSiteSettings();
    return { whatsappNumber: (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "" };
  },
  head: () => ({
    meta: [
      { title: `Sell DREAMZ — Stockists, Display Points & Boutique Enquiries — ${BRAND.name}` },
      { name: "description", content: "Explore DREAMZ approved stockist inventory, proposed shop-in-shop display points and prospective boutique franchise licensing with clear indicative budgets and terms." },
    ],
  }),
  component: RetailPage,
});

const BUSINESS_TYPES = ["Fashion Boutique", "Footwear Store", "Department Store", "Gift Shop", "Salon", "Lifestyle Store", "Online Retailer", "Corporate Retailer", "Other"];
const PRODUCTS = ["Footwear", "Bags", "Leather Wear", "Accessories", "Complete Sets", "Mixed Selection"];

function RetailPage() {
  const { whatsappNumber } = Route.useLoaderData();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("stockist");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submitPartnershipEnquiry({ data: {
        businessName: String(fd.get("businessName") || ""),
        contactPerson: String(fd.get("contactPerson") || ""),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || ""),
        city: String(fd.get("city") || ""),
        stateCountry: String(fd.get("stateCountry") || ""),
        businessType: String(fd.get("businessType") || ""),
        presence: String(fd.get("presence") || "store") as "store" | "online" | "both",
        productInterest: String(fd.get("productInterest") || ""),
        orderVolume: String(fd.get("orderVolume") || ""),
        partnershipCategory: model === "stockist" ? "bulk" : "undecided",
        message: `Requested model: ${model}. ${String(fd.get("message") || "")}`,
      } });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again or contact DREAMZ.");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <section className="bg-ink text-ivory px-5 sm:px-8 pt-32 pb-16 text-center">
        <p className="overline-label !text-gold-soft mb-4">SELL DREAMZ</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">The right partnership for your space.</h1>
        <p className="mt-5 mx-auto max-w-2xl text-ivory/80 leading-relaxed">
          Start by reselling approved leather pieces. Grow into a branded display.
          Qualified operators can explore a dedicated boutique under a separately negotiated licence.
          No membership purchase is required to apply.
        </p>
      </section>
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {TRACKS.map((t) => (
            <article key={t.id} className="border border-ink/15 p-7 flex flex-col">
              <p className="overline-label">RETAIL OPPORTUNITY</p>
              <h2 className="font-editorial text-3xl mt-2">{t.title}</h2>
              <p className="font-editorial text-xl text-oxblood mt-3">{t.investment}</p>
              <p className="text-sm text-stone mt-4">{t.summary}</p>
              <ul className="text-sm mt-5 space-y-3 flex-1">
                {t.features.map((item) => <li key={item} className="flex gap-2"><span className="text-oxblood">✓</span>{item}</li>)}
              </ul>
              <p className="border-t border-ink/10 pt-4 mt-6 text-xs text-stone leading-relaxed">{t.disclaimer}</p>
              <a href="#apply" onClick={() => setModel(t.id)} className="btn-lux btn-lux-outline text-center mt-6">Apply / enquire</a>
            </article>
          ))}
        </div>
        <p className="text-xs text-stone mt-8 leading-relaxed">
          Important: The stated budgets are indicative planning examples, not invoices, guaranteed returns or an offer of intellectual-property rights.
          Prices depend on space, location, inventory, fit-out, tax and production economics.
          Approved retail stock is sold with a written invoice and supply terms.
        </p>
      </section>
      <section id="apply" className="border-y border-ink/10 bg-ivory-deep">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-16 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="overline-label mb-3">LET'S TALK BUSINESS</p>
            <h2 className="font-editorial text-4xl">Tell us about your store and your vision.</h2>
            <p className="text-stone leading-relaxed mt-5">
              We evaluate customer reach, location, operating experience, product suitability and stock funding.
              All applicants receive an individual review; sending this form does not reserve territory or create a franchise.
            </p>
            <div className="mt-7">
              <WhatsAppCTAButton message="Hello DREAMZ, I'd like to discuss a retail or licensed boutique partnership." whatsappNumber={whatsappNumber} label="Discuss on WhatsApp" />
            </div>
            <p className="text-sm text-stone mt-6">For commission-only referrals or influencer co-designs, use <Link to="/creators" className="underline">Creator Collaborations</Link> or <Link to="/earn" className="underline">Refer & Earn</Link>.</p>
          </div>
          {submitted ? (
            <div role="status" className="border border-ink/15 bg-ivory p-8 self-start">
              <h3 className="font-editorial text-3xl">Application received.</h3>
              <p className="mt-4 text-sm text-stone leading-relaxed">Thank you. DREAMZ will review your details and contact you. No payment or licence has been authorised by submitting this form.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="border border-ink/15 bg-ivory p-6 sm:p-8 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="input-lux-label" htmlFor="pr-model">I want to explore *</label>
                <select id="pr-model" className="input-lux" value={model} onChange={(e)=>setModel(e.target.value)} required>
                  <option value="stockist">Authorised Stockist</option>
                  <option value="display">DREAMZ Display Point</option>
                  <option value="boutique">DREAMZ Boutique Licence / Franchise</option>
                </select>
              </div>
              <div><label className="input-lux-label" htmlFor="pr-business">Business Name *</label><input id="pr-business" className="input-lux" name="businessName" required maxLength={140}/></div>
              <div><label className="input-lux-label" htmlFor="pr-contact">Contact Person *</label><input id="pr-contact" className="input-lux" name="contactPerson" required maxLength={120}/></div>
              <div><label className="input-lux-label" htmlFor="pr-email">Email *</label><input id="pr-email" className="input-lux" name="email" required type="email" maxLength={140}/></div>
              <div><label className="input-lux-label" htmlFor="pr-phone">Phone *</label><input id="pr-phone" className="input-lux" name="phone" required type="tel" maxLength={24}/></div>
              <div><label className="input-lux-label" htmlFor="pr-city">City *</label><input id="pr-city" className="input-lux" name="city" required maxLength={80}/></div>
              <div><label className="input-lux-label" htmlFor="pr-country">State / Country *</label><input id="pr-country" className="input-lux" name="stateCountry" required maxLength={80}/></div>
              <div><label className="input-lux-label" htmlFor="pr-type">Business Type *</label><select id="pr-type" className="input-lux" name="businessType">{BUSINESS_TYPES.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
              <div><label className="input-lux-label" htmlFor="pr-presence">Current Presence *</label><select id="pr-presence" className="input-lux" name="presence"><option value="store">Physical Store</option><option value="online">Online</option><option value="both">Both</option></select></div>
              <div><label className="input-lux-label" htmlFor="pr-product">Product Interest *</label><select id="pr-product" name="productInterest" className="input-lux">{PRODUCTS.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
              <div><label className="input-lux-label" htmlFor="pr-volume">Planned Opening Order / Budget *</label><input id="pr-volume" name="orderVolume" className="input-lux" required maxLength={80} placeholder="e.g. ₦500,000 stock or ₦3m location"/></div>
              <div className="sm:col-span-2"><label className="input-lux-label" htmlFor="pr-message">Location, customers and questions</label><textarea id="pr-message" name="message" className="input-lux" rows={4} maxLength={1100}/></div>
              {error && <p role="alert" className="sm:col-span-2 text-sm text-oxblood">{error}</p>}
              <button disabled={saving} type="submit" className="btn-lux btn-lux-primary sm:col-span-2">{saving ? "Submitting…" : "Submit for review"}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
