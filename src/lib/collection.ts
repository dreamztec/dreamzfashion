/**
 * The three customer-facing DREAMZ collections and the automatic
 * classification SUGGESTION engine.
 *
 * Collections (customer-facing):
 *   essentials — ready-to-wear / accessible
 *   originals  — distinctive DREAMZ house designs
 *   royale     — premium design & customization service (quote-first)
 *
 * The automatic rules are SUGGESTIONS ONLY. The admin's manually selected
 * collection always overrides them. Ambiguous data (exactly 3 colours,
 * exactly ₦50,000, missing colour data) is NEVER guessed — it is flagged
 * "Needs Category Confirmation" for the admin review queue.
 */

export type Collection = "essentials" | "originals" | "royale";

export const COLLECTIONS: Collection[] = ["essentials", "originals", "royale"];

export const COLLECTION_LABELS: Record<Collection, string> = {
  essentials: "DREAMZ Essentials",
  originals: "DREAMZ Originals",
  royale: "DREAMZ Royale",
};

/** The ₦50,000 band boundary used by the automatic suggestion rules (kobo). */
export const COLLECTION_PRICE_BAND_KOBO = 5_000_000;

export type CollectionInput = {
  /** Number of colours on the design (missing/null = unknown). */
  colorsCount: number | null;
  /** Public product price in kobo (0 or null = quote-only / unpriced). */
  priceKobo: number | null;
};

export type CollectionSuggestion = {
  /** Automatic suggestion, or null when the data cannot be classified. */
  suggestion: Collection | null;
  /** True when the rules are ambiguous and the admin must decide. */
  needsConfirmation: boolean;
  /** Human-readable explanation for the admin queue. */
  reason: string | null;
};

/**
 * Automatic collection suggestion — never destructive, never a guess.
 *
 * - Essentials: ≤ 2 colours AND price below ₦50,000
 * - Originals:  > 3 colours AND price above ₦50,000
 * - Royale:     no public price (quote-only)
 * - Anything else: ambiguous → Needs Category Confirmation
 */
export function suggestCollection(input: CollectionInput): CollectionSuggestion {
  const { colorsCount, priceKobo } = input;
  const coloursKnown = typeof colorsCount === "number" && colorsCount >= 0;
  const priced = typeof priceKobo === "number" && priceKobo > 0;

  // Quote-only / unpriced pieces belong to the Royale design service.
  if (!priced) {
    return {
      suggestion: "royale",
      needsConfirmation: false,
      reason: "No public price — treated as the Royale design service.",
    };
  }

  if (!coloursKnown) {
    return {
      suggestion: null,
      needsConfirmation: true,
      reason: "Colour data is missing, so the collection rules cannot be applied.",
    };
  }

  const belowBand = priceKobo < COLLECTION_PRICE_BAND_KOBO;
  const aboveBand = priceKobo > COLLECTION_PRICE_BAND_KOBO;

  if (colorsCount <= 2 && belowBand) {
    return { suggestion: "essentials", needsConfirmation: false, reason: null };
  }
  if (colorsCount > 3 && aboveBand) {
    return { suggestion: "originals", needsConfirmation: false, reason: null };
  }

  // Ambiguous combinations — do not guess.
  if (colorsCount === 3 && priceKobo === COLLECTION_PRICE_BAND_KOBO) {
    return {
      suggestion: null,
      needsConfirmation: true,
      reason: "Exactly 3 colours at exactly ₦50,000 — both rules are inconclusive.",
    };
  }
  if (colorsCount === 3) {
    return {
      suggestion: null,
      needsConfirmation: true,
      reason: "Exactly 3 colours sits between the Essentials (≤2) and Originals (>3) colour rules.",
    };
  }
  if (priceKobo === COLLECTION_PRICE_BAND_KOBO) {
    return {
      suggestion: null,
      needsConfirmation: true,
      reason: "Priced at exactly ₦50,000 — neither below nor above the band boundary.",
    };
  }
  return {
    suggestion: null,
    needsConfirmation: true,
    reason: `Colour/price mix (${colorsCount} colours, ${
      priceKobo / 100
    } ₦) does not clearly match Essentials or Originals.`,
  };
}

/**
 * Legacy tier values found in stored data → customer-facing collection.
 * "signature" was the old face of Originals; "bespoke" was the old face of
 * Royale. Only exact legacy names are remapped — anything unknown stays
 * untouched and lands in the review queue.
 */
export function collectionFromLegacyTier(raw: string | null | undefined): Collection | null {
  const value = (raw ?? "").toLowerCase();
  if (value === "essentials") return "essentials";
  if (value === "signature" || value === "originals") return "originals";
  if (value === "bespoke" || value === "royale") return "royale";
  return null;
}

/** Does a stored row's collection clearly match what the rules suggest? */
export function needsCategoryConfirmation(args: {
  storedTier: string | null | undefined;
  colorsCount: number | null;
  priceKobo: number | null;
}): { needs: boolean; reason: string | null } {
  const stored = collectionFromLegacyTier(args.storedTier);
  if (!stored) {
    return { needs: true, reason: "No recognisable collection is set on this product." };
  }
  const s = suggestCollection({ colorsCount: args.colorsCount, priceKobo: args.priceKobo });
  if (s.needsConfirmation) {
    return { needs: true, reason: s.reason };
  }
  if (s.suggestion && s.suggestion !== stored) {
    return {
      needs: true,
      reason: `Stored collection (${COLLECTION_LABELS[stored]}) differs from the automatic suggestion (${COLLECTION_LABELS[s.suggestion]}).`,
    };
  }
  return { needs: false, reason: null };
}
