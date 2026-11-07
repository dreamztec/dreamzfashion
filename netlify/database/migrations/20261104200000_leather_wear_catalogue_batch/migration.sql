-- ── Leather Wear catalogue batch ─────────────────────────────────────
--
-- Adds the fourth commerce category (Leather Wear) and ingests the house's
-- 16 approved leather-fashion pieces as UNPUBLISHED DRAFTS with their
-- uploaded photography. Two additional uploads are catalogued as reference
-- assets only (campaign composition + colourway study) and never become
-- product SKUs.
--
-- NO PRICES are invented: every new product is price 0 (quote-only), stock 0
-- and checkout_ready = false. The house sets real prices and publishes each
-- piece from the admin dashboard.
--
-- Idempotent: guarded by ON CONFLICT DO NOTHING / NOT EXISTS, so re-applying
-- never duplicates or overwrites rows.

-- 1. The Leather Wear category (Tops · Vests · Jackets · Trousers ·
--    Shorts · Skirts · Other Leather Wear are product types under it).
INSERT INTO "categories" ("name", "slug", "description", "image_url", "sort_order", "active")
VALUES (
  'Leather Wear',
  'leather-wear',
  'Leather tops, vests, jackets, trousers and shorts — the wardrobe, made in leather.',
  NULL,
  4,
  true
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- 2. The 16 draft products. Descriptions are the house's approved copy,
--    used verbatim. Collections follow the house's assignment (Essentials /
--    Originals) and are locked so automatic classification never moves them.
INSERT INTO "products"
  ("sku", "name", "slug", "category_slug", "subcategory", "tier", "product_line",
   "collection_locked", "price", "complete_package_price", "package_contents",
   "short_description", "full_description", "colors", "sizes", "stock_quantity",
   "availability", "theme", "image_fit", "status", "checkout_ready")
