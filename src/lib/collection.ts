/**
 * DREAMZ merchandising category suggestions.
 *
 * User-approved price guide:
 *   slides / mules / sandals / easy wear: below ₦50k Essentials
 *   other shoes and footwear: below ₦100k Essentials
 *   bags / leather clothing: below ₦100k Essentials
 *   small leather goods (belts, wallets, purses, cuffs): below ₦50k Essentials
 *   products at or above their boundary: Originals
 *   custom unpriced commissions: Royale (quote-only)
 *
 * These classify the retail range, not quality: product cost and materials
 * remain individually approved by DREAMZ. The administrator's locked choice
 * is never overwritten by an automated suggestion.
 */

export type Collection = "essentials" | "originals" | "royale";
export const COLLECTIONS: Collection[] = ["essentials", "originals", "royale"];
export const COLLECTION_LABELS: Record<Collection, string> = {
  essentials: "DREAMZ Essentials",
  originals: "DREAMZ Originals",
  royale: "DREAMZ Royale",
};
export const COLLECTION_PRICE_BAND_KOBO = 5_000_000;
export const FOOTWEAR_PRICE_BAND_KOBO = 10_000_000;

const EASY_WEAR = new Set(["slide","slides","sandal","sandals","mule","mules","easy wear","slippers","half shoes"]);

export type CollectionInput = {
  colorsCount: number | null; // legacy admin input; colour count never sets quality tier
  priceKobo: number | null;
  categorySlug?: string | null;
  subcategory?: string | null;
};

export type CollectionSuggestion = {
  suggestion: Collection | null;
  needsConfirmation: boolean;
  reason: string | null;
};

export function suggestCollection(input: CollectionInput): CollectionSuggestion {
  const {priceKobo} = input;
  if (priceKobo === null || priceKobo === 0) {
    return {suggestion:"royale",needsConfirmation:false,reason:"Unpriced custom commission — quote-first Royale workflow."};
  }
  if (priceKobo < 0 || !Number.isFinite(priceKobo)) {
    return {suggestion:null,needsConfirmation:true,reason:"Invalid product price."};
  }
  const category=(input.categorySlug??"").toLowerCase().trim();
  if (!["footwear","accessories","bags","leather-wear"].includes(category)) {
    return {suggestion:null,needsConfirmation:true,reason:"Confirm the product category before assigning Essentials or Originals."};
  }
  const subcategory=(input.subcategory??"").toLowerCase().trim();
  const band = category === "accessories" || (category === "footwear" && EASY_WEAR.has(subcategory))
    ? COLLECTION_PRICE_BAND_KOBO
    : FOOTWEAR_PRICE_BAND_KOBO;
  return {suggestion:priceKobo<band?"essentials":"originals",needsConfirmation:false,reason:null};
}

export function collectionFromLegacyTier(raw: string | null | undefined): Collection | null {
  const value=(raw??"").toLowerCase().trim();
  if (value==="essentials") return "essentials";
  if (value==="signature"||value==="originals") return "originals";
  if (value==="bespoke"||value==="royale") return "royale";
  return null;
}

export function needsCategoryConfirmation(args: {
  storedTier: string | null | undefined;
  colorsCount: number | null;
  priceKobo: number | null;
  categorySlug?: string | null;
  subcategory?: string | null;
}): {needs:boolean;reason:string|null} {
  const stored=collectionFromLegacyTier(args.storedTier);
  if (!stored) return {needs:true,reason:"No recognised Essentials, Originals or Royale category on this product."};
  // Royale is a service classification; admin's premium bespoke selection wins
  // regardless of quoted product value. Never demote a bespoke commission.
  if (stored==="royale") return {needs:false,reason:null};
  const s=suggestCollection(args);
  if (s.needsConfirmation) return {needs:true,reason:s.reason};
  if (s.suggestion && s.suggestion!==stored) {
    return {needs:true,reason:`Stored collection (${COLLECTION_LABELS[stored]}) differs from the suggested ${COLLECTION_LABELS[s.suggestion]} price band.`};
  }
  return {needs:false,reason:null};
}
