import { Link, createFileRoute } from "@tanstack/react-router";
import { BRAND } from "@/lib/config";
import { waLink } from "@/lib/contact";

export const Route = createFileRoute("/partner-with-dreamz")({
  head: () => ({
    meta: [
      { title: `Work with DREAMZ — Creators, Stockists & Franchise Enquiries — ${BRAND.name}` },
      { name: "description", content: "Create a signature leather collection, refer buyers, become a DREAMZ stockist, propose a branded location or explore corporate collaborations. Every track is explained clearly." },
    ],
  }),
  component: WorkWithDreamz,
});

const OPPORTUNITIES = [
  {
    eyebrow: "CREATOR COLLABORATION",
    title: "Your story. Your leather collection.",
    price: "Free to pitch",
    summary: "For creators, influencers, artists and personalities with a distinctive story or audience.",
    included: [
      "Co-design a signature leather capsule with DREAMZ after concept approval",
      "DREAMZ coordinates feasibility, quotations, production, fulfilment and customer care",
      "Approved co-branded campaign page and trackable creator code",
      "Referral earnings at the published creator rate on eligible attributed sales",
      "Optional collection royalty, negotiated in a signed design-and-image licence",
    ],
    terms: "Suggested royalty starting point: 5% of net merchandise receipts for the approved collection, for an agreed term. A royalty is not automatic and is not automatically stacked with sales commission. Rates, IP, deliverables and marketing rights are agreed in writing before launch.",
    link: "/creators",
    cta: "Explore creator collaborations",
  },
  {
    eyebrow: "RETAIL & RESELLING",
    title: "Become an authorised stockist.",
    price: "Opening stock from ₦250,000",
    summary: "For boutiques, footwear shops, lifestyle stores and established online retailers.",
    included: [
      "Access to an approved wholesale assortment and product information",
      "Illustrative trade pricing up to 15% below approved retail on eligible SKUs, subject to an agreed quotation",
      "Digital sales assets, product care guidance and reorder support",
      "The opening amount buys goods, not access to a commission or membership",
      "Partners manage their own outlet, customers and local operating costs",
    ],
    terms: "Stock is normally prepaid. No automatic consignment, credit, exclusivity, guaranteed margins or guaranteed sales. Reseller arrangements require written approval, SKU-specific wholesale prices and a signed supply agreement.",
    link: "/partnerships",
    cta: "Apply to stock DREAMZ",
  },
  {
    eyebrow: "BRANDED LOCATION · PROPOSAL",
    title: "DREAMZ Display Point.",
    price: "Illustrative setup budget: ₦3,000,000",
    summary: "For an existing quality retail space seeking a branded DREAMZ display and managed reorder programme.",
    included: [
      "Illustrative budget: ₦2m opening inventory + ₦750k fit-out/display + ₦250k branding and training",
      "Proposed approved shop-in-shop presentation and display guidance",
      "Initial staff product orientation and replenishment planning",
      "Brand presentation guidelines and periodic quality reviews",
    ],
    terms: "Figures are planning estimates, not a fee request. The brand licence, deliverables, supplier quotes and retail rights are not granted until due diligence and a signed agreement. No exclusive territory is offered automatically.",
    link: "/partnerships",
    cta: "Enquire about a display point",
  },
  {
    eyebrow: "FRANCHISE EXPRESSION OF INTEREST",
    title: "DREAMZ Boutique.",
    price: "Illustrative launch budget: ₦12,000,000",
    summary: "For experienced, properly capitalised operators who want to propose a dedicated DREAMZ retail boutique.",
    included: [
      "Illustrative budget: ₦7m opening stock + ₦3m fit-out + ₦2m brand setup, training and systems",
      "Proposed licensed brand use, operating standards and approved merchandise",
      "Potential staff onboarding, launch support and merchandising guidelines",
      "A phased, performance-reviewed opening before any wider rollout",
    ],
    terms: "Not an offer to purchase a franchise. No franchise rights, intellectual-property licence, guaranteed return or exclusivity exist until trademark/legal checks, site review, operations documentation and a negotiated written agreement are complete. No franchise payment is collected through this page.",
    link: "/partnerships",
    cta: "Discuss boutique licensing",
  },
];

