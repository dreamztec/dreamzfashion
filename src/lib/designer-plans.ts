/**
 * DREAMZ Creator Studio pricing — access passes, NOT recurring subscriptions.
 * Legacy Pro Studio remains readable for existing users, not open to new sales.
 * Upgrades require admin confirmation; no payment integration is implied.
 */
export type DesignerPlanId = "free" | "creator" | "studio" | "pro";
export type DesignerFeature = "public_profile" | "share_links" | "advanced_materials" | "high_res_share" | "analytics" | "private_designs" | "client_mode" | "family_mode" | "client_approval" | "collections" | "priority_render";
export type DesignerPlan = {
  id: DesignerPlanId; name: string; priceKobo: number; designLimit: number;
  durationDays: number | null; summary: string; features: DesignerFeature[]; benefits: string[];
};
export const DESIGNER_PLANS: DesignerPlan[] = [
  {
    id: "free", name: "Dreamer", priceKobo: 0, designLimit: 3, durationDays: null,
    summary: "Start free. Create your first three saved DREAMZ leather concepts and share your vision.",
    features: ["public_profile","share_links","private_designs"],
    benefits: ["3 saved design projects","Dreamer profile and share links","Material, colour and construction choices","Reference image uploads","Public or private designs","Request a production quote separately"],
  },
  {
    id: "creator", name: "Creator Plus", priceKobo: 990_000, designLimit: 15, durationDays: 30,
    summary: "A 30-day access pass for creators experimenting with more concepts and sharing them.",
    features: ["public_profile","share_links","advanced_materials","high_res_share","analytics","private_designs"],
    benefits: ["15 saved design projects total","Creator profile and design sharing","Expanded materials and trims","Design insights and share-card options","Free applications to creator collaborations"],
  },
  {
    id: "studio", name: "Studio Pro", priceKobo: 2_990_000, designLimit: 50, durationDays: 30,
    summary: "A 30-day access pass for stylists and professionals handling multiple client projects.",
    features: ["public_profile","share_links","advanced_materials","high_res_share","analytics","private_designs","client_mode","family_mode","client_approval"],
    benefits: ["50 saved design projects total","Everything in Creator Plus","Client Mode and private client approvals","Family and group design projects","Professional project organisation"],
  },
  {
    id: "pro", name: "Pro Studio (Legacy)", priceKobo: 10_000_000, designLimit: 200, durationDays: 90,
    summary: "Retired 90-day plan. Active users retain their originally approved access.",
    features: ["public_profile","share_links","advanced_materials","high_res_share","analytics","private_designs","client_mode","family_mode","client_approval","collections","priority_render"],
    benefits: ["Existing contracted access remains subject to original terms."],
  },
];
export const PUBLIC_DESIGNER_PLANS = DESIGNER_PLANS.filter(p=>p.id!=="pro");
export const PAID_DESIGNER_PLANS = PUBLIC_DESIGNER_PLANS.filter(p=>p.priceKobo>0);
export function getDesignerPlan(id: string | null | undefined): DesignerPlan {
  return DESIGNER_PLANS.find(p=>p.id===id) ?? DESIGNER_PLANS[0];
}
export function designerPlanPriceLabel(plan: DesignerPlan): string {
  if(plan.priceKobo===0) return "Free";
  return `₦${(plan.priceKobo/100).toLocaleString("en-NG")} / ${plan.durationDays}-day pass`;
}
export function designerPlanRank(id: string | null | undefined): number {
  const order: DesignerPlanId[]=["free","creator","studio","pro"];
  const index=order.indexOf((id||"free") as DesignerPlanId);
  return index<0?0:index;
}
export function hasDesignerFeature(planId: string | null | undefined, feature: DesignerFeature): boolean {
  return getDesignerPlan(planId).features.includes(feature);
}
