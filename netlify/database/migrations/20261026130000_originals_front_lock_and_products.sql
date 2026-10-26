-- Lock approved collection homes and add an explicit DREAMZ Originals front edit.
-- New designs without an imported media file remain draft/quote-only until the
-- house attaches the exact uploaded image in Admin → Media.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "collection_locked" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "front_original_rank" integer;
--> statement-breakpoint

-- Existing house Originals are authoritative. Price/colour changes must never
-- move them into another collection automatically.
UPDATE "products"
SET "collection" = 'DREAMZ Originals',
    "tier" = 'originals',
    "product_line" = 'originals',
    "collection_locked" = true
WHERE "product_line" = 'originals' OR "tier" = 'originals';
--> statement-breakpoint

-- Existing products in the exact owner-approved front order.
UPDATE "products" SET "front_original_rank" = 1, "collection"='DREAMZ Originals', "tier"='originals', "product_line"='originals', "collection_locked"=true
WHERE "slug" = 'lightning-strap-loafer';
--> statement-breakpoint
UPDATE "products" SET "front_original_rank" = 3, "collection"='DREAMZ Originals', "tier"='originals', "product_line"='originals', "collection_locked"=true
WHERE "slug" = 'dreamz-courage';
--> statement-breakpoint
UPDATE "products" SET "front_original_rank" = 8, "collection"='DREAMZ Originals', "tier"='originals', "product_line"='originals', "collection_locked"=true
WHERE "slug" = 'ascension-oxford-blue-black';
--> statement-breakpoint
UPDATE "products" SET "front_original_rank" = 9, "collection"='DREAMZ Originals', "tier"='originals', "product_line"='originals', "collection_locked"=true
WHERE "slug" = 'dreamz-unity';

--> statement-breakpoint
INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","collection_locked",
  "front_original_rank","price","short_description","full_description","colors",
  "availability","featured","customizable","product_line","tier","checkout_ready",
  "image_fit","status","tags"
)
SELECT
  'DFK-ORG-016','Spectrum Buckle Slide','spectrum-buckle-slide','footwear','Slides',
  'DREAMZ Originals',true,2,0,
  'A black leather slide with individually coloured side straps and refined buckle details.',
  'A DREAMZ Originals slide built around a restrained black upper with red, green and blue accent straps. Exact pricing and availability are confirmed by the house before payment.',
  '["Black / Red / Green / Blue"]'::jsonb,'made_to_order',true,true,'originals','originals',false,'contain','draft',
  '["front-original","media-required"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug"='spectrum-buckle-slide');

--> statement-breakpoint
INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","collection_locked",
  "front_original_rank","price","short_description","full_description","colors",
  "availability","featured","customizable","product_line","tier","checkout_ready",
  "image_fit","status","tags"
)
SELECT
  'DFK-ORG-017','Heritage Medallion Oxford','heritage-medallion-oxford','footwear','Oxfords',
  'DREAMZ Originals',true,4,0,
  'A burnished brown lace-up formal shoe with a distinctive perforated toe medallion.',
  'A DREAMZ Originals formal lace-up in burnished brown with detailed toe perforation and welt construction. Exact pricing and availability are confirmed by the house before payment.',
  '["Burnished Brown"]'::jsonb,'made_to_order',true,true,'originals','originals',false,'contain','draft',
  '["front-original","media-required"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug"='heritage-medallion-oxford');

--> statement-breakpoint
INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","collection_locked",
  "front_original_rank","price","short_description","full_description","colors",
  "availability","featured","customizable","product_line","tier","checkout_ready",
  "image_fit","status","tags"
)
SELECT
  'DFK-ORG-018','Executive Spectrum Briefcase','executive-spectrum-briefcase','bags','Briefcases',
  'DREAMZ Originals',true,5,0,
  'A structured black business briefcase finished with signature multicolour leather panels.',
  'A DREAMZ Originals executive briefcase with a structured black body, top handles and restrained multicolour panel accents. Exact pricing and availability are confirmed by the house before payment.',
  '["Black / Purple / Blue / Gold / Red"]'::jsonb,'made_to_order',true,true,'originals','originals',false,'contain','draft',
  '["front-original","media-required"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug"='executive-spectrum-briefcase');

--> statement-breakpoint
INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","collection_locked",
  "front_original_rank","price","short_description","full_description","colors",
  "availability","featured","customizable","product_line","tier","checkout_ready",
  "image_fit","status","tags"
)
SELECT
  'DFK-ORG-019','Heritage Spectrum Wrist Pouch','heritage-spectrum-wrist-pouch','accessories','Purses',
  'DREAMZ Originals',true,6,0,
  'A brown leather wrist pouch with blue, green, burgundy and gold accent details.',
  'A DREAMZ Originals compact leather pouch with a heritage brown body and controlled multicolour detailing. Exact pricing and availability are confirmed by the house before payment.',
  '["Brown / Blue / Green / Burgundy / Gold"]'::jsonb,'made_to_order',true,true,'originals','originals',false,'contain','draft',
  '["front-original","media-required"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug"='heritage-spectrum-wrist-pouch');

--> statement-breakpoint
INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","collection_locked",
  "front_original_rank","price","short_description","full_description","colors",
  "availability","featured","customizable","product_line","tier","checkout_ready",
  "image_fit","status","tags"
)
SELECT
  'DFK-ORG-020','Executive Croc Tote','executive-croc-tote','bags','Totes',
  'DREAMZ Originals',true,7,0,
  'A structured black crocodile-texture tote with mustard and burgundy leather accents.',
  'A DREAMZ Originals structured tote with black crocodile-texture panels, tall handles and controlled mustard and burgundy accents. Exact pricing and availability are confirmed by the house before payment.',
  '["Black / Mustard / Burgundy"]'::jsonb,'made_to_order',true,true,'originals','originals',false,'contain','draft',
  '["front-original","media-required"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug"='executive-croc-tote');

--> statement-breakpoint
INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","collection_locked",
  "front_original_rank","price","short_description","full_description","colors",
  "availability","featured","customizable","product_line","tier","checkout_ready",
  "image_fit","status","tags"
)
SELECT
  'DFK-ORG-021','Heritage Panel Slide','heritage-panel-slide','footwear','Slides',
  'DREAMZ Originals',true,10,0,
  'A brown leather slide with mustard, burgundy and green panel accents.',
  'A DREAMZ Originals slide combining a rich brown base with structured mustard, burgundy and green leather panels. Exact pricing and availability are confirmed by the house before payment.',
  '["Brown / Mustard / Burgundy / Green"]'::jsonb,'made_to_order',true,true,'originals','originals',false,'contain','draft',
  '["front-original","media-required"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug"='heritage-panel-slide');
