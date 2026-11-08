export type PartnerPlanId =
  | "scout"
  | "starter"
  | "growth"
  | "pro"
  // Legacy ids are retained only so existing records keep their original terms.
  | "builder"
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

/**
 * Current public Partner with DREAMZ offers.
 *
 * IMPORTANT: these are optional BUSINESS-SUPPORT memberships. They do not buy
 * commission rights, guarantee income, grant credit/consignment automatically,
 * or create a recruitment/downline programme.
 */
export const PARTNER_PLANS: PartnerPlan[] = [
  {
    id: "scout",
    name: "Free Scout",
    feeKobo: 0,
    durationDays: null,
    summary: "The free earning level. No paid membership is required to earn from qualifying DREAMZ sales.",
    benefits: [
      "Unique DREAMZ code and referral link after approval",
      "Partner dashboard with tracked qualifying sales",
      "Approved product and campaign assets",
      "No membership fee",
    ],
  },
  {
    id: "starter",
    name: "Partner Starter",
    feeKobo: 2_500_000,
    durationDays: 365,
    summary: "A practical annual support package for new sellers who want better tools and guidance.",
    benefits: [
      "Everything available to a Free Scout",
      "Partner onboarding and sales toolkit",
      "Digital catalogue and approved campaign assets",
      "Access to partner sales-training sessions",
    ],
  },
  {
    id: "growth",
    name: "Partner Growth",
    feeKobo: 7_500_000,
    durationDays: 365,
    summary: "For active sellers who want stronger marketing support and a more professional sales presence.",
    benefits: [
      "Everything in Partner Starter",
      "Co-branded marketing templates",
      "Priority partner support",
      "Early access to selected launches",
      "Two business/sales review sessions during the membership year",
    ],
  },
  {
    id: "pro",
    name: "Partner Pro",
    feeKobo: 15_000_000,
    durationDays: 365,
    summary: "For serious partners building a consistent DREAMZ sales channel or customer community.",
    benefits: [
      "Everything in Partner Growth",
      "Quarterly strategy sessions",
      "Customised campaign-material support",
      "Priority consideration for approved activations and pop-ups",
      "Eligibility for a featured partner profile/directory placement",
    ],
  },
];

/**
 * Old plans are no longer offered publicly. Keeping their original definitions
 * prevents historical approved accounts from being silently repriced.
 */
const LEGACY_PARTNER_PLANS: PartnerPlan[] = [
  {
    id: "builder",
    name: "Builder (Legacy)",
    feeKobo: 5_000_000,
    durationDays: 365,
    summary: "Legacy annual partner plan. No longer offered to new applicants.",
    benefits: ["Legacy benefits remain subject to the terms originally approved."],
  },
  {
    id: "executive",
    name: "Executive (Legacy)",
    feeKobo: 50_000_000,
    durationDays: 365,
    summary: "Legacy annual partner plan. No longer offered to new applicants.",
    benefits: ["Legacy benefits remain subject to the terms originally approved."],
  },
  {
    id: "prestige",
    name: "Prestige (Legacy)",
    feeKobo: 75_000_000,
    durationDays: 365,
    summary: "Legacy annual partner plan. No longer offered to new applicants.",
    benefits: ["Legacy benefits remain subject to the terms originally approved."],
  },
  {
    id: "flagship",
    name: "Flagship (Legacy)",
    feeKobo: 100_000_000,
    durationDays: 365,
    summary: "Legacy annual partner plan. No longer offered to new applicants.",
    benefits: ["Legacy benefits remain subject to the terms originally approved."],
  },
];

export const PAID_PARTNER_PLANS = PARTNER_PLANS.filter((plan) => plan.feeKobo > 0);

export function getPartnerPlan(id: string | null | undefined): PartnerPlan {
  return (
    PARTNER_PLANS.find((plan) => plan.id === id) ??
    LEGACY_PARTNER_PLANS.find((plan) => plan.id === id) ??
    PARTNER_PLANS[0]
  );
}

export function partnerPlanPriceLabel(plan: PartnerPlan): string {
  if (plan.feeKobo === 0) return "Free";
  return `₦${(plan.feeKobo / 100).toLocaleString("en-NG")}/year`;
}
