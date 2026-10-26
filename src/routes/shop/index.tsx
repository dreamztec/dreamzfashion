import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { getCatalog, getCategoriesFn, searchCatalog } from "@/server/catalog.functions";
import { ProductGrid, photographyFirst } from "@/components/ProductCard";
import { BRAND } from "@/lib/config";
import { PRODUCT_TIERS, TIER_LABELS, formatNaira } from "@/lib/format";

/** Every filter lives in the URL so results are shareable and back-safe. */
export type ShopSearch = {
  q?: string;
  tier?: string;
  collection?: string;
  min?: string;
  max?: string;
  size?: string;
  colour?: string;
  availability?: string;
  sort?: string;
};

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    tier: typeof search.tier === "string" ? search.tier : undefined,
    collection: typeof search.collection === "string" ? search.collection : undefined,
    min: typeof search.min === "string" ? search.min : undefined,
    max: typeof search.max === "string" ? search.max : undefined,
    size: typeof search.size === "string" ? search.size : undefined,
    colour: typeof search.colour === "string" ? search.colour : undefined,
    availability: typeof search.availability === "string" ? search.availability : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
  }),
  loaderDeps: ({ search }) => ({
    q: search.q,
    min: search.min,
    max: search.max,
  }),
  loader: async ({ deps }) => {
    const q = deps.q || undefined;
    const [products, categories] = await Promise.all([
      q ? searchCatalog({ data: q }) : getCatalog({ data: { limit: 200 } }),
      getCategoriesFn(),
    ]);
    return { products, categories, query: q ?? "" };
  },
  head: () => ({
    meta: [
      { title: `Shop — ${BRAND.name}` },
      {
        name: "description",
        content: `Browse DREAMZ leather footwear, bags and accessories — Essentials, Originals and Royale.`,
      },
    ],
  }),
  component: ShopIndex,
});

type ShopProduct = Awaited<ReturnType<typeof getCatalog>>[number];

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

function entryPrice(p: ShopProduct): number {
  // Sorting and filtering use the entry price a customer would pay.
  return p.completePackagePrice ?? p.price;
}

