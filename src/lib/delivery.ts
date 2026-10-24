/**
 * Delivery rules — one implementation shared by the cart, the checkout
 * preview and server-side order creation, so the figure a customer sees is
 * the figure the order records.
 *
 * The admin enters delivery settings in naira (Admin → Settings → Delivery);
 * every calculation here is in integer kobo.
 *
 * Published rules this mirrors:
 *  - Announcement bar: complimentary nationwide delivery on orders above the
 *    free-delivery threshold (₦150,000 by default).
 *  - Complete Package contents: "Doorstep Delivery Anywhere in Nigeria" — a
 *    cart made up only of Complete Package lines carries no delivery fee.
 *  - Otherwise the flat default fee applies to every Nigerian state.
 *  - Nothing is described as complimentary until a delivery state is chosen.
 */

export type ShippingSettings = { defaultFee?: number; freeThreshold?: number };

export const DEFAULT_SHIPPING = { defaultFee: 3500, freeThreshold: 150000 } as const;

export type DeliveryQuote =
  | { status: "needs_state"; feeKobo: null; reason: string }
  | { status: "calculated"; feeKobo: number; reason: "standard" | "free_threshold" | "complete_package" };

export function shippingInKobo(settings: ShippingSettings | null | undefined): {
  defaultFeeKobo: number;
  freeThresholdKobo: number;
} {
  const fee = Number(settings?.defaultFee ?? DEFAULT_SHIPPING.defaultFee);
  const threshold = Number(settings?.freeThreshold ?? DEFAULT_SHIPPING.freeThreshold);
  return {
    defaultFeeKobo: Math.max(0, Math.round((Number.isFinite(fee) ? fee : 0) * 100)),
    // 0 disables the free-delivery threshold.
    freeThresholdKobo: Math.max(0, Math.round((Number.isFinite(threshold) ? threshold : 0) * 100)),
  };
}

export function quoteDelivery(input: {
  state: string | null | undefined;
  merchandiseKobo: number;
  allCompletePackage: boolean;
  settings: ShippingSettings | null | undefined;
}): DeliveryQuote {
  if (!input.state || input.state.trim().length < 2) {
    return { status: "needs_state", feeKobo: null, reason: "Select your state to calculate delivery" };
  }
  if (input.allCompletePackage) return { status: "calculated", feeKobo: 0, reason: "complete_package" };
  const { defaultFeeKobo, freeThresholdKobo } = shippingInKobo(input.settings);
  if (freeThresholdKobo > 0 && input.merchandiseKobo >= freeThresholdKobo) {
    return { status: "calculated", feeKobo: 0, reason: "free_threshold" };
  }
  return { status: "calculated", feeKobo: defaultFeeKobo, reason: "standard" };
}

export function deliveryReasonLabel(reason: string): string {
  switch (reason) {
    case "complete_package":
      return "Included with Complete Package";
    case "free_threshold":
      return "Free — order above the delivery threshold";
    default:
      return "Flat nationwide delivery fee";
  }
}
