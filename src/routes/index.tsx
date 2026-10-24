import { Link, createFileRoute } from "@tanstack/react-router";
import { getCatalog, getSiteSettings } from "@/server/catalog.functions";
import { ProductGrid } from "@/components/ProductCard";
import { RainbowRule, Wordmark } from "@/components/brand";
import { Reveal } from "@/components/Reveal";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { PRODUCT_TIERS, TIER_DESCRIPTIONS, TIER_LABELS, TIER_TAGLINES } from "@/lib/format";
import { WaitlistSignup } from "@/components/WaitlistSignup";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [settings, featured, all] = await Promise.all([
      getSiteSettings(),
      getCatalog({ data: { featured: true, limit: 8 } }),
      getCatalog({ data: { limit: 200 } }),
    ]);
    const tierCounts = {
      essentials: all.filter((p) => p.tier === "essentials").length,
      signature: all.filter((p) => p.tier === "signature").length,
      bespoke: all.filter((p) => p.tier === "bespoke").length,
    };
    return { settings, featured, tierCounts };
  },
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Your dream. Your style. Made to wear.` },
      { name: "description", content: BRAND.description },
    ],
  }),
  component: Home,
});

function Home() {
  const { settings, featured, tierCounts } = Route.useLoaderData() as {
    settings: Record<string, unknown>;
    featured: Awaited<ReturnType<typeof getCatalog>>;
    tierCounts: Record<string, number>;
  };
  const whatsappNumber =
    (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "";

  const tiers = PRODUCT_TIERS.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    tagline: TIER_TAGLINES[tier],
    description: TIER_DESCRIPTIONS[tier],
    count: tierCounts[tier] ?? 0,
  }));

  return (
    <div>
      {/* ── Brand presentation — text wordmark ─────────────── */}
      <section className="bg-ivory pt-28 sm:pt-32 pb-6 sm:pb-10">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <Wordmark size="xl" tagline />
          <RainbowRule className="mx-auto mt-7 fade-up fade-up-1" />
        </div>
      </section>

      {/* ── Typographic hero — the offer in plain words ────── */}
      <section className="bg-ivory">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-10 pb-16 sm:pt-14 sm:pb-24 text-center">
          <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl leading-[1.05] fade-up">
            {(settings.heroTitle as string) || "Your dream. Your style. Made to wear."}
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-stone leading-relaxed sm:text-lg fade-up fade-up-1">
            {(settings.heroBody as string) ||
              "Handcrafted leather footwear, bags and accessories — designed in Nigeria, made to be remembered. Shop the collection or commission a piece that is entirely yours."}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4 fade-up fade-up-2">
            <Link
              to="/shop"
              search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }}
              className="btn-lux btn-lux-primary"
            >
              Shop DREAMZ
            </Link>
            <Link to="/custom" className="btn-lux btn-lux-outline">
              Design Yours
            </Link>
          </div>
          <p className="mt-8 text-xs text-stone tracking-wide fade-up fade-up-3">
            Delivery across Nigeria · Paystack secured payments · Deposits available on made-to-order pieces
          </p>
        </div>
      </section>

      {/* ── What we sell — before any partnership talk ─────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24">
          <Reveal>
            <div className="text-center mb-12">
              <p className="overline-label mb-3">What We Make</p>
              <h2 className="font-editorial text-3xl sm:text-4xl">Leather, crafted to carry your story</h2>
              <p className="text-stone mt-4 max-w-xl mx-auto">
                Shoes and loafers. Slides, sandals and mules. Bags, belts,
                wallets and purses — every piece finished by hand.
              </p>
              <RainbowRule className="mx-auto mt-6" />
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              { label: "Footwear", to: "/shop/footwear", note: "Loafers, brogues, slides, sandals & boots" },
              { label: "Bags", to: "/shop/bags", note: "Totes, satchels & executive handbags" },
              { label: "Accessories", to: "/shop/accessories", note: "Belts, wallets, purses & gift sets" },
            ].map(({ label, to, note }, i) => (
              <Reveal key={to} delay={(i + 1) as 1 | 2 | 3}>
                <Link
                  to={to as "/shop"}
                  search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }}
                  className="block border border-ink/10 bg-ivory px-7 py-9 text-center transition-colors hover:border-ink/40 h-full"
                  aria-label={`Shop ${label}`}
                >
                  <h3 className="font-editorial text-2xl mb-2">{label}</h3>
                  <p className="text-sm text-stone leading-relaxed">{note}</p>
                  <span className="nav-link inline-block mt-5 text-[0.68rem] uppercase tracking-btn">Explore</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured ───────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-20 lg:pt-28">
          <Reveal>
            <div className="text-center mb-12">
              <p className="overline-label mb-3">Featured</p>
              <h2 className="font-editorial text-3xl sm:text-4xl">Featured DREAMZ</h2>
              <p className="text-stone mt-4 max-w-xl mx-auto">
                Selected pieces from the house. Each available Product Only or as
                a Complete Package.
              </p>
              <RainbowRule className="mx-auto mt-6" />
            </div>
          </Reveal>
          <Reveal delay={1}>
            <ProductGrid products={featured} />
          </Reveal>
        </section>
      )}

      {/* ── Three clear tiers ──────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-20 lg:pt-28">
        <Reveal>
          <div className="text-center mb-12">
            <p className="overline-label mb-3">Three Ways to Buy</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Choose your tier</h2>
            <p className="text-stone mt-4 max-w-xl mx-auto">
              Same craft, three levels of involvement — from ready-to-ship
              essentials to fully commissioned work.
            </p>
            <RainbowRule className="mx-auto mt-6" />
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map(({ tier, label, tagline, description, count }, i) => (
            <Reveal key={tier} delay={(i + 1) as 1 | 2 | 3}>
              <Link
                to={tier === "bespoke" ? "/custom" : "/shop"}
                search={tier === "bespoke" ? undefined : { q: undefined, tier, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined }}
                className="block border border-ink/10 px-7 py-10 text-center transition-colors hover:border-ink/40 h-full"
                aria-label={`Explore ${label}`}
              >
                <p className="tier-badge justify-center mb-3">{label}</p>
                <h3 className="font-editorial text-2xl mb-3">{tagline}</h3>
                <p className="text-sm text-stone leading-relaxed mb-5">{description}</p>
                <span className="nav-link text-[0.68rem] uppercase tracking-btn">
                  {tier === "bespoke" ? "Start a Brief" : `Shop ${count > 0 ? `(${count})` : ""}`}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Anniversary early access (free waitlist) ───────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-16 lg:py-24 text-center">
          <Reveal>
            <p className="overline-label mb-4">12 June 2027</p>
            <h2 className="font-editorial text-3xl sm:text-5xl leading-tight">
              The Fifth Anniversary Collection
            </h2>
            <div className="rule-gold mx-auto mt-6 mb-6" />
            <p className="text-stone leading-relaxed max-w-xl mx-auto">
              Five years of DREAMZ. One commemorative collection. Join the free
              early-access list — waitlist members see each piece first. No
              payment, no obligation.
            </p>
            <div className="mt-8 max-w-md mx-auto text-left">
              <WaitlistSignup />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Earn with DREAMZ (partnerships, after the product) ── */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24">
        <Reveal>
          <div className="text-center mb-12">
            <p className="overline-label mb-3">Earn with DREAMZ</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Three ways to work with the house</h2>
            <RainbowRule className="mx-auto mt-6" />
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-3 max-w-5xl mx-auto">
          {[
            { title: "Referral Partner", body: "Recommend DREAMZ to friends and followers. Free to apply, no purchase required." },
            { title: "Creator Partner", body: "Curate a storefront from approved pieces and co-design a named collection." },
            { title: "Trade Partner", body: "Buy in volume for your store or organisation, with quantity-based quotations." },
          ].map(({ title, body }, i) => (
            <Reveal key={title} delay={(i + 1) as 1 | 2 | 3}>
              <div className="border border-ink/10 px-7 py-9 h-full">
                <h3 className="font-editorial text-xl mb-3">{title}</h3>
                <p className="text-sm text-stone leading-relaxed mb-5">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={2}>
          <div className="text-center mt-10">
            <Link to="/earn" className="btn-lux btn-lux-primary">
              Apply on the Partner Hub
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Corporate orders ───────────────────────────────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-16 lg:py-24 text-center">
          <Reveal>
            <p className="overline-label mb-4">Corporate Orders</p>
            <h2 className="font-editorial text-3xl sm:text-4xl leading-tight">
              Gifts, events and co-branded accessories
            </h2>
            <p className="text-stone leading-relaxed max-w-xl mx-auto mt-6">
              Employee and client gifts, conference pieces, association orders
              and reseller volumes — with formal quotations and delivery you can
              plan around.
            </p>
            <div className="mt-8">
              <Link to="/corporate" className="btn-lux btn-lux-primary">
                Start a Corporate Enquiry
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The House ──────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 sm:px-8 py-20 lg:py-28 text-center">
        <Reveal>
          <p className="overline-label mb-6">The House</p>
          <h2 className="font-editorial text-3xl sm:text-5xl leading-tight">
            Crafted for your story. Made to be remembered.
          </h2>
          <RainbowRule className="mx-auto mt-8 mb-8" />
          <p className="text-stone leading-relaxed max-w-2xl mx-auto">
            {BRAND.shortName} is a contemporary African fashion house shaping
            footwear, bags and accessories for people who express their
            identity through what they wear. Craft. Character. Confidence.
          </p>
          <Link to="/about" className="btn-lux btn-lux-outline mt-10">
            Our Story
          </Link>
        </Reveal>
      </section>

      {/* ── WhatsApp CTA ───────────────────────────────────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 text-center">
          <h2 className="font-editorial text-3xl sm:text-4xl mb-4">
            Prefer to talk first?
          </h2>
          <p className="text-stone max-w-lg mx-auto mb-8 leading-relaxed">
            Our client team answers on WhatsApp — sizing, styling, bespoke
            timelines and everything between.
          </p>
          <WhatsAppCTAButton
            message={GENERAL_INQUIRY}
            whatsappNumber={whatsappNumber}
            label="Chat with DREAMZ"
          />
        </div>
      </section>
    </div>
  );
}
