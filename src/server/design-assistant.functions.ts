import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { analyticsEvents, designRequests } from "../../db/schema";
import { getPublishedProducts, getSetting } from "./catalog.server";
import { seed } from "./seed.server";
import { generateRequestNumber } from "@/lib/format";
import { getBlobStore } from "./blobs.server";

/**
 * DREAMZ DESIGN LAB ("Design Your Dream")
 *
 * Cost discipline:
 * - Product discovery is ALWAYS a deterministic database query first.
 * - The LLM is optional garnish: it only re-words/re-ranks the DB results and
 *   is skipped entirely when the AI Gateway is unavailable or disabled.
 * - Identical interpretation requests within 24h are served from the cache
 *   table (no model call).
 * - Hard daily caps enforced per settings (`ai.dailyRequestCap`).
 * - Concept image generation runs ONLY on explicit user request, capped by
 *   `ai.conceptDailyCap`, and its output is always labelled as an AI concept.
 * - The Shop itself never calls any of this.
 * - The assistant never invents products, prices, stock, materials or
 *   delivery promises: product facts always come from the database.
 */

const PRODUCT_TYPES = [
  "shoe",
  "boot",
  "loafer",
  "mule",
  "slide",
  "sandal",
  "bag",
  "belt",
  "wallet",
  "other",
] as const;

const InputSchema = z.object({
  productType: z.enum(PRODUCT_TYPES),
  audience: z.string().max(120).default(""),
  size: z.string().max(20).default(""),
  occasion: z.string().max(120).default(""),
  style: z.string().max(120).default(""),
  primaryColour: z.string().max(60).default(""),
  secondaryColour: z.string().max(60).default(""),
  material: z.string().max(60).default(""),
  sole: z.string().max(60).default(""),
  hardware: z.string().max(60).default(""),
  personalization: z.string().max(200).default(""),
  // Budgets are kobo integers. NO ceiling — a customer may budget ₦5,000,000
  // or more; only a sane positive bound is enforced.
  budgetMin: z.string().max(14).default(""),
  budgetMax: z.string().max(14).default(""),
  neededBy: z.string().max(60).default(""),
  description: z.string().max(1200).default(""),
  sessionId: z.string().min(6).max(64),
});

export type DesignAssistantInput = z.infer<typeof InputSchema>;

type AssistantProduct = {
  id: number;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  price: number;
  completePackagePrice: number | null;
  image: string | null;
  availability: string;
  customizable: boolean;
  materials: string | null;
};

function toAssistantProduct(p: {
  id: number;
  name: string;
  slug: string;
  categorySlug: string;
  subcategory: string | null;
  price: number;
  completePackagePrice: number | null;
  images: Array<{ url: string }>;
  availability: string;
  customizable: boolean;
  materials: string | null;
}): AssistantProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.categorySlug,
    subcategory: p.subcategory,
    price: p.price,
    completePackagePrice: p.completePackagePrice,
    image: p.images[0]?.url ?? null,
    availability: p.availability,
    customizable: p.customizable,
    materials: p.materials,
  };
}

// ── Deterministic catalogue search (no AI) ───────────────────────────

const TYPE_CATEGORY: Record<(typeof PRODUCT_TYPES)[number], string[]> = {
  shoe: ["footwear"],
  boot: ["footwear"],
  loafer: ["footwear"],
  mule: ["footwear"],
  slide: ["footwear"],
  sandal: ["footwear"],
  bag: ["bags"],
  belt: ["accessories"],
  wallet: ["accessories"],
  other: ["footwear", "bags", "accessories"],
};

const TYPE_SUBCATEGORY: Partial<Record<(typeof PRODUCT_TYPES)[number], RegExp>> = {
  boot: /boot/i,
  loafer: /loafer/i,
  mule: /mule|clog/i,
  slide: /slide/i,
  sandal: /sandal/i,
  belt: /belt/i,
  wallet: /wallet|purse|card/i,
};

function keywordScore(p: {
  name: string;
  shortDescription: string;
  fullDescription: string;
  subcategory: string | null;
  materials: string | null;
}, q: string): number {
  if (!q) return 0;
  const hay = `${p.name} ${p.shortDescription} ${p.fullDescription} ${p.subcategory ?? ""} ${p.materials ?? ""}`.toLowerCase();
  let score = 0;
  for (const token of q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)) {
    if (hay.includes(token)) score += token.length;
  }
  return score;
}

