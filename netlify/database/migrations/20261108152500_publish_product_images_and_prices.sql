-- DREAMZ public catalogue image/price reconciliation.
-- Forward-only DML. Existing uploads are attached to matching product slugs;
-- no file is duplicated and non-product campaign/reference files remain unlinked.
-- Product cards prefer clean photography, but may fall back to an approved
-- product poster instead of rendering a blank placeholder.

-- 1) House category order.
UPDATE "categories" SET "sort_order" = 1 WHERE "slug" = 'footwear';
--> statement-breakpoint
UPDATE "categories" SET "sort_order" = 2 WHERE "slug" = 'leather-wear';
--> statement-breakpoint
UPDATE "categories" SET "sort_order" = 3 WHERE "slug" = 'bags';
--> statement-breakpoint
UPDATE "categories" SET "sort_order" = 4 WHERE "slug" = 'accessories';
--> statement-breakpoint

-- 2) Signature hero price.
UPDATE "products"
SET "price" = 12000000,
    "complete_package_price" = 16000000,
    "updated_at" = now()
WHERE "sku" = 'DFK-FTW-001';
--> statement-breakpoint

-- 3) Publish the approved Leather Wear/accessory batch with real prices.
UPDATE "products"
SET "price" = CASE "sku"
    WHEN 'DFK-ACC-201' THEN 4500000
    WHEN 'DFK-ACC-202' THEN 3500000
    WHEN 'DFK-LWR-201' THEN 18000000
    WHEN 'DFK-LWR-202' THEN 22000000
    WHEN 'DFK-LWR-203' THEN 24000000
    WHEN 'DFK-ACC-203' THEN 4000000
    WHEN 'DFK-ACC-204' THEN 3500000
    WHEN 'DFK-LWR-204' THEN 22000000
    WHEN 'DFK-ACC-205' THEN 6500000
    WHEN 'DFK-ACC-206' THEN 8500000
    WHEN 'DFK-LWR-205' THEN 26000000
    WHEN 'DFK-LWR-206' THEN 22000000
    WHEN 'DFK-LWR-207' THEN 15000000
    WHEN 'DFK-LWR-208' THEN 14000000
    WHEN 'DFK-LWR-209' THEN 24000000
    WHEN 'DFK-LWR-210' THEN 16000000
  END,
  "status" = 'published',
  "checkout_ready" = true,
  "availability" = 'made_to_order',
  "updated_at" = now()
WHERE "sku" IN ('DFK-ACC-201', 'DFK-ACC-202', 'DFK-LWR-201', 'DFK-LWR-202', 'DFK-LWR-203', 'DFK-ACC-203', 'DFK-ACC-204', 'DFK-LWR-204', 'DFK-ACC-205', 'DFK-ACC-206', 'DFK-LWR-205', 'DFK-LWR-206', 'DFK-LWR-207', 'DFK-LWR-208', 'DFK-LWR-209', 'DFK-LWR-210');
--> statement-breakpoint

-- Purpose Wrist Pouch belongs with bags, not loose accessories.
UPDATE "products"
SET "category_slug" = 'bags',
    "subcategory" = 'Wrist Pouches',
    "updated_at" = now()
WHERE "sku" = 'DFK-ACC-206';
--> statement-breakpoint