VALUES
  ('DFK-ACC-201', 'Resolve Double-Buckle Cuff', 'resolve-double-buckle-cuff', 'accessories', 'Bracelets & Cuffs', 'essentials', 'essentials',
   true, 0, NULL, '[]'::jsonb,
   'A structured black leather wrist cuff finished with twin buckle closures, contrast red keepers and silver-tone hardware. Bold, compact and easy to style as a statement accessory.',
   'A structured black leather wrist cuff finished with twin buckle closures, contrast red keepers and silver-tone hardware. Bold, compact and easy to style as a statement accessory.',
   '["Black"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Resolve', 'contain', 'draft', false),
  ('DFK-ACC-202', 'Unity Beaded Bracelet', 'unity-beaded-bracelet', 'accessories', 'Bracelets & Cuffs', 'essentials', 'essentials',
   true, 0, NULL, '[]'::jsonb,
   'A layered bracelet combining dark leather, braided detailing and polished beads with subtle turquoise accents. Different materials brought together in one balanced piece.',
   'A layered bracelet combining dark leather, braided detailing and polished beads with subtle turquoise accents. Different materials brought together in one balanced piece.',
   '["Black / Turquoise"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Unity', 'contain', 'draft', false),
  ('DFK-LWR-201', 'Ambition Leather Tee', 'ambition-leather-tee', 'leather-wear', 'Tops', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'A relaxed short-sleeve leather top in deep brown, cut with a clean oversized silhouette and a restrained contrast detail at the chest pocket. Familiar form, elevated through leather.',
   'A relaxed short-sleeve leather top in deep brown, cut with a clean oversized silhouette and a restrained contrast detail at the chest pocket. Familiar form, elevated through leather.',
   '["Deep Brown"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Ambition', 'contain', 'draft', false),
  ('DFK-LWR-202', 'Courage Lace-Up Vest', 'courage-lace-up-vest', 'leather-wear', 'Vests', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'A sleeveless black leather vest built around utility pockets, structured panels and a distinctive blue lace-up front. Rugged construction refined into a statement fashion piece.',
   'A sleeveless black leather vest built around utility pockets, structured panels and a distinctive blue lace-up front. Rugged construction refined into a statement fashion piece.',
   '["Black / Blue"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Courage', 'contain', 'draft', false),
  ('DFK-LWR-203', 'Discipline Wide-Leg Trousers', 'discipline-wide-leg-trousers', 'leather-wear', 'Trousers', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'Clean black leather trousers with a high-rise profile and controlled wide-leg silhouette. Minimal detailing allows the leather, proportion and movement to lead.',
   'Clean black leather trousers with a high-rise profile and controlled wide-leg silhouette. Minimal detailing allows the leather, proportion and movement to lead.',
   '["Black"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Discipline', 'contain', 'draft', false),
  ('DFK-ACC-203', 'Mercy Wrap Cuff', 'mercy-wrap-cuff', 'accessories', 'Bracelets & Cuffs', 'essentials', 'essentials',
   true, 0, NULL, '[]'::jsonb,
   'A warm cognac leather cuff with a broad wrap construction and understated metal fastening. Simple, grounded and designed to age beautifully with wear.',
   'A warm cognac leather cuff with a broad wrap construction and understated metal fastening. Simple, grounded and designed to age beautifully with wear.',
   '["Cognac"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Mercy', 'contain', 'draft', false),
  ('DFK-ACC-204', 'Hope Slim Bracelet Set', 'hope-slim-bracelet-set', 'accessories', 'Bracelets & Cuffs', 'essentials', 'essentials',
   true, 0, NULL, '[]'::jsonb,
   'A set of slim leather bracelets in complementary tones, finished with small colour accents and minimal hardware. Wear individually or layer them together.',
   'A set of slim leather bracelets in complementary tones, finished with small colour accents and minimal hardware. Wear individually or layer them together.',
   '[]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Hope', 'contain', 'draft', false),
  ('DFK-LWR-204', 'Excellence Tailored Trousers', 'excellence-tailored-trousers', 'leather-wear', 'Trousers', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'Dark brown leather trousers shaped with a slimmer, tailored silhouette and precise panel construction. A refined alternative to conventional formal trousers.',
   'Dark brown leather trousers shaped with a slimmer, tailored silhouette and precise panel construction. A refined alternative to conventional formal trousers.',
   '["Dark Brown"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Excellence', 'contain', 'draft', false),
  ('DFK-ACC-205', 'Legacy Leather Belt', 'legacy-leather-belt', 'accessories', 'Belts', 'essentials', 'essentials',
   true, 0, NULL, '[]'::jsonb,
   'A classic black leather belt finished with a substantial antique-gold-tone buckle and restrained accent detailing. Designed as an everyday piece with lasting presence.',
   'A classic black leather belt finished with a substantial antique-gold-tone buckle and restrained accent detailing. Designed as an everyday piece with lasting presence.',
   '["Black"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Legacy', 'contain', 'draft', false),
  ('DFK-ACC-206', 'Purpose Wrist Pouch', 'purpose-wrist-pouch', 'accessories', 'Wrist Pouches', 'essentials', 'essentials',
   true, 0, NULL, '[]'::jsonb,
   'A structured brown leather wrist pouch with a clean flap profile, secure zip construction and detachable wrist strap. Compact enough for everyday carry while retaining an executive finish.',
   'A structured brown leather wrist pouch with a clean flap profile, secure zip construction and detachable wrist strap. Compact enough for everyday carry while retaining an executive finish.',
   '["Brown"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Purpose', 'contain', 'draft', false),
  ('DFK-LWR-205', 'Resilience Cargo Trousers', 'resilience-cargo-trousers', 'leather-wear', 'Trousers', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'Black leather cargo trousers with dimensional utility pockets, a wide-leg silhouette and adjustable lower-leg detailing. Functional references interpreted as statement leather fashion.',
   'Black leather cargo trousers with dimensional utility pockets, a wide-leg silhouette and adjustable lower-leg detailing. Functional references interpreted as statement leather fashion.',
   '["Black"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Resilience', 'contain', 'draft', false),
  ('DFK-LWR-206', 'Focus Cargo Joggers', 'focus-cargo-joggers', 'leather-wear', 'Joggers', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'Brown leather cargo joggers combining an elasticated waist, tapered legs and multiple utility pockets. Relaxed construction with a more considered luxury finish.',
   'Brown leather cargo joggers combining an elasticated waist, tapered legs and multiple utility pockets. Relaxed construction with a more considered luxury finish.',
   '["Brown"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Focus', 'contain', 'draft', false),
  ('DFK-LWR-207', 'Growth Tailored Shorts', 'growth-tailored-shorts', 'leather-wear', 'Shorts', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'Dark brown leather shorts with a clean knee-length cut and structured pocket detailing. Tailored enough to dress up while retaining an effortless silhouette.',
   'Dark brown leather shorts with a clean knee-length cut and structured pocket detailing. Tailored enough to dress up while retaining an effortless silhouette.',
   '["Dark Brown"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Growth', 'contain', 'draft', false),
  ('DFK-LWR-208', 'Possibility Cargo Shorts', 'possibility-cargo-shorts', 'leather-wear', 'Shorts', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'Warm tan leather cargo shorts with an elasticated waist and oversized utility pocket. An accessible statement piece built around comfort and proportion.',
   'Warm tan leather cargo shorts with an elasticated waist and oversized utility pocket. An accessible statement piece built around comfort and proportion.',
   '["Warm Tan"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Possibility', 'contain', 'draft', false),
  ('DFK-LWR-209', 'Leadership Utility Vest', 'leadership-utility-vest', 'leather-wear', 'Vests', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'A black leather utility vest defined by multiple dimensional pockets, textured panels and restrained accent details. A strong layering piece designed to command attention without unnecessary decoration.',
   'A black leather utility vest defined by multiple dimensional pockets, textured panels and restrained accent details. A strong layering piece designed to command attention without unnecessary decoration.',
   '["Black"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Leadership', 'contain', 'draft', false),
  ('DFK-LWR-210', 'Sacrifice Cargo Shorts', 'sacrifice-cargo-shorts', 'leather-wear', 'Shorts', 'originals', 'originals',
   true, 0, NULL, '[]'::jsonb,
   'Black leather cargo shorts with an extended silhouette, oversized utility pockets and subtle contrast hardware. Bold construction kept deliberately monochromatic.',
   'Black leather cargo shorts with an extended silhouette, oversized utility pockets and subtle contrast hardware. Bold construction kept deliberately monochromatic.',
   '["Black"]'::jsonb, '[]'::jsonb, 0, 'made_to_order', 'Sacrifice', 'contain', 'draft', false)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 3. Product photography — one clean gallery image per piece.
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/resolve-double-buckle-cuff.jpg',
       'Resolve Double-Buckle Cuff — structured black leather cuff with twin buckles, red keepers and silver-tone hardware', 0, 'product'
