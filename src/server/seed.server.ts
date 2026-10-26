import { db } from "../../db/index";
import { categories, productVariants, products, referralPrograms, settings } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import { tierFromProductLine } from "../lib/format";

/**
 * Real DREAMZ catalogue (Master Product Catalogue v2).
 * Prices are the brand's supplied figures in kobo — they are
 * authoritative and must not be recalculated. Imagery is intentionally
 * absent: the house uploads approved product photography in the admin
 * dashboard, and the storefront shows neutral "Image coming soon"
 * placeholders until then.
 */

export const STANDARD_PACKAGE_CONTENTS = [
  "Product",
  "Premium Gift Box",
  "Dust Bag",
  "Care Guide",
  "Shoe Care Kit",
  "Doorstep Delivery Anywhere in Nigeria",
  "Fast-track Production & Delivery Within 7 Days",
];

const GENTLEMAN_PACKAGE_CONTENTS = [
  "Shoes",
  "Belt",
  "Leather Pouch",
  "Premium Gift Box",
  "Dust Bag",
  "Care Guide",
  "Shoe Care Kit",
  "Doorstep Delivery Anywhere in Nigeria",
  "Fast-track Production & Delivery Within 7 Days",
];

const SHOE_SIZES = ["40", "41", "42", "43", "44", "45", "46"];

