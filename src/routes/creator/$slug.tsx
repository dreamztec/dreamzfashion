import { Link, createFileRoute } from "@tanstack/react-router";
import { getCreatorStorefrontFn } from "@/server/partners.functions";
import { ProductMedia } from "@/components/brand";
import { formatNaira, normalizeTier, TIER_LABELS } from "@/lib/format";
import { BRAND } from "@/lib/config";

/**
 * Public creator storefront. Only live, admin-approved storefronts resolve.
 * Every product link carries the creator's referral code so purchases
 * attribute server-side through /r/CODE.
 */
export const Route = createFileRoute("/creator/$slug")({
  loader: async ({ params }) => {
    const storefront = await getCreatorStorefrontFn({ data: params.slug });
    if (!storefront) throw new Error("Storefront not found");
    return storefront;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.storeName ?? "Storefront"} — DREAMZ Creator` },
      { name: "description", content: `${loaderData?.storeName ?? "A DREAMZ creator"}'s curated DREAMZ edit.` },
    ],
  }),
  component: CreatorStorefront,
});

type StorefrontData = NonNullable<Awaited<ReturnType<typeof getCreatorStorefrontFn>>>;

function CreatorStorefront() {
  const store = Route.useLoaderData() as StorefrontData;
  return (
    <div>
      <header className="mx-auto max-w-3xl px-5 sm:px-8 pt-32 pb-10 text-center">
        <p className="overline-label mb-4">DREAMZ Creator Edit</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">{store.storeName}</h1>
        {store.bio && <p className="text-stone mt-5 leading-relaxed max-w-xl mx-auto">{store.bio}</p>}
        {store.instagram && (
          <a
            href={store.instagram.startsWith("http") ? store.instagram : `https://instagram.com/${store.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link inline-block mt-4 text-[0.68rem] uppercase tracking-btn"
          >
            {store.instagram}
          </a>
        )}
      </header>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-20">
        {store.products.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="font-editorial text-2xl mb-3">The edit is being curated</h2>
            <p className="text-stone mb-8">
              This creator is preparing their selection — check back soon, or
              browse the full collection.
            </p>
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-primary">
              Browse DREAMZ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
            {store.products.map((p) => (
              <Link
                key={p.id}
                to="/r/$code"
                params={{ code: store.referralCode }}
                search={{ to: `/product/${p.slug}` }}
                className="group block h-full"
              >
                <ProductMedia url={p.image} alt={p.name} aspect="aspect-[4/5]" width={720} />
                <div className="pt-4 pb-2 text-center">
                  <p className="tier-badge mb-1 justify-center">{TIER_LABELS[normalizeTier(p.tier)]}</p>
                  <h3 className="font-editorial text-lg leading-snug">{p.name}</h3>
                  <p className="mt-1.5 text-sm">
                    {p.price > 0 ? formatNaira(p.price) : <span className="text-stone italic">Request a quote</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <p className="text-center text-xs text-stone mt-14">
          Curated by an independent DREAMZ creator. Prices and availability are
          confirmed on the product page — {BRAND.shortName} fulfils every order.
        </p>
      </section>
    </div>
  );
}
