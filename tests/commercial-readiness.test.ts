import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { img, cardFit, isDisplayableImageUrl } from "../src/lib/img";
import { PRODUCT_TIERS, TIER_LABELS } from "../src/lib/format";

/**
 * Commercial readiness of the storefront: the 16 approved Leather Wear /
 * Accessories pieces are published with real prices, the Boot of Many
 * Colours carries its ₦120,000 principal price, categories and collections
 * are ordered deliberately, cards fill their frame, partnership offers read
 * plainly, and no Image CDN request can be malformed.
 */

const ROOT = path.resolve(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf-8");

const MIGRATION = read(
  "netlify/database/migrations/20261108150000_publish_leather_wear_catalogue/migration.sql",
);
const SEED = read("src/server/seed.server.ts");
const PARTNERSHIPS = read("src/routes/partnerships.tsx");
const EARN = read("src/routes/earn.tsx");
const PRODUCT_CARD = read("src/components/ProductCard.tsx");
const BRAND = read("src/components/brand.tsx");
const PRODUCT_PAGE = fs.readFileSync(
  path.join(ROOT, "src/routes/product/$slug.tsx"),
  "utf-8",
);

/** The 16 approved pieces: SKU → slug. Photography lives at /img/products/<slug>. */
const APPROVED_16: Record<string, string> = {
  "DFK-ACC-201": "resolve-double-buckle-cuff",
  "DFK-ACC-202": "unity-beaded-bracelet",
  "DFK-ACC-203": "mercy-wrap-cuff",
  "DFK-ACC-204": "hope-slim-bracelet-set",
  "DFK-ACC-205": "legacy-leather-belt",
  "DFK-ACC-206": "purpose-wrist-pouch",
  "DFK-LWR-201": "ambition-leather-tee",
  "DFK-LWR-202": "courage-lace-up-vest",
  "DFK-LWR-203": "discipline-wide-leg-trousers",
  "DFK-LWR-204": "excellence-tailored-trousers",
  "DFK-LWR-205": "resilience-cargo-trousers",
  "DFK-LWR-206": "focus-cargo-joggers",
  "DFK-LWR-207": "growth-tailored-shorts",
  "DFK-LWR-208": "possibility-cargo-shorts",
  "DFK-LWR-209": "leadership-utility-vest",
  "DFK-LWR-210": "sacrifice-cargo-shorts",
};

/** Approved principal prices in kobo. */
const APPROVED_PRICES: Record<string, number> = {
  "DFK-ACC-201": 4_500_000,
  "DFK-ACC-202": 3_500_000,
  "DFK-ACC-203": 4_000_000,
  "DFK-ACC-204": 3_500_000,
  "DFK-ACC-205": 6_500_000,
  "DFK-ACC-206": 8_500_000,
  "DFK-LWR-201": 18_000_000,
  "DFK-LWR-202": 22_000_000,
  "DFK-LWR-203": 24_000_000,
  "DFK-LWR-204": 22_000_000,
  "DFK-LWR-205": 26_000_000,
  "DFK-LWR-206": 22_000_000,
  "DFK-LWR-207": 15_000_000,
  "DFK-LWR-208": 14_000_000,
  "DFK-LWR-209": 24_000_000,
  "DFK-LWR-210": 16_000_000,
};

describe("the 16 approved products are published, priced and purchasable", () => {
  const priceUpdateBlock = MIGRATION.slice(
    MIGRATION.indexOf("UPDATE \"products\" AS p"),
    MIGRATION.indexOf("-- 2. Boot of Many Colours"),
  );

  it("the forward migration sets every approved piece published with its price", () => {
    expect(MIGRATION).toContain("'DFK-LWR-210', 16000000");
    for (const sku of Object.keys(APPROVED_16)) {
      expect(MIGRATION).toContain(`'${sku}'`);
      expect(MIGRATION).toMatch(new RegExp(`\\('${sku}', ${APPROVED_PRICES[sku]}\\)`));
    }
    expect(priceUpdateBlock).toContain("\"status\" = 'published'");
    expect(priceUpdateBlock).toContain("\"checkout_ready\" = true");
    expect(priceUpdateBlock).toContain("'made_to_order'"); // availability preserved
    expect(priceUpdateBlock).toContain("\"new_arrival\" = true");
  });

  it("no approved piece stays at zero price anywhere in the migration", () => {
    for (const sku of Object.keys(APPROVED_16)) {
      const line = MIGRATION.split("\n").find((l) => l.includes(`'${sku}'`) && l.includes(","));
      expect(line).toBeDefined();
      expect(line!).not.toMatch(/,\s*0[,)]/);
    }
  });

  it("every approved piece has its own photography on disk and displayable", () => {
    const dir = path.join(ROOT, "public/img/products");
    for (const [sku, slug] of Object.entries(APPROVED_16)) {
      const file = `${slug}.jpg`;
      expect(fs.existsSync(path.join(dir, file)), `${sku}: missing ${file}`).toBe(true);
      expect(isDisplayableImageUrl(`/img/products/${file}`)).toBe(true);
      expect(cardFit(`/img/products/${file}`)).toBe("cover"); // cards fill the frame
    }
  });

  it("is a forward-only correction — it inserts no new products", () => {
    expect(MIGRATION).not.toMatch(/INSERT INTO\s+"?products"?/i);
    expect(MIGRATION).not.toMatch(/\bDELETE\b|\bTRUNCATE\b|\bDROP\b/i);
  });

  it("the two reference uploads never become product SKUs", () => {
    expect(MIGRATION).not.toContain("vision-leather-ensemble-campaign");
    expect(MIGRATION).not.toContain("cargo-shorts-colourway-reference");
    expect(SEED).not.toContain("vision-leather-ensemble");
    // They live as editorial imagery in the lookbook instead.
    const lookbook = read("src/routes/lookbook.tsx");
    expect(lookbook).toContain("vision-leather-ensemble-campaign.jpg");
    expect(lookbook).toContain("cargo-shorts-colourway-reference.jpg");
  });
});