// Single-flight guard: concurrent loaders in one process share one seed run.
let seedPromise: Promise<void> | null = null;
export function seed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed() {
  // Categories
  await db
    .insert(categories)
    .values([
      {
        name: "Footwear",
        slug: "footwear",
        description:
          "Boots, mules, slides, sandals and loafers — distinct pieces, made to be remembered.",
        imageUrl: null,
        sortOrder: 1,
      },
      {
        name: "Bags",
        slug: "bags",
        description: "Statement bags with a refined finish, made to carry well.",
        imageUrl: null,
        sortOrder: 2,
      },
      {
        name: "Accessories",
        slug: "accessories",
        description: "Complete sets and the finishing details of a considered wardrobe.",
        imageUrl: null,
        sortOrder: 3,
      },
    ])
    .onConflictDoNothing();

  // Real DREAMZ catalogue
  await db
    .insert(products)
    .values([
      {
        sku: "DFK-FTW-001",
        productLine: "originals",
        tier: "originals",
        name: "Boot of Many Colours",
        slug: "boot-of-many-colours",
        categorySlug: "footwear",
        subcategory: "Boots",
        price: 9000000,
        completePackagePrice: 12000000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Bold. Distinctive. Unapologetically You.",
        fullDescription:
          "A striking multicolour boot that stands apart from every row of ordinary footwear. The patchwork panels, sturdy silhouette and confident profile make it the piece people remember — built for all-day wear with a distinctive finish.",
        colors: ["Multicolour"],
        sizes: SHOE_SIZES,
        stockQuantity: 12,
        featured: true,
        newArrival: true,
        bestseller: true,
        homepageHero: true,
        customizable: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-002",
        productLine: "originals",
        name: "Asiwaju Mule — Brown",
        slug: "asiwaju-mule-brown",
        categorySlug: "footwear",
        subcategory: "Mules",
        price: 6000000,
        completePackagePrice: 8000000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Command Respect. Walk in Legacy.",
        fullDescription:
          "The Asiwaju Mule in rich brown with black strap detail and a beige insole. A distinctive embossed texture and the iconic strap mark it out instantly — an easy slip-on designed for all-day ease and quiet authority.",
        colors: ["Brown"],
        sizes: SHOE_SIZES,
        stockQuantity: 16,
        featured: true,
        newArrival: true,
        customizable: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-003",
        productLine: "originals",
        name: "Asiwaju Mule — Black / White",
        slug: "asiwaju-mule-black-white",
        categorySlug: "footwear",
        subcategory: "Mules",
        price: 6000000,
        completePackagePrice: 8000000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Command Respect. Walk in Legacy.",
        fullDescription:
          "The black and white edition of the Asiwaju Mule — the same embossed texture and signature strap, rendered in a bold monochrome. Effortless slip-on style with presence in every step.",
        colors: ["Black / White"],
        sizes: SHOE_SIZES,
        stockQuantity: 16,
        featured: true,
        newArrival: true,
        customizable: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-004",
        productLine: "essentials",
        name: "Crimson Pin",
        slug: "crimson-pin",
        categorySlug: "footwear",
        subcategory: "Slides",
        price: 2625000,
        completePackagePrice: 3500000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Bold Detail. Effortless Impact.",
        fullDescription:
          "A statement slide with a crimson suede strap over a black footbed, finished with the signature pin-detail stitching. Soft to the touch, cushioned underfoot, and made to be noticed.",
        colors: ["Crimson / Black"],
        sizes: SHOE_SIZES,
        stockQuantity: 20,
        featured: true,
        newArrival: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-005",
        productLine: "essentials",
        name: "Onyx Wave",
        slug: "onyx-wave",
        categorySlug: "footwear",
        subcategory: "Slides",
        price: 2625000,
        completePackagePrice: 3500000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Smooth sophistication. Effortless confidence.",
        fullDescription:
          "A refined black slide with a subtle wave-textured upper and a gold-tone stud accent over a brown footbed. Quiet distinction for the man who moves with intent.",
        colors: ["Black / Brown"],
        sizes: SHOE_SIZES,
        stockQuantity: 20,
        featured: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-006",
        productLine: "essentials",
        name: "Onyx Stride",
        slug: "onyx-stride",
        categorySlug: "footwear",
        subcategory: "Sandals",
        price: 2625000,
        completePackagePrice: 3500000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Understated elegance. Unshakable presence.",
        fullDescription:
          "A black sandal with an adjustable buckle strap and a clean beige contrast stripe, set on a cushioned footbed. Understated elegance for every day.",
        colors: ["Black / Beige"],
        sizes: SHOE_SIZES,
        stockQuantity: 20,
        featured: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-007",
        productLine: "essentials",
        name: "Terra Cross",
        slug: "terra-cross",
        categorySlug: "footwear",
        subcategory: "Slides / Sandals",
        price: 3000000,
        completePackagePrice: 4000000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Effortless. Grounded. Distinct.",
        fullDescription:
          "Terra-brown cross straps in a soft suede finish over a tan footbed and black sole. A refined cross-strap slide for everyday elevation.",
        colors: ["Terra Brown"],
        sizes: SHOE_SIZES,
        stockQuantity: 20,
        featured: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-008",
        productLine: "essentials",
        name: "Crimson Cross",
        slug: "crimson-cross",
        categorySlug: "footwear",
        subcategory: "Slides / Sandals",
        price: 2625000,
        completePackagePrice: 3500000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Bold texture. Effortless distinction.",
        fullDescription:
          "Distinctive scale-textured crimson straps cross over a smooth black footbed with a black buckle detail. A bold, secure and stylish everyday statement.",
        colors: ["Crimson / Black"],
        sizes: SHOE_SIZES,
        stockQuantity: 20,
        featured: true,
        newArrival: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-009",
        productLine: "essentials",
        name: "Pinnacle Denim",
        slug: "pinnacle-denim",
        categorySlug: "footwear",
        subcategory: "Slides",
        price: 3000000,
        completePackagePrice: 4000000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Effortless edge. Every detail counts.",
        fullDescription:
          "A dark denim slide with unique safety-pin accents over a black sole. Durable denim fabric, bold details, and a soft insole for all-day ease.",
        colors: ["Denim Blue"],
        sizes: SHOE_SIZES,
        stockQuantity: 20,
        featured: true,
        newArrival: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-010",
        productLine: "originals",
        name: "Terra Cove",
        slug: "terra-cove",
        categorySlug: "footwear",
        subcategory: "Clogs / Mules",
        price: 3825000,
        completePackagePrice: 4500000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Effortless ease. Confident every step.",
        fullDescription:
          "A brown mule with an adjustable gold-tone buckle, black sole and cushioned footbed. Effortless ease with a confident finish — currently offered at 15% lower.",
        colors: ["Brown"],
        sizes: SHOE_SIZES,
        stockQuantity: 18,
        featured: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-011",
        productLine: "originals",
        name: "Lightning Strap Loafer",
        slug: "lightning-strap-loafer",
        categorySlug: "footwear",
        subcategory: "Loafers",
        price: 6375000,
        completePackagePrice: 8500000,
        packageContents: STANDARD_PACKAGE_CONTENTS,
        shortDescription: "Bold by Design. Made to Lead.",
        fullDescription:
          "A black loafer with the signature star strap detail — expertly crafted with precision for a superior finish. Built for comfort, stability and effortless sophistication.",
        colors: ["Black"],
        sizes: SHOE_SIZES,
        stockQuantity: 14,
        featured: true,
        newArrival: true,
        customizable: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        // Price not yet confirmed by the brand — published as a draft.
        sku: "DFK-FTW-012",
        productLine: "originals",
        name: "Classic Black Penny Loafer",
        slug: "classic-black-penny-loafer",
        categorySlug: "footwear",
        subcategory: "Loafers",
        price: 0,
        shortDescription: "A clean black penny loafer with an elegant silhouette.",
        fullDescription:
          "The Classic Black Penny Loafer — a clean, elegant silhouette in deep black. Pricing to be confirmed by the house.",
        colors: ["Black"],
        sizes: SHOE_SIZES,
        stockQuantity: 0,
        status: "draft",
      },
      {
        // Price not yet confirmed by the brand — published as a draft.
        // No brand image supplied yet; the piece will take its visual once the
        // administrator uploads the original photograph in the admin dashboard.
        sku: "DFK-FTW-013",
        productLine: "originals",
        name: "Brown Leather Loafer",
        slug: "brown-leather-loafer",
        categorySlug: "footwear",
        subcategory: "Loafers",
        price: 0,
        shortDescription: "A brown leather loafer with a refined profile.",
        fullDescription:
          "The Brown Leather Loafer — refined, versatile, unmistakably DREAMZ. Pricing and imagery to be confirmed by the house.",
        colors: ["Brown"],
        sizes: SHOE_SIZES,
        stockQuantity: 0,
        status: "draft",
      },
      {
        sku: "DFK-BAG-014",
        productLine: "originals",
        name: "Exotic Elegance",
        slug: "exotic-elegance",
        categorySlug: "bags",
        subcategory: "Tote Bags",
        price: 6000000,
        completePackagePrice: 8000000,
        packageContents: [
          "Product",
          "Premium Gift Box",
          "Dust Bag",
          "Care Guide",
          "Doorstep Delivery Anywhere in Nigeria",
          "Fast-track Production & Delivery Within 7 Days",
        ],
        shortDescription: "Distinct. Sophisticated. Unmistakably You.",
        fullDescription:
          "The Exotic Elegance tote — a smooth, refined exterior with elegant buckle straps and delicate chain accents, and a roomy interior designed to carry your essentials with ease. Shown in Brown, Black and Grey; the available colour is confirmed at order.",
        colors: ["Brown", "Black", "Grey"],
        sizes: [],
        stockQuantity: 15,
        featured: true,
        newArrival: true,
        customizable: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-ACC-015",
        productLine: "royale",
        name: "The Gentleman Complete Combo",
        slug: "gentleman-complete-combo",
        categorySlug: "accessories",
        subcategory: "Gift Sets",
        price: 18750000,
        completePackagePrice: 25000000,
        packageContents: GENTLEMAN_PACKAGE_CONTENTS,
        shortDescription: "Refined Essentials. Effortless Distinction.",
        fullDescription:
          "The Gentleman Complete Combo brings together shoes, a belt and a leather pouch — a timeless combination that elevates every impression, presented with the full DREAMZ finishing: premium gift box, dust bag, care guide and shoe care kit. Doorstep delivery anywhere in Nigeria, fast-track production and delivery within 7 days.",
        colors: ["Brown"],
        sizes: SHOE_SIZES,
        stockQuantity: 6,
        featured: true,
        bestseller: true,
        deliveryInformation:
          "Doorstep delivery anywhere in Nigeria, fast-track production and delivery within 7 days.",
      },
      {
        sku: "DFK-FTW-016",
        productLine: "originals",
        name: "Lagos Tassel",
        slug: "lagos-tassel",
        categorySlug: "footwear",
        subcategory: "Loafers",
        price: 11850000, // ₦118,500 — Product Only, per brand creative
        completePackagePrice: 15800000, // ₦158,000 — Complete Package
        packageContents: [
          "Premium Gift Box",
          "Dust Bag",
          "Care Guide",
          "Shoe Care Kit",
          "Doorstep Delivery Anywhere in Nigeria",
          "Fast-track Production & Delivery Within 7 Days",
        ],
        shortDescription: "Premium Leather. Distinctive Design. Everyday Elegance.",
        fullDescription:
          "The Lagos Tassel — premium leather with a distinctive tassel detail, finished for everyday elegance. A confident loafer that carries the DREAMZ signature craft.",
        colors: [],
        sizes: SHOE_SIZES,
        stockQuantity: 14,
        featured: true,
        newArrival: true,
        customizable: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DFK-FTW-017",
        productLine: "essentials",
        name: "Verona Buckle Slide",
        slug: "verona-buckle-slide",
        categorySlug: "footwear",
        subcategory: "Slides",
        price: 2999900, // ₦29,999 — Product Only, per brand creative
        completePackagePrice: 3999900, // ₦39,999 — Complete Package
        packageContents: [
          "Product",
          "Premium Gift Box",
          "Dust Bag",
          "Shoe Care Kit",
          "Care Guide",
          "Doorstep Delivery Anywhere in Nigeria",
          "Fast-track Production & Delivery Within 7 Days",
        ],
        shortDescription: "Premium Leather. Handcrafted Finish. Comfort & Durability.",
        fullDescription:
          "The Verona Buckle Slide — premium leather with a handcrafted finish and an adjustable buckle, built for comfort and durability. Effortless slide-on ease with a considered profile.",
        colors: [],
        sizes: SHOE_SIZES,
        stockQuantity: 24,
        featured: true,
        newArrival: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
      {
        sku: "DZE-HB-001",
        productLine: "royale",
        name: "Executive Leather Handbag",
        slug: "executive-leather-handbag",
        categorySlug: "bags",
        subcategory: "Handbags",
        collection: "DREAMZ Exeutez Collection",
        price: 15375000, // ₦153,750 — single price, per brand artwork (SKU DZE-HB-001)
        completePackagePrice: null,
        packageContents: [],
        shortDescription: "Premium Full-Grain Leather. Handcrafted by Skilled Artisans.",
        fullDescription:
          "The Executive Leather Handbag from the DREAMZ Exeutez Collection — premium full-grain leather, handcrafted by skilled artisans with solid brass hardware. Spacious interior within an elegant structure. Dimensions: L 14.1 in (36 cm) × H 10.2 in (26 cm) × W 5.5 in (14 cm).",
        materials: "Premium full-grain leather, solid brass hardware",
        colors: [],
        sizes: [],
        stockQuantity: 10,
        featured: true,
        newArrival: true,
        deliveryInformation:
          "Doorstep delivery anywhere in Nigeria. Fast-track production and delivery within 7 days.",
      },
      {
        sku: "DFK-BAG-018",
        productLine: "originals",
        name: "Pedra Satchel",
        slug: "pedra-satchel",
        categorySlug: "bags",
        subcategory: "Satchels",
        price: 10125000, // ₦101,250 — Product Only, per brand creative
        completePackagePrice: 13500000, // ₦135,000 — Complete Package
        packageContents: [
          "Product",
          "Quality Box",
          "Dust Bag",
          "Care Guide",
          "Doorstep Delivery Anywhere in Nigeria",
          "Fast-track Production & Delivery Within 7 Days",
        ],
        shortDescription: "Structured Elegance. Timeless Luxury.",
        fullDescription:
          "The Pedra Satchel — structured elegance in timeless luxury. A considered silhouette with a refined finish, made to carry well and last.",
        colors: [],
        sizes: [],
        stockQuantity: 12,
        featured: true,
        newArrival: true,
        customizable: true,
        deliveryInformation:
          "Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.",
      },
    ].map((p) => ({ ...p, tier: tierFromProductLine(p.productLine) })))
    .onConflictDoNothing();

  // Variant rows for the products above — created once, deduped on every
  // pass (concurrent cold starts in dev can race this).
  // EVERY footwear product with sizes metadata gets real variant rows so the
  // size selector renders and the size gates Add to Cart / Buy Now / checkout.
  const variantTargets: Array<{ slug: string; sizes: string[]; colors: string[]; stock: number; sku: string }> = [
    { slug: "boot-of-many-colours", sizes: SHOE_SIZES, colors: [], stock: 12, sku: "DFK-FTW-001" },
    { slug: "asiwaju-mule-brown", sizes: SHOE_SIZES, colors: [], stock: 16, sku: "DFK-FTW-002" },
    { slug: "asiwaju-mule-black-white", sizes: SHOE_SIZES, colors: [], stock: 16, sku: "DFK-FTW-003" },
    { slug: "crimson-pin", sizes: SHOE_SIZES, colors: [], stock: 20, sku: "DFK-FTW-004" },
    { slug: "onyx-wave", sizes: SHOE_SIZES, colors: [], stock: 20, sku: "DFK-FTW-005" },
    { slug: "onyx-stride", sizes: SHOE_SIZES, colors: [], stock: 20, sku: "DFK-FTW-006" },
    { slug: "terra-cross", sizes: SHOE_SIZES, colors: [], stock: 20, sku: "DFK-FTW-007" },
    { slug: "crimson-cross", sizes: SHOE_SIZES, colors: [], stock: 20, sku: "DFK-FTW-008" },
    { slug: "pinnacle-denim", sizes: SHOE_SIZES, colors: [], stock: 20, sku: "DFK-FTW-009" },
    { slug: "terra-cove", sizes: SHOE_SIZES, colors: [], stock: 18, sku: "DFK-FTW-010" },
    { slug: "lightning-strap-loafer", sizes: SHOE_SIZES, colors: [], stock: 14, sku: "DFK-FTW-011" },
    { slug: "gentleman-complete-combo", sizes: SHOE_SIZES, colors: [], stock: 6, sku: "DFK-ACC-015" },
    { slug: "lagos-tassel", sizes: SHOE_SIZES, colors: [], stock: 14, sku: "DFK-FTW-016" },
    { slug: "verona-buckle-slide", sizes: SHOE_SIZES, colors: [], stock: 24, sku: "DFK-FTW-017" },
    { slug: "executive-leather-handbag", sizes: [], colors: [], stock: 10, sku: "DZE-HB-001" },
    { slug: "pedra-satchel", sizes: [], colors: [], stock: 12, sku: "DFK-BAG-018" },
  ];
  for (const t of variantTargets) {
    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, t.slug))
      .limit(1);
    if (!row) continue;
    const existing = await db
      .select({ id: productVariants.id, size: productVariants.size, color: productVariants.color })
      .from(productVariants)
      .where(eq(productVariants.productId, row.id));
    const expected = Math.max(1, t.sizes.length * Math.max(1, t.colors.length || 1));
    // Dedupe: keep the lowest variant id per (color, size) combination.
    const seen = new Set<string>();
    const duplicates: number[] = [];
    for (const v of existing) {
      const key = `${v.color ?? ""}|${v.size ?? ""}`;
      if (seen.has(key)) duplicates.push(v.id);
      else seen.add(key);
    }
    for (const id of duplicates) {
      await db.delete(productVariants).where(eq(productVariants.id, id));
    }
    if (existing.length - duplicates.length > 0) continue;
    const per = Math.max(1, Math.floor(t.stock / expected));
    const colors = t.colors.length ? t.colors : [null as unknown as string];
    const sizes = t.sizes.length ? t.sizes : [null as unknown as string];
    await db.insert(productVariants).values(
      colors.flatMap((color) =>
        sizes.map((size) => ({
          productId: row.id,
          color: color ?? null,
          size: size ?? null,
          stockQuantity: per,
          sku: `${t.sku}${color ? `-${String(color).slice(0, 3).toUpperCase()}` : ""}${size ? `-${size}` : ""}`,
        })),
      ),
    );
  }

  await db
    .insert(settings)
    .values([
      {
        key: "site",
        value: {
          announcementBar: "Complete Package — fast-track production & doorstep delivery anywhere in Nigeria within 7 days",
          heroEyebrow: "DREAMZ FASHION KONCEPTZ",
          heroTitle: "Your dream. Your style. Made to wear.",
          heroSubtitle: "YOUR DREAM OUTFIT",
          heroBody: "Handcrafted leather footwear, bags and accessories — designed in Nigeria, made to be remembered. Shop the collection or commission a piece that is entirely yours.",
          whatsappNumber: "2349038560517",
          whatsappDisplayName: "Dreamz.ng on WhatsApp",
          instagram: "https://www.instagram.com/dreamzfashion_ng/",
          tiktok: "https://www.tiktok.com/@official_dreamzfashion",
          facebook: "https://www.facebook.com/share/19TGM3Vkue/",
          contactEmail: "contact.dreamzgroup@gmail.com",
          contactPhone: "+234 903 856 0517",
        },
      },
      {
        key: "rewards",
        value: {
          enabled: false,
          // Centralised rewards configuration. Points display stays off until
          // the owner verifies per-product values — no invented reward maths.
          pointsPerNaira: 0,
          pointsValueKobo: 0,
          eligibleCategorySlugs: [],
          expiryDays: 0,
          redemptionNote: "",
        },
      },
      {
        key: "ai",
        value: {
          enabled: true,
          // Guardrails for the Design Your Dream assistant (cheap by design).
          dailyRequestCap: 200,
          maxTurnsPerSession: 6,
          conceptEnabled: true,
          conceptDailyCap: 25,
        },
      },
      {
        key: "dreamz5",
        value: { enabled: false },
      },
      {
        key: "shipping",
        value: {
          defaultFee: 3500,
          freeThreshold: 150000,
        },
      },
      {
        // Deposit plans stay OFF until the owner configures real terms.
        // Nothing here is advertised to customers while disabled.
        key: "deposits",
        value: {
          enabled: false,
          defaultPercent: 50,
          balanceDueDays: 14,
          termsText: "",
        },
      },
      {
        // Partner programme terms (all three tracks) — zero until the owner
        // sets real commission rates. Payouts always require admin review.
        key: "partners",
        value: {
          commissionBps: 0,
          payoutThresholdKobo: 0,
          attributionWindowDays: 30,
          termsNote: "",
        },
      },
      {
        key: "anniversary",
        value: {
          enabled: true,
          date: "2027-06-12",
          label: "The Fifth Anniversary Collection",
        },
      },
    ])
    .onConflictDoNothing();

  // Referral programme scaffolding (inactive until an admin configures and
  // activates them — no invented commission rates). The unique index on
  // referral_programs.track makes this idempotent: conflicts are skipped and
  // existing rows win — never overwrite admin-configured programmes.
  await db
    .insert(referralPrograms)
    .values([
      {
        track: "public",
        name: "General Public Referral Programme",
        description:
          "Share your DREAMZ referral link. Rewards are earned when a referred customer's order is verified.",
        rewardType: "points",
        commissionBps: 0,
        pointsPerNaira1000: 0,
        minOrderKobo: 0,
        payoutThresholdKobo: 0,
        requiresApproval: true,
        eligibilityNote: "Rewards rates are set by the house before activation.",
        active: false,
      },
      {
        track: "student",
        name: "DREAMZ Student Ambassador Programme",
        description:
          "For students: apply with your institution details, receive a unique referral link, and earn rewards on verified purchases.",
        rewardType: "points",
        commissionBps: 0,
        pointsPerNaira1000: 0,
        minOrderKobo: 0,
        payoutThresholdKobo: 0,
        requiresApproval: true,
        eligibilityNote: "Applications are reviewed by the house. Earnings programmes require adult eligibility by default.",
        active: false,
      },
    ])
    .onConflictDoNothing({ target: referralPrograms.track });

  await ensureCatalogueDrafts();
}

