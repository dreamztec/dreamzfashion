import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCategories,
  getProductBySlug,
  getPublishedProducts,
  getRelatedProducts,
  getSetting,
  searchProducts,
} from "./catalog.server";
import { seed } from "./seed.server";
import { backfillSiteSettings } from "./seed.server";

/**
 * Storefront loaders are strictly READ-ONLY against the catalogue.
 *
 * Reconciliation, SKU assignment, publishing and gallery rewrites happen
 * exclusively through idempotent SQL migrations in
 * netlify/database/migrations/ (applied by the platform at deploy time) or
 * through the admin dashboard. They must NEVER run inside SSR loaders,
 * homepage requests or cold-start request handlers — that collision-prone
 * architecture caused the previous HTTP 500 outages.
 *
 * The only catalog bootstrap allowed here is the idempotent first-run seed
 * (no-op once products exist, single-flight per process, failures are caught
 * and swallowed so a seed hiccup can never 500 the storefront).
 */

const ONLY_FIRST_RUN_SEED = true;

/**
 * First-run seed guard that never throws: a database hiccup during seeding
 * degrades to "empty catalogue" instead of a 500. Logging keeps it visible.
 */
let seedFailed = false;
async function safeSeed() {
  if (seedFailed) return;
  try {
    await seed();
  } catch (err) {
    seedFailed = true;
    console.error("First-run catalogue seed skipped (read-only fallback):", err);
  }
}

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
  .handler(async ({ data }) => {
    await safeSeed();
    return getPublishedProducts(data);
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    await safeSeed();
    return getProductBySlug(slug);
  });

export const getRelated = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const product = await getProductBySlug(data.slug);
    if (!product) return [];
    return getRelatedProducts(product, data.limit ?? 4);
  });

export const getCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  await safeSeed();
  return getCategories();
});

export const searchCatalog = createServerFn({ method: "GET" })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    await safeSeed();
    return searchProducts(query);
  });

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  await safeSeed();
  try {
    await backfillSiteSettings();
  } catch (err) {
    console.error("Settings backfill skipped:", err);
  }
  return getSetting<Record<string, string | boolean>>("site", {});
});

export const getShippingConfig = createServerFn({ method: "GET" }).handler(async () => {
  await safeSeed();
  return getSetting("shipping", { defaultFee: 3500, freeThreshold: 150000 });
});

// Referenced so bundlers keep the flag visible when auditing SSR writes.
export { ONLY_FIRST_RUN_SEED };