import { createServerFn } from "@tanstack/react-start";
import { getBnplStatus } from "./payments.server";
import { getSetting } from "./catalog.server";
import { db } from "../../db/index";
import { products } from "../../db/schema";
import { inArray } from "drizzle-orm";

/**
 * Public-safe checkout configuration for the client: whether a real BNPL
 * provider is configured and enabled. Reveals nothing about credentials.
 */
export const getCheckoutOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    const bnpl = getBnplStatus();
    const deposits = await getSetting("deposits", {
      enabled: false,
      defaultPercent: 50,
      balanceDueDays: 14,
      termsText: "",
    });
    return { bnplAvailable: bnpl.available, bnplLabel: bnpl.label, deposits };
  },
);

/**
 * Whether EVERY product in the cart is eligible for the deposit plan (the
 * server re-verifies this at order creation — this only controls what the
 * checkout UI offers).
 */
export const checkDepositEligibility = createServerFn({ method: "GET" })
  .inputValidator((productIds: number[]) => productIds)
  .handler(async ({ data: productIds }) => {
    if (productIds.length === 0) return { eligible: false };
    const deposits = await getSetting("deposits", {
      enabled: false,
      defaultPercent: 50,
      balanceDueDays: 14,
      termsText: "",
    });
    if (!deposits.enabled) return { eligible: false };
    const rows = await db
      .select({ depositEligible: products.depositEligible, checkoutReady: products.checkoutReady, price: products.price })
      .from(products)
      .where(inArray(products.id, productIds));
    const eligible =
      rows.length === productIds.length &&
      rows.every((r) => r.depositEligible && r.checkoutReady && r.price > 0);
    return {
      eligible,
      percent: Math.min(90, Math.max(1, deposits.defaultPercent ?? 50)),
      termsText: (deposits.termsText as string) || "",
      balanceDueDays: deposits.balanceDueDays ?? 0,
    };
  });
