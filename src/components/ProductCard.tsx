import { Link } from "@tanstack/react-router";
import type { ProductWithMedia } from "@/server/catalog.server";
import { formatNaira } from "@/lib/format";
import { displayFit, isPosterArtwork } from "@/lib/img";
import { ProductMedia } from "@/components/brand";
import { availabilityOf } from "@/lib/availability";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductWithMedia;
  priority?: boolean;
}) {
  const image = product.images[0]?.url ?? null;
  const alt = product.images[0]?.altText ?? product.name;
  const variantStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  const info = availabilityOf(product, { hasStock: product.variants.length > 0 ? variantStock > 0 : undefined });
  const quoteOnly = product.price <= 0 || !product.checkoutReady;

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block h-full"
      preload="intent"
    >
      <div className="relative">
        <ProductMedia
          url={image}
          alt={alt}
          aspect="aspect-[4/5]"
          width={720}
          eager={priority}
          // Two-column mobile grid at DPR 2 needs a ~640px source; larger
          // breakpoints step up through the Image CDN. No huge originals.
          sizes="(max-width: 479px) 92vw, (max-width: 1023px) 46vw, 30vw"
          // Product photography shows the whole piece; lifestyle scenes may
          // crop. The admin's per-product imageFit is respected.
          fit={displayFit(product.images[0]?.kind, product.imageFit)}
        />
        {info.label !== "Available" && (
          <span className="absolute top-4 left-4 bg-ink text-ivory text-[0.6rem] uppercase tracking-btn px-3 py-1.5">
            {info.label}
          </span>
        )}
        {quoteOnly && (
          <span className="absolute top-4 right-4 bg-ivory/95 text-ink border border-ink/20 text-[0.6rem] uppercase tracking-btn px-3 py-1.5">
            Request a Quote
          </span>
        )}
        {info.purchasable && !quoteOnly && !product.newArrival && product.customizable && (
          <span className="absolute top-4 right-4 bg-ink/85 text-ivory text-[0.6rem] uppercase tracking-btn px-3 py-1.5">
            Custom
          </span>
        )}
      </div>
      <div className="pt-4 pb-2 text-center flex flex-col">
        {/* Collection only — service tier and packaging are shown on the product page. */}
        {product.collection && <p className="tier-badge mb-1 justify-center">{product.collection}</p>}
        <h3 className="font-editorial text-lg leading-snug">{product.name}</h3>
        {product.subcategory && (
          <p className="text-xs text-stone mt-0.5">{product.subcategory}</p>
        )}
        {quoteOnly ? (
          <p className="mt-1.5 text-sm text-stone italic">Priced after review</p>
        ) : (
          <>
            <p className="mt-1.5 text-sm">
              <span className="text-stone">Product Only </span>
              <span className="text-ink">{formatNaira(product.price)}</span>
            </p>
            {product.completePackagePrice ? (
              <p className="mt-0.5 text-sm">
                <span className="text-stone">Complete Package </span>
                <span className="text-ink">{formatNaira(product.completePackagePrice)}</span>
              </p>
            ) : null}
          </>
        )}
      </div>
    </Link>
  );
}

/** Clean product photography leads; poster artwork follows (stable order). */
export function photographyFirst<T extends { images: Array<{ url: string }> }>(items: T[]): T[] {
  return items
    .map((p, i) => ({ p, i, poster: isPosterArtwork(p.images[0]?.url) || !p.images[0] }))
    .sort((a, b) => Number(a.poster) - Number(b.poster) || a.i - b.i)
    .map((x) => x.p);
}

export function ProductGrid({
  products,
  priority = false,
}: {
  products: ProductWithMedia[];
  priority?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={priority && i < 3} />
      ))}
    </div>
  );
}
