export const DREAM_CHALLENGE = {
  name: "DREAMZ 200",
  title: "Community Design Challenge",
  targetCloseDate: "2026-12-31",
  totalPrizeNaira: 1_000_000,
  prizes: [
    { place: 1, amountNaira: 500_000 },
    { place: 2, amountNaira: 300_000 },
    { place: 3, amountNaira: 200_000 },
  ],
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
