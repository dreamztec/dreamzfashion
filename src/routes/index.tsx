import { Link, createFileRoute } from "@tanstack/react-router";
import { getFrontOriginalsFn, getHomeSelectionFn, getSiteSettings } from "@/server/catalog.functions";
import { ProductMedia, RainbowRule } from "@/components/brand";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { AnniversaryBanner } from "@/components/AnniversaryBanner";
import { BRAND } from "@/lib/config";
import { formatNaira } from "@/lib/format";
import { cardFit } from "@/lib/img";
import { WaitlistSignup } from "@/components/WaitlistSignup";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [settings, selection, frontOriginals] = await Promise.all([getSiteSettings(), getHomeSelectionFn(), getFrontOriginalsFn()]);
    return { settings, frontOriginals, ...selection };
  },
  head: () => ({
    meta: [
      { title: `Design Your Dream Outfit — ${BRAND.name}` },
      { name: "description", content: HERO_BODY },
    ],
  }),
  component: Home,
});

const HERO_BODY =
  "Ready-to-wear and custom leather footwear, bags, accessories and wearable pieces, crafted around your story.";
const SHOP_SEARCH = { q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };
/** /shop/$category takes its own search params (no `q`). */
const CATEGORY_SEARCH = { tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };

type HomeProduct = Awaited<ReturnType<typeof getHomeSelectionFn>>["hero"];