/** Budget helpers: parse plain Naira strings into kobo. No ceiling. */
function parseBudget(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value * 100;
}

async function catalogueSearch(input: DesignAssistantInput): Promise<AssistantProduct[]> {
  const categorySlugs = TYPE_CATEGORY[input.productType];
  const all = await getPublishedProducts({ limit: 200 });
  const subRe = TYPE_SUBCATEGORY[input.productType];
  let inCategories = all.filter((p) => categorySlugs.includes(p.categorySlug));
  if (subRe) {
    const matched = inCategories.filter((p) => subRe.test(p.subcategory ?? ""));
    // Prefer exact subcategory matches; keep the rest as backup.
    inCategories = [...matched, ...inCategories.filter((p) => !matched.includes(p))];
  }

  const scored = inCategories
    .map((p) => {
      const q = [
        input.style,
        input.occasion,
        input.primaryColour,
        input.secondaryColour,
        input.material,
        input.description,
      ]
        .filter(Boolean)
        .join(" ");
      return { p, score: keywordScore(p, q) };
    })
    .sort((a, b) => b.score - a.score);

  let result = scored.map((s) => s.p);

  // Budgets filter the candidate pool. min is enforced; an absent max means
  // NO maximum — the most expensive piece in the house remains reachable.
  const minK = parseBudget(input.budgetMin);
  const maxK = parseBudget(input.budgetMax);
  if (minK != null || maxK != null) {
    const priceOf = (p: { price: number; completePackagePrice: number | null }) =>
      p.completePackagePrice ?? p.price;
    const within = result.filter((p) => {
      const price = priceOf(p);
      if (minK != null && price < minK) return false;
      if (maxK != null && price > maxK) return false;
      return true;
    });
    // If the budget excludes everything, keep the closest matches instead of
    // an empty result — the customer still sees real pieces with real prices.
    if (within.length > 0) {
      result = within.sort(
        (a, b) =>
          Math.abs(priceOf(a) - (minK ?? maxK ?? priceOf(a))) -
          Math.abs(priceOf(b) - (minK ?? maxK ?? priceOf(b))),
      );
    } else {
      result = [...result].sort((a, b) => priceOf(a) - priceOf(b));
    }
  }

  return result.slice(0, 4).map(toAssistantProduct);
}

// ── Rate limiting (settings-driven, DB-backed) ───────────────────────

async function countTodayInDb(prefix: string): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const start = since.getTime();
  const rows = await db
    .select({ createdAt: analyticsEvents.createdAt })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventName, prefix));
  return rows.filter((r) => (r.createdAt?.getTime() ?? 0) >= start).length;
}

// ── Cache (analytics_events doubles as a cache — cheapest option) ────

const CACHE_PREFIX = "ai_design_cache_v2";
function cacheKey(input: DesignAssistantInput): string {
  const material = {
    t: input.productType,
    o: input.occasion,
    s: input.style,
    c: input.primaryColour,
    c2: input.secondaryColour,
    m: input.material,
    bmin: input.budgetMin,
    bmax: input.budgetMax,
    p: input.personalization,
    n: input.description,
  };
  return `${CACHE_PREFIX}:${Buffer.from(JSON.stringify(material)).toString("base64url")}`;
}

async function readCache(key: string): Promise<{ advice: string; highlights: string[] } | null> {
  const [row] = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventName, key))
    .limit(1);
  if (!row) return null;
  // 24h cache lifetime
  if (Date.now() - (row.createdAt?.getTime() ?? 0) > 24 * 3600 * 1000) return null;
  const meta = row.metadata as { advice?: string; highlights?: string[] } | null;
  if (!meta?.advice) return null;
  return { advice: meta.advice, highlights: meta.highlights ?? [] };
}

async function writeCache(key: string, advice: string, highlights: string[]) {
  await db
    .insert(analyticsEvents)
    .values({ eventName: key, metadata: { advice, highlights } });
}

// ── LLM (optional garnish over deterministic results) ────────────────

