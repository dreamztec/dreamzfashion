import { z } from "zod";

export const CampaignEntrySchema = z.object({
  id: z.string().min(1).max(60),
  project: z.string().min(1).max(100),
  receivedKobo: z.number().int().nonnegative().max(100_000_000_000),
  depositPercent: z.number().int().min(1).max(100).nullable(),
  receivedOn: z.string().date(),
});
export const CampaignSchema = z.object({
  dreamers: z.number().int().min(0).max(100_000_000),
  entries: z.array(CampaignEntrySchema).max(1000),
}).refine(v => new Set(v.entries.map(e => e.id)).size === v.entries.length, "Each project must have a unique reference");
export type CampaignData = z.infer<typeof CampaignSchema> & { updatedAt: string };
export const DREAMER_TARGET = 1_000_000;
// Reconciled statement receipts, 14 November 2026. No bank or customer identifiers belong here.
export const INITIAL_CAMPAIGN: CampaignData = {
  dreamers: 2,
  updatedAt: "2026-11-14T00:00:00.000Z",
  entries: [
    { id: "vanity-flex", project: "Vanity Flex", receivedKobo: 37_500_000, depositPercent: 50, receivedOn: "2026-11-10" },
    { id: "viii-white-series", project: "The VIII White Series", receivedKobo: 13_999_200, depositPercent: 50, receivedOn: "2026-11-12" },
    { id: "statement-20260813", project: "Earlier customer receipt · Slippers", receivedKobo: 3_000_000, depositPercent: null, receivedOn: "2026-08-13" },
    { id: "statement-20260917", project: "Earlier customer receipt · Shoes", receivedKobo: 11_200_000, depositPercent: null, receivedOn: "2026-09-17" },
    { id: "statement-20261024", project: "Earlier customer receipt · Shoes", receivedKobo: 2_000_000, depositPercent: null, receivedOn: "2026-10-24" },
  ],
};
export const STATEMENT_REVIEW = {
  period: "1 August–14 November 2026",
  grossCreditsKobo: 1_028_018_440,
  ownTransfersKobo: 407_902_000,
  internalTransfersKobo: 44_500_000,
  unclassifiedKobo: 507_917_240,
  confirmedReceiptsKobo: 67_699_200,
} as const;

export function campaignTotals(data: Pick<CampaignData, "entries" | "dreamers">) {
  const receivedKobo = data.entries.reduce((sum, entry) => sum + entry.receivedKobo, 0);
  return {
    receivedKobo,
    dreamersRemaining: Math.max(0, DREAMER_TARGET - data.dreamers),
    dreamerPercent: data.dreamers / DREAMER_TARGET * 100,
  };
}
