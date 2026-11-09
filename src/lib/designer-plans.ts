
export type DesignerPlanId = "free" | "creator" | "studio" | "pro";

export type DesignerFeature =
  | "public_profile"
  | "share_links"
  | "advanced_materials"
  | "high_res_share"
  | "analytics"
  | "private_designs"
  | "client_mode"
  | "family_mode"
  | "client_approval"
  | "collections"
  | "priority_render";

export type DesignerPlan = {
  id: DesignerPlanId;
  name: string;
  priceKobo: number;
  designLimit: number;
  summary: string;
  features: DesignerFeature[];
  benefits: string[];
};

export const DESIGNER_PLANS: DesignerPlan[] = [
  {
    id: "free",
    name: "Dreamer",
    priceKobo: 0,
    designLimit: 3,
    summary: "Create, save and share your first three DREAMZ leather concepts.",
    features: ["public_profile", "share_links", "private_designs"],
    benefits: [
      "Up to 3 saved designs",
      "Automatic DREAMZ Dreamer page",
      "Visual leather, colour and construction studio",
      "Reference-image uploads",
      "Private or public designs",
      "Shareable design links",
      "Eligible to activate Earn with DREAMZ separately",
    ],
  },
  {
    id: "creator",
    name: "Creator Pass",
    priceKobo: 1_500_000,
    designLimit: 15,
    summary: "For people who want to create and share more ideas during the season.",
    features: [
      "public_profile",
      "share_links",
      "advanced_materials",
      "high_res_share",
      "analytics",
      "private_designs",
    ],
    benefits: [
      "Up to 15 saved designs",
      "Advanced material and trim library",
      "Creator analytics",
      "Priority share-card formats",
      "Private and public design controls",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    priceKobo: 5_000_000,
    designLimit: 50,
    summary: "For stylists, sellers and designers creating for clients and families.",
    features: [
      "public_profile",
      "share_links",
      "advanced_materials",
      "high_res_share",
      "analytics",
      "private_designs",
      "client_mode",
      "family_mode",
      "client_approval",
    ],
    benefits: [
      "Up to 50 saved designs",
      "Everything in Creator Pass",
      "Client Mode",
      "Family project mode",
      "Private client approval links",
      "Client labels and project organisation",
    ],
  },
  {
    id: "pro",
    name: "Pro Studio",
    priceKobo: 10_000_000,
    designLimit: 200,
    summary: "For serious creators building a repeat DREAMZ design and sales workflow.",
    features: [
      "public_profile",
      "share_links",
      "advanced_materials",
      "high_res_share",
      "analytics",
      "private_designs",
      "client_mode",
      "family_mode",
      "client_approval",
      "collections",
      "priority_render",
    ],
    benefits: [
      "Up to 200 saved designs",
      "Everything in Studio",
      "Collection organisation",
      "Priority render/atelier review queue",
      "Expanded analytics and portfolio capacity",
    ],
  },
];

export const PAID_DESIGNER_PLANS = DESIGNER_PLANS.filter((plan) => plan.priceKobo > 0);

export function getDesignerPlan(id: string | null | undefined): DesignerPlan {
  return DESIGNER_PLANS.find((plan) => plan.id === id) || DESIGNER_PLANS[0];
}

export function designerPlanPriceLabel(plan: DesignerPlan): string {
  if (plan.priceKobo === 0) return "Free";
  return "₦" + (plan.priceKobo / 100).toLocaleString("en-NG") + " / season";
}

export function designerPlanRank(id: string | null | undefined): number {
  const order: DesignerPlanId[] = ["free", "creator", "studio", "pro"];
  const index = order.indexOf((id || "free") as DesignerPlanId);
  return index < 0 ? 0 : index;
}

export function hasDesignerFeature(planId: string | null | undefined, feature: DesignerFeature): boolean {
  return getDesignerPlan(planId).features.includes(feature);
}
