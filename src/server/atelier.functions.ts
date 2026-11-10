import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { analyticsEvents, designRequests } from "../../db/schema";
import { getCurrentCustomer } from "./auth.server";
import { generateRequestNumber } from "@/lib/format";
import { getBlobStore } from "./blobs.server";
import {
  ATELIER_CATEGORIES,
  buildArtisanBrief,
  buildDesignSummary,
  buildQuoteBrief,
  buildRenderPrompt,
  classifyFashionRequest,
  safeLeatherMaterial,
  stripPrivateInfo,
  type AtelierBrief,
} from "@/lib/atelier";

/**
 * DREAMZ LEATHER ATELIER — the DREAMZ DREAM-TO-LEATHER METHOD (server).
 *
 * The site does not generate images and does not try to be a chatbot. It
 * interviews the client (progressive steps in the UI), translates the
 * answers into professional leathercraft language, detects missing
 * requirements and produces: a design summary, a DREAMZ render prompt the
 * customer can run in a stronger external visual model, an artisan
 * production brief and a structured quote brief saved for the house.
 *
 * Everything is composed deterministically from the structured interview, so
 * the storefront keeps working with the AI Gateway disabled and no AI image
 * generation happens during ordinary customisation.
 */

const MAX_BRIEF_TEXT = 400;

const BriefSchema = z.object({
  category: z.enum(["footwear", "bags", "accessories", "wearable", "other"]),
  piece: z.string().min(1).max(80),
  meaning: z.array(z.string().max(60)).max(8).default([]),
  customMeaning: z.string().max(MAX_BRIEF_TEXT).optional().or(z.literal("")),
  story: z.string().max(1200).optional().or(z.literal("")),
  forWhom: z.string().max(120).optional().or(z.literal("")),
  stylePreference: z.string().max(80).optional().or(z.literal("")),
  designAudience: z.enum(["Male", "Female", "Unisex"]).optional().or(z.literal("")),
  dreamGoal: z.string().max(180).optional().or(z.literal("")),
  paintingChoice: z.enum(["yes", "no"]).default("no"),
  paintingNotes: z.string().max(240).optional().or(z.literal("")),
  occasion: z.string().max(120).optional().or(z.literal("")),
  sizeOrMeasurements: z.string().max(200).optional().or(z.literal("")),
  neededBy: z.string().max(60).optional().or(z.literal("")),
  feel: z.array(z.string().max(40)).max(6).default([]),
  primaryColour: z.string().max(60).optional().or(z.literal("")),
  secondaryColour: z.string().max(60).optional().or(z.literal("")),
  pattern: z.string().max(120).optional().or(z.literal("")),
  texture: z.string().max(120).optional().or(z.literal("")),
  material: z.string().max(120).optional().or(z.literal("")),
  construction: z.record(z.string().max(40), z.string().max(200)).default({}),
  personalisation: z
    .object({ type: z.string().max(40).default("none"), text: z.string().max(120).optional().or(z.literal("")) })
    .default({ type: "none" }),
  inspirationNotes: z.string().max(800).optional().or(z.literal("")),
  budgetNaira: z.string().max(14).optional().or(z.literal("")),
});

export type AtelierBriefInput = z.infer<typeof BriefSchema>;

/** Free-text fields that must be screened for non-fashion requests. */
const FREE_TEXT_FIELDS = ["story", "inspirationNotes", "customMeaning", "occasion", "forWhom", "dreamGoal", "paintingNotes"] as const;

export const composeDreamToLeather = createServerFn({ method: "POST" })
  .inputValidator(BriefSchema)
  .handler(async ({ data }) => {
    // Classify before anything reaches the design engine: furniture,
    // automotive and upholstery requests are politely refused.
    for (const field of FREE_TEXT_FIELDS) {
      const value = (data as Record<string, unknown>)[field];
      if (typeof value === "string" && value) {
        const verdict = classifyFashionRequest(value);
        if (!verdict.suitable) {
          await db
            .insert(analyticsEvents)
            .values({ eventName: "atelier_request_rejected", metadata: { field, category: data.category } });
          return { ok: false as const, rejected: true as const, message: verdict.message };
        }
      }
    }
    const pieceVerdict = classifyFashionRequest(data.piece);
    if (!pieceVerdict.suitable) {
      return { ok: false as const, rejected: true as const, message: pieceVerdict.message };
    }

    const brief = normaliseBrief(data);
    const designSummary = stripPrivateInfo(buildDesignSummary(brief));
    const renderPrompt = stripPrivateInfo(buildRenderPrompt(brief));
    const artisanBrief = stripPrivateInfo(buildArtisanBrief(brief));

    return {
      ok: true as const,
      designSummary,
      renderPrompt,
      artisanBrief,
    };
  });

