import { db } from "../../db/index";
import { inspirationMessages, products, type Product } from "../../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSetting } from "./catalog.server";
import {
  MESSAGE_PLACEMENTS,
  PLACEMENT_LABELS,
  isPhysicalPlacement,
  isSacredSource,
  placementsForProduct,
  resolvePlacement,
  snapshotFromMessage,
  type MessagePlacement,
  type MessageSnapshot,
} from "../lib/meaning";

/**
 * Server side of MAKE IT MEANINGFUL. Only APPROVED messages leave the
 * catalogue; wording, charges and placement eligibility are always decided
 * here — never from browser input.
 */

export type PlacementPricing = Partial<Record<MessagePlacement, number | null>>;

/**
 * Admin-controlled placement pricing in naira. `0` = explicitly complimentary
 * (shown as such); a missing/null entry = priced after review → the line
 * becomes a quote line. Nothing is ever silently advertised as free.
 */
export async function getPlacementPricing(): Promise<PlacementPricing> {
  const s = await getSetting<{ placements?: PlacementPricing }>("meaning", { placements: { message_card: 0, gift_note: 0 } });
  return s.placements ?? {};
}

/** kobo charge for a placement, or null when costing is not configured. */
export async function placementChargeKobo(placement: MessagePlacement): Promise<number | null> {
  const pricing = await getPlacementPricing();
  const value = pricing[placement];
  if (value == null) return null;
  return Math.max(0, Math.round(value * 100));
}

export async function getApprovedMessages(source?: string): Promise<Array<typeof inspirationMessages.$inferSelect>> {
  const conds = [eq(inspirationMessages.status, "approved")];
  if (source) conds.push(eq(inspirationMessages.source, source));
  return db
    .select()
    .from(inspirationMessages)
    .where(and(...conds))
    .orderBy(inspirationMessages.theme, inspirationMessages.messageId);
}

export type ResolvedMessage =
  | { ok: true; snapshot: MessageSnapshot; chargeKobo: number | null; quoteRequired: boolean }
  | { ok: false; reason: string };

/**
 * Validate a customer's inspiration selection against the catalogue and the
 * product, resolve the placement (sacred text falls back to the Message Card
 * where a physical placement is inappropriate) and compute the charge
 * server-side. Nothing here trusts the browser.
 */
export async function resolveMessageForCheckout(opts: {
  product: Pick<Product, "id" | "name" | "inspirationEligible" | "allowedMessagePlacements">;
  message: { messageId: string; version: number; placement: string };
}): Promise<ResolvedMessage> {
  if (!opts.product.inspirationEligible) {
    return { ok: false, reason: `${opts.product.name} does not carry inspiration messages.` };
  }
  const [row] = await db
    .select()
    .from(inspirationMessages)
    .where(
      and(
        eq(inspirationMessages.messageId, opts.message.messageId),
        eq(inspirationMessages.version, opts.message.version),
      ),
    )
    .limit(1);
  if (!row) return { ok: false, reason: "That inspiration message could not be found." };
  if (row.status !== "approved") {
    return { ok: false, reason: "That inspiration message is not available." };
  }

  const allowed = placementsForProduct(opts.product.allowedMessagePlacements);
  const requested = MESSAGE_PLACEMENTS.includes(opts.message.placement as MessagePlacement)
    ? (opts.message.placement as MessagePlacement)
    : "message_card";
  const placement = resolvePlacement({
    source: row.source as "bible" | "quran" | "dreamz",
    requested,
    allowed,
  });
  if (!placement) {
    return { ok: false, reason: "That placement is not available for this piece." };
  }

  const chargeKobo = await placementChargeKobo(placement);
  const quoteRequired = chargeKobo == null && isPhysicalPlacement(placement) && isSacredSource(row.source)
    ? true
    : chargeKobo == null && isPhysicalPlacement(placement);
  return {
    ok: true,
    snapshot: snapshotFromMessage(row, placement),
    chargeKobo,
    quoteRequired,
  };
}

/** Re-snapshots historic order wording — used by order/admin projections. */
export function snapshotIsComplete(s: unknown): s is MessageSnapshot {
  const v = s as MessageSnapshot | null;
  return !!v && typeof v.text === "string" && typeof v.messageId === "string";
}

/** Products referenced by the atelier catalogue recommender. */
export async function publishedProductSummaries(ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
    })
    .from(products)
    .where(inArray(products.id, ids));
}

export const PLACEMENT_LABEL_MAP = PLACEMENT_LABELS;
