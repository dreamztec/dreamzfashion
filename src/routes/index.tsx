import { Link, createFileRoute } from "@tanstack/react-router";
import { getHomePageDataFn } from "@/server/catalog.functions";
import { ProductMedia, RainbowRule } from "@/components/brand";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { AnniversaryBanner } from "@/components/AnniversaryBanner";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import { formatNaira } from "@/lib/format";
import { WaitlistSignup } from "@/components/WaitlistSignup";

export const Route = createFileRoute("/")({
  loader: () => getHomePageDataFn(),
  head: () => ({
    meta: [
      { title: `Design Your Dream Outfit — ${BRAND.name}` },
      { name: "description", content: HERO_BODY },
    ],
  }),
  headers: () => ({
    "Netlify-CDN-Cache-Control": "public, durable, max-age=300, stale-while-revalidate=1800",
    "Netlify-Vary": "query=preview",
  }),
  staleTime: 60_000,
  component: Home,
});

const HERO_BODY =
  "Ready-to-wear and custom leather footwear, bags, accessories and wearable pieces, crafted around your story.";
const SHOP_SEARCH = { q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };
/** /shop/$category takes its own search params (no `q`). */
const CATEGORY_SEARCH = { tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };

type HomeProduct = Awaited<ReturnType<typeof getHomePageDataFn>>["hero"];