describe("Boot of Many Colours pricing", () => {
  it("the principal Product Only price is exactly ₦120,000", () => {
    expect(MIGRATION).toMatch(/"price" = 12000000/);
    expect(MIGRATION).toMatch(/"complete_package_price" = 16000000/);
    expect(SEED).toMatch(/price: 12000000/);
    expect(SEED).toMatch(/completePackagePrice: 16000000/);
  });

  it("the old ₦90,000 principal price is gone from the seed", () => {
    expect(SEED).not.toContain("9000000");
  });

  it("stays a fixed signature design — never customisable", () => {
    expect(MIGRATION).toMatch(/"customizable" = false/);
    expect(SEED).toMatch(/customizable: false/);
  });

  it("stays in Originals · Footwear · Boots with the homepage hero flag", () => {
    const block = SEED.slice(SEED.indexOf("DFK-FTW-001"), SEED.indexOf("DFK-FTW-002"));
    expect(block).toContain("categorySlug: \"footwear\"");
    expect(block).toContain("subcategory: \"Boots\"");
    expect(block).toContain("tier: \"originals\"");
    expect(block).toContain("homepageHero: true");
  });
});

describe("category and collection structure", () => {
  it("orders categories Footwear → Leather Wear → Bags → Accessories", () => {
    const expected: Array<[string, number]> = [
      ["footwear", 1],
      ["leather-wear", 2],
      ["bags", 3],
      ["accessories", 4],
    ];
    for (const [slug, order] of expected) {
      const re = new RegExp(
        `slug: "${slug}",[\\s\\S]{0,240}?sortOrder: ${order}\\b`,
      );
      expect(SEED).toMatch(re);
    }
    expect(MIGRATION).toContain("SET \"sort_order\" = 2 WHERE \"slug\" = 'leather-wear'");
    expect(MIGRATION).toContain("SET \"sort_order\" = 3 WHERE \"slug\" = 'bags'");
    expect(MIGRATION).toContain("SET \"sort_order\" = 4 WHERE \"slug\" = 'accessories'");
  });

  it("moves the Purpose Wrist Pouch into Bags, without duplicating it", () => {
    expect(MIGRATION).toMatch(
      /UPDATE "products"\s+SET "category_slug" = 'bags'\s+WHERE "sku" = 'DFK-ACC-206'/,
    );
    // Exactly one row moves — the SKU appears in the price list and the move
    // guard, never in an INSERT.
    expect(MIGRATION).not.toMatch(/INSERT/i);
  });

  it("orders collections Essentials → Originals → Royale", () => {
    expect(PRODUCT_TIERS).toEqual(["essentials", "originals", "royale"]);
    expect(TIER_LABELS.essentials).toContain("Essentials");
    expect(TIER_LABELS.originals).toContain("Originals");
    expect(TIER_LABELS.royale).toContain("Royale");
  });

  it("the shop page separates SHOP BY CATEGORY from SHOP BY COLLECTION", () => {
    const shop = read("src/routes/shop/index.tsx");
    expect(shop).toContain("Shop by Category");
    expect(shop).toContain("Shop by Collection");
  });
});

describe("image presentation", () => {
  it("storefront cards fill the frame; product detail keeps the full product", () => {
    expect(PRODUCT_CARD).toContain("cardFit");
    expect(PRODUCT_CARD).not.toContain("displayFit(product.images[0]?.kind, product.imageFit)");
    expect(PRODUCT_PAGE).toContain("displayFit(");
  });

  it("never emits a malformed Image CDN cover request", () => {
    // fit is dropped entirely when no height accompanies the width...
    expect(img("/img/products/a.jpg", { w: 720, fit: "cover" })).not.toContain("fit=");
    expect(img("/img/products/a.jpg", { w: 720, fit: "contain" })).not.toContain("fit=");
    // ...and cover always travels with a ratio-correct height.
    expect(img("/img/products/a.jpg", { w: 720, h: 900, fit: "cover" })).toContain("fit=cover");
    // ProductMedia computes the height from the frame ratio.
    expect(BRAND).toContain("coverHeight(");
    expect(BRAND).toContain("aspectRatioOf(");
  });

  it("card srcSet heights preserve the 4:5 ratio (720×900 and friends)", () => {
    expect(img("/img/products/a.jpg", { w: 720, h: Math.round(720 / 0.8), fit: "cover" })).toContain("h=900");
  });
});

describe("partnership clarity", () => {
  it("shows the three real deals with their percentages", () => {
    expect(PARTNERSHIPS).toContain("20% discount");
    expect(PARTNERSHIPS).toContain("10% discount");
    expect(PARTNERSHIPS).toContain("15% commission");
  });

  it("describes paid partner plans as optional, never as buying commission", () => {
    expect(PARTNERSHIPS.toLowerCase()).toContain("optional");
    expect(PARTNERSHIPS).toContain("No paid plan is required to sell, refer or earn.");
    expect(PARTNERSHIPS).toContain("do not change commission rules");
    expect(EARN).toMatch(/[Oo]ptional annual/);
    expect(EARN).toMatch(/Start free as a Scout/);
    expect(PARTNERSHIPS).not.toMatch(/after selecting a .*Partner Business Plan/i);
  });

  it("keeps a working Apply / WhatsApp fallback for failed applications", () => {
    expect(PARTNERSHIPS).toContain("Send this application on WhatsApp");
    expect(PARTNERSHIPS).toContain("fallbackNote");
  });
});
