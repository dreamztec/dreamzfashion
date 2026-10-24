import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { submitCorporateEnquiry } from "@/server/corporate.functions";
import { RainbowRule } from "@/components/brand";
import { BRAND } from "@/lib/config";


export const Route = createFileRoute("/corporate")({
  head: () => ({
    meta: [
      { title: `Corporate & Bulk Orders — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Employee gifts, conference pieces, association orders and co-branded leather accessories from DREAMZ — with formal quotations and planned delivery.",
      },
    ],
  }),
  component: CorporatePage,
});

const USE_CASES = [
  { title: "Employee & Client Gifts", body: "Branded leather pieces that say thank you properly — boxed, finished and delivered." },
  { title: "Conferences & Events", body: "Welcome gifts and speaker presents, produced to your deadline." },
  { title: "Associations & Organisations", body: "Uniform accessories for members, executives and award ceremonies." },
  { title: "Co-branded Accessories", body: "Your mark alongside our craft — agreed before production starts." },
  { title: "Reseller Orders", body: "Volume purchasing with quantity-based quotations and trade terms." },
];

function CorporatePage() {
  return (
    <div>
      <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-10 text-center">
        <p className="overline-label mb-4">Corporate Orders</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight">
          DREAMZ for your organisation
        </h1>
        <RainbowRule className="mx-auto mt-7" />
        <p className="text-stone mt-7 max-w-2xl mx-auto leading-relaxed">
          We supply leather footwear, bags and accessories for corporate gifting,
          events and resale — with formal quotations, agreed timelines and
          delivery you can plan around. Tell us what you need; a quotation
          follows after a short review.
        </p>
      </div>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u) => (
            <div key={u.title} className="border border-ink/10 px-6 py-7">
              <h2 className="font-editorial text-xl mb-2">{u.title}</h2>
              <p className="text-sm text-stone leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-5 sm:px-8 pb-16">
        <CorporateForm />
      </section>

      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-14 text-center">
          <h2 className="font-editorial text-2xl sm:text-3xl mb-3">How it works</h2>
          <ol className="text-sm text-stone space-y-2 max-w-md mx-auto text-left list-decimal pl-5">
            <li>You send the enquiry below.</li>
            <li>We qualify it and prepare a formal quotation.</li>
            <li>You review and accept the quote (with its validity date and payment milestones).</li>
            <li>Payment per the agreed milestones; production begins.</li>
            <li>Delivery to your locations.</li>
          </ol>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-outline">
              Browse the Retail Collection
            </Link>
            <Link to="/earn" className="btn-lux btn-lux-outline">
              Become a Trade Partner
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CorporateForm() {
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await submitCorporateEnquiry({
        data: {
          companyName: String(fd.get("companyName") || ""),
          contactPerson: String(fd.get("contactPerson") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          productInterests: String(fd.get("productInterests") || ""),
          quantity: String(fd.get("quantity") || ""),
          budgetRange: String(fd.get("budgetRange") || ""),
          deadline: String(fd.get("deadline") || ""),
          deliveryLocation: String(fd.get("deliveryLocation") || ""),
          brandingRequirements: String(fd.get("brandingRequirements") || ""),
          referenceUrl: String(fd.get("referenceUrl") || ""),
          message: String(fd.get("message") || ""),
        },
      });
      setDone(res.enquiryNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the enquiry. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="border border-ink/15 px-8 py-12 text-center" role="status">
        <p className="text-forest text-3xl mb-4" aria-hidden="true">✓</p>
        <h2 className="font-editorial text-2xl mb-3">Enquiry received</h2>
        <p className="text-sm text-stone mb-2">
          Reference <strong>{done}</strong>
        </p>
        <p className="text-sm text-stone">
          Our corporate desk will reach you within two working days. Keep your
          reference for follow-up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 sm:px-10 py-10">
      <h2 className="font-editorial text-2xl mb-8 text-center">Start an Enquiry</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company / Organisation" name="companyName" required />
        <Field label="Contact Person" name="contactPerson" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" required placeholder="0803 000 0000" />
        <div className="sm:col-span-2">
          <Field label="Products of interest" name="productInterests" required placeholder="e.g. 50 belts, 30 wallets, card holders…" />
        </div>
        <Field label="Approximate quantity" name="quantity" required placeholder="e.g. 50 – 100 units" />
        <Field label="Budget range (optional)" name="budgetRange" placeholder="e.g. ₦500k – ₦1m" />
        <Field label="Needed by" name="deadline" placeholder="e.g. mid-December" />
        <Field label="Delivery location(s)" name="deliveryLocation" required placeholder="City, State" />
        <div className="sm:col-span-2">
          <label htmlFor="branding" className="input-lux-label">Branding requirements</label>
          <textarea
            id="branding"
            name="brandingRequirements"
            rows={2}
            className="input-lux"
            placeholder="Logo engraving, co-branded packaging, colour matching…"
          />
        </div>
        <div className="sm:col-span-2">
          <Field label="Reference link (optional)" name="referenceUrl" placeholder="A link to a mood board or sample" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="input-lux-label">Anything else</label>
          <textarea id="message" name="message" rows={3} className="input-lux" />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-5 border border-oxblood/40 bg-oxblood/5 text-oxblood text-sm px-4 py-3">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-lux btn-lux-primary w-full mt-8">
        {busy ? "Sending…" : "Send Enquiry"}
      </button>
      <p className="mt-4 text-xs text-stone text-center">
        No obligation. We reply from our business email — quotations are valid
        for the period stated on them.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="input-lux-label">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="input-lux"
        maxLength={type === "email" ? 140 : 200}
      />
    </div>
  );
}