FROM "products" p WHERE p."slug" = 'resolve-double-buckle-cuff'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/resolve-double-buckle-cuff.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/unity-beaded-bracelet.jpg',
       'Unity Beaded Bracelet — layered dark leather, braided detailing and polished beads with turquoise accents', 0, 'product'
FROM "products" p WHERE p."slug" = 'unity-beaded-bracelet'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/unity-beaded-bracelet.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/ambition-leather-tee.jpg',
       'Ambition Leather Tee — relaxed short-sleeve deep brown leather top with chest pocket detail', 0, 'product'
FROM "products" p WHERE p."slug" = 'ambition-leather-tee'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/ambition-leather-tee.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/courage-lace-up-vest.jpg',
       'Courage Lace-Up Vest — sleeveless black leather vest with utility pockets and blue lace-up front', 0, 'product'
FROM "products" p WHERE p."slug" = 'courage-lace-up-vest'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/courage-lace-up-vest.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/discipline-wide-leg-trousers.jpg',
       'Discipline Wide-Leg Trousers — clean black high-rise leather trousers with a wide leg', 0, 'product'
FROM "products" p WHERE p."slug" = 'discipline-wide-leg-trousers'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/discipline-wide-leg-trousers.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/mercy-wrap-cuff.jpg',
       'Mercy Wrap Cuff — broad cognac leather wrap cuff with understated metal fastening', 0, 'product'
FROM "products" p WHERE p."slug" = 'mercy-wrap-cuff'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/mercy-wrap-cuff.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/hope-slim-bracelet-set.jpg',
       'Hope Slim Bracelet Set — slim leather bracelets in complementary tones with small colour accents', 0, 'product'
FROM "products" p WHERE p."slug" = 'hope-slim-bracelet-set'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/hope-slim-bracelet-set.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/excellence-tailored-trousers.jpg',
       'Excellence Tailored Trousers — dark brown tailored leather trousers with precise panel construction', 0, 'product'
FROM "products" p WHERE p."slug" = 'excellence-tailored-trousers'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/excellence-tailored-trousers.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/legacy-leather-belt.jpg',
       'Legacy Leather Belt — classic black leather belt with antique-gold-tone buckle', 0, 'product'
FROM "products" p WHERE p."slug" = 'legacy-leather-belt'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/legacy-leather-belt.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/purpose-wrist-pouch.jpg',
       'Purpose Wrist Pouch — structured brown leather wrist pouch with flap, zip and detachable strap', 0, 'product'