-- 4) Attach every deployed product file whose basename exactly matches an
-- existing product slug. This repairs older products such as Crimson Pin,
-- Onyx Wave, Terra Cross, etc. without guessing which unrelated asset belongs
-- to which product.
WITH uploaded(filename) AS (
VALUES
  ('ambition-leather-tee.jpg'),
  ('ascension-oxford.jpg'),
  ('asiwaju-mule-black-white.jpg'),
  ('asiwaju-mule-brown-detail.jpg'),
  ('asiwaju-mule-brown.jpg'),
  ('boot-of-many-colours-studio.jpg'),
  ('boot-of-many-colours.jpg'),
  ('cargo-shorts-colourway-reference.jpg'),
  ('classic-black-penny-loafer.jpg'),
  ('courage-lace-up-vest.jpg'),
  ('crimson-cross.jpg'),
  ('crimson-pin.jpg'),
  ('discipline-wide-leg-trousers.jpg'),
  ('dreamz-ambition-brown-blue-gold.jpg'),
  ('dreamz-balance-beige-burnt-orange-slate-blue.jpg'),
  ('dreamz-balance-sand-multicolour.jpg'),
  ('dreamz-confidence-black-royal-blue.jpg'),
  ('dreamz-courage-black-red.jpg'),
  ('dreamz-depth-black-deep-blue.jpg'),
  ('dreamz-discipline-black-blue.jpg'),
  ('dreamz-discipline-black-royal-blue.jpg'),
  ('dreamz-discipline-cognac-royal-blue-gold.jpg'),
  ('dreamz-excellence-black-blue.jpg'),
  ('dreamz-excellence-brown-white.jpg'),
  ('dreamz-faith-black-oxblood.jpg'),
  ('dreamz-faith-tan-green.jpg'),
  ('dreamz-faith-taupe-navy.jpg'),
  ('dreamz-focus-black-royal-blue.jpg'),
  ('dreamz-freedom-cognac-green-blue-red-yellow.jpg'),
  ('dreamz-grace-black-blue.jpg'),
  ('dreamz-grace-black-royal-blue.jpg'),
  ('dreamz-grace-black-white.jpg'),
  ('dreamz-harmony-cream-multicolour.jpg'),
  ('dreamz-harmony-tan-forest-green.jpg'),
  ('dreamz-harmony-taupe-navy.jpg'),
  ('dreamz-integrity-black-burgundy.jpg'),
  ('dreamz-legacy-black-royal-blue.jpg'),
  ('dreamz-legacy-cognac-white.jpg'),
  ('dreamz-purpose-brown-blue.jpg'),
  ('dreamz-purpose-cognac-royal-blue.jpg'),
  ('dreamz-resolve-multicolour.jpg'),
  ('dreamz-rhythm-olive-orange-brown-black.jpg'),
  ('dreamz-unity-cream-multi.jpg'),
  ('dreamz-unity-multicolour.jpg'),
  ('dreamz-vision-green-red-orange-brown.jpg'),
  ('excellence-tailored-trousers.jpg'),
  ('executive-leather-handbag.jpg'),
  ('executive-spectrum-briefcase.jpg'),
  ('exotic-elegance.jpg'),
  ('focus-cargo-joggers.jpg'),
  ('gentleman-complete-combo.jpg'),
  ('growth-tailored-shorts.jpg'),
  ('heritage-medallion-oxford.jpg'),
  ('hope-slim-bracelet-set.jpg'),
  ('lagos-tassel.jpg'),
  ('leadership-utility-vest.jpg'),
  ('legacy-leather-belt.jpg'),
  ('legacy-strap-loafer.jpg'),
  ('lightning-strap-loafer.jpg'),
  ('mercy-wrap-cuff.jpg'),
  ('mosaic-crest-mule.jpg'),
  ('multicolour-oxford.jpg'),
  ('onyx-stride.jpg'),
  ('onyx-wave.jpg'),
  ('patterned-loafer.jpg'),
  ('pedra-satchel.jpg'),
  ('pinnacle-denim.jpg'),
  ('possibility-cargo-shorts.jpg'),
  ('prism-cross-sandal.jpg'),
  ('purpose-wrist-pouch.jpg'),
  ('regent-croc-tote.jpg'),
  ('resilience-cargo-trousers.jpg'),
  ('resolve-double-buckle-cuff.jpg'),
  ('sacrifice-cargo-shorts.jpg'),
  ('spectrum-buckle-slide.jpg'),
  ('strap-twist.jpg'),
  ('terra-cove.jpg'),
  ('terra-cross.jpg'),
  ('unity-beaded-bracelet.jpg'),
  ('verona-buckle-slide.jpg'),
  ('vision-leather-ensemble-campaign.jpg'),
  ('voltage-noir-loafer.jpg'),
  ('voyager-colourline-pouch.jpg')
),
matched AS (
  SELECT p."id" AS product_id,
         p."name" AS product_name,
         '/img/products/' || u.filename AS image_url
  FROM uploaded u
  JOIN "products" p
    ON p."slug" = regexp_replace(u.filename, '\.jpg$', '')
)
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT m.product_id, m.image_url, m.product_name, 0, 'product'
FROM matched m
WHERE NOT EXISTS (
  SELECT 1 FROM "product_images" pi
  WHERE pi."product_id" = m.product_id AND pi."url" = m.image_url
);
--> statement-breakpoint

