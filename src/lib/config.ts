export const BRAND = {
  name: "DREAMZ FASHION KONCEPTZ",
  shortName: "DREAMZ",
  initials: "DFK",
  tagline: "YOUR DREAM OUTFIT",
  description:
    "A Nigerian leather fashion house — ready-to-wear and bespoke leather footwear, bags, accessories and wearable leather pieces, crafted around your story.",
} as const;

export const SITE_URL: string =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.SITE_URL || "https://dreamzfashion.dreamz-gc.com";
