import { db } from "../../db/index";
import {
  categories,
  productImages,
  productVariants,
  products,
  settings,
  type Product,
} from "../../db/schema";
import { and, asc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { isDisplayableImageUrl } from "../lib/img";
import { TIER_LABELS, normalizeTier } from "../lib/format";

export type ProductWithMedia = Product & {
  images: Array<{ url: string; altText: string | null; kind: string }>;
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
  rows: Array<{ url: string; altText: string | null; kind?: string | null }>,
): Array<{ url: string; altText: string | null; kind: string }> {
  return rows
    .filter((i) => isDisplayableImageUrl(i.url))
    .map((i) => ({ url: i.url, altText: i.altText, kind: i.kind || "product" }));
}

/**
 * Customer-facing collection label for a product.
 *
 * The three primary DREAMZ collections are Essentials, Originals and Royale.
 * The admin's stored choices always win:
 * 1. An explicit curated `collection` string (e.g. "DREAMZ Originals") set
 *    in the admin dashboard is preserved verbatim — automatic rules NEVER
 *    move or rename a product, including the Boot of Many Colours.
 * 2. Otherwise the label comes from the admin-managed commercial tier
 *    (Essentials / Originals / Royale), which also accepts the legacy
 *    "signature"/"bespoke" values and presents them under the new names.
 *
 * The old automatic "Essentials Pro" generation is gone: ambiguous products
 * are surfaced in the admin "Needs Category Confirmation" review queue
 * (src/lib/collection.ts) instead of being silently relabelled.
 */
export function resolveCollection(p: {
  collection?: string | null;
  tier?: string | null;
}): string {
  if (p.collection && p.collection.trim().length > 0) return p.collection.trim();
  return TIER_LABELS[normalizeTier(p.tier)];
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
  if (queryLower.includes("essential") || queryLower.includes("original") || queryLower.includes("royale")) {
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

export type HomeProductSummary = Pick<
  Product,
  "id" | "slug" | "name" | "sku" | "tier" | "price" | "checkoutReady" | "categorySlug"
> & {
  images: Array<{ url: string; altText: string | null; kind: string }>;
};

/**
 * Homepage selection without the full catalogue: slim product columns and a
 * displayable-images-only query (no variants, no description payloads), then
 * the same hero / per-collection / accessories picks the page renders.
 */
export async function getHomeSelection(): Promise<{
  hero: HomeProductSummary | null;
  collectionPreviews: {
    essentials: HomeProductSummary | null;
    originals: HomeProductSummary | null;
    royale: HomeProductSummary | null;
  };
  accessoriesPreview: HomeProductSummary | null;
  total: number;
}> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      sku: products.sku,
      tier: products.tier,
      price: products.price,
      checkoutReady: products.checkoutReady,
      categorySlug: products.categorySlug,
      homepageHero: products.homepageHero,
      bestseller: products.bestseller,
    })
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(asc(products.id))
    .limit(200);

  const total = rows.length;
  if (total === 0) {
    return {
      hero: null,
      collectionPreviews: { essentials: null, originals: null, royale: null },
      accessoriesPreview: null,
      total,
    };
  }

  const imgRows = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      altText: productImages.altText,
      kind: productImages.kind,
    })
    .from(productImages)
    .where(
      and(
        inArray(
          productImages.productId,
          rows.map((r) => r.id),
        ),
        or(
          like(productImages.url, "/api/media/%"),
          like(productImages.url, "/img/products/%"),
          like(productImages.url, "https://%"),
        ),
      ),
    )
    .orderBy(asc(productImages.position));

  const imagesByProduct = new Map<number, Array<{ url: string; altText: string | null; kind: string }>>();
  for (const row of imgRows) {
    const list = imagesByProduct.get(row.productId) ?? [];
    list.push({ url: row.url, altText: row.altText, kind: row.kind || "product" });
    imagesByProduct.set(row.productId, list);
  }

  const withImages: Array<HomeProductSummary & { homepageHero: boolean; bestseller: boolean }> =
    rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    sku: r.sku,
    tier: r.tier,
    price: r.price,
    checkoutReady: r.checkoutReady,
    categorySlug: r.categorySlug,
    homepageHero: r.homepageHero,
    bestseller: r.bestseller,
    images: imagesByProduct.get(r.id) ?? [],
  }));

  // Homepage hero: explicit admin flag, then bestseller, then the Boot of
  // Many Colours SKU. Automatic rules never move the hero.
  const hero =
    withImages.find((p) => p.homepageHero) ??
    withImages.find((p) => p.bestseller) ??
    withImages.find((p) => p.sku === "DFK-FTW-001") ??
    null;
  const rest = withImages.filter((p) => p.id !== hero?.id);
  const pick = (tier: string) =>
    rest.find((p) => p.tier === tier && p.images[0]) ?? rest.find((p) => p.tier === tier) ?? null;

  return {
    hero,
    collectionPreviews: {
      essentials: pick("essentials"),
      originals: pick("originals"),
      royale: pick("royale"),
    },
    accessoriesPreview:
      rest.find((p) => p.categorySlug === "accessories" && p.images[0]) ?? null,
    total,
  };
}