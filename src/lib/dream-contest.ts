export const DREAM_CHALLENGE = {
  name: "DREAMZ 200",
  title: "Dream Design Challenge",
  status: "pending_approval",
  targetCloseDate: "2026-12-31",
  totalPrizeNaira: 1_000_000,
  totalCashNaira: 500_000,
  totalProductNaira: 500_000,
  minimumVerifiedOrdersForPrize: 1,
  minimumDepositPercent: 20,
  prizes: [
    { place: 1, cashNaira: 250_000, productNaira: 200_000, amountNaira: 450_000, studioPlan: "Pro Studio" },
    { place: 2, cashNaira: 100_000, productNaira: 120_000, amountNaira: 220_000, studioPlan: "Studio" },
    { place: 3, cashNaira: 75_000, productNaira: 80_000, amountNaira: 155_000, studioPlan: "Creator Pass" },
    { place: 4, cashNaira: 50_000, productNaira: 60_000, amountNaira: 110_000, studioPlan: "Creator Pass" },
    { place: 5, cashNaira: 25_000, productNaira: 40_000, amountNaira: 65_000, studioPlan: "Creator Pass" },
  ],
  judging: [
    { label: "Originality & distinctiveness", points: 30 },
    { label: "Dream/story translated into design", points: 20 },
    { label: "Buildability & leathercraft feasibility", points: 20 },
    { label: "Visual coherence & presentation", points: 15 },
    { label: "Market response", points: 15 },
  ],
  // Market-signal points are tracked for transparency and the 15-point
  // market-response portion of judging. They do NOT automatically decide winners.
  scoring: {
    verifiedOrder: 100,
    verifiedAccountLike: 5,
    recordedShare: 1,
    view: 0,
  },
} as const;

export function dreamContestScore(input: {
  verifiedOrders: number;
  likeCount: number;
  shareCount: number;
}): number {
  return (
    input.verifiedOrders * DREAM_CHALLENGE.scoring.verifiedOrder +
    input.likeCount * DREAM_CHALLENGE.scoring.verifiedAccountLike +
    input.shareCount * DREAM_CHALLENGE.scoring.recordedShare
  );
}

export function isDreamPrizeEligible(input: { verifiedOrders: number }): boolean {
  return input.verifiedOrders >= DREAM_CHALLENGE.minimumVerifiedOrdersForPrize;
}
