import { Link, createFileRoute } from "@tanstack/react-router";
import { getCatalog, getSiteSettings } from "@/server/catalog.functions";
import { ProductGrid } from "@/components/ProductCard";
import { ProductMedia, RainbowRule } from "@/components/brand";
import { Reveal } from "@/components/Reveal";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { formatNaira } from "@/lib/format";
import { isPosterArtwork } from "@/lib/img";
import { WaitlistSignup } from "@/components/WaitlistSignup";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [settings, all] = await Promise.all([getSiteSettings(), getCatalog({ data: { limit: 200 } })]);
    const hero = all.find((p) => p.sku === "DFK-FTW-001") ?? null;
    const rest = all.filter((p) => p.id !== hero?.id);
    // Clean product photography first; poster artwork goes to Inspiration.
    const photographed = rest.filter((p) => p.images[0] && !isPosterArtwork(p.images[0].url));
    const posters = rest.filter((p) => p.images[0] && isPosterArtwork(p.images[0].url));
    const samples = [...photographed.filter((p) => p.featured), ...photographed.filter((p) => !p.featured)].slice(0, 6);
    return { settings, hero, samples, posters: posters.slice(0, 6), total: all.length };
  },
  head: () => ({
    meta: [
      { title: `Design Your Dream Outfit — ${BRAND.name}` },
      { name: "description", content: HERO_BODY },
    ],
  }),
  component: Home,
});

const HERO_BODY = "Custom-made and ready-to-wear leather footwear, bags and accessories, crafted around you.";
const SHOP_SEARCH = { q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined };

