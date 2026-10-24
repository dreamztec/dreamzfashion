import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { getBlobStore } from "./blobs.server";
import { db } from "../../db/index";
import { mediaAssets, productImages, productVariants, products } from "../../db/schema";
import { desc } from "drizzle-orm";

function requireAdmin() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("Admin access is not configured.");
  }
  let token = "";
  try {
    token = getRequest().headers.get("x-admin-key") ?? "";
  } catch {
    token = "";
  }
  if (!token || token !== secret) {
    throw new Error("Admin authentication failed. Please sign in again.");
  }
}

const MEDIA_CATEGORIES = [
  "PRODUCT",
  "CAMPAIGN",
  "LOOKBOOK",
  "HOMEPAGE",
  "PARTNERSHIPS",
  "SOCIAL",
  "BRAND",
  "OTHER",
] as const;

const UploadSchema = z.object({
  filename: z.string().min(1).max(120).regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dot, dash, underscore only"),
  // data URL from the admin browser (image is optimised/converted client-side
  // via canvas before upload; originals stay unmodified in blob storage)
  dataUrl: z.string().max(14_000_000),
  title: z.string().max(160).default(""),
  altText: z.string().max(240).default(""),
  category: z.enum(MEDIA_CATEGORIES).default("OTHER"),
  isLifestyle: z.boolean().default(false),
});

export const adminUploadMedia = createServerFn({ method: "POST" })
  .inputValidator(UploadSchema)
  .handler(async ({ data }) => {
    requireAdmin();
    const base64 = data.dataUrl.replace(/^data:[^;]+;base64,/, "");
    if (!base64) throw new Error("Empty upload");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) throw new Error("Empty upload");

    const key = `media/${Date.now()}-${data.filename}`;
    const store = getBlobStore();
    const mime = data.dataUrl.slice(5, data.dataUrl.indexOf(";")) || "image/jpeg";
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    await store.set(key, new Blob([ab], { type: mime }));
    // Uploaded media is served through /api/media/$ which streams from Blobs —
    // works identically on the deployed site and in local dev.
    const url = `/api/media/${key}`;

    const [row] = await db
      .insert(mediaAssets)
      .values({
        url,
        title: data.title || data.filename,
        altText: data.altText || data.title || data.filename,
        category: data.category,
        isLifestyle: data.isLifestyle,
      })
      .returning();
    return { ok: true, asset: row };
  });

export const adminListMedia = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.id)).limit(500);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null }));
});

export const adminUpdateMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int(),
      title: z.string().max(160).optional(),
      altText: z.string().max(240).optional(),
      category: z.enum(MEDIA_CATEGORIES).optional(),
      isLifestyle: z.boolean().optional(),
      productId: z.number().int().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const { id, ...patch } = data;
    await db.update(mediaAssets).set(patch).where(eq(mediaAssets.id, id));
    return { ok: true };
  });

export const adminDeleteMedia = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int(), url: z.string().optional() }))
  .handler(async ({ data }) => {
    requireAdmin();
    if (data.url && data.url.includes("/api/media/media/")) {
      // Only blob-stored uploads are deletable from storage; repo assets stay.
      try {
        const store = getBlobStore();
        const key = data.url.replace("/api/media/", "");
        await store.delete(key);
      } catch {
        /* storage deletion is best-effort; the DB row is the source of truth */
      }
    }
    await db.delete(mediaAssets).where(eq(mediaAssets.id, data.id));
    return { ok: true };
  });

/**
 * Assign a media asset to a product: becomes the product's primary image
 * (front of the gallery) without touching the original asset.
 */
export const adminAssignMediaToProduct = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mediaId: z.number().int(),
      productId: z.number().int(),
      asPrimary: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, data.mediaId)).limit(1);
    if (!asset) throw new Error("Media asset not found");
    const [product] = await db.select().from(products).where(eq(products.id, data.productId)).limit(1);
    if (!product) throw new Error("Product not found");

    const existing = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, data.productId))
      .orderBy(productImages.position);

    if (existing.length === 0) {
      await db.insert(productImages).values({
        productId: data.productId,
        url: asset.url,
        altText: asset.altText || product.name,
        position: 0,
      });
    } else if (data.asPrimary) {
      await db
        .update(productImages)
        .set({ url: asset.url, altText: asset.altText || product.name, position: 0 })
        .where(eq(productImages.id, existing[0].id));
    } else {
      await db.insert(productImages).values({
        productId: data.productId,
        url: asset.url,
        altText: asset.altText || product.name,
        position: existing.length,
      });
    }
    await db.update(mediaAssets).set({ productId: data.productId }).where(eq(mediaAssets.id, data.mediaId));
    return { ok: true };
  });

// ── Same Design / New Colourway ──────────────────────────────────────

/**
 * Register an uploaded photograph as a NEW COLOURWAY of an existing product:
 * appends the image to the product's gallery (gallery order matches the
 * product's colour order, so the storefront colour selector swaps the main
 * image) and creates a selectable colour variant. The house always makes
 * this call — AI may suggest, but never combines products on its own.
 */
