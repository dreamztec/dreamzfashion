import { Link, createFileRoute } from "@tanstack/react-router";
import { getHomePageDataFn } from "@/server/catalog.functions";
import { ProductMedia } from "@/components/brand";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/")({
  loader: () => getHomePageDataFn(),
  head: () => ({
    meta: [
      { title: `Design Your Dream Product in 5 Minutes — ${BRAND.name}` },
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
  "Choose a product, tap real leather references, select colours and construction details, then receive a complete design specification and copy-ready AI prompt.";
const SHOP_SEARCH = { q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };
/** /shop/$category takes its own search params (no `q`). */
const CATEGORY_SEARCH = { tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined };

type HomeProduct = Awaited<ReturnType<typeof getHomePageDataFn>>["hero"];

function Home() {
  const { hero, frontOriginals, total } = Route.useLoaderData() as {
    hero: HomeProduct;
    frontOriginals: Array<NonNullable<HomeProduct>>;
    total: number;
  };
  const whatsappNumber = CONTACT.whatsappNumber;
  // Clean product photography leads the hero; lifestyle imagery would crop.
  const heroPhoto = hero?.images.find((i) => i.kind !== "lifestyle") ?? hero?.images[0] ?? null;

  return (
    <div>
      {/* ── Opening: the offer first, then the hero product ─── */}
      <section className="bg-ivory">
        <div className="bg-ink text-ivory">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 sm:pt-28 pb-12 sm:pb-16 text-center">
            <p className="overline-label !text-gold-soft mb-4">DREAMZ OPEN ATELIER · SEASON OFFER</p>
            <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl leading-[1.02] uppercase tracking-tight">
              Design Your Dream Product in 5 Minutes
            </h1>
            <p className="mt-5 font-editorial text-2xl sm:text-3xl text-gold-soft">
              We produce and deliver it in 7 days.
            </p>
            <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base text-ivory/75 leading-relaxed">
              {HERO_BODY}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/custom"
                search={{ design: undefined, t: undefined, start: "1", brief: undefined }}
                className="btn-lux btn-lux-gold"
              >
                Start My 5-Minute Design
              </Link>
              <Link
                to="/shop"
                search={SHOP_SEARCH}
                className="btn-lux border border-ivory/40 text-ivory hover:border-ivory"
              >
                Shop Ready-Made
              </Link>
            </div>
            <div className="mt-7 grid gap-2 sm:grid-cols-3 max-w-3xl mx-auto text-[0.66rem] uppercase tracking-btn text-ivory/70">
              <span>3 saved designs free</span>
              <span>Visual leather & component samples</span>
              <span>Production + delivery in 7 days</span>
            </div>
            <p className="mt-5 text-[0.66rem] text-ivory/55">
              The 7-day timeline starts after the final design, measurements and order are confirmed.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-8 pb-12">
          <Link
            to="/dreams"
            className="group relative block overflow-hidden border border-ink bg-ink px-5 py-7 sm:px-9 sm:py-9 text-ivory transition hover:border-gold"
          >
            <div className="absolute inset-x-0 top-0 h-1.5 rainbow-rule" aria-hidden="true" />
            <div className="grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-end text-left">
              <div>
                <p className="overline-label !text-gold-soft">DREAMZ 200 · Dream Design Challenge</p>
                <h2 className="font-editorial text-3xl sm:text-5xl mt-2">Design your dream. Let the best designs win.</h2>
                <p className="mt-4 text-sm text-ivory/70 leading-relaxed max-w-2xl">
                  Create a leather product, publish it with a unique Dream Code, validate real demand and compete on design quality — not popularity alone.
                </p>
              </div>
              <div>
                <p className="font-editorial text-5xl sm:text-6xl text-gold-soft">₦1,000,000</p>
                <p className="text-sm uppercase tracking-btn mt-1">Total prize pool*</p>
                <p className="mt-3 text-sm text-ivory/70">₦500k cash + ₦500k DREAMZ products · Top 5 · Plus paid Studio passes</p>
              </div>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-3 text-[0.62rem] uppercase tracking-btn text-ivory/65">
              <span>20% minimum production deposit</span>
              <span>Dream Code tracking</span>
              <span>Eligible GIGL COD/TOD</span>
            </div>
            <p className="mt-5 text-[0.6rem] text-ivory/45">
              *Design/order offer is live. Prize challenge activates subject to required promotional approval and published rules.
            </p>
            <span className="nav-link inline-block mt-4 text-[0.68rem] uppercase tracking-btn text-gold-soft">See prizes, rules & market pulse →</span>
          </Link>
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

      <section id="open-atelier" className="border-t border-ink/10 bg-ivory-deep">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div>
              <p className="overline-label mb-3">DREAMZ Open Atelier</p>
              <h2 className="font-editorial text-3xl sm:text-5xl">Five minutes from idea to shareable design.</h2>
              <p className="mt-4 text-sm text-stone leading-relaxed max-w-xl">
                Start from real product, leather and component references, then choose the colours and construction details that matter to your own design. Your first three saved designs are free, and your Dreamer page is created automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary">
                  Start Designing
                </Link>
                <Link to="/studio-plans" className="btn-lux btn-lux-outline">
                  Creator Studio Plans
                </Link>
              </div>
              <p className="mt-4 text-xs text-stone">
                The first 200 profile holders are marked as Founding Dreamers. Paid Studio access expands tools and capacity; it never buys votes or guarantees earnings.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {[
                ["01", "Design visually", "Pick a piece, leather, colours, sole, hardware and the details that actually apply."],
                ["02", "Save & change it", "Keep the design private, reopen it later and update the same versioned concept."],
                ["03", "Publish safely", "Private references and client details stay hidden. You decide when a design becomes public."],
                ["04", "Share & earn properly", "Approved Earn with DREAMZ members can share attributed links; earnings come only from qualifying verified sales."],
              ].map(([number, title, copy]) => (
                <li key={number} className="border border-ink/10 bg-ivory p-5">
                  <p className="font-editorial text-2xl text-gold">{number}</p>
                  <h3 className="font-editorial text-xl mt-2">{title}</h3>
                  <p className="text-xs text-stone leading-relaxed mt-2">{copy}</p>
                </li>
              ))}
            </ol>
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
