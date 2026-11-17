/**
 * Public earning and trade programmes are free to apply for.
 * Legacy annual membership SKUs remain readable so existing contracts and
 * historical records are NEVER silently repriced or erased.
 */
export type PartnerPlanId = "scout" | "starter" | "growth" | "pro" | "builder" | "executive" | "prestige" | "flagship";
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

/** Only current public enrolment. No paying to unlock commission. */
export const PARTNER_PLANS: PartnerPlan[] = [{
  id: "scout",
  name: "Free DREAMZ Partner",
  feeKobo: 0,
  durationDays: null,
  summary: "Apply free. Earn only from verified eligible customer orders.",
  benefits: [
    "Application and onboarding at no charge",
    "Unique code and tracked partner dashboard when approved",
    "Approved product and campaign content",
    "No subscription, recruitment commission or guaranteed income",
  ],
}];

const LEGACY_PARTNER_PLANS: PartnerPlan[] = [
  {id:"starter",name:"Partner Starter (Legacy)",feeKobo:2_500_000,durationDays:365,summary:"Retired annual plan; existing approved agreements remain unchanged.",benefits:["Benefits subject to original agreement."]},
  {id:"growth",name:"Partner Growth (Legacy)",feeKobo:7_500_000,durationDays:365,summary:"Retired annual plan; existing approved agreements remain unchanged.",benefits:["Benefits subject to original agreement."]},
  {id:"pro",name:"Partner Pro (Legacy)",feeKobo:15_000_000,durationDays:365,summary:"Retired annual plan; existing approved agreements remain unchanged.",benefits:["Benefits subject to original agreement."]},
  {id:"builder",name:"Builder (Legacy)",feeKobo:5_000_000,durationDays:365,summary:"No longer sold.",benefits:["Benefits subject to original agreement."]},
  {id:"executive",name:"Executive (Legacy)",feeKobo:50_000_000,durationDays:365,summary:"No longer sold.",benefits:["Benefits subject to original agreement."]},
  {id:"prestige",name:"Prestige (Legacy)",feeKobo:75_000_000,durationDays:365,summary:"No longer sold.",benefits:["Benefits subject to original agreement."]},
  {id:"flagship",name:"Flagship (Legacy)",feeKobo:100_000_000,durationDays:365,summary:"No longer sold.",benefits:["Benefits subject to original agreement."]},
];

export const PAID_PARTNER_PLANS = PARTNER_PLANS.filter(plan => plan.feeKobo > 0);

export function getPartnerPlan(id: string | null | undefined): PartnerPlan {
  return PARTNER_PLANS.find(p=>p.id===id) ?? LEGACY_PARTNER_PLANS.find(p=>p.id===id) ?? PARTNER_PLANS[0];
}
export function partnerPlanPriceLabel(plan: PartnerPlan): string {
  return plan.feeKobo === 0 ? "Free to join" : `₦${(plan.feeKobo/100).toLocaleString("en-NG")}/year (legacy only)`;
}