function Home() {
  const { settings, hero, frontOriginals, collectionPreviews, accessoriesPreview, total } = Route.useLoaderData() as {
    settings: Record<string, unknown>;
    hero: HomeProduct;
    frontOriginals: Array<NonNullable<HomeProduct>>;
    collectionPreviews: { essentials: HomeProduct; originals: HomeProduct; royale: HomeProduct };
    accessoriesPreview: HomeProduct;
    total: number;
  };
  const whatsappNumber =
    (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "";
  // Clean product photography leads the hero; lifestyle imagery would crop.
  const heroPhoto = hero?.images.find((i) => i.kind !== "lifestyle") ?? hero?.images[0] ?? null;

  return (
    <div>
      {/* ── Opening: the offer first, then the hero product ─── */}
      <section className="bg-ivory pt-36 sm:pt-32">
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
              Design Your Dream Leather Piece
            </Link>
            <Link to="/shop" search={SHOP_SEARCH} className="btn-lux btn-lux-outline">
              Shop the Collection
            </Link>
          </div>
          <p className="mt-7 text-xs text-stone tracking-wide fade-up fade-up-3">
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

      {/* ── Shop by Category — product types first, collections separate ── */}
      <section className="border-t border-ink/10 bg-ivory">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
          <div className="text-center mb-10">
            <p className="overline-label mb-3">Shop by Category</p>
            <h2 className="font-editorial text-3xl sm:text-4xl">Four kinds of leather</h2>
            <RainbowRule className="mx-auto mt-5" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(
              [
                { category: "footwear", name: "Footwear", copy: "Boots, loafers, mules, slides & sandals" },
                { category: "leather-wear", name: "Leather Wear", copy: "Tops, vests, trousers, shorts & joggers" },
                { category: "bags", name: "Bags", copy: "Totes, satchels, briefcases & wrist pouches" },
                { category: "accessories", name: "Accessories", copy: "Belts, cuffs, bracelets & gift sets" },
              ] as const
            ).map((c) => (
              <Link
                key={c.category}
                to="/shop/$category"
                params={{ category: c.category }}
                search={CATEGORY_SEARCH}
                className="group border border-ink/10 bg-ivory-deep/40 px-6 py-8 text-center transition-colors hover:border-ink/40"
              >
                <h3 className="font-editorial text-xl sm:text-2xl">{c.name}</h3>
                <p className="text-xs text-stone mt-2 leading-relaxed">{c.copy}</p>
                <span className="nav-link inline-block mt-4 text-[0.66rem] uppercase tracking-btn">Browse →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leather Wear — the newest core category, shown immediately ── */}
      <section className="bg-ink text-ivory">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14 items-center">
            <div className="lg:col-span-7">
              <img
                src="/img/products/vision-leather-ensemble-campaign.jpg"
                alt="Vision Leather Ensemble — a complete leather lifestyle composition of outerwear and coordinated accessories"
                className="w-full aspect-[4/3] object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="lg:col-span-5">
              <p className="overline-label !text-gold-soft mb-3">New — Leather Wear</p>
              <h2 className="font-editorial text-3xl sm:text-4xl leading-tight">The wardrobe, made in leather</h2>
              <div className="rule-gold mt-5 mb-5" />
              <p className="text-ivory/80 leading-relaxed text-sm sm:text-base">
                Tops, vests, trousers, joggers and shorts — cut from real leather
                and finished by hand. Each piece is made to order in your size
                and colourway.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link to="/shop/$category" params={{ category: "leather-wear" }} search={CATEGORY_SEARCH} className="btn-lux btn-lux-primary">
                  Discover Leather Wear
                </Link>
                <Link to="/lookbook" className="btn-lux text-ivory border border-ivory/40 hover:border-ivory">
                  View the Lookbook
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                      fit={cardFit(photo?.url)}
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
                // Royale is the premium private-client service first; its
                // shopping gallery is reachable from the Royale page.
                to={tier === "royale" ? "/royale" : "/shop/$category"}
                params={tier === "royale" ? undefined : { category: tier }}
                search={tier === "royale" ? undefined : CATEGORY_SEARCH}
                className="block border border-ink/10 bg-ivory p-6 text-center transition-colors hover:border-ink/40"
              >
                <ProductMedia
                  url={product?.images[0]?.url ?? null}
                  alt={product?.images[0]?.altText ?? `${title} collection`}
                  aspect="aspect-[4/5]"
                  width={720}
                  sizes="(max-width: 640px) 88vw, 30vw"
                  fit={cardFit(product?.images[0]?.url)}
                  className="mb-5"
                />
                <h3 className="font-editorial text-2xl">{title}</h3>
                <p className="text-sm text-stone mt-2 leading-relaxed">{copy}</p>
                <span className="nav-link inline-block mt-4 text-[0.68rem] uppercase tracking-btn">{cta} →</span>
              </Link>
            ))}
          </div>

          {/* Accessories */}
          <div className="max-w-5xl mx-auto mt-6">
            <Link
              to="/shop/$category"
              params={{ category: "accessories" }}
              search={CATEGORY_SEARCH}
              className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] gap-6 items-center border border-ink/10 bg-ivory p-6 transition-colors hover:border-ink/40"
            >
              <ProductMedia
                url={accessoriesPreview?.images[0]?.url ?? null}
                alt={accessoriesPreview?.images[0]?.altText ?? "DREAMZ accessories"}
                aspect="aspect-square w-24 sm:w-28"
                width={360}
                sizes="112px"
                fit={cardFit(accessoriesPreview?.images[0]?.url)}
              />
              <div>
                <h3 className="font-editorial text-2xl">Accessories</h3>
                <p className="text-sm text-stone mt-1 leading-relaxed">
                  Belts · Wallets · Purses · Card Holders · Key Holders · Gift Sets
                </p>
              </div>
              <span className="nav-link hidden sm:inline-block text-[0.68rem] uppercase tracking-btn">Explore →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Leather Atelier — design your own ──────────────── */}
      <section className="border-t border-ink/10">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-16 lg:py-20 text-center">
          <p className="overline-label mb-3">Leather Atelier</p>
          <h2 className="font-editorial text-3xl sm:text-4xl">Dream it. We craft it.</h2>
          <div className="rule-gold mx-auto mt-5 mb-5" />
          <p className="text-stone max-w-xl mx-auto leading-relaxed text-sm sm:text-base">
            Choose the leather, the colour, the construction and the meaning —
            then walk through the Atelier brief with us. We build your piece
            from scratch and keep you updated at every stage of the make.
          </p>
          <div className="mt-8">
            <Link to="/custom" search={{ design: undefined, t: undefined }} className="btn-lux btn-lux-gold">
              Enter the Leather Atelier
            </Link>
          </div>
        </div>
      </section>

      {/* ── Creators & Retail Partnerships ──────────────────── */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16 lg:py-24">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="border border-ink/10 bg-ivory-deep/60 p-8 text-center sm:text-left">
            <p className="overline-label mb-3">Creators</p>
            <h2 className="font-editorial text-2xl sm:text-3xl">Create with DREAMZ</h2>
            <p className="text-stone leading-relaxed mt-4 text-sm">
              Apply free, receive your creator code and link, and earn commission
              on verified qualifying sales — never just for clicks or codes.
            </p>
            <Link to="/creators" className="btn-lux btn-lux-primary mt-6">
              Sell with DREAMZ
            </Link>
          </div>
          <div className="border border-ink/10 bg-ivory-deep/60 p-8 text-center sm:text-left">
            <p className="overline-label mb-3">Retail Partnerships</p>
            <h2 className="font-editorial text-2xl sm:text-3xl">Sell DREAMZ in your store</h2>
            <p className="text-stone leading-relaxed mt-4 text-sm">
              Bulk sales, credit sales or commission sales partnerships for
              boutiques, footwear retailers and lifestyle stores.
            </p>
            <Link to="/partnerships" className="btn-lux btn-lux-outline mt-6">
              See the Partnership Models
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
