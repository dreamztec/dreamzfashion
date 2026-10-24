import { createFileRoute } from "@tanstack/react-router";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { getSiteSettings } from "@/server/catalog.functions";
import { BRAND } from "@/lib/config";
import { CONTACT, COMPANY, REGISTERED_BUSINESS_LINE } from "@/lib/contact";

export const Route = createFileRoute("/policies")({
  loader: async () => {
    const settings = await getSiteSettings();
    return {
      whatsappNumber:
        (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "",
    };
  },
  head: () => ({
    meta: [
      { title: `Client Care Policies — ${BRAND.name}` },
      {
        name: "description",
        content: `Delivery, returns, payment, product care, privacy and terms for ${BRAND.name}.`,
      },
    ],
  }),
  component: Policies,
});

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 mb-14">
      <h2 className="font-editorial text-2xl sm:text-3xl mb-5">{title}</h2>
      <div className="space-y-4 text-stone leading-relaxed">{children}</div>
    </section>
  );
}

function Policies() {
  const { whatsappNumber } = Route.useLoaderData() as { whatsappNumber: string };

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-32 pb-24">
      <div className="text-center mb-14">
        <p className="overline-label mb-3">Client Care</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">Policies &amp; Information</h1>
        <div className="rule-gold mx-auto mt-6" />
      </div>

      <nav aria-label="Policy sections" className="mb-14 border border-ink/10 px-6 py-6">
        <p className="overline-label mb-3">On this page</p>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm">
          {[
            ["Delivery & Shipping", "delivery"],
            ["Returns & Exchanges", "returns"],
            ["Payment Information", "payment"],
            ["Product Care", "care"],
            ["Made-to-Order & Bespoke", "bespoke"],
            ["Privacy Policy", "privacy"],
            ["Terms & Conditions", "terms"],
            ["Contact", "contact"],
          ].map(([label, id]) => (
            <li key={id}>
              <a href={`#${id}`} className="underline hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="delivery" title="Delivery & Shipping">
        <p>
          Every order is delivered to your doorstep anywhere in Nigeria. Orders
          placed on the site are confirmed once payment is verified, and
          production or dispatch begins immediately afterwards.
        </p>
        <p>
          Complete Package orders include fast-track production and delivery
          within 7 days. Delivery is complimentary above the threshold shown at
          checkout; the current threshold and any delivery fee are always
          displayed in your order summary before you pay — the figures you see
          at checkout are the figures you pay.
        </p>
        <p>
          You will be contacted on the phone number supplied at checkout if our
          courier needs directions. Delivery times may extend during national
          holidays or where addresses are outside major courier routes; our
          client team keeps you informed in every case.
        </p>
      </Section>

      <Section id="returns" title="Returns & Exchanges">
        <p>
          Each piece is inspected before dispatch. If a ready-to-wear piece
          arrives unworn-in-box with a manufacturing fault, we will exchange it
          or make it right — contact us within 48 hours of delivery with your
          order number and photographs.
        </p>
        <p>
          Made-to-order, bespoke and personalized pieces are crafted to your
          specification and are not returnable unless faulty. Where a fault is
          ours, we repair or remake the piece.
        </p>
        <p>
          To begin a return or exchange, message the client team on WhatsApp
          with your order number — details are confirmed before anything is
          sent back. Refunds, where approved, are processed to the original
          payment method.
        </p>
      </Section>

      <Section id="payment" title="Payment Information">
        <p>
          All prices are in Nigerian Naira (₦). Checkout is processed securely
          by Paystack — card, bank transfer and USSD are supported. Your card
          details go directly to Paystack and never touch our servers.
        </p>
        <p>
          An order is confirmed only after payment verification. If your
          payment is declined or abandoned, the order is saved as unpaid and
          can be retried from your confirmation page — you are never charged
          for an incomplete payment.
        </p>
        <p>
          Questions about a charge? Have your order number ready and message
          the client team on WhatsApp.
        </p>
      </Section>

      <Section id="care" title="Product Care">
        <p>
          DREAMZ leather is finished to be worn. Keep pieces dry, wipe with a
          soft cloth after wear, condition sparingly with a quality leather
          conditioner, and store in the supplied dust bag away from direct
          sunlight.
        </p>
        <p>
          Every Complete Package includes a care guide and shoe care kit with
          product-specific instructions. When in doubt, ask the client team
          before applying any product to the leather.
        </p>
      </Section>

      <Section id="bespoke" title="Made-to-Order & Bespoke">
        <p>
          Bespoke and made-to-order pieces are crafted to your measurements and
          specification after a consultation. Timelines are agreed with you at
          consultation and confirmed in writing before production begins.
        </p>
        <p>
          Bespoke commissions require an agreed deposit to enter production,
          with the balance due before dispatch. Design approvals are confirmed
          with you at each stage.
        </p>
      </Section>

      <Section id="privacy" title="Privacy Policy">
        <p>
          We collect only the information needed to fulfil your order or answer
          your enquiry: your name, contact details, delivery address and order
          history. Payment credentials are handled entirely by Paystack and are
          never stored by us.
        </p>
        <p>
          We do not sell your personal information. Order details are visible
          to you only when matched with the order number and the phone number
          or email used at checkout.
        </p>
        <p>
          To request access to, or deletion of, your data, contact the client
          team at <a href={`mailto:${CONTACT.email}`} className="underline">{CONTACT.email}</a>.
        </p>
      </Section>

      <Section id="terms" title="Terms & Conditions">
        <p>
          By placing an order on this site you make an offer to purchase the
          selected pieces at the prices displayed at checkout. The order is
          accepted when payment is verified and the order enters production or
          dispatch.
        </p>
        <p>
          Product photography is representative; leather is a natural material
          and pieces may vary slightly in grain and tone — this is
          characteristic of genuine handcrafted leather, not a defect.
        </p>
        <p>
          {COMPANY.legalName} (RC {COMPANY.rcNumber}) operates this site and is
          incorporated in {COMPANY.country}. These terms are governed by the
          laws of the Federal Republic of Nigeria.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          For any policy question, message the client team on WhatsApp, call{" "}
          <a href={CONTACT.phoneHref} className="underline">{CONTACT.phoneDisplay}</a>, or
          email <a href={`mailto:${CONTACT.email}`} className="underline break-all">{CONTACT.email}</a>.
          We answer Monday to Saturday, 9am–7pm (WAT).
        </p>
        <p className="text-xs text-stone">{REGISTERED_BUSINESS_LINE}</p>
      </Section>

      <div className="text-center">
        <WhatsAppCTAButton
          message={GENERAL_INQUIRY}
          whatsappNumber={whatsappNumber}
          label="Message DREAMZ on WhatsApp"
        />
      </div>
    </div>
  );
}
