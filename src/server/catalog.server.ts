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
import { isDisplayableImageUrl } from "../lib/img";

export type ProductWithMedia = Product & {
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{ id: number; color: string | null; size: string | null; stockQuantity: number; price: number | null }>;
};

export type { Product } from "../../db/schema";

/**
 * Gallery rows are filtered through isDisplayableImageUrl: uploaded media
 * (Netlify Blobs via /api/media/…), the house's bundled product photography
 * (/img/products/…) and external https URLs display. Legacy root-level
 * /img/*.jpg placeholders are dropped so those surfaces fall back to the
 * neutral "Image coming soon" placeholder.
 */
function displayableImages(
  rows: Array<{ url: string; altText: string | null }>,
): Array<{ url: string; altText: string | null }> {
  return rows
    .filter((i) => isDisplayableImageUrl(i.url))
    .map((i) => ({ url: i.url, altText: i.altText }));
}

/**
 * Apply the house collection rules:
 * - One or two design colours: Essentials
 * - More than two design colours (or explicit multicolour/rainbow): Essentials Pro
 * Each `colors` entry is a separate colourway ("Black / Brown" = one colourway
 * with two design colours), so colours are counted per colourway — a bag
 * offered in Brown, Black or Grey is still a one-colour Essentials design.
 * Explicit collections (e.g. DREAMZ Originals, DREAMZ Exeutez Collection) are preserved.
 */
export function resolveCollection(p: {
  collection?: string | null;
  colors?: string[] | null;
  name?: string;
}): string {
  if (p.collection && p.collection.trim().length > 0) return p.collection;
  const colourways = p.colors ?? [];
  const maxDesignColours = Math.max(
    0,
    ...colourways.map(
      (c) => new Set(c.split(/[\/,+&]/).map((part) => part.trim().toLowerCase()).filter(Boolean)).size,
    ),
  );
  const hasMulticolour =
    colourways.some((c) => /multi|rainbow/i.test(c)) ||
    Boolean(p.name && /multi|rainbow/i.test(p.name));
  if (maxDesignColours >= 3 || hasMulticolour) {
    return "Essentials Pro";
  }
  return "Essentials";
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
    collection: resolveCollection(p),
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
  collection?: string;
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
  const media = await attachMedia(rows);
  if (opts?.collection) {
    const coll = opts.collection.toLowerCase();
    return media.filter((p) => (p.collection ?? "").toLowerCase() === coll);
  }
  return media;
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
          sql`lower(${products.sku}) like ${q}`,
          sql`lower(coalesce(${products.collection}, '')) like ${q}`,
          sql`lower(${products.shortDescription}) like ${q}`,
          sql`lower(${products.fullDescription}) like ${q}`,
          sql`lower(coalesce(${products.subcategory}, '')) like ${q}`,
          sql`lower(coalesce(${products.materials}, '')) like ${q}`,
        ),
      ),
    )
    .limit(24);
  const media = await attachMedia(rows);
  // Also include products whose resolved collection matches the query
  const queryLower = query.toLowerCase();
  if (queryLower.includes("pro") || queryLower.includes("essential") || queryLower.includes("original")) {
    const allPublished = await db.select().from(products).where(eq(products.status, "published")).limit(100);
    const allMedia = await attachMedia(allPublished);
    const matched = allMedia.filter(
      (p) =>
        (p.collection ?? "").toLowerCase().includes(queryLower) &&
        !media.some((m) => m.id === p.id),
    );
    return [...media, ...matched].slice(0, 24);
  }
  return media;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (rows.length === 0) return fallback;
  return rows[0].value as T;
}