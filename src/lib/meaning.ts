/**
 * MAKE IT MEANINGFUL — the inspiration-message system.
 *
 * "Choose your design. Carry your meaning."
 *
 * A meaning/theme word and a short brand-neutral universal statement belong
 * to each meaningful product. Inspiration messages (Bible, Qur'an or DREAMZ
 * Quote) are an optional addition the customer chooses explicitly — the house
 * never preselects a source, never infers a religion and never uses an
 * inspiration choice for advertising.
 */

export const MEANING_THEMES = [
  "Vision",
  "Ambition",
  "Faith",
  "Peace",
  "Joy",
  "Love",
  "Hope",
  "Purpose",
  "Courage",
  "Believe",
  "Resolve",
  "Mercy",
  "Excellence",
  "Sacrifice",
  "Mentorship",
  "Legacy",
  "Discipline",
  "Resilience",
  "Wisdom",
  "Gratitude",
  "Grace",
  "Unity",
  "Relationships",
  "Patience",
  "Growth",
  "Focus",
  "Commitment",
  "Possibility",
  "Service",
  "Leadership",
  "Integrity",
  "Balance",
  "Confidence",
] as const;

export type MeaningTheme = (typeof MEANING_THEMES)[number];

export const MESSAGE_SOURCES = ["bible", "quran", "dreamz"] as const;
export type MessageSource = (typeof MESSAGE_SOURCES)[number];

export const SOURCE_LABELS: Record<MessageSource, string> = {
  bible: "Bible",
  quran: "Qur’an",
  dreamz: "DREAMZ Quote",
};

/** Placements the house offers, in display order. */
export const MESSAGE_PLACEMENTS = [
  "message_card",
  "gift_note",
  "inside_label",
  "inside_lining",
  "embossing",
  "engraving",
] as const;
export type MessagePlacement = (typeof MESSAGE_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<MessagePlacement, string> = {
  message_card: "Message Card",
  gift_note: "Gift Note",
  inside_label: "Inside Label",
  inside_lining: "Inside Lining",
  embossing: "Embossing",
  engraving: "Engraving",
};

/** Physical placements (everything except the card/note pair). */
const PHYSICAL_PLACEMENTS: ReadonlySet<string> = new Set([
  "inside_label",
  "inside_lining",
  "embossing",
  "engraving",
]);

/**
 * Surfaces that routinely contact the ground or are exposed to dirt and
 * abrasion. Sacred text (Bible/Qur'an) is never applied to them — a sacred
 * message selected with such a placement falls back to the Message Card.
 */
const SACRED_FORBIDDEN_PLACEMENTS: ReadonlySet<string> = new Set([
  "sole",
  "outsole",
  "heel",
  "ground_contact",
]);

/**
 * Default placement allow-list for a product the admin has not customised.
 * Which placements are physically appropriate is decided per product by the
 * admin (`allowedMessagePlacements`); the card and gift note are always
 * available because they never touch the piece.
 */
export function placementsForProduct(allowed: string[] | null | undefined): MessagePlacement[] {
  if (!allowed || allowed.length === 0) return ["message_card", "gift_note"];
  return MESSAGE_PLACEMENTS.filter((p) => allowed.includes(p));
}

/**
 * Resolve the placement a message may actually use. A sacred message with an
 * ineligible placement falls back to the Message Card; a DREAMZ quote may use
 * any placement the product allows. Returns null when nothing is appropriate.
 */
export function resolvePlacement(opts: {
  source: MessageSource;
  requested: MessagePlacement | string;
  allowed: MessagePlacement[];
}): MessagePlacement | null {
  const requested = opts.requested as MessagePlacement;
  if (!opts.allowed.includes(requested)) {
    return opts.source === "dreamz" ? null : opts.allowed.includes("message_card") ? "message_card" : null;
  }
  if (opts.source !== "dreamz" && SACRED_FORBIDDEN_PLACEMENTS.has(requested)) return "message_card";
  return requested;
}

/** Is this placement a physical application on the product itself? */
export function isPhysicalPlacement(placement: string): boolean {
  return PHYSICAL_PLACEMENTS.has(placement);
}

/** Source kinds that must be treated with additional reverence. */
export function isSacredSource(source: string): boolean {
  return source === "bible" || source === "quran";
}

/** The four equally-treated opening choices. "No Message" is always valid. */
export const INSPIRATION_CHOICES = [
  { key: "bible", label: "Bible" },
  { key: "quran", label: "Qur’an" },
  { key: "dreamz", label: "DREAMZ Quote" },
  { key: "none", label: "No Message" },
] as const;

/** Immutable snapshot stored on the order line at checkout time. */
export type MessageSnapshot = {
  messageId: string;
  version: number;
  theme: string;
  source: MessageSource;
  text: string;
  reference: string | null;
  translation: string | null;
  attribution: string | null;
  placement: MessagePlacement;
  placementLabel: string;
  rtl: boolean;
  /** Server-computed placement charge in kobo (null = priced after review). */
  chargeKobo?: number | null;
};

/** Build the immutable snapshot from a catalogue row + chosen placement. */
export function snapshotFromMessage(
  m: {
    messageId: string;
    version: number;
    theme: string;
    source: string;
    text: string;
    reference: string | null;
    translation: string | null;
    attribution: string | null;
    rtl: boolean;
  },
  placement: MessagePlacement,
): MessageSnapshot {
  return {
    messageId: m.messageId,
    version: m.version,
    theme: m.theme,
    source: m.source as MessageSource,
    text: m.text,
    reference: m.reference,
    translation: m.translation,
    attribution: m.attribution,
    placement,
    placementLabel: PLACEMENT_LABELS[placement] ?? placement,
    rtl: m.rtl,
  };
}

/** Cart-line discriminator: two different personalisations never merge. */
export function messageLineKey(s: MessageSnapshot | null | undefined): string {
  if (!s) return "";
  return [s.messageId, s.version, s.placement].join("::");
}

/** Human-readable line the artisan and admin both read. */
export function messageSummary(s: MessageSnapshot | null | undefined): string | null {
  if (!s) return null;
  const parts = [`"${s.text}"`];
  if (s.reference) parts.push(s.reference);
  parts.push(`${PLACEMENT_LABELS[s.placement] ?? s.placement}`);
  return parts.join(" · ");
}