async function llmAdvice(
  input: DesignAssistantInput,
  candidates: AssistantProduct[],
): Promise<{ advice: string; highlights: string[] } | null> {
  const key = process.env.NETLIFY_AI_GATEWAY_KEY;
  const base = process.env.NETLIFY_AI_GATEWAY_BASE_URL;
  if (!key || !base) return null;

  // Short context: only the slim catalogue slice goes to the model.
  const catalogue = candidates
    .map(
      (p) =>
        `- ${p.name} (${p.category}${p.subcategory ? ` / ${p.subcategory}` : ""}): ${
          p.customizable ? "can be personalized. " : ""
        }${p.materials ?? ""}`.trim(),
    )
    .join("\n");

  const budget =
    input.budgetMin || input.budgetMax
      ? `₦${input.budgetMin || "0"}${input.budgetMax ? ` – ₦${input.budgetMax}` : " and above (no maximum)"}`
      : "unspecified";

  const prompt = `You are the DREAMZ design assistant for a Nigerian luxury leather fashion house (footwear, bags, accessories).
Customer brief: type=${input.productType}; audience=${input.audience || "unspecified"}; occasion=${input.occasion || "unspecified"}; style=${input.style || "unspecified"}; primary colour=${input.primaryColour || "unspecified"}; secondary colour=${input.secondaryColour || "unspecified"}; material=${input.material || "unspecified"}; sole=${input.sole || "unspecified"}; hardware=${input.hardware || "unspecified"}; personalisation=${input.personalization || "none"}; budget=${budget}; needed by=${input.neededBy || "unspecified"}; notes=${input.description || "none"}.
Catalogue pieces found (verified data only):
${catalogue || "(no catalogue matches)"}

Write 2-3 sentences of warm, elegant style advice that references ONLY these pieces (or explains what to consider next). Never invent products, prices, stock, materials, discounts or delivery promises. Do not use emojis. Do not use headings. Then output a line "HIGHLIGHTS:" followed by 1-3 catalogue piece names from the list above that best match, one per line.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.DREAMZ_AI_TEXT_MODEL || "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 240,
        temperature: 0.6,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    const [main, ...rest] = text.split(/HIGHLIGHTS?:/i);
    const highlights = rest
      .join("")
      .split("\n")
      .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
      .filter((l) => l && candidates.some((c) => c.name.toLowerCase() === l.toLowerCase()))
      .slice(0, 3);
    return { advice: main.trim(), highlights };
  } catch {
    return null;
  }
}

function fallbackAdvice(input: DesignAssistantInput, candidates: AssistantProduct[]): { advice: string; highlights: string[] } {
  const focus = candidates[0];
  const advice = focus
    ? `Our ${focus.category} collection has pieces that suit your brief${input.occasion ? ` for ${input.occasion}` : ""}. ${focus.name} is a strong place to start${focus.customizable ? " and can be personalized to your taste" : ""}. Our client team can refine the choice with you on WhatsApp.`
    : "Our client team will gladly guide your choice — share your occasion and preferences and we will suggest pieces from the collection.";
  return { advice, highlights: candidates.slice(0, 2).map((c) => c.name) };
}

// ── Server functions ─────────────────────────────────────────────────

export const designAssistantRecommend = createServerFn({ method: "POST" })
  .inputValidator(InputSchema)
  .handler(async ({ data }) => {
    await seed();
    const aiConfig = await getSetting("ai", {
      enabled: true,
      dailyRequestCap: 200,
      maxTurnsPerSession: 6,
      conceptEnabled: true,
      conceptDailyCap: 25,
    });

    if (!aiConfig.enabled) {
      return { ok: false as const, reason: "disabled" as const, products: [], advice: "", highlights: [] };
    }

    // Daily cap
    const used = await countTodayInDb("ai_design_request");
    if (used >= aiConfig.dailyRequestCap) {
      return { ok: false as const, reason: "cap" as const, products: [], advice: "", highlights: [] };
    }

    await db
      .insert(analyticsEvents)
      .values({ eventName: "ai_design_request", metadata: { productType: data.productType } });

    // 1. Deterministic catalogue search — always.
    const candidates = await catalogueSearch(data);

    // 2. Cache identical interpretation requests.
    const key = cacheKey(data);
    let advice = await readCache(key);

    // 3. Otherwise, one short LLM call — with deterministic fallback.
    if (!advice) {
      advice = (await llmAdvice(data, candidates)) ?? fallbackAdvice(data, candidates);
      await writeCache(key, advice.advice, advice.highlights);
    }

    // 4. Product facts ALWAYS come from the DB, never from the model.
    const highlightSet = new Set(advice.highlights);
    const ordered = [
      ...candidates.filter((c) => highlightSet.has(c.name)),
      ...candidates.filter((c) => !highlightSet.has(c.name)),
    ];

    return { ok: true as const, products: ordered, advice: advice.advice, highlights: advice.highlights };
  });

// ── Concept image generation (explicit user action only) ─────────────

export const designAssistantConcept = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      brief: z.string().min(10).max(600),
      sessionId: z.string().min(6).max(64),
    }),
  )
  .handler(async ({ data }) => {
    const aiConfig = await getSetting("ai", {
      enabled: true,
      dailyRequestCap: 200,
      conceptEnabled: true,
      conceptDailyCap: 25,
    });
    if (!aiConfig.enabled || !aiConfig.conceptEnabled) {
      return { ok: false as const, reason: "disabled" as const };
    }
    const used = await countTodayInDb("ai_design_concept");
    if (used >= aiConfig.conceptDailyCap) {
      return { ok: false as const, reason: "cap" as const };
    }

    const key = process.env.NETLIFY_AI_GATEWAY_KEY;
    const base = process.env.NETLIFY_AI_GATEWAY_BASE_URL;
    if (!key || !base) return { ok: false as const, reason: "unavailable" as const };

    await db
      .insert(analyticsEvents)
      .values({ eventName: "ai_design_concept", metadata: { brief: data.brief.slice(0, 120) } });

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: { baseUrl: base.replace(/\/$/, "") },
      });
      const response = await ai.models.generateContent({
        model: process.env.DREAMZ_AI_IMAGE_MODEL || "gemini-2.5-flash-image",
        contents: `Studio product-concept sketch on a clean linen background: a single luxury handcrafted leather piece for a contemporary African fashion house. Brief: ${data.brief}. Elegant, minimal, editorial lighting. No text, no logos, no watermarks, no third-party brand marks.`,
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            ok: true as const,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType ?? "image/png",
          };
        }
      }
      return { ok: false as const, reason: "unavailable" as const };
    } catch {
      return { ok: false as const, reason: "unavailable" as const };
    }
  });

// ── Lead capture: the Design Lab brief becomes a design_request ──────

const REFERENCE_MAX_BYTES = 8 * 1024 * 1024;

const RequestSchema = InputSchema.extend({
  referenceImage: z
    .string()
    .max(REFERENCE_MAX_BYTES) // data URL from the browser
    .optional()
    .nullable(),
  aiSummary: z.string().max(2000).optional().nullable(),
  recommendedProductIds: z.array(z.number().int().positive()).max(12).optional(),
});

export const submitDesignRequest = createServerFn({ method: "POST" })
  .inputValidator(RequestSchema)
  .handler(async ({ data }) => {
    await seed();

    const { referenceImage, aiSummary, recommendedProductIds, ...rest } = data;
    const budgetMin = parseBudget(rest.budgetMin);
    const budgetMax = parseBudget(rest.budgetMax);

    // Validate and store the inspiration image in Blobs (never in the URL).
    let referenceImageUrl: string | null = null;
    if (referenceImage) {
      const match = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(referenceImage);
      if (!match) {
        throw new Error("Inspiration image must be a JPG, PNG or WebP file.");
      }
      const mime = match[1];
      const base64 = referenceImage.slice(match[0].length);
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length === 0) {
        throw new Error("The inspiration image could not be read.");
      }
      if (buffer.length > REFERENCE_MAX_BYTES) {
        throw new Error("Please choose an inspiration image under 8 MB.");
      }
      try {
        const store = getBlobStore();
        const key = `design-references/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${mime.split("/")[1]}`;
        const ab = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer;
        await store.set(key, new Blob([ab], { type: mime }));
        // Served through the existing blob-streaming route; the path reveals
        // nothing about the customer.
        referenceImageUrl = `/api/media/${key}`;
      } catch {
        // Storage hiccup must not lose the lead — the brief persists without
        // the image and the customer is told at submission time.
        referenceImageUrl = null;
      }
    }

    const requestNumber = generateRequestNumber();
    const specification: Record<string, unknown> = { ...rest };
    delete (specification as { sessionId?: string }).sessionId;

    await db.insert(designRequests).values({
      requestNumber,
      sessionId: data.sessionId,
      specification,
      aiSummary: aiSummary || null,
      recommendedProductIds: recommendedProductIds ?? [],
      referenceImageUrl,
      budgetMin: budgetMin ?? null,
      budgetMax: budgetMax ?? null,
      status: "new",
    });

    await db
      .insert(analyticsEvents)
      .values({ eventName: "design_request_submitted", metadata: { requestNumber } });

    return { ok: true as const, requestNumber, aiSummary: aiSummary ?? null };
  });