/**
 * Structural draft entries that complete the 50-product merchandising
 * allocation (boots, bags, belts, wallets and purses). Every entry is an
 * UNPUBLISHED draft at zero price — the administrator completes the record
 * (real price, stock, imagery) in the admin dashboard before publishing.
 * Nothing here invents availability: unpriced products are quote-only even
 * if published. Insert-only + conflict skip keeps this idempotent.
 */
const CATALOGUE_DRAFTS: Array<{
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  subcategory: string;
  tier: string;
  shortDescription: string;
}> = [
  // Boots (allocation: 5)
  { sku: "DFK-DFT-101", name: "Chelsea Boot — Ebony", slug: "chelsea-boot-ebony", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "A sleek Chelsea boot in deep black leather with elastic side panels." },
  { sku: "DFK-DFT-102", name: "Lace-Up Ankle Boot — Tan", slug: "lace-up-ankle-boot-tan", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "Tan leather ankle boot with a full lace-up front and stacked heel." },
  { sku: "DFK-DFT-103", name: "Rider Boot — Chestnut", slug: "rider-boot-chestnut", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "A chestnut rider boot with a rounded toe and a confident profile." },
  { sku: "DFK-DFT-104", name: "Desert Boot — Sand", slug: "desert-boot-sand", categorySlug: "footwear", subcategory: "Boots", tier: "essentials", shortDescription: "Sand suede desert boot with crepe sole — easy, everyday character." },
  // Shoes & loafers (allocation: 15)
  { sku: "DFK-DFT-110", name: "Horsebit Loafer — Cognac", slug: "horsebit-loafer-cognac", categorySlug: "footwear", subcategory: "Loafers", tier: "originals", shortDescription: "Cognac loafer with a metal horsebit accent and a hand-burnished finish." },
  { sku: "DFK-DFT-111", name: "Tassel Loafer — Oxblood", slug: "tassel-loafer-oxblood", categorySlug: "footwear", subcategory: "Loafers", tier: "originals", shortDescription: "An oxblood tassel loafer with a considered, elegant profile." },
  { sku: "DFK-DFT-112", name: "Derby Shoe — Espresso", slug: "derby-shoe-espresso", categorySlug: "footwear", subcategory: "Derby Shoes", tier: "originals", shortDescription: "An espresso Derby shoe with an open-lace construction for a tailored fit." },
  // Bags (allocation: 8)
  { sku: "DFK-DFT-120", name: "Weekender Duffle — Espresso", slug: "weekender-duffle-espresso", categorySlug: "bags", subcategory: "Duffle Bags", tier: "originals", shortDescription: "A full-leather weekender duffle with brass hardware and a canvas-lined interior." },
  { sku: "DFK-DFT-121", name: "Crossbody Saddle Bag", slug: "crossbody-saddle-bag", categorySlug: "bags", subcategory: "Crossbody Bags", tier: "essentials", shortDescription: "A compact saddle crossbody with an adjustable leather strap." },
  { sku: "DFK-DFT-122", name: "Structured Tote — Onyx", slug: "structured-tote-onyx", categorySlug: "bags", subcategory: "Tote Bags", tier: "originals", shortDescription: "An onyx structured tote that holds its shape and carries a full day." },
  { sku: "DFK-DFT-123", name: "Mini Evening Bag — Plum", slug: "mini-evening-bag-plum", categorySlug: "bags", subcategory: "Evening Bags", tier: "originals", shortDescription: "A plum leather mini bag with a delicate chain strap for evenings out." },
  { sku: "DFK-DFT-124", name: "Laptop Folio — Charcoal", slug: "laptop-folio-charcoal", categorySlug: "bags", subcategory: "Business Bags", tier: "essentials", shortDescription: "A charcoal leather folio with a padded laptop sleeve and document pockets." },
  // Belts (allocation: 5)
  { sku: "DFK-DFT-130", name: "Classic Dress Belt — Black", slug: "classic-dress-belt-black", categorySlug: "accessories", subcategory: "Belts", tier: "essentials", shortDescription: "A black dress belt with a brushed buckle — the finishing detail of a considered wardrobe." },
  { sku: "DFK-DFT-131", name: "Casual Belt — Tan", slug: "casual-belt-tan", categorySlug: "accessories", subcategory: "Belts", tier: "essentials", shortDescription: "A tan casual belt with a matte roller buckle for everyday wear." },
  { sku: "DFK-DFT-132", name: "Reversible Belt — Brown / Black", slug: "reversible-belt-brown-black", categorySlug: "accessories", subcategory: "Belts", tier: "essentials", shortDescription: "One belt, two colourways — smooth leather that rotates in its buckle." },
  { sku: "DFK-DFT-133", name: "Braided Leather Belt", slug: "braided-leather-belt", categorySlug: "accessories", subcategory: "Belts", tier: "essentials", shortDescription: "Hand-braided leather strands with an articulated buckle — texture with restraint." },
  { sku: "DFK-DFT-134", name: "Executive Belt — Oxblood", slug: "executive-belt-oxblood", categorySlug: "accessories", subcategory: "Belts", tier: "originals", shortDescription: "An oxblood executive belt with edge stitching and a solid brass buckle." },
  // New drop — administrator-supplied designs (allocation: 17).
  // Imagery for these pieces is uploaded by the house in Admin → Media
  // (bulk upload) and assigned per product; the files themselves are never
  // bundled in the repo. Quote-only until the house sets prices.
  { sku: "DFK-DFT-150", name: "Ascension Oxford — Blue / Black", slug: "ascension-oxford-blue-black", categorySlug: "footwear", subcategory: "Oxfords", tier: "originals", shortDescription: "A blue and black Oxford with a confident, distinctive finish." },
  { sku: "DFK-DFT-151", name: "Woven Lightning Loafer — Brown", slug: "woven-lightning-loafer-brown", categorySlug: "footwear", subcategory: "Loafers", tier: "originals", shortDescription: "A brown woven loafer with lightning-strap detail." },
  { sku: "DFK-DFT-152", name: "Buckle Slide — Cream / Brown", slug: "buckle-slide-cream-brown", categorySlug: "footwear", subcategory: "Slides", tier: "essentials", shortDescription: "A cream and brown buckle slide — easy, everyday character." },
  { sku: "DFK-DFT-153", name: "Regent Button Boot — Emerald", slug: "regent-button-boot-emerald", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "An emerald button boot with a refined, commanding profile." },
  { sku: "DFK-DFT-154", name: "Wrist Pouch — Forest Green", slug: "wrist-pouch-forest-green", categorySlug: "accessories", subcategory: "Pouches", tier: "essentials", shortDescription: "A forest-green leather wrist pouch — carry the essentials well." },
  { sku: "DFK-DFT-155", name: "Frontier Croc Boot — Multicolour", slug: "frontier-croc-boot-multicolour", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "A multicolour crocodile-texture boot with frontier character." },
  { sku: "DFK-DFT-156", name: "Heritage Briefcase — Brown", slug: "heritage-briefcase-brown", categorySlug: "bags", subcategory: "Business Bags", tier: "originals", shortDescription: "A brown leather briefcase with a heritage finish." },
  { sku: "DFK-DFT-157", name: "Heritage Harness Boot — Brown Croc", slug: "heritage-harness-boot-brown-croc", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "A brown crocodile-texture harness boot with heritage detailing." },
  { sku: "DFK-DFT-158", name: "Midnight Vow Oxford — Black / Red", slug: "midnight-vow-oxford-black-red", categorySlug: "footwear", subcategory: "Oxfords", tier: "originals", shortDescription: "A black Oxford with a red sole — distinctive after dark." },
  { sku: "DFK-DFT-159", name: "Chelsea Boot — Navy / Cognac", slug: "chelsea-boot-navy-cognac", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "A navy and cognac Chelsea boot with elastic side panels." },
  { sku: "DFK-DFT-160", name: "Signature Hook Belt — Black / Rainbow", slug: "signature-hook-belt-black-rainbow", categorySlug: "accessories", subcategory: "Belts", tier: "originals", shortDescription: "A black belt with the house's signature rainbow hook." },
  { sku: "DFK-DFT-161", name: "Voltage Boot — Oxblood / Black", slug: "voltage-boot-oxblood-black", categorySlug: "footwear", subcategory: "Boots", tier: "originals", shortDescription: "An oxblood and black double-strap boot with a charged profile." },
  { sku: "DFK-DFT-162", name: "Chunky Derby — Black", slug: "chunky-derby-black", categorySlug: "footwear", subcategory: "Derby Shoes", tier: "originals", shortDescription: "A black chunky Derby shoe with an open-lace construction." },
  { sku: "DFK-DFT-163", name: "Loafer — Tan / Forest Green", slug: "loafer-tan-forest-green", categorySlug: "footwear", subcategory: "Loafers", tier: "originals", shortDescription: "A tan and forest-green loafer with a considered profile." },
  { sku: "DFK-DFT-164", name: "Patchwork Slide — Brown", slug: "patchwork-slide-brown", categorySlug: "footwear", subcategory: "Slides", tier: "essentials", shortDescription: "A brown patchwork slide with close-up craft detailing." },
  { sku: "DFK-DFT-165", name: "Lined Belt Trio — Black", slug: "lined-belt-trio-black", categorySlug: "accessories", subcategory: "Belts", tier: "essentials", shortDescription: "Three black belts with colourful linings — one for every mood." },
  { sku: "DFK-DFT-166", name: "Croc Slide — Blue / Black", slug: "croc-slide-blue-black", categorySlug: "footwear", subcategory: "Slides", tier: "essentials", shortDescription: "A blue crocodile-texture and black slide — texture with restraint." },
  // Wallets, purses & card holders (allocation: 7)
  { sku: "DFK-DFT-140", name: "Bifold Wallet — Black", slug: "bifold-wallet-black", categorySlug: "accessories", subcategory: "Wallets", tier: "essentials", shortDescription: "A slim black bifold with six card slots and a full-length note compartment." },
  { sku: "DFK-DFT-141", name: "Card Holder — Tan", slug: "card-holder-tan", categorySlug: "accessories", subcategory: "Card Holders", tier: "essentials", shortDescription: "A tan card holder that softens with use — minimal, quick, everyday." },
  { sku: "DFK-DFT-142", name: "Zip Purse — Espresso", slug: "zip-purse-espresso", categorySlug: "accessories", subcategory: "Purses", tier: "essentials", shortDescription: "An espresso leather zip purse with a lined interior and card wall." },
  { sku: "DFK-DFT-143", name: "Travel Wallet — Cognac", slug: "travel-wallet-cognac", categorySlug: "accessories", subcategory: "Wallets", tier: "originals", shortDescription: "A cognac travel wallet with slots for passports, cards and boarding passes." },
  { sku: "DFK-DFT-144", name: "Money Clip — Ebony", slug: "money-clip-ebony", categorySlug: "accessories", subcategory: "Money Clips", tier: "essentials", shortDescription: "An ebony leather money clip with a magnetic fold — carry less, carry well." },
  { sku: "DFK-DFT-145", name: "Clutch Purse — Plum", slug: "clutch-purse-plum", categorySlug: "accessories", subcategory: "Purses", tier: "originals", shortDescription: "A plum leather clutch with a snap closure and an interior zip pocket." },
  { sku: "DFK-DFT-146", name: "Passport Holder — Sand", slug: "passport-holder-sand", categorySlug: "accessories", subcategory: "Travel Accessories", tier: "essentials", shortDescription: "A sand leather passport holder with card slots — travel, organised." },
];