-- 5) Mirror matched bundled files into Admin → Media when they are not
-- already represented there.
WITH uploaded(filename) AS (
VALUES
  ('ambition-leather-tee.jpg'),
  ('ascension-oxford.jpg'),
  ('asiwaju-mule-black-white.jpg'),
  ('asiwaju-mule-brown-detail.jpg'),
  ('asiwaju-mule-brown.jpg'),
  ('boot-of-many-colours-studio.jpg'),
  ('boot-of-many-colours.jpg'),
  ('cargo-shorts-colourway-reference.jpg'),
  ('classic-black-penny-loafer.jpg'),
  ('courage-lace-up-vest.jpg'),
  ('crimson-cross.jpg'),
  ('crimson-pin.jpg'),
  ('discipline-wide-leg-trousers.jpg'),
  ('dreamz-ambition-brown-blue-gold.jpg'),
  ('dreamz-balance-beige-burnt-orange-slate-blue.jpg'),
  ('dreamz-balance-sand-multicolour.jpg'),
  ('dreamz-confidence-black-royal-blue.jpg'),
  ('dreamz-courage-black-red.jpg'),
  ('dreamz-depth-black-deep-blue.jpg'),
  ('dreamz-discipline-black-blue.jpg'),
  ('dreamz-discipline-black-royal-blue.jpg'),
  ('dreamz-discipline-cognac-royal-blue-gold.jpg'),
  ('dreamz-excellence-black-blue.jpg'),
  ('dreamz-excellence-brown-white.jpg'),
  ('dreamz-faith-black-oxblood.jpg'),
  ('dreamz-faith-tan-green.jpg'),
  ('dreamz-faith-taupe-navy.jpg'),
  ('dreamz-focus-black-royal-blue.jpg'),
  ('dreamz-freedom-cognac-green-blue-red-yellow.jpg'),
  ('dreamz-grace-black-blue.jpg'),
  ('dreamz-grace-black-royal-blue.jpg'),
  ('dreamz-grace-black-white.jpg'),
  ('dreamz-harmony-cream-multicolour.jpg'),
  ('dreamz-harmony-tan-forest-green.jpg'),
  ('dreamz-harmony-taupe-navy.jpg'),
  ('dreamz-integrity-black-burgundy.jpg'),
  ('dreamz-legacy-black-royal-blue.jpg'),
  ('dreamz-legacy-cognac-white.jpg'),
  ('dreamz-purpose-brown-blue.jpg'),
  ('dreamz-purpose-cognac-royal-blue.jpg'),
  ('dreamz-resolve-multicolour.jpg'),
  ('dreamz-rhythm-olive-orange-brown-black.jpg'),
  ('dreamz-unity-cream-multi.jpg'),
  ('dreamz-unity-multicolour.jpg'),
  ('dreamz-vision-green-red-orange-brown.jpg'),
  ('excellence-tailored-trousers.jpg'),
  ('executive-leather-handbag.jpg'),
  ('executive-spectrum-briefcase.jpg'),
  ('exotic-elegance.jpg'),
  ('focus-cargo-joggers.jpg'),
  ('gentleman-complete-combo.jpg'),
  ('growth-tailored-shorts.jpg'),
  ('heritage-medallion-oxford.jpg'),
  ('hope-slim-bracelet-set.jpg'),
  ('lagos-tassel.jpg'),
  ('leadership-utility-vest.jpg'),
  ('legacy-leather-belt.jpg'),
  ('legacy-strap-loafer.jpg'),
  ('lightning-strap-loafer.jpg'),
  ('mercy-wrap-cuff.jpg'),
  ('mosaic-crest-mule.jpg'),
  ('multicolour-oxford.jpg'),
  ('onyx-stride.jpg'),
  ('onyx-wave.jpg'),
  ('patterned-loafer.jpg'),
  ('pedra-satchel.jpg'),
  ('pinnacle-denim.jpg'),
  ('possibility-cargo-shorts.jpg'),
  ('prism-cross-sandal.jpg'),
  ('purpose-wrist-pouch.jpg'),
  ('regent-croc-tote.jpg'),
  ('resilience-cargo-trousers.jpg'),
  ('resolve-double-buckle-cuff.jpg'),
  ('sacrifice-cargo-shorts.jpg'),
  ('spectrum-buckle-slide.jpg'),
  ('strap-twist.jpg'),
  ('terra-cove.jpg'),
  ('terra-cross.jpg'),
  ('unity-beaded-bracelet.jpg'),
  ('verona-buckle-slide.jpg'),
  ('vision-leather-ensemble-campaign.jpg'),
  ('voltage-noir-loafer.jpg'),
  ('voyager-colourline-pouch.jpg')
),
matched AS (
  SELECT p."id" AS product_id,
         p."name" AS product_name,
         '/img/products/' || u.filename AS image_url
  FROM uploaded u
  JOIN "products" p
    ON p."slug" = regexp_replace(u.filename, '\.jpg$', '')
)
INSERT INTO "media_assets" ("url", "title", "alt_text", "category", "is_lifestyle", "product_id")
SELECT m.image_url, m.product_name, m.product_name, 'PRODUCT', false, m.product_id
FROM matched m
WHERE NOT EXISTS (
  SELECT 1 FROM "media_assets" a WHERE a."url" = m.image_url
);
--> statement-breakpoint

