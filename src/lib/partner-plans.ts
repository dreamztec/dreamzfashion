export type PartnerPlanId =
  | "scout"
  | "starter"
  | "builder"
  | "pro"
  | "growth"
  | "executive"
  | "prestige"
  | "flagship";

export type SellingMode = "digital" | "physical" | "both";
export type PhysicalModel = "undecided" | "bulk" | "credit" | "commission";

export type PartnerPlan = {
  id: PartnerPlanId;
  name: string;
  feeKobo: number;
  durationDays: number | null;
  summary: string;
  benefits: string[];
};

export const PARTNER_PLANS: PartnerPlan[] = [
  {
    id: "scout",
    name: "Scout",
    feeKobo: 0,
    durationDays: null,
    summary: "Start selling DREAMZ without buying stock or paying a membership fee.",
    benefits: [
      "Unique DREAMZ code and referral link after approval",
      "Partner dashboard with tracked qualifying sales",
      "Approved product and campaign assets",
      "Access to the full available DREAMZ catalogue",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    feeKobo: 2_500_000,
    durationDays: 365,
    summary: "A simple annual business toolkit for new DREAMZ sellers.",
    benefits: [
      "Everything in Scout",
      "Personalised partner storefront",
      "Sales starter kit and product content library",
      "Partner onboarding and sales training",
    ],
  },
  {
    id: "builder",
    name: "Builder",
    feeKobo: 5_000_000,
    durationDays: 365,
    summary: "For sellers building a repeatable digital or physical sales channel.",
    benefits: [
      "Everything in Starter",
      "Expanded campaign assets",
      "Partner performance analytics",
      "Monthly sales clinic access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    feeKobo: 10_000_000,
    durationDays: 365,
    summary: "For active sellers who need stronger marketing and product support.",
    benefits: [
      "Everything in Builder",
      "Co-branded campaign assets",
      "Priority access to approved product drops",
      "Sample/demo privileges subject to availability",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    feeKobo: 25_000_000,
    durationDays: 365,
    summary: "For partners growing a serious DREAMZ sales business.",
    benefits: [
      "Everything in Pro",
      "Priority partner support",
      "Enhanced sample/display support subject to approval",
      "Launch and pop-up participation opportunities",
    ],
  },
  {
    id: "executive",
    name: "Executive",
    feeKobo: 50_000_000,
    durationDays: 365,
    summary: "For established sellers and approved retail spaces.",
    benefits: [
      "Everything in Growth",
      "Premium display support subject to location approval",
      "Professional campaign content pack",
      "Priority replenishment and account support",
    ],
  },
  {
    id: "prestige",
    name: "Prestige",
    feeKobo: 75_000_000,
    durationDays: 365,
    summary: "For high-performing partners requiring deeper brand support.",
    benefits: [
      "Everything in Executive",
      "Premium early-release access",
      "Quarterly partner strategy session",
      "Expanded branded display/content support",
    ],
  },
  {
    id: "flagship",
    name: "Flagship",
    feeKobo: 100_000_000,
    durationDays: 365,
    summary: "DREAMZ's highest annual partner business plan.",
    benefits: [
      "Everything in Prestige",
      "Dedicated partner account support",
      "Flagship/shop-in-shop support subject to site approval",
      "Major campaign collaboration opportunities",
    ],
  },
];

export const PAID_PARTNER_PLANS = PARTNER_PLANS.filter((plan) => plan.feeKobo > 0);

export function getPartnerPlan(id: string | null | undefined): PartnerPlan {
  return PARTNER_PLANS.find((plan) => plan.id === id) ?? PARTNER_PLANS[0];
}

export function partnerPlanPriceLabel(plan: PartnerPlan): string {
  if (plan.feeKobo === 0) return "Free";
  return `₦${(plan.feeKobo / 100).toLocaleString("en-NG")}/year`;
}