function WorkWithDreamz() {
  return (
    <div>
      <section className="bg-ink text-ivory px-5 sm:px-8 pt-32 pb-16 text-center">
        <p className="overline-label !text-gold-soft mb-4">WORK WITH DREAMZ</p>
        <h1 className="font-editorial text-4xl sm:text-6xl leading-tight max-w-5xl mx-auto">
          Create it. Share it. Sell it. Build with us.
        </h1>
        <p className="max-w-2xl mx-auto mt-6 text-ivory/80 leading-relaxed">
          DREAMZ brings design development, leather production and fulfilment.
          Partners bring creativity, audiences, customers, retail expertise or locations.
          Choose the partnership that matches what you actually contribute.
        </p>
        <div className="flex gap-3 flex-wrap justify-center mt-8">
          <Link to="/creators" className="btn-lux btn-lux-primary">Co-create a collection</Link>
          <Link to="/partnerships" className="btn-lux btn-lux-outline !text-ivory">Retail & franchise enquiries</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {OPPORTUNITIES.map((offer) => (
            <article key={offer.title} className="border border-ink/15 p-7 sm:p-9 flex flex-col">
              <p className="overline-label">{offer.eyebrow}</p>
              <h2 className="font-editorial text-3xl mt-3">{offer.title}</h2>
              <p className="font-editorial text-xl mt-3 text-oxblood">{offer.price}</p>
              <p className="text-sm text-stone mt-4 leading-relaxed">{offer.summary}</p>
              <h3 className="text-xs uppercase tracking-btn mt-7">What you receive</h3>
              <ul className="mt-4 text-sm space-y-3 flex-1">
                {offer.included.map((item) => <li className="flex gap-2" key={item}><span className="text-oxblood">✓</span><span>{item}</span></li>)}
              </ul>
              <p className="mt-6 pt-5 border-t border-ink/10 text-xs text-stone leading-relaxed">{offer.terms}</p>
              <Link to={offer.link as "/creators"} className="btn-lux btn-lux-primary mt-7 text-center">{offer.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ivory-deep border-y border-ink/10">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-14">
          <p className="overline-label mb-3">PRIVATE & INSTITUTIONAL</p>
          <h2 className="font-editorial text-3xl sm:text-4xl">For private patrons, corporations and cultural partners.</h2>
          <p className="mt-4 text-stone max-w-3xl leading-relaxed">
            Commission a private leather collection, executive gift programme or approved co-branded capsule.
            You receive a dedicated brief, product concept, transparent quotation, milestone-based production
            and a named contact. This is a product or commercial collaboration, not a promise of investment returns.
          </p>
          <div className="flex gap-3 flex-wrap mt-7">
            <Link to="/corporate" className="btn-lux btn-lux-primary">Corporate commissions</Link>
            <Link to="/royale" className="btn-lux btn-lux-outline">Private Royale service</Link>
            <a href={waLink("Hello DREAMZ, I would like to discuss a private collection, sponsorship or strategic leather collaboration.")} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-outline">Request a private proposal</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 sm:px-8 py-16">
        <h2 className="font-editorial text-3xl">One transaction. One agreed commercial model.</h2>
        <p className="mt-4 text-stone leading-relaxed">
          Referral commissions, design royalties, wholesale discounts and franchise arrangements are distinct.
          They do not stack automatically. No paid membership is required to refer or apply.
          All commissions are based on qualifying verified sales, not recruiting members.
          No public pricing implies a guaranteed return. Existing signed partner agreements remain in force on their original terms.
        </p>
        <div className="flex gap-3 flex-wrap mt-7">
          <Link to="/earn" className="btn-lux btn-lux-outline">Just want to refer? Start free</Link>
          <Link to="/studio-plans" className="btn-lux btn-lux-outline">Design Studio access</Link>
        </div>
      </section>
    </div>
  );
}
