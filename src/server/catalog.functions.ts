import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCategories,
  getHomeSelection,
  getFrontOriginals,
  getProductBySlug,
  getPublishedProducts,
  getRelatedProducts,
  getSetting,
  searchProducts,
} from "./catalog.server";

/**
 * Public storefront loaders are read-only.
 *
 * Catalogue seeding, settings backfills, reconciliation and publishing belong
 * in deploy-time migrations or the admin dashboard. Running seed/backfill work
 * inside SSR requests caused avoidable cold-start latency and previously
 * contributed to storefront instability.
 */
export const getCatalog = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        categorySlug: z.string().optional(),
        tier: z.string().optional(),
        collection: z.string().optional(),
        featured: z.boolean().optional(),
        customizable: z.boolean().optional(),
        limit: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => getPublishedProducts(data));

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => getProductBySlug(slug));

export const getRelated = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const product = await getProductBySlug(data.slug);
    if (!product) return [];
    return getRelatedProducts(product, data.limit ?? 4);
  });

export const getCategoriesFn = createServerFn({ method: "GET" }).handler(() =>
  getCategories(),
);

export const searchCatalog = createServerFn({ method: "GET" })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => searchProducts(query));

export const getSiteSettings = createServerFn({ method: "GET" }).handler(() =>
  getSetting<Record<string, string | boolean>>("site", {}),
);

export const getHomeSelectionFn = createServerFn({ method: "GET" }).handler(() =>
  getHomeSelection(),
);

export const getFrontOriginalsFn = createServerFn({ method: "GET" }).handler(() =>
  getFrontOriginals(),
);

/**
 * One RPC for all homepage merchandise. This avoids two independent
 * client-to-server calls during the home loader and runs the catalogue reads
 * concurrently inside the same server invocation.
 */
export const getHomePageDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const [selection, frontOriginals] = await Promise.all([
    getHomeSelection(),
    getFrontOriginals(),
  ]);
  return { ...selection, frontOriginals };
});

export const getShippingConfig = createServerFn({ method: "GET" }).handler(() =>
  getSetting("shipping", { defaultFee: 3500, freeThreshold: 150000 }),
);
