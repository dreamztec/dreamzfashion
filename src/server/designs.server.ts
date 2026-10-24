import { db } from "../../db/index";
import { customDesigns, designReferences, products } from "../../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  templateForSku,
  templateForModel,
  validateSelection,
  selectionSummary,
  type DesignSelection,
} from "@/lib/design-templates";
import { detectImageType, REFERENCE_LIMITS } from "@/lib/reference-upload";

/**
 * Custom designs and their private inspiration references. Plain server
 * module (not *.functions.ts) so the API route and server functions share it.
 */

function randomId(len: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function selectionFromDesignRow(row: typeof customDesigns.$inferSelect): Record<string, string> {
  const template = templateForModel(row.modelId);
  const summary = template
    ? selectionSummary(template, { parts: row.parts, materials: row.materials, components: row.geometry, size: row.size })
    : { ...row.parts };
  const out: Record<string, string> = {
    "Design version": `${row.modelId} ${row.modelVersion} · v${row.configVersion}`,
    ...summary,
  };
  if (row.referenceIds?.length) out["Reference images"] = `${row.referenceIds.length} attached`;
  if (row.notes) out["Notes"] = row.notes.slice(0, 300);
  return out;
}

export async function storeReference(file: { bytes: Uint8Array; name: string | null }): Promise<{ refId: string; contentType: string }> {
  if (file.bytes.byteLength === 0) throw new Error("The file is empty.");
  if (file.bytes.byteLength > REFERENCE_LIMITS.maxBytes) {
    throw new Error(`Each image must be ${REFERENCE_LIMITS.maxLabel} or smaller.`);
  }
  // Trust the file's bytes, never its name or the browser's MIME claim.
  const contentType = detectImageType(file.bytes);
  if (!contentType) throw new Error("Please upload a JPG, PNG, WebP or HEIC image.");
  const refId = `ref_${randomId(20)}`;
  const blobKey = `design-refs/${refId}`;
  const { getBlobStore } = await import("./blobs.server");
  const ab = file.bytes.buffer.slice(file.bytes.byteOffset, file.bytes.byteOffset + file.bytes.byteLength) as ArrayBuffer;
  await getBlobStore().set(blobKey, new Blob([ab], { type: contentType }), {
    metadata: { contentType },
  });
  await db.insert(designReferences).values({
    refId,
    blobKey,
    contentType,
    sizeBytes: file.bytes.byteLength,
    originalName: file.name ? file.name.slice(0, 120) : null,
  });
  return { refId, contentType };
}

export async function readReference(refId: string): Promise<{ blob: Blob; contentType: string } | null> {
  if (!/^ref_[A-Z0-9]{20}$/.test(refId)) return null;
  const [row] = await db.select().from(designReferences).where(eq(designReferences.refId, refId)).limit(1);
  if (!row) return null;
  const { getBlobStore } = await import("./blobs.server");
  const blob = await getBlobStore().get(row.blobKey, { type: "blob" });
  if (!blob) return null;
  return { blob, contentType: row.contentType };
}

export type SaveDesignInput = {
  designId?: string | null;
  editToken?: string | null;
  productId: number;
  selection: DesignSelection;
  referenceIds: string[];
  notes?: string | null;
};

export async function saveDesign(input: SaveDesignInput) {
  const [p] = await db
    .select({ id: products.id, sku: products.sku, status: products.status })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  if (!p || p.status !== "published") throw new Error("This product is not available to customise.");
  const template = templateForSku(p.sku);
  if (!template) throw new Error("This product is not available in the design workspace yet.");
  const errors = validateSelection(template, input.selection);
  if (errors.length) throw new Error(errors[0]);

  const refIds = [...new Set(input.referenceIds)].slice(0, REFERENCE_LIMITS.maxFiles);
  if (refIds.length) {
    const found = await db
      .select({ refId: designReferences.refId })
      .from(designReferences)
      .where(inArray(designReferences.refId, refIds));
    if (found.length !== refIds.length) throw new Error("One of your reference images could not be found — please upload it again.");
  }

  const values = {
    productId: p.id,
    modelId: template.modelId,
    modelVersion: template.modelVersion,
    configVersion: 1,
    parts: input.selection.parts,
    materials: input.selection.materials,
    geometry: input.selection.components,
    size: input.selection.size,
    referenceIds: refIds,
    notes: input.notes?.trim().slice(0, 1000) || null,
    updatedAt: new Date(),
  };

  let designId: string;
  let editToken: string;
  if (input.designId && input.editToken) {
    const [existing] = await db
      .select()
      .from(customDesigns)
      .where(and(eq(customDesigns.designId, input.designId), eq(customDesigns.editToken, input.editToken)))
      .limit(1);
    if (!existing) throw new Error("This design link is not valid any more. Save it as a new design.");
    // A quoted design is frozen: changes start a new design.
    if (existing.priceStatus === "quoted") {
      designId = `DZD-${randomId(8)}`;
      editToken = randomId(24);
      await db.insert(customDesigns).values({ designId, editToken, ...values });
    } else {
      designId = existing.designId;
      editToken = existing.editToken;
      await db
        .update(customDesigns)
        .set({ ...values, configVersion: existing.configVersion + 1 })
        .where(eq(customDesigns.id, existing.id));
    }
  } else {
    designId = `DZD-${randomId(8)}`;
    editToken = randomId(24);
    await db.insert(customDesigns).values({ designId, editToken, ...values });
  }
  if (refIds.length) {
    await db.update(designReferences).set({ designId }).where(inArray(designReferences.refId, refIds));
  }
  return { designId, editToken, summary: selectionSummary(template, input.selection) };
}

export async function loadDesign(designId: string, editToken: string) {
  const [row] = await db
    .select()
    .from(customDesigns)
    .where(and(eq(customDesigns.designId, designId), eq(customDesigns.editToken, editToken)))
    .limit(1);
  if (!row) return null;
  const refs = row.referenceIds.length
    ? await db
        .select({ refId: designReferences.refId, contentType: designReferences.contentType, originalName: designReferences.originalName })
        .from(designReferences)
        .where(inArray(designReferences.refId, row.referenceIds))
    : [];
  return {
    designId: row.designId,
    productId: row.productId,
    modelId: row.modelId,
    modelVersion: row.modelVersion,
    configVersion: row.configVersion,
    selection: {
      parts: row.parts,
      materials: row.materials,
      components: row.geometry,
      size: row.size,
    } satisfies DesignSelection,
    references: refs,
    notes: row.notes ?? "",
    priceStatus: row.priceStatus,
    quotedPriceKobo: row.quotedPriceKobo,
  };
}