async function ensureCatalogueDrafts() {
  const values = CATALOGUE_DRAFTS.map((d) => ({
    sku: d.sku,
    name: d.name,
    slug: d.slug,
    categorySlug: d.categorySlug,
    subcategory: d.subcategory,
    tier: d.tier,
    productLine: d.tier === "royale" ? "royale" : d.tier === "originals" ? "originals" : "essentials",
    price: 0, // no approved price yet — quote-only, even if published early
    shortDescription: d.shortDescription,
    fullDescription: `${d.shortDescription} This piece is being prepared for the collection. Pricing, sizes and imagery are confirmed by the house before it is published.`,
    sizes: d.categorySlug === "footwear" ? SHOE_SIZES : [],
    stockQuantity: 0,
    status: "draft" as const,
    checkoutReady: false,
  }));
  if (values.length === 0) return;
  await db.insert(products).values(values).onConflictDoNothing();
}

/**
 * Idempotent backfill for databases seeded by earlier versions: adds the
 * verified WhatsApp/social configuration and the rewards/AI keys without
 * overwriting anything an administrator has already saved.
 */
const SOCIAL_DEFAULTS: Record<string, unknown> = {
  whatsappNumber: "2349038560517",
  whatsappDisplayName: "Dreamz.ng on WhatsApp",
  instagram: "https://www.instagram.com/dreamzfashion_ng/",
  tiktok: "https://www.tiktok.com/@official_dreamzfashion",
  facebook: "https://www.facebook.com/share/19TGM3Vkue/",
  contactEmail: "contact.dreamzgroup@gmail.com",
  contactPhone: "+234 903 856 0517",
};

