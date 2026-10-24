/**
 * One availability system for the whole site.
 *
 * Allowed states (admin-managed per product):
 *   available | made_to_order | on_request | out_of_stock | sold_out
 * "unpublished" is handled by product status (draft/archived), never shown
 * on the storefront.
 *
 * Rule enforced everywhere: a product with a non-purchasable state never
 * shows Add to Cart / Buy Now. It shows the configured alternative instead
 * (Notify me / Ask on WhatsApp / Request this piece) — never invented stock.
 */

export type AvailabilityState =
  | "available"
  | "made_to_order"
  | "on_request"
  | "out_of_stock"
  | "sold_out";

export const AVAILABILITY_STATES: AvailabilityState[] = [
  "available",
  "made_to_order",
  "on_request",
  "out_of_stock",
  "sold_out",
];

export const AVAILABILITY_LABELS: Record<AvailabilityState, string> = {
  available: "Available",
  made_to_order: "Made to Order",
  on_request: "Available on Request",
  out_of_stock: "Out of Stock",
  sold_out: "Sold Out",
};

/** Legacy values used by earlier seeds map onto the new system. */
function normalize(raw: string | null | undefined): AvailabilityState {
  const value = (raw ?? "").toLowerCase();
  switch (value) {
    case "in_stock":
    case "available":
      return "available";
    case "made_to_order":
    case "pre_order":
      return "made_to_order";
    case "on_request":
    case "available_on_request":
      return "on_request";
    case "out_of_stock":
      return "out_of_stock";
    case "sold_out":
      return "sold_out";
    default:
      return "available";
  }
}

export type AvailabilityInfo = {
  state: AvailabilityState;
  label: string;
  /** True only when purchase CTAs (Add to Cart / Buy Now) may be shown. */
  purchasable: boolean;
  /** The alternative CTA when not purchasable. */
  altCta: { label: "Notify Me" | "Ask on WhatsApp" | "Request This Piece"; kind: "notify" | "whatsapp" | "request" } | null;
};

export function availabilityOf(
  product: { availability: string; stockQuantity: number },
  opts?: { hasStock?: boolean },
): AvailabilityInfo {
  const state = normalize(product.availability);
  const hasStock = opts?.hasStock ?? product.stockQuantity > 0;

  if (state === "out_of_stock" || state === "sold_out" || (state === "available" && !hasStock)) {
    return {
      state: state === "sold_out" ? "sold_out" : "out_of_stock",
      label: AVAILABILITY_LABELS[state === "sold_out" ? "sold_out" : "out_of_stock"],
      purchasable: false,
      altCta: { label: "Notify Me", kind: "notify" },
    };
  }
  if (state === "made_to_order") {
    return {
      state,
      label: AVAILABILITY_LABELS.made_to_order,
      purchasable: true,
      altCta: null,
    };
  }
  if (state === "on_request") {
    return {
      state,
      label: AVAILABILITY_LABELS.on_request,
      purchasable: false,
      altCta: { label: "Request This Piece", kind: "request" },
    };
  }
  return {
    state: "available",
    label: AVAILABILITY_LABELS.available,
    purchasable: true,
    altCta: null,
  };
}
