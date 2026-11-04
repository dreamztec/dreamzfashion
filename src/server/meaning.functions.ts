import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getApprovedMessages, getPlacementPricing } from "./meaning.server";
import { seed } from "./seed.server";

/**
 * Public MAKE IT MEANINGFUL RPCs. Only APPROVED messages are ever returned;
 * drafts and archived versions stay in the catalogue for the admin.
 */
export const getInspirationMessages = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      source: z.enum(["bible", "quran", "dreamz"]),
    }),
  )
  .handler(async ({ data }) => {
    await seed();
    const messages = await getApprovedMessages(data.source);
    return {
      messages: messages.map((m) => ({
        messageId: m.messageId,
        version: m.version,
        theme: m.theme,
        text: m.text,
        reference: m.reference,
        translation: m.translation,
        attribution: m.attribution,
        rtl: m.rtl,
      })),
    };
  });

/** Admin-controlled placement pricing (naira; null = priced after review). */
export const getMeaningPlacementPricing = createServerFn({ method: "POST" }).handler(
  async () => {
    const pricing = await getPlacementPricing();
    return { placements: pricing as Record<string, number | null> };
  },
);
