-- DREAMZ approved pricing and collection reconciliation, 18 Nov 2026.
-- Forward-only DML. Do not touch order snapshots or already-paid transactions.
-- Currency: NGN in kobo. Never guess prices for unsold catalogue drafts.

-- Boot of Many Colours: ₦120,000 alone or ₦160,000 with gift packaging.
-- Delivery is priced at checkout, not silently charged twice in the bundle.
UPDATE "products"
SET "price" = 12000000,
    "complete_package_price" = 16000000,
    "package_contents" = '["Product", "Premium gift box", "Dust bag", "Care guide", "Shoe care kit"]'::jsonb,
    "delivery_information" = 'Delivery charges and available options are calculated at checkout. Production and dispatch timing are confirmed after the order is accepted.',
    "tier" = 'originals',
    "product_line" = 'originals',
    "collection" = 'DREAMZ Originals',
    "updated_at" = now()
WHERE "sku" = 'DFK-FTW-001';
--> statement-breakpoint

-- A genuine entry-price made-to-order leather wrist piece. Photo to follow;
-- the storefront shows an honest no-photo placeholder, never invented art.
INSERT INTO "products" (
  "sku", "name", "slug", "category_slug", "subcategory",
  "collection", "tier", "product_line", "price", "currency",
  "short_description", "full_description", "materials", "colors", "sizes",
  "stock_quantity", "availability", "checkout_ready", "status", "featured",
  "customizable", "package_contents"
)
VALUES (
  'DFK-ACC-207', 'DREAMZ Everyday Leather Bangle', 'dreamz-everyday-leather-bangle',
  'accessories', 'Bracelets & Cuffs', 'DREAMZ Essentials', 'essentials', 'essentials', 500000, 'NGN',
  'A simple leather bangle made to order — an accessible first piece from DREAMZ.',
  'A minimal leather wrist bangle made to order at an accessible price. This entry-level piece is offered without premium gift packaging. Check delivery charges at checkout; your finished piece is crafted after your order is accepted.',
  'Leather', '[]'::jsonb, '[]'::jsonb,
  0, 'made_to_order', true, 'published', true, false, '[]'::jsonb
)
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint

-- Product lines for the READY-TO-WEAR catalogue. Royale bespoke and
-- unpriced custom requests remain untouched; no guessing missing prices.
-- Slides / sandals / easy wear: below ₦50k Essentials; ₦50k+ Originals.
-- Other footwear: below ₦100k Essentials; ₦100k+ Originals.
-- Bags and leather clothing: below ₦100k Essentials; ₦100k+ Originals.
-- Belts, wallets, purses, cuffs and small leather goods:
-- below ₦50k Essentials; ₦50k+ Originals.
WITH assigned AS (
  SELECT "id",
    CASE
      WHEN "category_slug" = 'footwear'
        AND lower(trim(coalesce("subcategory", ''))) IN
          ('slides', 'slide', 'sandals', 'sandal', 'mules', 'mule', 'easy wear', 'slippers', 'half shoes')
      THEN CASE WHEN "price" < 5000000 THEN 'essentials' ELSE 'originals' END
      WHEN "category_slug" = 'accessories'
      THEN CASE WHEN "price" < 5000000 THEN 'essentials' ELSE 'originals' END
      ELSE CASE WHEN "price" < 10000000 THEN 'essentials' ELSE 'originals' END
    END AS new_tier
  FROM "products"
  WHERE "status" = 'published'
    AND "price" > 0
    AND "category_slug" IN ('footwear', 'bags', 'leather-wear', 'accessories')
    AND lower("tier") NOT IN ('royale', 'bespoke')
    AND lower("product_line") <> 'royale'
)
UPDATE "products" p
SET "tier" = a.new_tier,
    "product_line" = a.new_tier,
    "collection" = CASE
      WHEN a.new_tier = 'essentials' THEN 'DREAMZ Essentials'
      ELSE 'DREAMZ Originals'
    END,
    "front_original_rank" = CASE WHEN a.new_tier = 'essentials' THEN NULL ELSE p."front_original_rank" END,
    "updated_at" = now()
FROM assigned a WHERE p."id" = a."id";
