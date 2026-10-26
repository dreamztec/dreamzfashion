import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { getCatalog, getCategoriesFn } from "@/server/catalog.functions";
import { ProductGrid, photographyFirst } from "@/components/ProductCard";
import { groupCounts, productGroup } from "@/lib/taxonomy";
import { BRAND } from "@/lib/config";
import { PRODUCT_TIERS, TIER_LABELS, TIER_TAGLINES, TIER_DESCRIPTIONS, formatNaira, type ProductTier } from "@/lib/format";

/** Old collection URLs keep working under the new names. */
const LEGACY_TIER_SLUGS: Record<string, ProductTier> = {
  signature: "originals",
  bespoke: "royale",
};

export const Route = createFileRoute("/shop/$category")({
  validateSearch: (search: Record<string, unknown>) => ({
    tier: typeof search.tier === "string" ? search.tier : undefined,
    min: typeof search.min === "string" ? search.min : undefined,
    max: typeof search.max === "string" ? search.max : undefined,
    size: typeof search.size === "string" ? search.size : undefined,
    colour: typeof search.colour === "string" ? search.colour : undefined,
    availability: typeof search.availability === "string" ? search.availability : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    sub: typeof search.sub === "string" ? search.sub : undefined,
  }),
  loader: async ({ params }) => {
    // /shop/essentials, /shop/signature and /shop/bespoke are the tier
    // landing experiences; this route renders them (see component).
    const legacy = LEGACY_TIER_SLUGS[params.category];
    const tierSlug: ProductTier | null =
      legacy ??
      ((PRODUCT_TIERS as readonly string[]).includes(params.category)
        ? (params.category as ProductTier)
        : null);
    if (tierSlug) {
      const products = await getCatalog({ data: { limit: 200 } });
      return {
        kind: "tier" as const,
        tier: tierSlug,
        products: products.filter((p) => p.tier === tierSlug),
        productsByCategory: [],
        category: null,
      };
    }
    const [products, categories] = await Promise.all([
      getCatalog({ data: { categorySlug: params.category, limit: 200 } }),
      getCategoriesFn(),
    ]);
    const category = categories.find((c) => c.slug === params.category);
    if (!category) throw notFound();
    return { kind: "category" as const, tier: null, products: [], productsByCategory: products, category };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category?.name ?? "Shop"} — ${BRAND.name}` },
      {
        name: "description",
        content:
          loaderData?.category?.description ||
          `Browse ${BRAND.name} leather pieces.`,
      },
    ],
  }),
  component: CategoryPage,
});

type ShopProduct = Awaited<ReturnType<typeof getCatalog>>[number];

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

function entryPrice(p: ShopProduct): number {
  return p.completePackagePrice ?? p.price;
}

function CategoryPage() {
  const loaderData = Route.useLoaderData() as {
    kind: "tier" | "category";
    tier: ProductTier | null;
    products: ShopProduct[];
    productsByCategory: ShopProduct[];
    category: { slug: string; name: string; description: string | null; imageUrl: string | null } | null;
  };
  const { kind, tier: tierParam, category } = loaderData;
  const products = kind === "tier" ? loaderData.products : loaderData.productsByCategory;

  if (kind === "tier") {
    return <TierLanding tier={(tierParam ?? "essentials") as ProductTier} products={products} />;
  }
  if (!category) throw notFound();

  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop/$category" });

  const [minInput, setMinInput] = useState(search.min ?? "");
  const [maxInput, setMaxInput] = useState(search.max ?? "");

  // The upper bound shown as a hint is derived from the live catalogue —
  // never hard-coded. A blank max means "No Maximum".
  const maxCatalogPrice = useMemo(
    () => products.reduce((m, p) => Math.max(m, entryPrice(p)), 0),
    [products],
  );

  // Browsing groups (Shoes / Loafers / Boots / Slides …) with live counts.
  const groups = useMemo(() => groupCounts(category?.slug ?? "", products), [products, category?.slug]);
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) for (const s of p.sizes ?? []) set.add(String(s));
    return [...set].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [products]);
  const availableColours = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) for (const c of p.colors ?? []) set.add(String(c));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const visible = useMemo(() => {
    let out = products;
    if (search.sub) {
      const wanted = (search.sub as string).toLowerCase();
      out = out.filter(
        (p) =>
          (productGroup(p.categorySlug, p.subcategory) ?? "").toLowerCase() === wanted ||
          (p.subcategory ?? "").toLowerCase() === wanted,
      );
    }
    if (search.tier && PRODUCT_TIERS.includes(search.tier as never)) {
      out = out.filter((p) => p.tier === search.tier);
    }
    if (search.size) out = out.filter((p) => (p.sizes ?? []).includes(search.size as string));
    if (search.colour) {
      const c = (search.colour as string).toLowerCase();
      out = out.filter((p) => (p.colors ?? []).some((x) => x.toLowerCase() === c));
    }
    if (search.availability === "1") {
      out = out.filter((p) => p.stockQuantity > 0 || p.availability === "made_to_order");
    }
    const minK = search.min ? parseNairaInput(search.min) : null;
    const maxK = search.max ? parseNairaInput(search.max) : null;
    if (minK != null) out = out.filter((p) => entryPrice(p) >= minK);
    if (maxK != null) out = out.filter((p) => entryPrice(p) <= maxK);
    switch (search.sort) {
      case "price_asc":
        out = [...out].sort((a, b) => entryPrice(a) - entryPrice(b));
        break;
      case "price_desc":
        out = [...out].sort((a, b) => entryPrice(b) - entryPrice(a));
        break;
      case "newest":
        out = [...out].sort(
          (a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0) || b.id - a.id,
        );
        break;
      default:
        out = photographyFirst(
          [...out].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.id - b.id),
        );
    }
    return out;
  }, [products, search.sub, search.tier, search.size, search.colour, search.availability, search.min, search.max, search.sort]);

  const hasFilters =
    search.sub || search.tier || search.min || search.max || search.size || search.colour || search.availability === "1" || search.sort;

  const update = (patch: Record<string, string | undefined>) => {
    const next: Record<string, string | undefined> = { ...search, ...patch };
    for (const key of Object.keys(next)) {
      if (next[key] === undefined || next[key] === "") delete next[key];
    }
    void navigate({ to: "/shop/$category", params: { category: category.slug }, search: next as never });
  };

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    update({ min: minInput || undefined, max: maxInput || undefined });
  };

  return (
    <div>
      <div className="relative h-[42svh] min-h-[320px] -mt-16 flex items-end overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25 rainbow-rule"
          style={{ filter: "blur(80px)" }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 pb-12 text-ivory">
          <p className="overline-label !text-gold-soft mb-2">Shop</p>
          <h1 className="font-editorial text-5xl sm:text-6xl">{category.name}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        {category.description && (
          <p className="text-stone max-w-xl mb-12 leading-relaxed">{category.description}</p>
        )}

        {/* Filters — dynamic price bands, no upper cap. */}
        <form
          onSubmit={applyPrice}
          className="grid gap-3 sm:grid-cols-[repeat(3,1fr)_auto_auto] items-end max-w-4xl mb-6 border border-ink/10 px-5 py-5"
          aria-label="Filter products"
        >
          <div>
            <label htmlFor="c-min" className="input-lux-label">Minimum price (₦)</label>
            <input
              id="c-min"
              inputMode="numeric"
              className="input-lux"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              placeholder="No minimum"
            />
          </div>
          <div>
            <label htmlFor="c-max" className="input-lux-label">Maximum price (₦)</label>
            <input
              id="c-max"
              inputMode="numeric"
              className="input-lux"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              placeholder={maxCatalogPrice ? `Up to ${formatNaira(maxCatalogPrice)} or higher` : "No maximum"}
            />
          </div>
          <div>
            <label htmlFor="c-size" className="input-lux-label">Size</label>
            <select
              id="c-size"
              className="input-lux"
              value={search.size ?? ""}
              onChange={(e) => update({ size: e.target.value || undefined })}
            >
              <option value="">Any size</option>
              {availableSizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-sort" className="input-lux-label">Sort</label>
            <select
              id="c-sort"
              className="input-lux"
              value={search.sort ?? "featured"}
              onChange={(e) => update({ sort: e.target.value === "featured" ? undefined : e.target.value })}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <label className="flex items-center gap-2 text-xs uppercase tracking-btn cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={search.availability === "1"}
                onChange={(e) => update({ availability: e.target.checked ? "1" : undefined })}
              />
              Available
            </label>
          </div>
          <div className="flex gap-2 sm:col-span-5">
            <button type="submit" className="btn-lux btn-lux-outline !py-2.5 !px-6">
              Apply Price
            </button>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setMinInput("");
                  setMaxInput("");
                  void navigate({
                    to: "/shop/$category",
                    params: { category: category.slug },
                    search: {} as never,
                  });
                }}
                className="btn-lux btn-lux-outline !py-2.5 !px-6"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
          {availableColours.length > 1 && (
            <div className="sm:col-span-5">
              <label htmlFor="c-colour" className="input-lux-label">Colour</label>
              <select
                id="c-colour"
                className="input-lux max-w-xs"
                value={search.colour ?? ""}
                onChange={(e) => update({ colour: e.target.value || undefined })}
              >
                <option value="">Any colour</option>
                {availableColours.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </form>

        {/* Subcategory + tier chips */}
        {(groups.length > 1 || products.some((p) => p.tier)) && (
          <div className="flex flex-wrap gap-x-7 gap-y-3 mb-10">
            {groups.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => update({ sub: undefined })}
                  aria-pressed={!search.sub}
                  className={`nav-link text-[0.7rem] uppercase tracking-btn ${!search.sub ? "text-brand-red" : ""}`}
                >
                  All {category.name} ({products.length})
                </button>
                {groups.map(({ group: s, count }) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update({ sub: s })}
                    aria-pressed={search.sub === s}
                    className={`nav-link text-[0.7rem] uppercase tracking-btn ${
                      search.sub && (search.sub as string).toLowerCase() === s.toLowerCase()
                        ? "text-brand-red"
                        : ""
                    }`}
                  >
                    {s} ({count})
                  </button>
                ))}
              </>
            )}
            {products.some((p) => p.tier) && (
              <>
                <span aria-hidden="true" className="text-ink/20">|</span>
                {PRODUCT_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => update({ tier })}
                    aria-pressed={search.tier === tier}
                    className={`nav-link text-[0.7rem] uppercase tracking-btn ${search.tier === tier ? "text-brand-red" : ""}`}
                  >
                    {TIER_LABELS[tier]}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {(search.min || search.max) && (
          <p className="text-xs text-stone mb-8">
            Price:{" "}
            {search.min ? `from ${formatNaira(parseNairaInput(search.min) ?? 0)}` : ""}
            {search.min && search.max ? " to " : ""}
            {search.max ? `up to ${formatNaira(parseNairaInput(search.max) ?? 0)}` : ""}
            {search.max ? "" : search.min ? " and above" : ""}
          </p>
        )}

        <p className="text-xs text-stone mb-10" role="status">
          {visible.length} {visible.length === 1 ? "piece" : "pieces"}
        </p>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="font-editorial text-2xl mb-3">Pieces arriving soon</h2>
            <p className="text-stone mb-8">
              Nothing has been published in this category yet.
            </p>
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-outline">
              Browse All Pieces
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="font-editorial text-2xl mb-3">
              No DREAMZ pieces match those filters yet
            </h2>
            <p className="text-stone mb-8">
              Clear the filters or design something with us.
            </p>
            <button
              type="button"
              onClick={() => {
                setMinInput("");
                setMaxInput("");
                void navigate({
                  to: "/shop/$category",
                  params: { category: category.slug },
                  search: {} as never,
                });
              }}
              className="btn-lux btn-lux-outline"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <ProductGrid products={visible} priority />
        )}
        <div className="text-center mt-16">
          <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="nav-link text-[0.7rem] uppercase tracking-btn">
            View All Categories
          </Link>
        </div>
      </div>
    </div>
  );
}

function parseNairaInput(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value * 100;
}

/** Collection landing (Essentials / Originals / Royale) rendered by /shop/$category. */
function TierLanding({
  tier,
  products,
}: {
  tier: ProductTier;
  products: ShopProduct[];
}) {
  return (
    <div>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-32 pb-14 text-center">
        <p className="tier-badge justify-center mb-4">{TIER_LABELS[tier]}</p>
        <h1 className="font-editorial text-5xl sm:text-6xl">{TIER_TAGLINES[tier]}</h1>
        <div className="rule-gold mx-auto mt-7" />
        <p className="text-stone max-w-2xl mx-auto mt-6 leading-relaxed">
          {TIER_DESCRIPTIONS[tier]}
        </p>
      </div>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-20">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="font-editorial text-2xl mb-3">Pieces arriving soon</h2>
            <p className="text-stone mb-8">
              Nothing has been published in this tier yet — explore the full
              collection in the meantime.
            </p>
            <Link
              to="/shop"
              search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }}
              className="btn-lux btn-lux-outline"
            >
              Browse All Pieces
            </Link>
          </div>
        ) : (
          <ProductGrid products={products} priority />
        )}
      </div>
    </div>
  );
}