function Home() {
  const { settings, hero, samples, posters, total } = Route.useLoaderData() as {
    settings: Record<string, unknown>;
    hero: Awaited<ReturnType<typeof getCatalog>>[number] | null;
    samples: Awaited<ReturnType<typeof getCatalog>>;
    posters: Awaited<ReturnType<typeof getCatalog>>;
    total: number;
  };
  const whatsappNumber =
    (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "";
  const heroPhoto = hero?.images.find((i) => !isPosterArtwork(i.url)) ?? hero?.images[0] ?? null;

  return (
    <div>
      {/* ── Hero: the offer first ──────────────────────────── */}
      <section className="bg-ivory pt-36 sm:pt-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-14 sm:pb-20 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="text-center lg:text-left">
            <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl leading-[1.02] uppercase tracking-tight fade-up">
              Design Your Dream Outfit
            </h1>
            <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-stone leading-relaxed sm:text-lg fade-up fade-up-1">
              {HERO_BODY}
            </p>
            <div className="mt-9 flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4 fade-up fade-up-2">
              <Link to="/custom" className="btn-lux btn-lux-primary">
                Design Your Dream Outfit
              </Link>
              <Link to="/shop" search={SHOP_SEARCH} className="btn-lux btn-lux-outline">
                Or See Samples
              </Link>
            </div>
            <p className="mt-7 text-xs text-stone tracking-wide fade-up fade-up-3">
              Handmade in Nigeria · Made to order or ready to wear · Delivery nationwide
            </p>
          </div>

          {hero && (
            <figure className="fade-up fade-up-1">
              <Link to="/product/$slug" params={{ slug: hero.slug }} className="block group" aria-label={`View ${hero.name}`}>
                <ProductMedia
                  url={heroPhoto?.url ?? null}
                  alt={heroPhoto?.altText ?? `${hero.name} — multicolour leather lace-up boots`}
                  aspect="aspect-square"
                  width={1000}
                  eager
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>
                    <span className="font-editorial text-xl">{hero.name}</span>
                    {hero.collection && <span className="text-stone"> · {hero.collection}</span>}
                  </span>
                  <span className="nav-link text-[0.68rem] uppercase tracking-btn">
                    {hero.price > 0 && hero.checkoutReady ? `From ${formatNaira(hero.price)}` : "Request a quote"} →
                  </span>
                </figcaption>
              </Link>
            </figure>
          )}
        </div>
      </section>

      {/* ── Samples — clean product photography ────────────── */}
      {samples.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-16 lg:pt-24">
          <Reveal>
            <div className="text-center mb-12">
              <p className="overline-label mb-3">Samples</p>
              <h2 className="font-editorial text-3xl sm:text-4xl">Pieces from the workshop</h2>
              <p className="text-stone mt-4 max-w-xl mx-auto">
                Order a sample as shown, or use it as the starting point for your own design.
              </p>
              <RainbowRule className="mx-auto mt-6" />
            </div>
          </Reveal>
          <ProductGrid products={samples} />
          <div className="text-center mt-10">
            <Link to="/shop" search={SHOP_SEARCH} className="btn-lux btn-lux-outline">
              See all {total} samples
            </Link>
          </div>
        </section>
      )}

      {/* ── What we make ───────────────────────────────────── */}
      <section className="bg-ivory-deep mt-20 lg:mt-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24">
          <div className="text-center mb-12">
            <p className="overline-label mb-3">What We Make</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Leather, crafted around you</h2>
            <RainbowRule className="mx-auto mt-6" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
              { label: "Footwear", to: "/shop/footwear", note: "Shoes · Loafers · Boots · Slides" },
              { label: "Bags", to: "/shop/bags", note: "Briefcases · Wrist pouches · Handbags" },
              { label: "Accessories", to: "/shop/accessories", note: "Belts · Gift sets" },
            ].map(({ label, to, note }) => (
              <Link
                key={to}
                to={to as "/shop"}
                search={SHOP_SEARCH}
                className="block border border-ink/10 bg-ivory px-7 py-9 text-center transition-colors hover:border-ink/40 h-full"
                aria-label={`See ${label}`}
              >
                <h3 className="font-editorial text-2xl mb-2">{label}</h3>
                <p className="text-sm text-stone leading-relaxed">{note}</p>
                <span className="nav-link inline-block mt-5 text-[0.68rem] uppercase tracking-btn">Explore</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Creators & Partners ────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-5 sm:px-8 py-16 lg:py-24 text-center">
        <p className="overline-label mb-3">Creators &amp; Partners</p>
        <h2 className="font-editorial text-3xl sm:text-4xl">Share DREAMZ, earn on qualifying sales</h2>
        <p className="text-stone leading-relaxed max-w-xl mx-auto mt-5">
          Approved creators get a personal code and link. Commission is earned
          from verified, fulfilled sales — not from sharing or entering a code.
        </p>
        <Link to="/creators" className="btn-lux btn-lux-primary mt-8">
          How it works
        </Link>
      </section>

      {/* ── Inspiration — house posters, clearly labelled ──── */}
      {posters.length > 0 && (
        <section className="bg-ivory-deep">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24">
            <div className="text-center mb-12">
              <p className="overline-label mb-3">Inspiration</p>
              <h2 className="font-editorial text-3xl sm:text-4xl">House posters</h2>
              <p className="text-stone mt-4 max-w-xl mx-auto">
                Our launch posters, shown in full. Prices on each product page
                are the current prices.
              </p>
            </div>
            <ProductGrid products={posters} />
          </div>
        </section>
      )}

      {/* ── Anniversary early access (free waitlist) ───────── */}
      <section className="mx-auto max-w-4xl px-5 sm:px-8 py-16 lg:py-24 text-center">
        <p className="overline-label mb-4">12 June 2027</p>
        <h2 className="font-editorial text-3xl sm:text-5xl leading-tight">The Fifth Anniversary Collection</h2>
        <div className="rule-gold mx-auto mt-6 mb-6" />
        <p className="text-stone leading-relaxed max-w-xl mx-auto">
          Join the free early-access list — waitlist members see each piece
          first. No payment, no obligation.
        </p>
        <div className="mt-8 max-w-md mx-auto text-left">
          <WaitlistSignup />
        </div>
      </section>

      {/* ── Corporate + help ───────────────────────────────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-16 grid gap-10 sm:grid-cols-2 text-center sm:text-left">
          <div>
            <p className="overline-label mb-3">Corporate Orders</p>
            <h2 className="font-editorial text-2xl sm:text-3xl">Gifts, events and co-branded pieces</h2>
            <Link to="/corporate" className="btn-lux btn-lux-outline mt-6">
              Start a Corporate Enquiry
            </Link>
          </div>
          <div>
            <p className="overline-label mb-3">Help</p>
            <h2 className="font-editorial text-2xl sm:text-3xl">Prefer to talk first?</h2>
            <p className="text-stone mt-3 text-sm leading-relaxed">
              Sizing, styling and custom timelines — our client team answers on WhatsApp.
            </p>
            <div className="mt-6">
              <WhatsAppCTAButton message={GENERAL_INQUIRY} whatsappNumber={whatsappNumber} label="Chat with DREAMZ" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
