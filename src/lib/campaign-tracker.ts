import { z } from "zod";

export const CampaignEntrySchema = z.object({
  id: z.string().min(1).max(60),
  project: z.string().min(1).max(100),
  receivedKobo: z.number().int().nonnegative().max(100_000_000_000),
  depositPercent: z.number().int().min(1).max(100),
  receivedOn: z.string().date(),
});
export const CampaignSchema = z.object({
  dreamers: z.number().int().min(0).max(100_000_000),
  entries: z.array(CampaignEntrySchema).max(1000),
}).refine(v => new Set(v.entries.map(e => e.id)).size === v.entries.length, "Each project must have a unique reference");
export type CampaignData = z.infer<typeof CampaignSchema> & { updatedAt: string };
export const CAMPAIGN_TARGET_KOBO = 100_000_000_000;
export const DREAMER_TARGET = 1_000_000;
// Owner-confirmed receipts, 13 November 2026. No bank or customer identifiers belong here.
export const INITIAL_CAMPAIGN: CampaignData = {
  dreamers: 2,
  updatedAt: "2026-11-13T00:00:00.000Z",
  entries: [
    { id: "vanity-flex", project: "Vanity Flex", receivedKobo: 37_500_000, depositPercent: 50, receivedOn: "2026-11-10" },
    { id: "viii-white-series", project: "The VIII White Series", receivedKobo: 13_999_200, depositPercent: 50, receivedOn: "2026-11-12" },
  ],
};
export function campaignTotals(data: Pick<CampaignData, "entries" | "dreamers">) {
  const receivedKobo = data.entries.reduce((sum, entry) => sum + entry.receivedKobo, 0);
  return {
    receivedKobo,
    remainingKobo: Math.max(0, CAMPAIGN_TARGET_KOBO - receivedKobo),
    moneyPercent: receivedKobo / CAMPAIGN_TARGET_KOBO * 100,
    dreamersRemaining: Math.max(0, DREAMER_TARGET - data.dreamers),
    dreamerPercent: data.dreamers / DREAMER_TARGET * 100,
  };
}