-- 6) If a product already had a verified positive price and its uploaded file
-- matches its slug, it is safe to make the catalogue row public. Zero-price
-- drafts remain private; we never invent a price.
WITH uploaded(filename) AS (
VALUES
  ('ambition-leather-tee.jpg'),
  ('ascension-oxford.jpg'),
  ('asiwaju-mule-black-white.jpg'),
  ('asiwaju-mule-brown-detail.jpg'),
  ('asiwaju-mule-brown.jpg'),
  ('boot-of-many-colours-studio.jpg'),
  ('boot-of-many-colours.jpg'),
  ('cargo-shorts-colourway-reference.jpg'),
  ('classic-black-penny-loafer.jpg'),
  ('courage-lace-up-vest.jpg'),
  ('crimson-cross.jpg'),
  ('crimson-pin.jpg'),
  ('discipline-wide-leg-trousers.jpg'),
  ('dreamz-ambition-brown-blue-gold.jpg'),
  ('dreamz-balance-beige-burnt-orange-slate-blue.jpg'),
  ('dreamz-balance-sand-multicolour.jpg'),
  ('dreamz-confidence-black-royal-blue.jpg'),
  ('dreamz-courage-black-red.jpg'),
  ('dreamz-depth-black-deep-blue.jpg'),
  ('dreamz-discipline-black-blue.jpg'),
  ('dreamz-discipline-black-royal-blue.jpg'),
  ('dreamz-discipline-cognac-royal-blue-gold.jpg'),
  ('dreamz-excellence-black-blue.jpg'),
  ('dreamz-excellence-brown-white.jpg'),
  ('dreamz-faith-black-oxblood.jpg'),
  ('dreamz-faith-tan-green.jpg'),
  ('dreamz-faith-taupe-navy.jpg'),
  ('dreamz-focus-black-royal-blue.jpg'),
  ('dreamz-freedom-cognac-green-blue-red-yellow.jpg'),
  ('dreamz-grace-black-blue.jpg'),
  ('dreamz-grace-black-royal-blue.jpg'),
  ('dreamz-grace-black-white.jpg'),
  ('dreamz-harmony-cream-multicolour.jpg'),
  ('dreamz-harmony-tan-forest-green.jpg'),
  ('dreamz-harmony-taupe-navy.jpg'),
  ('dreamz-integrity-black-burgundy.jpg'),
  ('dreamz-legacy-black-royal-blue.jpg'),
  ('dreamz-legacy-cognac-white.jpg'),
  ('dreamz-purpose-brown-blue.jpg'),
  ('dreamz-purpose-cognac-royal-blue.jpg'),
  ('dreamz-resolve-multicolour.jpg'),
  ('dreamz-rhythm-olive-orange-brown-black.jpg'),
  ('dreamz-unity-cream-multi.jpg'),
  ('dreamz-unity-multicolour.jpg'),
  ('dreamz-vision-green-red-orange-brown.jpg'),
  ('excellence-tailored-trousers.jpg'),
  ('executive-leather-handbag.jpg'),
  ('executive-spectrum-briefcase.jpg'),
  ('exotic-elegance.jpg'),
  ('focus-cargo-joggers.jpg'),
  ('gentleman-complete-combo.jpg'),
  ('growth-tailored-shorts.jpg'),
  ('heritage-medallion-oxford.jpg'),
  ('hope-slim-bracelet-set.jpg'),
  ('lagos-tassel.jpg'),
  ('leadership-utility-vest.jpg'),
  ('legacy-leather-belt.jpg'),
  ('legacy-strap-loafer.jpg'),
  ('lightning-strap-loafer.jpg'),
  ('mercy-wrap-cuff.jpg'),
  ('mosaic-crest-mule.jpg'),
  ('multicolour-oxford.jpg'),
  ('onyx-stride.jpg'),
  ('onyx-wave.jpg'),
  ('patterned-loafer.jpg'),
  ('pedra-satchel.jpg'),
  ('pinnacle-denim.jpg'),
  ('possibility-cargo-shorts.jpg'),
  ('prism-cross-sandal.jpg'),
  ('purpose-wrist-pouch.jpg'),
  ('regent-croc-tote.jpg'),
  ('resilience-cargo-trousers.jpg'),
  ('resolve-double-buckle-cuff.jpg'),
  ('sacrifice-cargo-shorts.jpg'),
  ('spectrum-buckle-slide.jpg'),
  ('strap-twist.jpg'),
  ('terra-cove.jpg'),
  ('terra-cross.jpg'),
  ('unity-beaded-bracelet.jpg'),
  ('verona-buckle-slide.jpg'),
  ('vision-leather-ensemble-campaign.jpg'),
  ('voltage-noir-loafer.jpg'),
  ('voyager-colourline-pouch.jpg')
)
UPDATE "products" p
SET "status" = 'published',
    "updated_at" = now()
WHERE p."status" = 'draft'
  AND p."price" > 0
  AND EXISTS (
    SELECT 1 FROM uploaded u
    WHERE p."slug" = regexp_replace(u.filename, '\.jpg$', '')
  );