function ShopIndex() {
  const { products, categories, query } = Route.useLoaderData() as {
    products: ShopProduct[];
    categories: Awaited<ReturnType<typeof getCategoriesFn>>;
    query: string;
  };
  const navigate = useNavigate({ from: "/shop/" });
  const search = Route.useSearch();

  const [searchInput, setSearchInput] = useState(query);
  const [minInput, setMinInput] = useState(search.min ?? "");
  const [maxInput, setMaxInput] = useState(search.max ?? "");

  // The upper bound of the price band is derived from the live catalogue —
  // never hard-coded. A blank max means "No Maximum".
  const maxCatalogPrice = useMemo(
    () => products.reduce((m, p) => Math.max(m, entryPrice(p)), 0),
    [products],
  );

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

  const availableCollections = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.collection) set.add(p.collection);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    let out = products;
    if (search.tier && PRODUCT_TIERS.includes(search.tier as never)) {
      out = out.filter((p) => p.tier === search.tier);
    }
    if (search.collection) {
      const coll = (search.collection as string).toLowerCase();
      out = out.filter((p) => (p.collection ?? "").toLowerCase() === coll);
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
        // Clean photography first, then featured, then by id (stable).
        out = photographyFirst(
          [...out].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.id - b.id),
        );
    }
    return out;
  }, [products, search.tier, search.collection, search.size, search.colour, search.availability, search.min, search.max, search.sort]);

  const hasFilters =
    search.tier || search.collection || search.min || search.max || search.size || search.colour || search.availability === "1" || search.sort;

  const update = (patch: Record<string, string | undefined>) => {
    const next: Record<string, string | undefined> = { ...search, ...patch };
    for (const key of Object.keys(next)) {
      if (next[key] === undefined || next[key] === "") delete next[key];
    }
    void navigate({ to: "/shop", search: next as never });
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: searchInput || undefined });
  };

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-32 pb-8">
      <div className="text-center mb-12">
        <p className="overline-label mb-3">The Collection</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">Samples</h1>
        <p className="text-stone mt-4 max-w-xl mx-auto text-sm">
          Order any piece as shown, or{" "}
          <Link to="/custom" className="underline hover:text-ink">design your own</Link>.
        </p>
        <div className="rule-gold mx-auto mt-6" />
      </div>

      <form onSubmit={submitSearch} role="search" className="max-w-md mx-auto mb-10 flex border border-ink/20">
        <input
          type="search"
          name="q"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search pieces — try “sandal” or “belt”"
          aria-label="Search products"
          className="input-lux border-0"
        />
        <button type="submit" className="px-5 text-xs uppercase tracking-btn hover:bg-ink hover:text-ivory transition-colors">
          Search
        </button>
      </form>

      <nav aria-label="Categories" className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-8">
        <Link
          to="/shop"
          search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }}
          className="nav-link text-[0.7rem] uppercase tracking-btn"
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/shop/$category"
            params={{ category: c.slug }}
            search={{ tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined }}
            className="nav-link text-[0.7rem] uppercase tracking-btn"
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {/* Commercial tiers */}
      <nav aria-label="DREAMZ tiers" className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
        <button
          type="button"
          onClick={() => update({ tier: undefined })}
          aria-pressed={!search.tier}
          className={`nav-link text-[0.7rem] uppercase tracking-btn ${!search.tier ? "text-brand-red" : ""}`}
        >
          All Tiers
        </button>
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
      </nav>

      {/* Filters — price bands are dynamic, no upper cap. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ min: minInput || undefined, max: maxInput || undefined });
        }}
        className="grid gap-3 sm:grid-cols-[repeat(3,1fr)_auto_auto] items-end max-w-4xl mx-auto mb-6 border border-ink/10 px-5 py-5"
        aria-label="Filter products"
      >
        <div>
          <label htmlFor="f-min" className="input-lux-label">Minimum price (₦)</label>
          <input
            id="f-min"
            inputMode="numeric"
            className="input-lux"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            placeholder="No minimum"
          />
        </div>
        <div>
          <label htmlFor="f-max" className="input-lux-label">Maximum price (₦)</label>
          <input
            id="f-max"
            inputMode="numeric"
            className="input-lux"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            placeholder={maxCatalogPrice ? `Up to ${formatNaira(maxCatalogPrice)} or higher` : "No maximum"}
          />
        </div>
        <div>
          <label htmlFor="f-size" className="input-lux-label">Size</label>
          <select
            id="f-size"
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
          <label htmlFor="f-sort" className="input-lux-label">Sort</label>
          <select
            id="f-sort"
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
                setSearchInput("");
                void navigate({ to: "/shop", search: {} as never });
              }}
              className="btn-lux btn-lux-outline !py-2.5 !px-6"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-4 sm:col-span-5">
          {availableCollections.length > 1 && (
            <div>
              <label htmlFor="f-collection" className="input-lux-label">Collection</label>
              <select
                id="f-collection"
                className="input-lux min-w-[180px]"
                value={search.collection ?? ""}
                onChange={(e) => update({ collection: e.target.value || undefined })}
              >
                <option value="">All Collections</option>
                {availableCollections.map((col) => (
                  <option key={col} value={col}>
                    {col} ({products.filter((p) => p.collection === col).length})
                  </option>
                ))}
              </select>
            </div>
          )}
          {availableColours.length > 1 && (
            <div>
              <label htmlFor="f-colour" className="input-lux-label">Colour</label>
              <select
                id="f-colour"
                className="input-lux min-w-[180px]"
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
        </div>
      </form>

      {/* Active price filter feedback */}
      {(search.min || search.max) && (
        <p className="text-center text-xs text-stone mb-8">
          Showing pieces{" "}
          {search.min ? `from ${formatNaira(parseNairaInput(search.min) ?? 0)}` : ""}
          {search.min && search.max ? " to " : ""}
          {search.max ? `up to ${formatNaira(parseNairaInput(search.max) ?? 0)}` : ""}
          {search.max ? "" : search.min ? " and above" : ""}
          {" — there is no upper price limit at DREAMZ."}
        </p>
      )}

      <p className="text-center text-xs text-stone mb-10" role="status">
        {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        {query ? ` matching “${query}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <h2 className="font-editorial text-2xl mb-3">
            No DREAMZ pieces match those filters yet
          </h2>
          <p className="text-stone mb-8 max-w-md mx-auto">
            Clear the filters to browse the full collection, or design something
            entirely yours with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-outline">
              Clear Filters
            </Link>
            <Link to="/custom" className="btn-lux btn-lux-primary">
              Design Something With Us
            </Link>
          </div>
        </div>
      ) : (
        <ProductGrid products={filtered} priority />
      )}
    </div>
  );
}

/** Parse a Naira input string to kobo; null when empty/invalid. */
function parseNairaInput(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value * 100;
}