function Home() {
  const { hero, frontOriginals, collectionPreviews, total } = Route.useLoaderData() as {
    hero: HomeProduct;
    frontOriginals: Array<NonNullable<HomeProduct>>;
    collectionPreviews: { essentials: HomeProduct; originals: HomeProduct; royale: HomeProduct };
    accessoriesPreview: HomeProduct;
    total: number;
  };
  const whatsappNumber = CONTACT.whatsappNumber;
  // Clean product photography leads the hero; lifestyle imagery would crop.
  const heroPhoto = hero?.images.find((i) => i.kind !== "lifestyle") ?? hero?.images[0] ?? null;

  return (
    <div>
      {/* ── Opening: the offer first, then the hero product ─── */}
      <section className="bg-ivory pt-28 sm:pt-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-10 sm:pb-16 text-center">
          {/* No fade-up on the H1 or hero image: the LCP element must paint
              at full opacity immediately (transparent elements are skipped
              as LCP candidates, so the entrance animation delayed it). */}
          <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl leading-[1.02] uppercase tracking-tight">
            Design Your Dream Outfit
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-stone leading-relaxed sm:text-lg fade-up fade-up-1">
            {HERO_BODY}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 fade-up fade-up-2">
            <Link to="/custom" search={{ design: undefined, t: undefined }} className="btn-lux btn-lux-primary">
              Design Your Dream Pair in 5 Minutes
            </Link>
            <Link to="/shop" search={SHOP_SEARCH} className="btn-lux btn-lux-outline">
              Shop the Collection
            </Link>
          </div>
          <p className="mt-5 text-xs text-stone leading-relaxed fade-up fade-up-3">
            Answer a few guided questions and receive a ready-to-copy DREAMZ design prompt in about five minutes.
          </p>
          <p className="mt-3 text-xs text-stone tracking-wide">
            Handmade in Nigeria · Made to order or ready to wear · Delivery nationwide
          </p>
        </div>

        {/* The Boot of Many Colours — principal hero product, shown whole. */}
        {hero && (
          <div className="mx-auto max-w-5xl px-5 sm:px-8 pb-16 sm:pb-24">
            <figure>
              <Link
                to="/product/$slug"
                params={{ slug: hero.slug }}
                className="block group"
                aria-label={`View ${hero.name}`}
              >
                <ProductMedia
                  url={heroPhoto?.url ?? null}
                  alt={heroPhoto?.altText ?? `${hero.name} — multicolour leather lace-up boots`}
                  aspect="aspect-[4/5]"
                  width={1280}
                  eager
                  fetchPriorityHint
                  sizes="(max-width: 1024px) 92vw, 640px"
                  fit="contain"
                />
                <figcaption className="mt-5 text-center">
                  <p className="overline-label mb-2">DREAMZ ORIGINALS</p>
                  <span className="font-editorial text-2xl sm:text-3xl block">{hero.name}</span>
                  {(hero.theme || hero.sku === "DFK-FTW-001") && (
                    <span className="overline-label block mt-2 !text-gold-soft">{hero.theme ?? "Vision"}</span>
                  )}
                  {hero.sku === "DFK-FTW-001" && (
                    <span className="block mt-2 text-xs text-stone italic max-w-md mx-auto">
                      “See beyond where you are. Walk toward what you can become.”
                    </span>
                  )}
                  <span className="inline-block mt-3 bg-ink text-ivory text-[0.6rem] uppercase tracking-btn px-3 py-1.5">
                    Bestseller
                  </span>
                  <span className="block mt-3 nav-link text-[0.68rem] uppercase tracking-btn">
                    {hero.price > 0 && hero.checkoutReady ? `From ${formatNaira(hero.price)} — view the piece` : "View the piece"} →
                  </span>
                </figcaption>
              </Link>
            </figure>
          </div>
        )}
      </section>

      {/* ── DREAMZ 5-Year Experience announcement (dismissible) ── */}
      <AnniversaryBanner />

      {/* ── Curated Originals — explicit house order, never inferred ── */}
      {frontOriginals.length > 0 && (
        <section className="border-t border-ink/10 bg-ivory">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
              <div>
                <p className="overline-label mb-3">DREAMZ Originals</p>
                <h2 className="font-editorial text-3xl sm:text-4xl">The front edit</h2>
                <p className="text-sm text-stone mt-3 max-w-xl">
                  House-selected Originals shown in the order DREAMZ has approved.
                </p>
              </div>
              <Link
                to="/shop/$category"
                params={{ category: "originals" }}
                search={CATEGORY_SEARCH}
                className="nav-link text-[0.68rem] uppercase tracking-btn"
              >
                Shop all Originals →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {frontOriginals.map((product) => {
                const photo = product.images.find((i) => i.kind !== "lifestyle") ?? product.images[0] ?? null;
                return (
                  <Link
                    key={product.id}
                    to="/product/$slug"
                    params={{ slug: product.slug }}
                    className="group block"
                  >
                    <ProductMedia
                      url={photo?.url ?? null}
                      alt={photo?.altText ?? product.name}
                      aspect="aspect-[4/5]"
                      width={720}
                      sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 20vw"
                      fit="cover"
                    />
                    <p className="mt-3 text-[0.62rem] uppercase tracking-btn text-gold-soft">Originals</p>
                    <h3 className="font-editorial text-base sm:text-lg leading-tight mt-1">{product.name}</h3>
                    <p className="text-xs text-stone mt-1">
                      {product.price > 0 && product.checkoutReady ? formatNaira(product.price) : "Request price"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Shop by product category ────────────────────────── */}
      <section className="border-t border-ink/10 bg-ivory">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
          <div className="text-center mb-10">
            <p className="overline-label mb-3">Shop by Category</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Leather for how you live</h2>
            <p className="mt-4 text-sm text-stone max-w-2xl mx-auto">
              Explore DREAMZ by product type. Every public piece shown has approved imagery and a clear price.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { slug: "footwear", title: "Footwear", copy: "Boots, loafers, mules, slides and sandals." },
              { slug: "leather-wear", title: "Leather Wear", copy: "Tops, vests, trousers, shorts and statement pieces." },
              { slug: "bags", title: "Bags", copy: "Pouches, totes, briefcases and everyday carry." },
              { slug: "accessories", title: "Accessories", copy: "Belts, cuffs, bracelets, wallets and finishing pieces." },
            ].map((category) => (
              <Link
                key={category.slug}
                to="/shop/$category"
                params={{ category: category.slug }}
                search={CATEGORY_SEARCH}
                className="border border-ink/10 bg-ivory-deep/60 p-6 transition-colors hover:border-ink/40"
              >
                <h3 className="font-editorial text-2xl">{category.title}</h3>
                <p className="text-sm text-stone mt-2 leading-relaxed">{category.copy}</p>
                <span className="nav-link inline-block mt-5 text-[0.68rem] uppercase tracking-btn">
                  Explore →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── The three collections ───────────────────────────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24">
          <div className="text-center mb-12">
            <p className="overline-label mb-3">The Collections</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Three ways to wear DREAMZ</h2>
            <RainbowRule className="mx-auto mt-6" />
          </div>
          <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
            {(
              [
                {
                  tier: "essentials" as const,
                  title: "Essentials",
                  copy: "Ready-to-wear, accessible pieces with honest prices.",
                  cta: "Shop Essentials",
                  product: collectionPreviews.essentials,
                },
                {
                  tier: "originals" as const,
                  title: "Originals",
                  copy: "Distinctive DREAMZ house designs — statements made to be remembered.",
                  cta: "Shop Originals",
                  product: collectionPreviews.originals,
                },
                {
                  tier: "royale" as const,
                  title: "Royale",
                  copy: "Private Client Leather Service — commissions designed around you, priced after a considered quote.",
                  cta: "Discover Royale",
                  product: collectionPreviews.royale,
                },
              ]
            ).map(({ tier, title, copy, cta, product }) => (
              <Link
                key={tier}
                to={tier === "royale" ? "/royale" : "/shop/$category"}
                params={tier === "royale" ? undefined : { category: tier }}
                search={tier === "royale" ? undefined : CATEGORY_SEARCH}
                className="block border border-ink/10 bg-ivory p-6 text-center transition-colors hover:border-ink/40"
              >
                {product?.images[0]?.url && (
                  <ProductMedia
                    url={product.images[0].url}
                    alt={product.images[0].altText ?? `${title} collection`}
                    aspect="aspect-[4/5]"
                    width={720}
                    sizes="(max-width: 640px) 88vw, 30vw"
                    fit="cover"
                    className="mb-5"
                  />
                )}
                <h3 className="font-editorial text-2xl">{title}</h3>
                <p className="text-sm text-stone mt-2 leading-relaxed">{copy}</p>
                <span className="nav-link inline-block mt-4 text-[0.68rem] uppercase tracking-btn">{cta} →</span>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ── Three distinct ways to work with DREAMZ ────────────── */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24">
        <div className="text-center mb-10">
          <p className="overline-label mb-3">Work with DREAMZ</p>
          <h2 className="font-editorial text-3xl sm:text-4xl">Choose the relationship that fits you</h2>
          <p className="mt-4 text-sm text-stone max-w-2xl mx-auto">
            Earning, business-support membership and retail stock are three
            different programmes. You never need to buy a membership just to earn.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="border border-ink/10 bg-ivory-deep/60 p-8 text-center sm:text-left">
            <p className="overline-label mb-3">Earn with DREAMZ</p>
            <h3 className="font-editorial text-2xl">Refer. Create. Earn.</h3>
            <p className="text-stone leading-relaxed mt-4 text-sm">
              Free sales and creator programme. Get an approved code/link and
              earn on qualifying verified product sales.
            </p>
            <Link to="/earn" className="btn-lux btn-lux-primary mt-6">
              Join Free
            </Link>
          </div>
          <div className="border border-ink/10 bg-ivory-deep/60 p-8 text-center sm:text-left">
            <p className="overline-label mb-3">Partner with DREAMZ</p>
            <h3 className="font-editorial text-2xl">Build with more support.</h3>
            <p className="text-stone leading-relaxed mt-4 text-sm">
              Optional annual business-support memberships with sales tools,
              training, marketing support and strategy access.
            </p>
            <Link to="/partner-with-dreamz" className="btn-lux btn-lux-outline mt-6">
              See Memberships
            </Link>
          </div>
          <div className="border border-ink/10 bg-ivory-deep/60 p-8 text-center sm:text-left">
            <p className="overline-label mb-3">Sell DREAMZ</p>
            <h3 className="font-editorial text-2xl">Stock DREAMZ in your business.</h3>
            <p className="text-stone leading-relaxed mt-4 text-sm">
              Bulk purchase, approved credit or commission/consignment for
              eligible retailers. No paid membership is required.
            </p>
            <Link to="/partnerships" className="btn-lux btn-lux-outline mt-6">
              See Retail Models
            </Link>
          </div>
        </div>
      </section>

      {/* ── Anniversary: the DREAMZ 5-Year Experience ───────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-16 lg:py-24 text-center">
          <p className="overline-label mb-4">The DREAMZ 5-Year Experience · 12 June 2027</p>
          <h2 className="font-editorial text-3xl sm:text-5xl leading-tight">The Billion-Naira Collection.</h2>
          <div className="rule-gold mx-auto mt-6 mb-6" />
          <p className="text-stone leading-relaxed max-w-xl mx-auto">
            Five years of DREAMZ, building toward our most ambitious collection
            yet. Join the free early-access list — waitlist members see each
            piece first. No payment, no obligation.
          </p>
          <div className="mt-8 max-w-md mx-auto text-left">
            <WaitlistSignup />
          </div>
        </div>
      </section>

      {/* ── Corporate + help ───────────────────────────────── */}
      <section>
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

      {total === 0 && (
        <section className="mx-auto max-w-3xl px-5 pb-20 text-center">
          <p className="text-stone text-sm">
            The full catalogue is being prepared. Design your dream outfit in the
            meantime.
          </p>
        </section>
      )}
    </div>
  );
}
