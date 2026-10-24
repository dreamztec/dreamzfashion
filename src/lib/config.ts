export const BRAND = {
  name: "DREAMZ FASHION KONCEPTZ",
  shortName: "DREAMZ",
  initials: "DFK",
  tagline: "YOUR DREAM OUTFIT",
  description:
    "Bespoke and ready-to-wear leather footwear and accessories created for people who want to express their identity through what they wear.",
} as const;

export const SITE_URL: string =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.SITE_URL || "https://dreamzfashion.dreamz-gc.com";