function normaliseBrief(data: AtelierBriefInput): AtelierBrief {
  return {
    ...data,
    // Exotic materials are described safely until the house verifies
    // genuine availability (admin setting).
    material: data.material ? safeLeatherMaterial(data.material, process.env.DREAMZ_EXOTIC_LEATHER_VERIFIED === "true") : "",
    feel: data.feel ?? [],
    meaning: data.meaning ?? [],
    construction: data.construction ?? {},
  };
}

// ── Submission: the quote brief is saved for the house ───────────────

const REFERENCE_MAX_BYTES = 8 * 1024 * 1024;
const MAX_REFERENCE_IMAGES = 4;

const ReferenceSchema = z
  .string()
  .max(REFERENCE_MAX_BYTES) // data URL from the browser
  .optional()
  .nullable();

const SubmitSchema = BriefSchema.extend({
  sessionId: z.string().min(6).max(80),
  customerName: z.string().max(120).optional().or(z.literal("")),
  email: z.string().max(140).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  referenceImages: z.array(ReferenceSchema).max(MAX_REFERENCE_IMAGES).optional(),
  designSummary: z.string().max(4000).optional().or(z.literal("")),
  renderPrompt: z.string().max(8000).optional().or(z.literal("")),
  artisanBrief: z.string().max(4000).optional().or(z.literal("")),
  recommendedProductIds: z.array(z.number().int().positive()).max(3).optional(),
});

export const submitAtelierBrief = createServerFn({ method: "POST" })
  .inputValidator(SubmitSchema)
  .handler(async ({ data }) => {
    // The classification gate runs again at submission — nothing unsuitable
    // ever reaches the design engine.
    for (const field of FREE_TEXT_FIELDS) {
      const value = (data as Record<string, unknown>)[field];
      if (typeof value === "string" && value) {
        const verdict = classifyFashionRequest(value);
        if (!verdict.suitable) return { ok: false as const, rejected: true as const, message: verdict.message };
      }
    }

    const brief = normaliseBrief(data);
    const designSummary = data.designSummary || stripPrivateInfo(buildDesignSummary(brief));
    const renderPrompt = data.renderPrompt || stripPrivateInfo(buildRenderPrompt(brief));
    const artisanBrief = data.artisanBrief || stripPrivateInfo(buildArtisanBrief(brief));

    // Validate and store inspiration images in Blobs (never in the URL).
    const referenceUrls: string[] = [];
    if (data.referenceImages?.length) {
      try {
        const store = getBlobStore();
        for (const image of data.referenceImages) {
          if (!image) continue;
          const match = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(image);
          if (!match) throw new Error("Inspiration images must be JPG, PNG or WebP files.");
          const mime = match[1];
          const buffer = Buffer.from(image.slice(match[0].length), "base64");
          if (buffer.length === 0) throw new Error("An inspiration image could not be read.");
          if (buffer.length > REFERENCE_MAX_BYTES) throw new Error("Please choose inspiration images under 8 MB.");
          const key = `design-references/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${mime.split("/")[1]}`;
          const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
          await store.set(key, new Blob([ab], { type: mime }));
          referenceUrls.push(`/api/media/${key}`);
        }
      } catch {
        // Storage trouble must not lose the lead — the brief persists
        // without the images and the customer is told at submission time.
      }
    }

    const customer = await getCurrentCustomer().catch(() => null);
    const budgetMin = parseNaira(data.budgetNaira);
    const requestNumber = generateRequestNumber();
    const quoteBrief = buildQuoteBrief(brief, {
      requestNumber,
      renderPrompt,
      artisanBrief,
      designSummary,
      catalogueIds: data.recommendedProductIds ?? [],
      inspirationCount: referenceUrls.length,
    });

    await db.insert(designRequests).values({
      requestNumber,
      sessionId: data.sessionId,
      customerId: customer?.id ?? null,
      customerName: data.customerName || null,
      email: data.email || null,
      phone: data.phone || null,
      specification: { ...quoteBrief, referenceImageUrls: referenceUrls },
      category: data.category,
      aiSummary: designSummary.slice(0, 2000),
      renderPrompt,
      artisanBrief,
      recommendedProductIds: data.recommendedProductIds ?? [],
      referenceImageUrl: referenceUrls[0] ?? null,
      budgetMin: budgetMin,
      budgetMax: budgetMin,
      deadline: data.neededBy || null,
      status: "new",
    });

    await db
      .insert(analyticsEvents)
      .values({ eventName: "atelier_brief_submitted", metadata: { requestNumber, category: data.category } });

    return { ok: true as const, requestNumber };
  });

function parseNaira(input: string | undefined): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value * 100;
}

/** Category metadata for the atelier UI (kept in one place). */
export const atelierCategories = ATELIER_CATEGORIES;
