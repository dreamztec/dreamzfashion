import { Link, createFileRoute } from "@tanstack/react-router";
import { getHomeSelectionFn, getSiteSettings } from "@/server/catalog.functions";
import { ProductMedia, RainbowRule } from "@/components/brand";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { formatNaira } from "@/lib/format";
import { WaitlistSignup } from "@/components/WaitlistSignup";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [settings, selection] = await Promise.all([getSiteSettings(), getHomeSelectionFn()]);
    return { settings, ...selection };
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
const SHOP_SEARCH = { q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };
/** /shop/$category takes its own search params (no `q`). */
const CATEGORY_SEARCH = { tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };

type HomeProduct = Awaited<ReturnType<typeof getHomeSelectionFn>>["hero"];

function Home() {
  const { settings, hero, collectionPreviews, accessoriesPreview, total } = Route.useLoaderData() as {
    settings: Record<string, unknown>;
    hero: HomeProduct;
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
            <Link to="/custom" className="btn-lux btn-lux-primary">
              Design Your Dream Outfit
            </Link>
            <Link to="/shop" search={SHOP_SEARCH} className="btn-lux btn-lux-outline">
              See Samples
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
                  copy: "The premium design and customization service. Priced after a considered quote.",
                  cta: "Design Yours",
                  product: collectionPreviews.royale,
                },
              ]
            ).map(({ tier, title, copy, cta, product }) => (
              <Link
                key={tier}
                to="/shop/$category"
                params={{ category: tier }}
                search={CATEGORY_SEARCH}
                className="block border border-ink/10 bg-ivory p-6 text-center transition-colors hover:border-ink/40"
              >
                <ProductMedia
                  url={product?.images[0]?.url ?? null}
                  alt={product?.images[0]?.altText ?? `${title} collection`}
                  aspect="aspect-[4/5]"
                  width={720}
                  sizes="(max-width: 640px) 88vw, 30vw"
                  fit="contain"
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
                fit="contain"
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

      {/* ── Anniversary early access (free waitlist) ───────── */}
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-16 lg:py-24 text-center">
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
