import { db } from "../../db/index";
import {
  categories,
  productImages,
  productVariants,
  products,
  settings,
  type Product,
} from "../../db/schema";
import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";

export type ProductWithMedia = Product & {
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{ id: number; color: string | null; size: string | null; stockQuantity: number; price: number | null }>;
};

export type { Product } from "../../db/schema";

/**
 * Legacy bundled imagery (/img/…) is no longer part of the rebuilt site —
 * those references are dropped at the data layer so every surface falls back
 * to the neutral "Image coming soon" placeholder. Uploaded media (Netlify
 * Blobs via /api/media/…) and external CDN URLs still display.
 */
function displayableImages(
  rows: Array<{ url: string; altText: string | null }>,
): Array<{ url: string; altText: string | null }> {
  return rows
    .filter((i) => i.url && !i.url.startsWith("/img/"))
    .map((i) => ({ url: i.url, altText: i.altText }));
}

async function attachMedia(rows: Product[]): Promise<ProductWithMedia[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const imgs = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.position));
  const vars = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productId, ids));
  return rows.map((p) => ({
    ...p,
    images: displayableImages(imgs.filter((i) => i.productId === p.id)),
    variants: vars
      .filter((v) => v.productId === p.id)
      .map((v) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        stockQuantity: v.stockQuantity,
        price: v.price,
      })),
  }));
}

/** A published product is purchasable only when fully approved for checkout. */
export function isPurchasable(p: Pick<Product, "price" | "checkoutReady">): boolean {
  // Bespoke-tier pieces priced after review carry no price yet and fall out
  // naturally (price 0 → "Request a quote"). Verified prices are preserved.
  return p.price > 0 && p.checkoutReady;
}

export async function getPublishedProducts(opts?: {
  categorySlug?: string;
  tier?: string;
  featured?: boolean;
  customizable?: boolean;
  limit?: number;
}): Promise<ProductWithMedia[]> {
  const conds = [eq(products.status, "published")];
  if (opts?.categorySlug) conds.push(eq(products.categorySlug, opts.categorySlug));
  if (opts?.tier) conds.push(eq(products.tier, opts.tier));
  if (opts?.featured) conds.push(eq(products.featured, true));
  if (opts?.customizable) conds.push(eq(products.customizable, true));
  const rows = await db
    .select()
    .from(products)
    .where(and(...conds))
    .orderBy(asc(products.id))
    .limit(opts?.limit ?? 100);
  return attachMedia(rows);
}

export async function getProductBySlug(slug: string): Promise<ProductWithMedia | null> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .limit(1);
  if (rows.length === 0) return null;
  const [withMedia] = await attachMedia(rows);
  return withMedia;
}

export async function getCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder));
}

export async function getRelatedProducts(
  product: ProductWithMedia,
  limit = 4,
): Promise<ProductWithMedia[]> {
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "published"),
        eq(products.categorySlug, product.categorySlug),
        ne(products.id, product.id),
      ),
    )
    .limit(limit);
  if (rows.length < limit) {
    const fill = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.status, "published"),
          ne(products.categorySlug, product.categorySlug),
        ),
      )
      .limit(limit - rows.length);
    return attachMedia([...rows, ...fill]);
  }
  return attachMedia(rows);
}

export async function searchProducts(query: string): Promise<ProductWithMedia[]> {
  const q = `%${query.toLowerCase()}%`;
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "published"),
        or(
          sql`lower(${products.name}) like ${q}`,
          sql`lower(${products.shortDescription}) like ${q}`,
          sql`lower(${products.fullDescription}) like ${q}`,
          sql`lower(coalesce(${products.subcategory}, '')) like ${q}`,
          sql`lower(coalesce(${products.materials}, '')) like ${q}`,
        ),
      ),
    )
    .limit(24);
  return attachMedia(rows);
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (rows.length === 0) return fallback;
  return rows[0].value as T;
}