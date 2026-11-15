import { createFileRoute, Link } from "@tanstack/react-router";
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
            ["Returns, Exchanges & Refunds", "returns"],
            ["Ordering & Confirmation", "payment"],
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
          We arrange delivery across Nigeria, subject to the agreed address and
          courier availability. Orders are confirmed only after the product,
          price, payment and delivery details are agreed. Ready-to-wear dispatch
          and custom production follow the timelines confirmed for your order.
        </p>
        <p>
          Delivery timing and any delivery charge are confirmed with you before
          your order enters production or dispatch. Where a product package
          includes delivery, that will be stated clearly in the product or order
          details.
        </p>
        <p>
          You will be contacted on the phone number supplied at checkout if our
          courier needs directions. Delivery times may extend during national
          holidays or where addresses are outside major courier routes; our
          client team keeps you informed in every case.
        </p>
      </Section>

      <Section id="returns" title="Returns, Exchanges & Refunds">
        <p>
          We accept eligible change-of-mind return or exchange requests for
          unworn, standard ready-to-wear products within <strong>7 calendar days</strong>
          of delivery. For bespoke or personalised items, cancellation terms
          depend on whether the approved production has started and any
          documented costs already incurred.
        </p>
        <p>
          If you receive a faulty, unsafe, wrong or materially misdescribed
          item, your statutory consumer rights apply regardless of the
          change-of-mind window. In particular, qualifying quality failures
          may be claimed within three months after delivery under Nigerian
          consumer law. Please tell us promptly if you see damage, but
          <strong> 48 hours is not a deadline for reporting a defect</strong>.
        </p>
        <p>
          Our dedicated policy explains size changes, order cancellations,
          bespoke deposits, return shipping, how to submit a claim and
          the timing and method for approved refunds.
        </p>
        <p>
          <Link to="/returns" className="font-semibold text-ink underline underline-offset-4">
            Read the full Returns, Exchanges &amp; Refunds Policy →
          </Link>
        </p>
      </Section>

      <Section id="payment" title="Ordering & Confirmation">
        <p>
          All displayed product prices are in Nigerian Naira (₦). To place an
          order, add the pieces you want and contact the DREAMZ client team on
          WhatsApp from your cart. We confirm the item, size or measurements,
          availability, delivery details and final order total with you.
        </p>
        <p>
          Production or dispatch begins only after your order details and
          payment have been confirmed by DREAMZ. For your security, never send
          your card PIN, OTP, banking password or full card details in
          WhatsApp, email or any site form.
        </p>
        <p>
          If anything about your order is unclear, message the client team
          before making payment and keep your order details for reference.
          <Link to="/returns" className="ml-1 underline text-ink">
            Please review the returns and refund terms before paying.
          </Link>
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
          history. DREAMZ does not ask you to submit card PINs, OTPs or banking
          passwords through this website or WhatsApp.
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
