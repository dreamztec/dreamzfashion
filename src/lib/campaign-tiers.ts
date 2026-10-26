/**
 * The seven DREAMZ creator / influencer campaign tiers.
 *
 * These are COLLABORATION / CAMPAIGN values — what a brand campaign with a
 * creator costs — NOT joining fees. Applying to the DREAMZ creator programme
 * is free; nobody pays to become a seller. Actual creator selection depends
 * on audience quality, content quality, reach, conversion history and
 * negotiated scope. Nothing here guarantees views, revenue or conversions;
 * every deliverable list is subject to a written campaign agreement.
 *
 * The sales-code commission system is separate and unchanged.
 */

export type CampaignTier = {
  level: number;
  name: string;
  price: string;
  audience: string;
  deliverables: string[];
};

export const CAMPAIGN_TIERS: CampaignTier[] = [
  {
    level: 1,
    name: "Spark",
    price: "₦25,000",
    audience: "Student creators and emerging micro-creators.",
    deliverables: [
      "1 short-form product video",
      "2 story/status placements",
      "DREAMZ creator code/link",
      "Basic campaign reporting",
    ],
  },
  {
    level: 2,
    name: "Rise",
    price: "₦75,000",
    audience: "Growing creators building their first audience.",
    deliverables: [
      "2 short-form videos",
      "4 stories/status placements",
      "1 product/photo feature",
      "Creator code/link",
      "Basic performance report",
    ],
  },
  {
    level: 3,
    name: "Momentum",
    price: "₦150,000",
    audience: "Creators with consistent content output and steady reach.",
    deliverables: [
      "3 short-form videos",
      "6 stories",
      "1 carousel/photo post",
      "Creator code/link",
      "Campaign reporting",
      "Limited approved reposting rights",
    ],
  },
  {
    level: 4,
    name: "Impact",
    price: "₦350,000",
    audience: "Established creators with strong engagement.",
    deliverables: [
      "4–5 short-form videos",
      "8–10 stories",
      "2 feed/carousel posts",
      "Creator code/link",
      "One coordinated campaign concept",
      "Performance summary",
    ],
  },
  {
    level: 5,
    name: "Ambassador",
    price: "₦750,000",
    audience: "A one-month collaboration with a leading creator.",
    deliverables: [
      "6 short-form videos",
      "12+ story placements",
      "2–3 feed posts",
      "Creator storefront/code",
      "DREAMZ campaign shoot where agreed",
      "Monthly reporting",
    ],
  },
  {
    level: 6,
    name: "Premier",
    price: "₦2,000,000",
    audience: "Major campaigns with top-tier creators.",
    deliverables: [
      "8–12 short-form videos",
      "20+ story placements",
      "Multiple feed/editorial features",
      "Professional campaign shoot",
      "Creator code/storefront",
      "One event/launch appearance where agreed",
      "Campaign reporting and agreed usage rights",
    ],
  },
  {
    level: 7,
    name: "Icon",
    price: "Up to ₦7,000,000",
    audience:
      "Major creators, public personalities and large campaigns. Scope is individually contracted.",
    deliverables: [
      "Large multi-platform launch campaign",
      "Campaign photography/video production",
      "18–24 planned short-form pieces across the agreed campaign period",
      "30+ story/support placements",
      "Launch/event appearances where agreed",
      "Dedicated DREAMZ campaign landing page/code",
      "Approved advertising/usage rights for a defined period",
      "Full campaign report",
    ],
  },
];
