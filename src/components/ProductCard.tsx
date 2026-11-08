import { Link } from "@tanstack/react-router";
import type { ProductWithMedia } from "@/server/catalog.server";
import { formatNaira } from "@/lib/format";
import { isPosterArtwork } from "@/lib/img";
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
  // Public product grids only render real, priced products. This prevents
  // blank "Image coming soon" cards and ₦0/quote-only catalogue clutter.\n  if (!image || product.price <= 0) return null;

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
          // Clean product photography fills the commerce card. If the only
          // approved asset is a house product poster, keep it fully visible
          // rather than cropping its product/price information.
          fit={isPosterArtwork(image) ? "contain" : "cover"}
        />
        {info.label !== "Available" && (
          <span className="absolute top-4 left-4 bg-ink text-ivory text-[0.6rem] uppercase tracking-btn px-3 py-1.5">
            {info.label}
          </span>
        )}
      </div>
      <div className="pt-4 pb-2 text-center flex flex-col">
        {/* Collection only — service tier and packaging are shown on the product page. */}
        {product.collection && <p className="tier-badge mb-1 justify-center">{product.collection}</p>}
        <h3 className="font-editorial text-lg leading-snug">{product.name}</h3>
        {product.theme && (
          <p className="overline-label !text-gold-soft mt-0.5">{product.theme}</p>
        )}
        {product.subcategory && (
          <p className="text-xs text-stone mt-0.5">{product.subcategory}</p>
        )}
        {/* One principal price per card — the Product Only price. The
            Complete Package is presented on the product page only. */}
        <p className="mt-1.5 text-sm">
          <span className="text-ink">{formatNaira(product.price)}</span>
        </p>
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
