import { Link, createFileRoute } from "@tanstack/react-router";
import { CONTACT, COMPANY, REGISTERED_BUSINESS_LINE, waLink } from "@/lib/contact";
import { BRAND } from "@/lib/config";

const POLICY_DATE = "15 November 2026";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: `Returns, Exchanges & Refunds — ${BRAND.name}` },
      {
        name: "description",
        content: "Clear return, exchange, cancellation, and refund rights for DREAMZ Fashion ready-to-wear leather products and bespoke commissions.",
      },
    ],
  }),
  component: ReturnsPolicy,
});

function PolicySection({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return <section id={id} className="scroll-mt-28 border-t border-ink/10 pt-8">
    <h2 className="font-editorial text-2xl sm:text-3xl text-ink">{title}</h2>
    <div className="mt-4 space-y-4 text-sm sm:text-base text-stone leading-relaxed">{children}</div>
  </section>;
}

function ReturnsPolicy() {
  const requestMessage = "Hello DREAMZ Fashion, I need help with a return, exchange or refund. My order code is: ";
  return (
    <main className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-24">
      <div className="mb-10">
        <p className="overline-label">DREAMZ FASHION · CLIENT CARE</p>
        <h1 className="mt-3 font-editorial text-4xl sm:text-6xl">Returns, Exchanges &amp; Refunds</h1>
        <p className="mt-4 text-sm text-stone">Effective {POLICY_DATE} · Applies to new orders. Your rights under applicable Nigerian consumer law are never reduced by this policy.</p>
        <p className="mt-5 text-stone leading-relaxed">
          We make custom and ready-to-wear leather footwear, bags, clothing and accessories.
          We want every piece to fit the agreed specification and arrive in good condition.
          The right solution depends on whether it was a standard stock item or produced specially for you.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-10">
        <div className="border border-ink/15 bg-white p-5">
          <p className="overline-label">Ready-to-wear</p>
          <p className="font-editorial text-2xl mt-2">7-day change-of-mind window</p>
          <p className="text-xs text-stone mt-2">Unused standard stock items, subject to the conditions below.</p>
        </div>
        <div className="border border-ink/15 bg-white p-5">
          <p className="overline-label">Bespoke &amp; custom</p>
          <p className="font-editorial text-2xl mt-2">Made for your brief</p>
          <p className="text-xs text-stone mt-2">Different cancellation terms once production begins, without removing defect rights.</p>
        </div>
        <div className="border border-ink/15 bg-white p-5">
          <p className="overline-label">Faulty or incorrect</p>
          <p className="font-editorial text-2xl mt-2">Legal protections apply</p>
          <p className="text-xs text-stone mt-2">Including qualifying defects discovered after the first 48 hours.</p>
        </div>
      </div>

      <div className="space-y-10">
        <PolicySection id="ready-to-wear" title="1. Ready-to-wear orders">
          <p>
            For an Essentials, Originals or other standard stock item that is not personalised or made to your measurements,
            you may request a change-of-mind return or size exchange within <strong className="text-ink">7 calendar days of receiving it</strong>.
            We accept these requests when the item is unused, unaltered and in resaleable condition, with its original packaging,
            labels and included accessories. Carefully trying on footwear indoors to check size is acceptable;
            outdoor wear, damage or alteration is not.
          </p>
          <p>
            A change-of-mind exchange depends on size and stock availability. If we cannot offer a suitable alternative,
            we can refund the eligible item price after inspection. For a voluntary change-of-mind return,
            the customer normally covers the return shipping cost. Any original delivery charge already incurred
            is refundable only where required by law or where we agree otherwise in writing.
          </p>
          <p>
            The 7-day period above is our voluntary standard-stock change-of-mind window;
            it <strong className="text-ink">does not shorten statutory rights</strong> for defective, unsafe,
            incorrectly supplied or materially misdescribed goods.
          </p>
        </PolicySection>

        <PolicySection id="faults" title="2. Faults, incorrect items and workmanship">
          <p>
            If we delivered the wrong product, the wrong approved size or specification, or an item that is defective
            or materially different from its agreed description, notify us with the order code and photographs or a short video.
            Contacting us within 48 hours is helpful for courier-damage evidence, but <strong className="text-ink">48 hours is not a legal deadline for fault claims</strong>.
          </p>
          <p>
            Under the Federal Competition and Consumer Protection Act, qualifying goods that fail applicable quality
            standards may be returned within three months after delivery, with appropriate repair, replacement or refund
            remedies. Other rights available under law or any written warranty also remain in place.
            We will assess the issue fairly and provide a lawful remedy, including covering reasonable return
            transport for confirmed faulty or incorrectly supplied goods.
          </p>
          <p>
            Natural differences in authentic leather grain and small variations in tone may occur, as disclosed before purchase.
            However, these do not excuse a substantial mismatch with the approved design, defective construction,
            incorrect materials or unfit workmanship.
          </p>
        </PolicySection>

        <PolicySection id="bespoke" title="3. Bespoke, made-to-order and personalised products">
          <p>
            Royale commissions, individually sized or adapted footwear, customer-approved leather colour combinations,
            initials, paintings and other personalised pieces are produced from an agreed brief.
            We confirm the measurements, materials, construction, price, deposit and realistic delivery date
            <strong className="text-ink"> in writing before production begins</strong>.
          </p>
          <p>
            Once production starts, a made-for-you item generally cannot be returned solely because you changed
            your mind about an approved design. This does not affect your rights where we supply an incorrect,
            unsafe, faulty or materially misdescribed item. If we made an error against the approved specification,
            contact us so we can arrange an appropriate correction, remake, replacement or refund as required.
          </p>
          <p>
            If you supplied an incorrect measurement but we faithfully followed the agreed brief,
            we will discuss an alteration or remake quote before doing additional work.
            If our own measurement or construction is wrong, we will not treat that as a paid preference change.
          </p>
          <p>
            Using the free Dream Studio, copying a design prompt or uploading a generated concept image
            <strong className="text-ink"> does not itself place a production order or create a payment obligation</strong>.
            A production order starts only after the separate quote and your approval are confirmed.
          </p>
        </PolicySection>

        <PolicySection id="cancellations" title="4. Order cancellations and deposits">
          <p>
            A standard stock order cancelled before dispatch is eligible for a refund of the amount paid,
            subject to any lawful deductions already clearly disclosed and accepted.
            For a custom order cancelled before we begin work, we will review any individually agreed
            design service already supplied and actual, documented costs reasonably incurred.
          </p>
          <p>
            If a custom order is cancelled after sourcing or making has started, we will provide an itemised
            account of non-recoverable costs and return any refundable balance. We do not apply a blanket rule
            that <strong className="text-ink">every deposit is automatically forfeited</strong>.
            Neither deposits nor personalised status remove remedies for a DREAMZ failure to deliver
            the agreed goods or meet statutory quality standards.
          </p>
          <p>
            If production or delivery is materially delayed, we will notify you and discuss a realistic revised
            date or the remedy available under the order agreement and applicable law.
          </p>
        </PolicySection>

        <PolicySection id="process" title="5. How to request an exchange or refund">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Message us on WhatsApp or email using the contact details below.</li>
            <li>Include your order number, name and contact used at checkout, delivery date, what happened, and photos or video if relevant.</li>
            <li>We will acknowledge the request within <strong className="text-ink">2 working days</strong>, then share the assessment and safe return instructions if needed.</li>
            <li>Please use the confirmed return instructions so an expensive or fragile leather piece can be tracked and protected in transit. Contacting us for instructions does not waive legal return rights.</li>
            <li>We aim to conclude the initial assessment within <strong className="text-ink">5 working days</strong> after we receive the needed information or inspect the returned item; complicated repairs may require an agreed timeline.</li>
          </ol>
        </PolicySection>

        <PolicySection id="refund-method" title="6. Refund timing and payment method">
          <p>
            For an approved refund we aim to <strong className="text-ink">initiate payment within 7 working days</strong>
            of confirming the amount and remedy. Actual arrival depends on the bank or payment processor.
            Electronic refunds normally return through the original payment channel where supported;
            if that is unavailable, we will agree a verified, lawful alternative with you.
          </p>
          <p>
            We do not impose a restocking fee or deduct a payment-processing charge from a refund that
            you are legally entitled to receive. A permitted return-delivery cost for a voluntary
            change-of-mind request will be explained in advance. Refunds cannot be sent to unverified third parties.
          </p>
        </PolicySection>

        <PolicySection id="contact" title="7. Contact DREAMZ Fashion">
          <p>
            The merchant responsible for fashion orders is <strong className="text-ink">{COMPANY.legalName}</strong>,
            RC {COMPANY.rcNumber}, registered in Nigeria.
            Contact us by phone at <a className="underline" href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>,
            email <a className="underline break-all" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>,
            or WhatsApp. Support is available Monday–Saturday, 9 AM–7 PM WAT.
            The return shipment destination is confirmed privately for each approved case.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href={waLink(requestMessage)} className="btn-lux btn-lux-gold" target="_blank" rel="noopener noreferrer">Request Return on WhatsApp</a>
            <a href={`mailto:${CONTACT.email}?subject=DREAMZ%20return%20or%20refund%20request`} className="btn-lux btn-lux-outline">Email Client Care</a>
            <Link to="/policies" className="btn-lux btn-lux-outline">All Client Care Policies</Link>
          </div>
          <p className="text-xs">{REGISTERED_BUSINESS_LINE}</p>
        </PolicySection>
      </div>
    </main>
  );
}