export async function backfillSiteSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.key, "site")).limit(1);
  const site = { ...((row?.value ?? {}) as Record<string, unknown>) };
  // The rebuilt site presents the wordmark in type and shows neutral
  // "Image coming soon" placeholders until approved photography is uploaded.
  // Legacy bundled hero artwork is no longer part of the site.
  let siteChanged = false;
  if ("heroImage" in site) {
    delete site.heroImage;
    siteChanged = true;
  }
  const merged = { ...SOCIAL_DEFAULTS, ...site };
  if (!row || siteChanged || JSON.stringify(merged) !== JSON.stringify(row?.value ?? {})) {
    await db
      .insert(settings)
      .values({ key: "site", value: merged })
      .onConflictDoUpdate({ target: settings.key, set: { value: merged, updatedAt: new Date() } });
  }
  // Category tiles no longer use bundled imagery.
  await db
    .update(categories)
    .set({ imageUrl: null })
    .where(sql`${categories.imageUrl} is not null and ${categories.imageUrl} like '/img/%'`);
  // Rewards + AI config keys (do not touch existing values).
  await db
    .insert(settings)
    .values([
      {
        key: "rewards",
        value: {
          enabled: false,
          pointsPerNaira: 0,
          pointsValueKobo: 0,
          eligibleCategorySlugs: [],
          expiryDays: 0,
          redemptionNote: "",
        },
      },
      {
        key: "ai",
        value: {
          enabled: true,
          dailyRequestCap: 200,
          maxTurnsPerSession: 6,
          conceptEnabled: true,
          conceptDailyCap: 25,
        },
      },
    ])
    .onConflictDoNothing();
}