export const adminApplyColourway = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mediaId: z.number().int(),
      productId: z.number().int(),
      color: z.string().min(1).max(40),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, data.mediaId)).limit(1);
    if (!asset) throw new Error("Media asset not found");
    const [product] = await db.select().from(products).where(eq(products.id, data.productId)).limit(1);
    if (!product) throw new Error("Product not found");

    const colour = data.color.trim();
    if (!colour) throw new Error("Colour label is required");

    const existingImages = await db
      .select({ id: productImages.id, url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(productImages.position);

    // Keep gallery order aligned with the product's colour order.
    const colors = [...new Set([...(product.colors ?? []), colour])];
    const altText = asset.altText || `${product.name} ${colour}`;

    if (!existingImages.some((i) => i.url === asset.url)) {
      await db.insert(productImages).values({
        productId: product.id,
        url: asset.url,
        altText,
        position: colors.indexOf(colour),
      });
    } else {
      // Re-point the existing gallery entry at the colour's position.
      const [img] = existingImages.filter((i) => i.url === asset.url);
      await db
        .update(productImages)
        .set({ altText, position: colors.indexOf(colour) })
        .where(eq(productImages.id, img.id));
    }

    const variants = await db
      .select({ id: productVariants.id, color: productVariants.color })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id));
    if (!variants.some((v) => v.color === colour)) {
      await db.insert(productVariants).values({
        productId: product.id,
        color: colour,
        size: null,
        stockQuantity: 0,
        sku: `${product.sku}-${colour.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      });
    }

    await db
      .update(products)
      .set({ colors, updatedAt: new Date() })
      .where(eq(products.id, product.id));
    await db.update(mediaAssets).set({ productId: product.id }).where(eq(mediaAssets.id, data.mediaId));
    return { ok: true };
  });

/**
 * AI match suggestion for an uploaded image: the vision model compares the
 * photograph against the live catalogue and proposes which product (if any)
 * the image belongs to. Purely advisory — the result is shown in the admin
 * as a pre-filled suggestion and requires explicit approval via the
 * "Same Design / New Colourway" or "Assign to product" controls.
 *
 * Honest configuration states: when the AI gateway is not configured the
 * response says so instead of pretending.
 */
export const adminSuggestImageMatch = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mediaId: z.number().int(),
      // Optional data URL from the browser (used when the asset is a repo
      // path the serverless runtime cannot read from disk).
      dataUrl: z.string().max(14_000_000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const key = process.env.NETLIFY_AI_GATEWAY_KEY;
    const base = process.env.NETLIFY_AI_GATEWAY_BASE_URL;
    if (!key || !base) {
      return {
        configured: false as const,
        suggestion: null,
        note: "AI matching is not configured on this deployment — approve matches manually.",
      };
    }

    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, data.mediaId)).limit(1);
    if (!asset) throw new Error("Media asset not found");

    // Resolve image bytes: direct data URL from the browser, blob storage,
    // or (last resort) the site's own static asset.
    let dataUrl = data.dataUrl ?? "";
    if (!dataUrl) {
      if (asset.url.startsWith("/api/media/")) {
        const blobKey = asset.url.replace("/api/media/", "");
        const blob = await getBlobStore().get(blobKey, { type: "blob" });
        if (!blob) throw new Error("Stored image could not be loaded");
        const buf = Buffer.from(await blob.arrayBuffer());
        dataUrl = `data:${blob.type || "image/jpeg"};base64,${buf.toString("base64")}`;
      } else if (asset.url.startsWith("/")) {
        const origin = process.env.SITE_URL || "https://dreamzfashion.dreamz-gc.com";
        const res = await fetch(`${origin}${asset.url}`);
        if (!res.ok) throw new Error("Stored image could not be loaded");
        const buf = Buffer.from(await res.arrayBuffer());
        dataUrl = `data:${res.headers.get("content-type") || "image/jpeg"};base64,${buf.toString("base64")}`;
      } else {
        throw new Error("This image cannot be analysed in place.");
      }
    }

    // Catalogue slice: everything the model may choose from.
    const catalogue = await db
      .select({ id: products.id, name: products.name, subcategory: products.subcategory, colors: products.colors })
      .from(products)
      .where(inArray(products.status, ["published", "draft"]))
      .orderBy(products.id);

    const list = catalogue
      .map(
        (p) =>
          `- ${p.name}${p.subcategory ? ` (${p.subcategory})` : ""}${p.colors?.length ? ` — existing colourways: ${p.colors.join(", ")}` : ""}`,
      )
      .join("\n");

    const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DREAMZ_AI_TEXT_MODEL || "gpt-4.1-mini",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are the catalogue assistant for the DREAMZ footwear store. Study the photograph and decide which catalogue product it shows.\n\nRules:\n- Match by physical construction (silhouette, panels, straps, broguing, buckles, tassels, sole) — never by colour alone. A NEW colour of an existing design is still that product.\n- If the photograph is a colourway of a listed product, name it exactly as listed.\n- If no listed product shares the construction, return null.\n- Respond ONLY with compact JSON: {"product": "<exact name or null>", "reason": "<one short line>"}`,
              },
              { type: "text", text: `Catalogue:\n${list}` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      return {
        configured: true as const,
        suggestion: null,
        note: "The AI matching service did not respond — approve matches manually.",
      };
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { configured: true as const, suggestion: null, note: "No usable suggestion — approve matches manually." };
    }
    let parsed: { product?: string | null; reason?: string };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { configured: true as const, suggestion: null, note: "No usable suggestion — approve matches manually." };
    }
    const rawName = (parsed.product ?? "").trim();
    // Models sometimes append the parenthesised subcategory from the list
    // ("Dreamz Discipline (Monk Straps)") — strip it before matching.
    const normalised = (candidate: string) =>
      candidate.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
    const hit = rawName
      ? catalogue.find((p) => p.name.toLowerCase() === rawName.toLowerCase() || normalised(p.name) === normalised(rawName))
      : undefined;
    if (!hit) {
      return {
        configured: true as const,
        suggestion: null,
        note: parsed.reason || "The photograph does not clearly match a catalogue construction.",
      };
    }
    return {
      configured: true as const,
      suggestion: { productId: hit.id, productName: hit.name },
      note: parsed.reason || "",
    };
  });
