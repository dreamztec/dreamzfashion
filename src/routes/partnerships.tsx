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
      { title: `Retail & Sales Point Partnerships — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Bring DREAMZ to your store, boutique, showroom or customer community. Become an authorised DREAMZ stockist.",
      },
    ],
  }),
  component: PartnershipsPage,
});

const BUSINESS_TYPES = [
  "Fashion Boutique",
  "Footwear Store",
  "Luxury Retailer",
  "Concept Store",
  "Lifestyle Store",
  "Corporate Partner",
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
      {/* Hero with the supplied retail shelf image — partnership editorial media */}
      <section className="relative h-[56svh] min-h-[400px] -mt-16 flex items-end overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 rainbow-rule"
          style={{ filter: "blur(90px)" }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 pb-14 text-ivory">
          <p className="overline-label !text-gold-soft mb-3">Retail & Sales Point Partnerships</p>
          <h1 className="font-editorial text-5xl sm:text-7xl leading-tight">
            Bring DREAMZ to your store
          </h1>
          <p className="mt-4 max-w-xl text-ivory/85 leading-relaxed">
            Boutiques, footwear stores, luxury retailers, concept stores and
            corporate partners — carry the pieces your customers remember.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <p className="overline-label mb-3">The Partnership</p>
            <h2 className="font-editorial text-3xl sm:text-4xl leading-tight">
              A house your customers ask for
            </h2>
            <div className="rule-gold mt-6 mb-6" />
            <p className="text-stone leading-relaxed">
              DREAMZ partners with a limited number of authorised sales points.
              Stock the collection, present it with the brand's own display
              language, and offer your customers made-to-order access to the
              wider atelier.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              {[
                "Authorised stockist pricing and allocation",
                "Brand display guidance and premium packaging",
                "Made-to-order access for your clients",
                "Direct line to the DREAMZ client team",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="text-gold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <WhatsAppCTAButton
                message={`Hello ${BRAND.shortName}, I'd like to become a DREAMZ stockist.`}
                whatsappNumber={whatsappNumber}
                label="Become a DREAMZ Stockist"
              />
              <WhatsAppCTAButton
                message={`Hello ${BRAND.shortName}, I'd like to discuss a partnership.`}
                whatsappNumber={whatsappNumber}
                label="Partner with DREAMZ"
              />
              <CallCTAButton label={`Call ${CONTACT.phoneDisplay}`} />
            </div>
          </div>

          <div>
            {submitted ? (
              <div className="border border-gold/40 bg-gold/5 px-8 py-12 text-center">
                <p className="overline-label mb-3">Enquiry received</p>
                <h2 className="font-editorial text-3xl mb-4">Thank you.</h2>
                <p className="text-stone leading-relaxed max-w-md mx-auto mb-6">
                  Our partnerships team reviews every enquiry personally and
                  will reach out on the details you provided.
                </p>
                <WhatsAppCTAButton
                  message={`Hello ${BRAND.shortName}, I have just submitted a partnership enquiry and would like to continue the conversation.`}
                  whatsappNumber={whatsappNumber}
                  label="Continue on WhatsApp"
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="border border-ink/15 p-6 sm:p-8 grid gap-4 sm:grid-cols-2 bg-white/40">
                <h2 className="sm:col-span-2 font-editorial text-2xl">Partnership enquiry</h2>
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
                  <label className="input-lux-label" htmlFor="pb-interest">Expected Product Interest *</label>
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
                    {saving ? "Sending…" : "Submit Enquiry"}
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
          <Link to="/bespoke" className="btn-lux btn-lux-outline">Bespoke Commissions</Link>
          <Link to="/custom" className="btn-lux btn-lux-outline">Design Your Dream</Link>
        </div>
      </section>
    </div>
  );
}
