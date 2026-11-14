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
}).refine(v => new Set(v.entries.map(e => e.id)).size === v.entries.length, "Each receipt must have a unique reference");
export type CampaignData = z.infer<typeof CampaignSchema> & { updatedAt: string };
export const DREAMER_TARGET = 1_000_000;
export const BILLION_NAIRA_RECEIPT_TARGET_KOBO = 100_000_000_000;

// Reviewed GTBank and Moniepoint statements, 1 Aug–14 Nov 2026.
// Owner attributes named individual transfers to customers. Bank records alone
// do not establish completed products, revenue recognition, or delivery.
// Project labels intentionally contain no sender names, bank references or PII.
// The first five entries are retained with identical IDs and amounts to
// prevent counting the two original 50% deposits (and three earlier receipts) twice.
export const INITIAL_CAMPAIGN: CampaignData = {
  dreamers: 11, // 11 distinct individual payers; one person paid twice.
  updatedAt: "2026-11-14T13:33:00.000Z",
  entries: [
    { id: "vanity-flex", project: "Vanity Flex", receivedKobo: 37_500_000, depositPercent: 50, receivedOn: "2026-11-10" },
    { id: "viii-white-series", project: "The VIII White Series", receivedKobo: 13_999_200, depositPercent: 50, receivedOn: "2026-11-12" },
    { id: "statement-20260813", project: "Earlier customer receipt · Slippers", receivedKobo: 3_000_000, depositPercent: null, receivedOn: "2026-08-13" },
    { id: "statement-20260917", project: "Earlier customer receipt · Shoes", receivedKobo: 11_200_000, depositPercent: null, receivedOn: "2026-09-17" },
    { id: "statement-20261024", project: "Earlier customer receipt · Shoes", receivedKobo: 2_000_000, depositPercent: null, receivedOn: "2026-10-24" },
    { id: "statement-20260811", project: "Named individual receipt · Product unspecified", receivedKobo: 1_630_000, depositPercent: null, receivedOn: "2026-08-11" },
    { id: "statement-20260818-olotu", project: "Named individual receipt · Product unspecified", receivedKobo: 7_500_000, depositPercent: null, receivedOn: "2026-08-18" },
    { id: "statement-20260818-ohini", project: "Named individual receipt · Product unspecified", receivedKobo: 3_000_000, depositPercent: null, receivedOn: "2026-08-18" },
    { id: "statement-20260828", project: "Named individual receipt · Product unspecified", receivedKobo: 2_625_000, depositPercent: null, receivedOn: "2026-08-28" },
    { id: "statement-20260901", project: "Named individual receipt · Product unspecified", receivedKobo: 2_000_000, depositPercent: null, receivedOn: "2026-09-01" },
    { id: "statement-20260924", project: "Repeat receipt from an existing payer", receivedKobo: 2_000_000, depositPercent: null, receivedOn: "2026-09-24" },
    { id: "statement-20261017", project: "Named individual receipt · Product unspecified", receivedKobo: 20_000_000, depositPercent: null, receivedOn: "2026-10-17" },
  ],
};

export const STATEMENT_REVIEW = {
  period: "1 August–14 November 2026",
  grossCreditsKobo: 1_028_018_440,
  ownTransfersKobo: 407_902_000,
  internalTransfersKobo: 44_500_000,
  unclassifiedKobo: 469_162_240, // Corporate, cash/withdraw descriptions, test/related and COD settlement
  confirmedReceiptsKobo: 106_454_200, // Owner-attributed named individual receipts, not audited sales
  identifiedIndividualPayers: 11,
  identifiedPaymentEvents: 12,
} as const;

/** Add bank-reviewed entries to a pre-review DB snapshot. Do not overwrite later
 * owner edits; after publication owner deletion/correction must remain possible.
 * Matching IDs and matching date+amount skip duplicate imported deposits.
 */
export function mergeStatementReceiptSnapshot(saved: CampaignData): CampaignData {
  if (Date.parse(saved.updatedAt) >= Date.parse(INITIAL_CAMPAIGN.updatedAt)) return saved;
  const entries = [...saved.entries];
  for (const entry of INITIAL_CAMPAIGN.entries) {
    if (entries.some(existing =>
      existing.id === entry.id ||
      (existing.receivedOn === entry.receivedOn && existing.receivedKobo === entry.receivedKobo)
    )) continue;
    entries.push(entry);
  }
  return {
    dreamers: Math.max(saved.dreamers, INITIAL_CAMPAIGN.dreamers),
    entries,
    updatedAt: INITIAL_CAMPAIGN.updatedAt,
  };
}

export function campaignTotals(data: Pick<CampaignData, "entries" | "dreamers">) {
  const receivedKobo = data.entries.reduce((sum, entry) => sum + entry.receivedKobo, 0);
  return {
    receivedKobo,
    receiptCount: data.entries.length,
    dreamersRemaining: Math.max(0, DREAMER_TARGET - data.dreamers),
    dreamerPercent: data.dreamers / DREAMER_TARGET * 100,
    billionReceiptsPercent: receivedKobo / BILLION_NAIRA_RECEIPT_TARGET_KOBO * 100,
  };
}
