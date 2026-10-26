import { createFileRoute, Link } from "@tanstack/react-router";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { getSiteSettings } from "@/server/catalog.functions";
import { CONTACT, COMPANY, REGISTERED_BUSINESS_LINE } from "@/lib/contact";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/contact")({
  loader: async () => {
    const settings = await getSiteSettings();
    return {
      whatsappNumber:
        (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "",
    };
  },
  head: () => ({
    meta: [
      { title: `Contact & Client Care — ${BRAND.name}` },
      {
        name: "description",
        content: `Reach the ${BRAND.name} client team on WhatsApp, by phone or by email — sizing, styling, orders, bespoke commissions and partnerships.`,
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { whatsappNumber } = Route.useLoaderData() as { whatsappNumber: string };

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-32 pb-24">
      <div className="text-center mb-14">
        <p className="overline-label mb-3">Client Care</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">Contact DREAMZ</h1>
        <div className="rule-gold mx-auto mt-6" />
        <p className="text-stone mt-6 leading-relaxed max-w-lg mx-auto">
          Sizing, styling, orders, bespoke timelines, partnerships — our client
          team answers personally on every channel below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-16">
        <a
          href={
            whatsappNumber
              ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(GENERAL_INQUIRY)}`
              : `https://wa.me/${CONTACT.whatsappNumber}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink/15 px-6 py-8 text-center hover:border-ink transition-colors"
        >
          <p className="overline-label mb-2">WhatsApp</p>
          <p className="font-editorial text-xl mb-2">Message DREAMZ</p>
          <p className="text-xs text-stone">Fastest response — usually minutes</p>
        </a>
        <a
          href={CONTACT.phoneHref}
          className="border border-ink/15 px-6 py-8 text-center hover:border-ink transition-colors"
        >
          <p className="overline-label mb-2">Telephone</p>
          <p className="font-editorial text-xl mb-2">Call DREAMZ</p>
          <p className="text-xs text-stone">{CONTACT.phoneDisplay}</p>
        </a>
        <a
          href={`mailto:${CONTACT.email}`}
          className="border border-ink/15 px-6 py-8 text-center hover:border-ink transition-colors break-all"
        >
          <p className="overline-label mb-2">Email</p>
          <p className="font-editorial text-xl mb-2">Email DREAMZ</p>
          <p className="text-xs text-stone">{CONTACT.email}</p>
        </a>
      </div>

      <section className="mb-16">
        <h2 className="font-editorial text-2xl mb-5">How can we help?</h2>
        <ul className="space-y-3 text-stone leading-relaxed">
          <li>
            <strong className="text-ink">Orders and delivery</strong> —{" "}
            <Link to="/track-order" search={{ order: undefined }} className="underline hover:text-ink">
              track your order
            </Link>{" "}
            with your order number and the phone or email you used at checkout.
          </li>
          <li>
            <strong className="text-ink">Bespoke commissions</strong> — begin on the{" "}
            <Link to="/royale" className="underline hover:text-ink">
              Royale page
            </Link>{" "}
            or describe your idea in the{" "}
            <Link to="/custom" className="underline hover:text-ink">
              Design Lab
            </Link>
            .
          </li>
          <li>
            <strong className="text-ink">Retail partnerships</strong> — stockists and
            corporate partners, visit{" "}
            <Link to="/partnerships" className="underline hover:text-ink">
              Retail Partnerships
            </Link>
            .
          </li>
          <li>
            <strong className="text-ink">Feedback</strong> — we read every message at{" "}
            <Link to="/feedback" className="underline hover:text-ink">
              Send Feedback
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mb-16 border border-ink/10 px-6 py-8">
        <h2 className="font-editorial text-2xl mb-4">Policies and information</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/policies" className="btn-lux btn-lux-outline">
            Delivery, Returns &amp; Policies
          </Link>
          <Link to="/about" className="btn-lux btn-lux-outline">
            About the House
          </Link>
        </div>
      </section>

      <section className="text-center">
        <p className="overline-label mb-3">Follow the House</p>
        <p className="text-sm text-stone mb-6">
          Instagram{" "}
          <a
            href="https://www.instagram.com/dreamzfashion_ng/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline"
          >
            @dreamzfashion_ng
          </a>{" "}
          · TikTok{" "}
          <a
            href="https://www.tiktok.com/@official_dreamzfashion"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline"
          >
            @official_dreamzfashion
          </a>
        </p>
        <div className="rule-gold mx-auto mt-10 mb-8" />
        <p className="text-[0.65rem] uppercase tracking-btn text-stone">
          {REGISTERED_BUSINESS_LINE}
        </p>
        <p className="text-[0.65rem] text-stone mt-2">
          {COMPANY.entityType}. Client care hours: Monday–Saturday, 9am–7pm (WAT).
        </p>
      </section>

      <div className="mt-12 text-center">
        <WhatsAppCTAButton
          message={GENERAL_INQUIRY}
          whatsappNumber={whatsappNumber}
          label="Message DREAMZ on WhatsApp"
        />
      </div>
    </div>
  );
}