FROM "products" p WHERE p."slug" = 'purpose-wrist-pouch'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/purpose-wrist-pouch.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/resilience-cargo-trousers.jpg',
       'Resilience Cargo Trousers — black leather cargo trousers with dimensional utility pockets and wide leg', 0, 'product'
FROM "products" p WHERE p."slug" = 'resilience-cargo-trousers'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/resilience-cargo-trousers.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/focus-cargo-joggers.jpg',
       'Focus Cargo Joggers — brown leather cargo joggers with elasticated waist and utility pockets', 0, 'product'
FROM "products" p WHERE p."slug" = 'focus-cargo-joggers'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/focus-cargo-joggers.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/growth-tailored-shorts.jpg',
       'Growth Tailored Shorts — dark brown knee-length leather shorts with structured pockets', 0, 'product'
FROM "products" p WHERE p."slug" = 'growth-tailored-shorts'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/growth-tailored-shorts.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/possibility-cargo-shorts.jpg',
       'Possibility Cargo Shorts — warm tan leather cargo shorts with elasticated waist and oversized pocket', 0, 'product'
FROM "products" p WHERE p."slug" = 'possibility-cargo-shorts'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/possibility-cargo-shorts.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/leadership-utility-vest.jpg',
       'Leadership Utility Vest — black leather utility vest with dimensional pockets and textured panels', 0, 'product'
FROM "products" p WHERE p."slug" = 'leadership-utility-vest'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/leadership-utility-vest.jpg');
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", '/img/products/sacrifice-cargo-shorts.jpg',
       'Sacrifice Cargo Shorts — black leather cargo shorts with extended silhouette and oversized utility pockets', 0, 'product'
FROM "products" p WHERE p."slug" = 'sacrifice-cargo-shorts'
  AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/sacrifice-cargo-shorts.jpg');
--> statement-breakpoint

-- 4. Reference assets (NOT products):
--    a. Vision Leather Ensemble — campaign/lookbook composition only.
--    b. Cargo Shorts Colourway Study — visual reference the house uses to
--       define colour VARIANTS of matching SKUs. It must never be turned
--       into three products automatically.
INSERT INTO "media_assets" ("url", "title", "alt_text", "category", "is_lifestyle", "product_id")
SELECT '/img/products/vision-leather-ensemble-campaign.jpg',
       'Vision Leather Ensemble — Campaign',
       'Complete DREAMZ leather lifestyle composition featuring outerwear and coordinated leather accessories — campaign imagery, not a product SKU',
       'CAMPAIGN', true, NULL
WHERE NOT EXISTS (SELECT 1 FROM "media_assets" ma WHERE ma."url" = '/img/products/vision-leather-ensemble-campaign.jpg');
--> statement-breakpoint
INSERT INTO "media_assets" ("url", "title", "alt_text", "category", "is_lifestyle", "product_id")
SELECT '/img/products/cargo-shorts-colourway-reference.jpg',
       'Cargo Shorts Colourway Study — Variant Reference',
       'Visual reference showing related cargo-short constructions in multiple leather colourways — use to define colour variants of matching SKUs only; never to create new products',
       'OTHER', false, NULL
WHERE NOT EXISTS (SELECT 1 FROM "media_assets" ma WHERE ma."url" = '/img/products/cargo-shorts-colourway-reference.jpg');
--> statement-breakpoint

-- 5. Link the 16 product photographs into the media library so the admin
--    media picker shows them against their products (reference assets stay
--    unassigned).
INSERT INTO "media_assets" ("url", "title", "alt_text", "category", "is_lifestyle", "product_id")
SELECT pi."url",
       p."name",
       COALESCE(pi."alt_text", p."name"),
       'PRODUCT_PHOTO',
       false,
       p."id"
FROM "product_images" pi
JOIN "products" p ON p."id" = pi."product_id"
WHERE p."slug" IN (
  'resolve-double-buckle-cuff','unity-beaded-bracelet','ambition-leather-tee',
  'courage-lace-up-vest','discipline-wide-leg-trousers','mercy-wrap-cuff',
  'hope-slim-bracelet-set','excellence-tailored-trousers','legacy-leather-belt',
  'purpose-wrist-pouch','resilience-cargo-trousers','focus-cargo-joggers',
  'growth-tailored-shorts','possibility-cargo-shorts','leadership-utility-vest',
  'sacrifice-cargo-shorts'
)
AND NOT EXISTS (SELECT 1 FROM "media_assets" ma WHERE ma."url" = pi."url");
