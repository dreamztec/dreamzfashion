-- DREAMZ Originals — canonical catalogue publishing (one-time controlled operation)
--
-- Architecture note: this migration is the ONLY place catalogue reconciliation
-- happens. Storefront SSR performs read-only queries and never mutates data.
--
-- Rules honoured here:
-- - Every statement is idempotent (re-running is a no-op).
-- - Products are matched by slug first, then legacy/name aliases; if a row
--   already exists it is UPDATED, never duplicated.
-- - The unique products.sku constraint is respected: rows are only re-keyed
--   when their current SKU differs from the canonical one, and legacy
--   provisional Originals rows are archived with a unique ARCHIVED-<id> SKU
--   before canonical SKUs are set.
-- - Boot of Many Colours keeps its Royale identity and hero treatment.
-- - Prices are in kobo (existing schema convention): ₦90,000 = 9000000.


-- ── 1. Archive legacy/provisional Originals duplicates ──────────────────
-- Older demo-era "dreamz-*" rows that are NOT part of the canonical fifteen.
-- They keep a unique SKU (ARCHIVED-<id>) so the unique constraint always holds.
UPDATE "products"
SET "sku" = 'ARCHIVED-' || id,
    "status" = 'archived',
    "featured" = false,
    "updated_at" = now()
WHERE "slug" IN (
  'dreamz-cross-strap-sandal',
  'dreamz-penny-loafer',
  'dreamz-derby-shoe',
  'dreamz-leather-tote',
  'dreamz-executive-briefcase',
  'dreamz-slim-wallet',
  'dreamz-leather-belt',
  'dreamz-depth',
  'dreamz-freedom',
  'dreamz-legacy',
  'dreamz-rhythm'
)
AND "slug" NOT IN (
  'dreamz-faith','dreamz-vision','dreamz-focus','dreamz-courage','dreamz-integrity',
  'dreamz-purpose','dreamz-discipline','dreamz-ambition','dreamz-excellence',
  'dreamz-grace','dreamz-confidence','dreamz-unity','dreamz-balance',
  'dreamz-harmony','dreamz-resolve'
);

-- ── 2. Publish and price the canonical fifteen ──────────────────────────
-- Full content per product: name, type label, short description, full
-- description, features, colourways and prices from the official batch.

-- DFK-ORG-001 — Dreamz Faith (₦90,000; 2 colourways)
UPDATE "products" SET
  "name" = 'Dreamz Faith',
  "sku" = 'DFK-ORG-001',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Loafers',
  "collection" = 'DREAMZ Originals',
  "price" = 9000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Soft sophistication for the man who moves with quiet confidence.',
  "full_description" = 'Dreamz Faith brings relaxed luxury into everyday dressing. Its streamlined slip-on silhouette combines a soft neutral body with a contrasting suede vamp, creating a versatile statement that works beautifully with smart-casual and relaxed looks.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Contrast-colour suede construction' || E'\n' || '• Clean slip-on silhouette' || E'\n' || '• Apron-style stitching' || E'\n' || '• Lightweight cream outsole' || E'\n' || '• Cushioned everyday profile' || E'\n' || '• Two colourways',
  "materials" = 'Premium soft suede leather with lightweight cream outsole',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Brush suede gently with a suede brush only.',
  "colors" = '["Tan / Forest Green","Taupe / Navy"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-faith';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-001','Dreamz Faith','dreamz-faith','footwear','Loafers','DREAMZ Originals','originals',9000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Soft sophistication for the man who moves with quiet confidence.',
  'Dreamz Faith brings relaxed luxury into everyday dressing. Its streamlined slip-on silhouette combines a soft neutral body with a contrasting suede vamp, creating a versatile statement that works beautifully with smart-casual and relaxed looks.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Contrast-colour suede construction' || E'\n' || '• Clean slip-on silhouette' || E'\n' || '• Apron-style stitching' || E'\n' || '• Lightweight cream outsole' || E'\n' || '• Cushioned everyday profile' || E'\n' || '• Two colourways',
  'Premium soft suede leather with lightweight cream outsole',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Brush suede gently with a suede brush only.',
  '["Tan / Forest Green","Taupe / Navy"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-faith');

-- DFK-ORG-002 — Dreamz Vision (₦120,000)
UPDATE "products" SET
  "name" = 'Dreamz Vision',
  "sku" = 'DFK-ORG-002',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Brogues',
  "collection" = 'DREAMZ Originals',
  "price" = 12000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Classic craftsmanship seen through a bolder lens.',
  "full_description" = 'Dreamz Vision transforms the traditional brogue into an expressive DREAMZ statement. Rich green, burgundy and warm amber panels meet detailed perforation and a formal silhouette for a shoe created to command attention without abandoning classic elegance.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Multicolour leather construction' || E'\n' || '• Wingtip styling' || E'\n' || '• Decorative brogue perforation' || E'\n' || '• Lace-up closure' || E'\n' || '• Traditional formal profile' || E'\n' || '• Contrast panel construction',
  "materials" = 'Hand-finished full-grain leather upper with contrast panels and brogue perforation',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly on smooth leather.',
  "colors" = '["Forest Green / Burgundy / Amber / Brown"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-vision';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-002','Dreamz Vision','dreamz-vision','footwear','Brogues','DREAMZ Originals','originals',12000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Classic craftsmanship seen through a bolder lens.',
  'Dreamz Vision transforms the traditional brogue into an expressive DREAMZ statement. Rich green, burgundy and warm amber panels meet detailed perforation and a formal silhouette for a shoe created to command attention without abandoning classic elegance.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Multicolour leather construction' || E'\n' || '• Wingtip styling' || E'\n' || '• Decorative brogue perforation' || E'\n' || '• Lace-up closure' || E'\n' || '• Traditional formal profile' || E'\n' || '• Contrast panel construction',
  'Hand-finished full-grain leather upper with contrast panels and brogue perforation',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly on smooth leather.',
  '["Forest Green / Burgundy / Amber / Brown"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-vision');

-- DFK-ORG-003 — Dreamz Focus (₦85,000)
UPDATE "products" SET
  "name" = 'Dreamz Focus',
  "sku" = 'DFK-ORG-003',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Brogues',
  "collection" = 'DREAMZ Originals',
  "price" = 8500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Strong lines. Clear direction.',
  "full_description" = 'Dreamz Focus combines a commanding black silhouette with a sharp royal-blue accent. Brogue-inspired detailing adds refinement while the bold lug sole gives the design a contemporary, confident presence.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Black upper' || E'\n' || '• Royal-blue contrast panel' || E'\n' || '• Decorative brogue detailing' || E'\n' || '• Black lace-up closure' || E'\n' || '• Chunky lug outsole' || E'\n' || '• Contemporary formal-casual profile',
  "materials" = 'Smooth full-grain calf leather with durable chunky lug outsole',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Black / Royal Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-focus';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-003','Dreamz Focus','dreamz-focus','footwear','Brogues','DREAMZ Originals','originals',8500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Strong lines. Clear direction.',
  'Dreamz Focus combines a commanding black silhouette with a sharp royal-blue accent. Brogue-inspired detailing adds refinement while the bold lug sole gives the design a contemporary, confident presence.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Black upper' || E'\n' || '• Royal-blue contrast panel' || E'\n' || '• Decorative brogue detailing' || E'\n' || '• Black lace-up closure' || E'\n' || '• Chunky lug outsole' || E'\n' || '• Contemporary formal-casual profile',
  'Smooth full-grain calf leather with durable chunky lug outsole',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Black / Royal Blue"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-focus');

-- DFK-ORG-004 — Dreamz Courage (₦100,000)
UPDATE "products" SET
  "name" = 'Dreamz Courage',
  "sku" = 'DFK-ORG-004',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Loafers',
  "collection" = 'DREAMZ Originals',
  "price" = 10000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Designed for those willing to stand apart.',
  "full_description" = 'Dreamz Courage pairs polished black with a deep red saddle and distinctive lightning-inspired detail. The result is a sleek loafer with a controlled flash of character — sophisticated enough for formal dressing and memorable enough to make a statement.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Sleek black leather construction' || E'\n' || '• Deep-red contrast saddle' || E'\n' || '• Lightning-inspired cut-out detail' || E'\n' || '• Refined apron stitching' || E'\n' || '• Slip-on construction' || E'\n' || '• Formal low heel',
  "materials" = 'Polished black box calf leather with deep-red contrast saddle and refined low heel',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Black / Red"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-courage';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-004','Dreamz Courage','dreamz-courage','footwear','Loafers','DREAMZ Originals','originals',10000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Designed for those willing to stand apart.',
  'Dreamz Courage pairs polished black with a deep red saddle and distinctive lightning-inspired detail. The result is a sleek loafer with a controlled flash of character — sophisticated enough for formal dressing and memorable enough to make a statement.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Sleek black leather construction' || E'\n' || '• Deep-red contrast saddle' || E'\n' || '• Lightning-inspired cut-out detail' || E'\n' || '• Refined apron stitching' || E'\n' || '• Slip-on construction' || E'\n' || '• Formal low heel',
  'Polished black box calf leather with deep-red contrast saddle and refined low heel',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Black / Red"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-courage');

-- DFK-ORG-005 — Dreamz Integrity (₦100,000)
UPDATE "products" SET
  "name" = 'Dreamz Integrity',
  "sku" = 'DFK-ORG-005',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Loafers',
  "collection" = 'DREAMZ Originals',
  "price" = 10000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Timeless character, finished with distinction.',
  "full_description" = 'Dreamz Integrity takes the familiar penny loafer and gives it a DREAMZ signature. A deep burgundy saddle contrasts against the polished black body, creating a mature design built for effortless formal and smart-casual dressing.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Black leather upper' || E'\n' || '• Burgundy saddle strap' || E'\n' || '• Penny-slot detail' || E'\n' || '• Apron stitching' || E'\n' || '• Slip-on construction' || E'\n' || '• Refined low heel',
  "materials" = 'Polished full-grain calfskin leather with burgundy saddle strap and stacked heel',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Black / Burgundy"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-integrity';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-005','Dreamz Integrity','dreamz-integrity','footwear','Loafers','DREAMZ Originals','originals',10000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Timeless character, finished with distinction.',
  'Dreamz Integrity takes the familiar penny loafer and gives it a DREAMZ signature. A deep burgundy saddle contrasts against the polished black body, creating a mature design built for effortless formal and smart-casual dressing.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Black leather upper' || E'\n' || '• Burgundy saddle strap' || E'\n' || '• Penny-slot detail' || E'\n' || '• Apron stitching' || E'\n' || '• Slip-on construction' || E'\n' || '• Refined low heel',
  'Polished full-grain calfskin leather with burgundy saddle strap and stacked heel',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Black / Burgundy"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-integrity');

-- DFK-ORG-006 — Dreamz Purpose (₦95,000)
UPDATE "products" SET
  "name" = 'Dreamz Purpose',
  "sku" = 'DFK-ORG-006',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Monk Straps',
  "collection" = 'DREAMZ Originals',
  "price" = 9500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Every detail has a reason.',
  "full_description" = 'Dreamz Purpose pairs richly burnished brown with a commanding royal-blue monk strap. The clean buckle closure and elongated profile create an elegant formal shoe with enough colour to feel unmistakably DREAMZ.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Burnished brown upper' || E'\n' || '• Royal-blue monk panel' || E'\n' || '• Silver-tone buckle' || E'\n' || '• Single monk closure' || E'\n' || '• Elongated formal silhouette' || E'\n' || '• Contrast construction',
  "materials" = 'Hand-burnished calfskin with royal-blue dyed leather strap and chrome-finished silver buckle',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Burnished Brown / Royal Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-purpose';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-006','Dreamz Purpose','dreamz-purpose','footwear','Monk Straps','DREAMZ Originals','originals',9500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Every detail has a reason.',
  'Dreamz Purpose pairs richly burnished brown with a commanding royal-blue monk strap. The clean buckle closure and elongated profile create an elegant formal shoe with enough colour to feel unmistakably DREAMZ.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Burnished brown upper' || E'\n' || '• Royal-blue monk panel' || E'\n' || '• Silver-tone buckle' || E'\n' || '• Single monk closure' || E'\n' || '• Elongated formal silhouette' || E'\n' || '• Contrast construction',
  'Hand-burnished calfskin with royal-blue dyed leather strap and chrome-finished silver buckle',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Burnished Brown / Royal Blue"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-purpose');

-- DFK-ORG-007 — Dreamz Discipline (₦110,000)
UPDATE "products" SET
  "name" = 'Dreamz Discipline',
  "sku" = 'DFK-ORG-007',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Monk Straps',
  "collection" = 'DREAMZ Originals',
  "price" = 11000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Structure becomes style.',
  "full_description" = 'Dreamz Discipline is built around precision. A polished black body is intersected by bold royal-blue double-monk panels and clean silver hardware, delivering a structured formal design with unmistakable contemporary character.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Polished black upper' || E'\n' || '• Royal-blue double-monk panels' || E'\n' || '• Dual silver-tone buckles' || E'\n' || '• Formal silhouette' || E'\n' || '• Contrast panel construction' || E'\n' || '• Refined outsole',
  "materials" = 'Polished calf leather with royal-blue leather panels and dual silver-tone buckles',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Black / Royal Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-discipline';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-007','Dreamz Discipline','dreamz-discipline','footwear','Monk Straps','DREAMZ Originals','originals',11000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Structure becomes style.',
  'Dreamz Discipline is built around precision. A polished black body is intersected by bold royal-blue double-monk panels and clean silver hardware, delivering a structured formal design with unmistakable contemporary character.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Polished black upper' || E'\n' || '• Royal-blue double-monk panels' || E'\n' || '• Dual silver-tone buckles' || E'\n' || '• Formal silhouette' || E'\n' || '• Contrast panel construction' || E'\n' || '• Refined outsole',
  'Polished calf leather with royal-blue leather panels and dual silver-tone buckles',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Black / Royal Blue"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-discipline');

-- DFK-ORG-008 — Dreamz Ambition (₦110,000)
UPDATE "products" SET
  "name" = 'Dreamz Ambition',
  "sku" = 'DFK-ORG-008',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Monk Straps',
  "collection" = 'DREAMZ Originals',
  "price" = 11000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Made for bigger rooms and bigger dreams.',
  "full_description" = 'Dreamz Ambition layers rich brown leather with royal blue and warm gold accents across a distinctive double-monk construction. Confident colour blocking gives a traditional formal silhouette an unmistakably modern DREAMZ attitude.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Burnished brown upper' || E'\n' || '• Royal-blue upper monk panel' || E'\n' || '• Warm gold lower accent' || E'\n' || '• Twin silver-tone buckles' || E'\n' || '• Multicolour construction' || E'\n' || '• Formal profile',
  "materials" = 'Burnished full-grain leather with tri-colour straps and polished silver hardware',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Burnished Brown / Royal Blue / Gold"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-ambition';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-008','Dreamz Ambition','dreamz-ambition','footwear','Monk Straps','DREAMZ Originals','originals',11000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Made for bigger rooms and bigger dreams.',
  'Dreamz Ambition layers rich brown leather with royal blue and warm gold accents across a distinctive double-monk construction. Confident colour blocking gives a traditional formal silhouette an unmistakably modern DREAMZ attitude.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Burnished brown upper' || E'\n' || '• Royal-blue upper monk panel' || E'\n' || '• Warm gold lower accent' || E'\n' || '• Twin silver-tone buckles' || E'\n' || '• Multicolour construction' || E'\n' || '• Formal profile',
  'Burnished full-grain leather with tri-colour straps and polished silver hardware',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Burnished Brown / Royal Blue / Gold"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-ambition');

-- DFK-ORG-009 — Dreamz Excellence (₦158,000; 2 colourways)
UPDATE "products" SET
  "name" = 'Dreamz Excellence',
  "sku" = 'DFK-ORG-009',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Brogues',
  "collection" = 'DREAMZ Originals',
  "price" = 15800000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Classic detail, elevated beyond ordinary.',
  "full_description" = 'Dreamz Excellence celebrates traditional brogue craftsmanship with a distinctive contrast centre line. Detailed perforation, polished finishing and carefully balanced colour transform a familiar formal silhouette into a signature DREAMZ piece.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Brogue perforation detailing' || E'\n' || '• Decorative cap toe' || E'\n' || '• Contrast centre stripe' || E'\n' || '• Lace-up construction' || E'\n' || '• Refined formal heel' || E'\n' || '• Two colourways',
  "materials" = 'Premium full-grain leather with contrast centre stripe and detailed brogue perforation',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Brown / White","Black / Royal Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-excellence';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-009','Dreamz Excellence','dreamz-excellence','footwear','Brogues','DREAMZ Originals','originals',15800000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Classic detail, elevated beyond ordinary.',
  'Dreamz Excellence celebrates traditional brogue craftsmanship with a distinctive contrast centre line. Detailed perforation, polished finishing and carefully balanced colour transform a familiar formal silhouette into a signature DREAMZ piece.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Brogue perforation detailing' || E'\n' || '• Decorative cap toe' || E'\n' || '• Contrast centre stripe' || E'\n' || '• Lace-up construction' || E'\n' || '• Refined formal heel' || E'\n' || '• Two colourways',
  'Premium full-grain leather with contrast centre stripe and detailed brogue perforation',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Brown / White","Black / Royal Blue"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-excellence');

-- DFK-ORG-010 — Dreamz Grace (₦85,000; 2 colourways)
UPDATE "products" SET
  "name" = 'Dreamz Grace',
  "sku" = 'DFK-ORG-010',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Loafers',
  "collection" = 'DREAMZ Originals',
  "price" = 8500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Elegance without effort.',
  "full_description" = 'Dreamz Grace combines a clean black loafer body with a bold contrast vamp and refined tassel detailing. Gold-tone accents provide a subtle touch of luxury while the sleek silhouette keeps the design elegant and wearable.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Smooth black construction' || E'\n' || '• Contrast-colour vamp' || E'\n' || '• Twin tassels' || E'\n' || '• Gold-tone tassel collars' || E'\n' || '• Slip-on silhouette' || E'\n' || '• Two colourways',
  "materials" = 'Polished black leather with contrast leather vamp and gold-plated tassel hardware',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  "colors" = '["Black / White","Black / Royal Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-grace';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-010','Dreamz Grace','dreamz-grace','footwear','Loafers','DREAMZ Originals','originals',8500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Elegance without effort.',
  'Dreamz Grace combines a clean black loafer body with a bold contrast vamp and refined tassel detailing. Gold-tone accents provide a subtle touch of luxury while the sleek silhouette keeps the design elegant and wearable.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Smooth black construction' || E'\n' || '• Contrast-colour vamp' || E'\n' || '• Twin tassels' || E'\n' || '• Gold-tone tassel collars' || E'\n' || '• Slip-on silhouette' || E'\n' || '• Two colourways',
  'Polished black leather with contrast leather vamp and gold-plated tassel hardware',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Use a leather conditioner sparingly.',
  '["Black / White","Black / Royal Blue"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-grace');

-- DFK-ORG-011 — Dreamz Confidence (₦45,000)
UPDATE "products" SET
  "name" = 'Dreamz Confidence',
  "sku" = 'DFK-ORG-011',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Slides',
  "collection" = 'DREAMZ Originals',
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Confidence, even in your easiest steps.',
  "full_description" = 'Dreamz Confidence combines rich blue crocodile-inspired textures with a black cushioned base for a slide that feels relaxed without looking ordinary. Strong texture and electric-blue edging make it an unmistakable DREAMZ casual piece.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Crocodile-inspired textured panels' || E'\n' || '• Mixed-texture upper' || E'\n' || '• Royal-blue edge detailing' || E'\n' || '• Black cushioned footbed' || E'\n' || '• Easy slip-on construction' || E'\n' || '• Flat everyday outsole',
  "materials" = 'Crocodile-embossed leather with pebbled grain panels and electric-blue contrast piping',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  "colors" = '["Black / Deep Royal Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 30,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-confidence';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-011','Dreamz Confidence','dreamz-confidence','footwear','Slides','DREAMZ Originals','originals',4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Confidence, even in your easiest steps.',
  'Dreamz Confidence combines rich blue crocodile-inspired textures with a black cushioned base for a slide that feels relaxed without looking ordinary. Strong texture and electric-blue edging make it an unmistakable DREAMZ casual piece.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Crocodile-inspired textured panels' || E'\n' || '• Mixed-texture upper' || E'\n' || '• Royal-blue edge detailing' || E'\n' || '• Black cushioned footbed' || E'\n' || '• Easy slip-on construction' || E'\n' || '• Flat everyday outsole',
  'Crocodile-embossed leather with pebbled grain panels and electric-blue contrast piping',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  '["Black / Deep Royal Blue"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  30,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-confidence');

-- DFK-ORG-012 — Dreamz Unity (₦45,000)
UPDATE "products" SET
  "name" = 'Dreamz Unity',
  "sku" = 'DFK-ORG-012',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Sandals',
  "collection" = 'DREAMZ Originals',
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Different colours. One bold idea.',
  "full_description" = 'Dreamz Unity celebrates colour through an easy everyday sandal. Contrasting straps meet a clean white footbed and adjustable tan upper, creating a playful design built around comfort, individuality and the DREAMZ multicolour identity.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Multicolour strap construction' || E'\n' || '• Adjustable buckle strap' || E'\n' || '• Toe-post design' || E'\n' || '• White cushioned footbed' || E'\n' || '• Contrasting edge detail' || E'\n' || '• Lightweight casual profile',
  "materials" = 'Multi-tonal calf leather straps with silver ankle buckle and cushioned white footbed',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  "colors" = '["Tan / Green / Blue / Red / Yellow / White"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 30,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-unity';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-012','Dreamz Unity','dreamz-unity','footwear','Sandals','DREAMZ Originals','originals',4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Different colours. One bold idea.',
  'Dreamz Unity celebrates colour through an easy everyday sandal. Contrasting straps meet a clean white footbed and adjustable tan upper, creating a playful design built around comfort, individuality and the DREAMZ multicolour identity.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Multicolour strap construction' || E'\n' || '• Adjustable buckle strap' || E'\n' || '• Toe-post design' || E'\n' || '• White cushioned footbed' || E'\n' || '• Contrasting edge detail' || E'\n' || '• Lightweight casual profile',
  'Multi-tonal calf leather straps with silver ankle buckle and cushioned white footbed',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  '["Tan / Green / Blue / Red / Yellow / White"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  30,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-unity');

-- DFK-ORG-013 — Dreamz Balance (₦45,000)
UPDATE "products" SET
  "name" = 'Dreamz Balance',
  "sku" = 'DFK-ORG-013',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Slides',
  "collection" = 'DREAMZ Originals',
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Relaxed comfort, carefully balanced.',
  "full_description" = 'Dreamz Balance pairs a soft sand-toned foundation with subtle orange and dusty-blue accents. Oversized silver-tone buckles bring structure to an otherwise relaxed silhouette, creating an easy-wearing slide with a refined creative edge.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Sand-toned upper' || E'\n' || '• Two adjustable straps' || E'\n' || '• Orange accent detail' || E'\n' || '• Dusty-blue accent detail' || E'\n' || '• Silver-tone buckles' || E'\n' || '• Contrast black edging',
  "materials" = 'Sand suede and smooth leather upper with contrast suede accents and dual silver buckles',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Brush suede gently with a suede brush only.',
  "colors" = '["Sand / Orange / Dusty Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 30,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-balance';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-013','Dreamz Balance','dreamz-balance','footwear','Slides','DREAMZ Originals','originals',4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Relaxed comfort, carefully balanced.',
  'Dreamz Balance pairs a soft sand-toned foundation with subtle orange and dusty-blue accents. Oversized silver-tone buckles bring structure to an otherwise relaxed silhouette, creating an easy-wearing slide with a refined creative edge.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Sand-toned upper' || E'\n' || '• Two adjustable straps' || E'\n' || '• Orange accent detail' || E'\n' || '• Dusty-blue accent detail' || E'\n' || '• Silver-tone buckles' || E'\n' || '• Contrast black edging',
  'Sand suede and smooth leather upper with contrast suede accents and dual silver buckles',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight. Brush suede gently with a suede brush only.',
  '["Sand / Orange / Dusty Blue"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  30,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-balance');

-- DFK-ORG-014 — Dreamz Harmony (₦45,000)
UPDATE "products" SET
  "name" = 'Dreamz Harmony',
  "sku" = 'DFK-ORG-014',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Slides',
  "collection" = 'DREAMZ Originals',
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Colour working beautifully together.',
  "full_description" = 'Dreamz Harmony brings together textured cream straps and carefully placed multicolour piping over a clean black footbed. The relaxed cross-strap construction makes it easy to wear while the colour treatment gives it unmistakable DREAMZ personality.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Textured cream upper' || E'\n' || '• Cross-strap construction' || E'\n' || '• Multicolour edge detailing' || E'\n' || '• Black cushioned footbed' || E'\n' || '• Flat black sole' || E'\n' || '• Easy slip-on profile',
  "materials" = 'Textured woven-effect cream leather with vibrant edge piping and cushioned black footbed',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  "colors" = '["Cream / Blue / Red / Green / Orange / Black"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 30,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-harmony';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-014','Dreamz Harmony','dreamz-harmony','footwear','Slides','DREAMZ Originals','originals',4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Colour working beautifully together.',
  'Dreamz Harmony brings together textured cream straps and carefully placed multicolour piping over a clean black footbed. The relaxed cross-strap construction makes it easy to wear while the colour treatment gives it unmistakable DREAMZ personality.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Textured cream upper' || E'\n' || '• Cross-strap construction' || E'\n' || '• Multicolour edge detailing' || E'\n' || '• Black cushioned footbed' || E'\n' || '• Flat black sole' || E'\n' || '• Easy slip-on profile',
  'Textured woven-effect cream leather with vibrant edge piping and cushioned black footbed',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  '["Cream / Blue / Red / Green / Orange / Black"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  30,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-harmony');

-- DFK-ORG-015 — Dreamz Resolve (₦45,000)
UPDATE "products" SET
  "name" = 'Dreamz Resolve',
  "sku" = 'DFK-ORG-015',
  "product_line" = 'originals',
  "category_slug" = 'footwear',
  "subcategory" = 'Slides',
  "collection" = 'DREAMZ Originals',
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Four tones. One clear statement.',
  "full_description" = 'Dreamz Resolve is a clean multicolour slide built from four horizontal bands in earthy complementary tones. The structured colour arrangement gives a simple everyday silhouette a stronger sense of identity.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Four-band upper construction' || E'\n' || '• Olive accent band' || E'\n' || '• Orange accent band' || E'\n' || '• Brown accent band' || E'\n' || '• Dark navy/black accent band' || E'\n' || '• Brown cushioned footbed' || E'\n' || '• Visible perimeter stitching',
  "materials" = 'Full-grain leather bands in four distinct tones with stitched perimeter and durable outsole',
  "care_information" = 'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  "colors" = '["Olive / Orange / Brown / Dark Navy-Black"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 30,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "delivery_information" = 'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  "status" = 'published',
  "updated_at" = now()
WHERE "slug" = 'dreamz-resolve';

INSERT INTO "products" (
  "sku","name","slug","category_slug","subcategory","collection","product_line","price",
  "package_contents","short_description","full_description","materials","care_information",
  "colors","sizes","stock_quantity","availability","featured","new_arrival",
  "delivery_information","image_fit","status"
)
SELECT
  'DFK-ORG-015','Dreamz Resolve','dreamz-resolve','footwear','Slides','DREAMZ Originals','originals',4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Four tones. One clear statement.',
  'Dreamz Resolve is a clean multicolour slide built from four horizontal bands in earthy complementary tones. The structured colour arrangement gives a simple everyday silhouette a stronger sense of identity.' || E'\n\n' ||
    'Key Features:' || E'\n' || '• Four-band upper construction' || E'\n' || '• Olive accent band' || E'\n' || '• Orange accent band' || E'\n' || '• Brown accent band' || E'\n' || '• Dark navy/black accent band' || E'\n' || '• Brown cushioned footbed' || E'\n' || '• Visible perimeter stitching',
  'Full-grain leather bands in four distinct tones with stitched perimeter and durable outsole',
  'Wipe with a soft dry cloth after wear. Keep away from prolonged moisture and direct heat. Store in the dust bag, away from sunlight.',
  '["Olive / Orange / Brown / Dark Navy-Black"]'::jsonb,
  '["40","41","42","43","44","45","46"]'::jsonb,
  30,'made_to_order',true,true,
  'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
  'cover','published'
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'dreamz-resolve');

-- ── 3. Variant rows: colourways + size grid ─────────────────────────────
-- The variants table drives both the colour selector and the size selector.
-- Colour-only variants (one row per colourway) already exist for this batch —
-- refresh them to the canonical colours, and add the size dimension where a
-- colour-only variant is the only row for a sized product. Idempotent: rows
-- are deleted and rebuilt per product only when their colour set differs
-- from the canonical colours; stock is shared across the grid.

CREATE TEMP TABLE _org_variant_targets (
  sku text PRIMARY KEY,
  colours jsonb NOT NULL,
  sized boolean NOT NULL,
  per_size_stock int NOT NULL
);
INSERT INTO _org_variant_targets VALUES
  ('DFK-ORG-001', '["Tan / Forest Green","Taupe / Navy"]'::jsonb, true, 1),
  ('DFK-ORG-002', '["Forest Green / Burgundy / Amber / Brown"]'::jsonb, true, 2),
  ('DFK-ORG-003', '["Black / Royal Blue"]'::jsonb, true, 2),
  ('DFK-ORG-004', '["Black / Red"]'::jsonb, true, 2),
  ('DFK-ORG-005', '["Black / Burgundy"]'::jsonb, true, 2),
  ('DFK-ORG-006', '["Burnished Brown / Royal Blue"]'::jsonb, true, 2),
  ('DFK-ORG-007', '["Black / Royal Blue"]'::jsonb, true, 2),
  ('DFK-ORG-008', '["Burnished Brown / Royal Blue / Gold"]'::jsonb, true, 2),
  ('DFK-ORG-009', '["Brown / White","Black / Royal Blue"]'::jsonb, true, 1),
  ('DFK-ORG-010', '["Black / White","Black / Royal Blue"]'::jsonb, true, 1),
  ('DFK-ORG-011', '["Black / Deep Royal Blue"]'::jsonb, true, 4),
  ('DFK-ORG-012', '["Tan / Green / Blue / Red / Yellow / White"]'::jsonb, true, 4),
  ('DFK-ORG-013', '["Sand / Orange / Dusty Blue"]'::jsonb, true, 4),
  ('DFK-ORG-014', '["Cream / Blue / Red / Green / Orange / Black"]'::jsonb, true, 4),
  ('DFK-ORG-015', '["Olive / Orange / Brown / Dark Navy-Black"]'::jsonb, true, 4);

-- Rebuild variants only where the colour set drifted from canonical
-- (protects any administrator-adjusted stock for untouched products).
DELETE FROM "product_variants" pv
USING "products" p, _org_variant_targets t
WHERE pv."product_id" = p."id"
  AND p."sku" = t."sku"
  AND (
    SELECT array_agg(c ORDER BY c) FROM jsonb_array_elements_text(t."colours") c
  ) IS DISTINCT FROM (
    SELECT array_agg(DISTINCT pv2."color" ORDER BY pv2."color")
    FROM "product_variants" pv2
    WHERE pv2."product_id" = p."id" AND pv2."color" IS NOT NULL
  );

INSERT INTO "product_variants" ("product_id","color","size","price","stock_quantity","sku")
SELECT p."id",
       c,
       s,
       NULL,
       t."per_size_stock",
       p."sku" || '-' || lower(regexp_replace(c, '[^a-zA-Z0-9]+', '-', 'g')) ||
         CASE WHEN s IS NOT NULL THEN '-' || s ELSE '' END
FROM "products" p
JOIN _org_variant_targets t ON t."sku" = p."sku"
CROSS JOIN LATERAL jsonb_array_elements_text(t."colours") AS colours(c)
CROSS JOIN LATERAL (
  VALUES ('40'), ('41'), ('42'), ('43'), ('44'), ('45'), ('46')
) AS sizes(s)
WHERE NOT EXISTS (
  SELECT 1 FROM "product_variants" pv
  WHERE pv."product_id" = p."id"
    AND pv."color" IS NOT DISTINCT FROM c
    AND pv."size" IS NOT DISTINCT FROM s
)
ON CONFLICT DO NOTHING;

-- Legacy variant SKUs reused another design's number (e.g. DFK-ORG-009-… rows
-- under DFK-ORG-010) — they were rebuilt above with correct prefixes. Renumber
-- the product-level guard: no variant SKU may belong to a different product.
UPDATE "product_variants" pv
SET "sku" = p."sku" || '-v' || pv."id"
FROM "products" p
WHERE pv."product_id" = p."id"
  AND p."sku" LIKE 'DFK-ORG-%'
  AND pv."sku" IS NOT NULL
  AND pv."sku" NOT LIKE p."sku" || '-%';

DROP TABLE _org_variant_targets;

-- ── 3b. Gallery rows for every Originals product ────────────────────────
-- Each design's uploaded photographs are permanent site assets under
-- /img/products/ (committed to the repo, served by the Netlify Image CDN).
-- Order matters: position 0 is the PRIMARY catalogue photograph; a colourway
-- gallery matches the product's colours array so selecting a colourway on the
-- PDP swaps to its photograph. Idempotent — only inserted when a design's
-- gallery is empty (never overwrites administrator-curated galleries).
CREATE TEMP TABLE _org_gallery (
  sku text PRIMARY KEY,
  images jsonb NOT NULL,
  alts jsonb NOT NULL
);
INSERT INTO _org_gallery VALUES
  ('DFK-ORG-001', '["/img/products/dreamz-faith-tan-green.jpg","/img/products/dreamz-faith-taupe-navy.jpg"]'::jsonb,
                  '["Dreamz Faith tan and forest-green suede slip-on loafers with contrast vamp and cream outsole","Dreamz Faith taupe and navy suede slip-on loafers with contrast vamp and cream outsole"]'::jsonb),
  ('DFK-ORG-002', '["/img/products/dreamz-vision-green-red-orange-brown.jpg"]'::jsonb,
                  '["Dreamz Vision multicolour wingtip brogue lace-up in forest green, burgundy, amber and brown"]'::jsonb),
  ('DFK-ORG-003', '["/img/products/dreamz-focus-black-royal-blue.jpg"]'::jsonb,
                  '["Dreamz Focus black chunky brogue lace-ups with royal-blue panels and lug sole"]'::jsonb),
  ('DFK-ORG-004', '["/img/products/dreamz-courage-black-red.jpg"]'::jsonb,
                  '["Dreamz Courage black statement loafers with deep-red lightning saddle strap"]'::jsonb),
  ('DFK-ORG-005', '["/img/products/dreamz-integrity-black-burgundy.jpg"]'::jsonb,
                  '["Dreamz Integrity black penny loafers with burgundy saddle strap"]'::jsonb),
  ('DFK-ORG-006', '["/img/products/dreamz-purpose-brown-blue.jpg"]'::jsonb,
                  '["Dreamz Purpose burnished brown single monk straps with royal-blue panel and silver buckle"]'::jsonb),
  ('DFK-ORG-007', '["/img/products/dreamz-discipline-black-blue.jpg"]'::jsonb,
                  '["Dreamz Discipline black double monk straps with royal-blue panels and twin silver buckles"]'::jsonb),
  ('DFK-ORG-008', '["/img/products/dreamz-ambition-brown-blue-gold.jpg"]'::jsonb,
                  '["Dreamz Ambition burnished brown double monks with royal-blue and gold straps"]'::jsonb),
  ('DFK-ORG-009', '["/img/products/dreamz-excellence-brown-white.jpg","/img/products/dreamz-excellence-black-blue.jpg"]'::jsonb,
                  '["Dreamz Excellence brown and white brogue lace-ups with contrast centre stripe","Dreamz Excellence black and royal-blue brogue lace-ups with contrast centre stripe"]'::jsonb),
  ('DFK-ORG-010', '["/img/products/dreamz-grace-black-white.jpg","/img/products/dreamz-grace-black-blue.jpg"]'::jsonb,
                  '["Dreamz Grace black tassel loafers with white vamp and gold-tone tassel collars","Dreamz Grace black tassel loafers with royal-blue vamp and gold-tone tassel collars"]'::jsonb),
  ('DFK-ORG-011', '["/img/products/dreamz-confidence-black-royal-blue.jpg"]'::jsonb,
                  '["Dreamz Confidence slides with crocodile-textured panels and electric-blue edge detailing"]'::jsonb),
  ('DFK-ORG-012', '["/img/products/dreamz-unity-multicolour.jpg"]'::jsonb,
                  '["Dreamz Unity multicolour toe-post sandals with white footbed and tan buckle strap"]'::jsonb),
  ('DFK-ORG-013', '["/img/products/dreamz-balance-sand-multicolour.jpg"]'::jsonb,
                  '["Dreamz Balance sand double-buckle slides with orange and dusty-blue accents"]'::jsonb),
  ('DFK-ORG-014', '["/img/products/dreamz-harmony-cream-multicolour.jpg"]'::jsonb,
                  '["Dreamz Harmony cream cross-strap slides with multicolour piping on a black footbed"]'::jsonb),
  ('DFK-ORG-015', '["/img/products/dreamz-resolve-multicolour.jpg"]'::jsonb,
                  '["Dreamz Resolve four-band slides in olive, orange, brown and dark navy"]'::jsonb);

INSERT INTO "product_images" ("product_id","url","alt_text","position")
SELECT p."id",
       img,
       alt,
       ord - 1
FROM "products" p
JOIN _org_gallery g ON g."sku" = p."sku"
CROSS JOIN LATERAL jsonb_array_elements_text(g."images") WITH ORDINALITY AS imgs(img, ord)
CROSS JOIN LATERAL (
  SELECT alt FROM jsonb_array_elements_text(g."alts") WITH ORDINALITY AS a(alt, o)
  WHERE o = ord
) AS alts
WHERE NOT EXISTS (
  SELECT 1 FROM "product_images" pi
  WHERE pi."product_id" = p."id" AND pi."url" = img
);

DROP TABLE _org_gallery;

-- ── 3c. Media library labels for the batch photographs ──────────────────
-- The 18 uploaded photographs are registered in the admin media library as
-- PRODUCT media linked to their design (idempotent by URL: updates the title/
-- linkage when the row already exists, inserts when it does not).
CREATE TEMP TABLE _org_media (
  sku text,
  url text,
  title text
);
INSERT INTO _org_media VALUES
  ('DFK-ORG-001','/img/products/dreamz-faith-tan-green.jpg','Dreamz Faith — Tan / Forest Green (Suede Slip-On Loafer)'),
  ('DFK-ORG-001','/img/products/dreamz-faith-taupe-navy.jpg','Dreamz Faith — Taupe / Navy (Suede Slip-On Loafer)'),
  ('DFK-ORG-002','/img/products/dreamz-vision-green-red-orange-brown.jpg','Dreamz Vision — Wingtip Brogue Lace-Up'),
  ('DFK-ORG-003','/img/products/dreamz-focus-black-royal-blue.jpg','Dreamz Focus — Chunky Brogue Lace-Up'),
  ('DFK-ORG-004','/img/products/dreamz-courage-black-red.jpg','Dreamz Courage — Statement Loafer'),
  ('DFK-ORG-005','/img/products/dreamz-integrity-black-burgundy.jpg','Dreamz Integrity — Penny Loafer'),
  ('DFK-ORG-006','/img/products/dreamz-purpose-brown-blue.jpg','Dreamz Purpose — Single Monk Strap'),
  ('DFK-ORG-007','/img/products/dreamz-discipline-black-blue.jpg','Dreamz Discipline — Double Monk Strap'),
  ('DFK-ORG-008','/img/products/dreamz-ambition-brown-blue-gold.jpg','Dreamz Ambition — Multicolour Double Monk'),
  ('DFK-ORG-009','/img/products/dreamz-excellence-brown-white.jpg','Dreamz Excellence — Brown / White (Brogue Lace-Up)'),
  ('DFK-ORG-009','/img/products/dreamz-excellence-black-blue.jpg','Dreamz Excellence — Black / Royal Blue (Brogue Lace-Up)'),
  ('DFK-ORG-010','/img/products/dreamz-grace-black-white.jpg','Dreamz Grace — Black / White (Tassel Loafer)'),
  ('DFK-ORG-010','/img/products/dreamz-grace-black-blue.jpg','Dreamz Grace — Black / Royal Blue (Tassel Loafer)'),
  ('DFK-ORG-011','/img/products/dreamz-confidence-black-royal-blue.jpg','Dreamz Confidence — Textured Slide'),
  ('DFK-ORG-012','/img/products/dreamz-unity-multicolour.jpg','Dreamz Unity — Toe-Post Sandal'),
  ('DFK-ORG-013','/img/products/dreamz-balance-sand-multicolour.jpg','Dreamz Balance — Double-Buckle Slide'),
  ('DFK-ORG-014','/img/products/dreamz-harmony-cream-multicolour.jpg','Dreamz Harmony — Cross-Strap Slide'),
  ('DFK-ORG-015','/img/products/dreamz-resolve-multicolour.jpg','Dreamz Resolve — Four-Band Slide');

-- Outdated provisional media labels (old colourway names from the earlier
-- iteration) are corrected to match the final batch.
UPDATE "media_assets"
SET "title" = 'Superseded draft photograph — not part of the canonical gallery',
    "is_lifestyle" = true,
    "category" = 'OTHER'
WHERE "url" IN (
  '/img/products/dreamz-faith-black-oxblood.jpg',
  '/img/products/dreamz-harmony-tan-forest-green.jpg',
  '/img/products/dreamz-harmony-taupe-navy.jpg',
  '/img/products/dreamz-purpose-cognac-royal-blue.jpg',
  '/img/products/dreamz-discipline-black-royal-blue.jpg',
  '/img/products/dreamz-discipline-cognac-royal-blue-gold.jpg',
  '/img/products/dreamz-balance-beige-burnt-orange-slate-blue.jpg',
  '/img/products/dreamz-unity-cream-multi.jpg',
  '/img/products/dreamz-grace-black-royal-blue.jpg'
);

INSERT INTO "media_assets" ("url","title","alt_text","category","is_lifestyle","product_id")
SELECT m."url", m."title", m."title", 'PRODUCT', false, p."id"
FROM _org_media m
JOIN "products" p ON p."sku" = m."sku"
WHERE NOT EXISTS (SELECT 1 FROM "media_assets" x WHERE x."url" = m."url");

UPDATE "media_assets" x
SET "title" = m."title",
    "alt_text" = m."title",
    "category" = 'PRODUCT',
    "is_lifestyle" = false,
    "product_id" = p."id"
FROM _org_media m
JOIN "products" p ON p."sku" = m."sku"
WHERE x."url" = m."url";

DROP TABLE _org_media;

-- ── 4. Guard: no SKU or slug may now exist twice ────────────────────────
DO $$
DECLARE
  dup_skus int; dup_slugs int;
BEGIN
  SELECT count(*) INTO dup_skus FROM (SELECT sku FROM products GROUP BY sku HAVING count(*) > 1) s;
  SELECT count(*) INTO dup_slugs FROM (SELECT slug FROM products GROUP BY slug HAVING count(*) > 1) d;
  IF dup_skus > 0 OR dup_slugs > 0 THEN
    RAISE EXCEPTION 'Duplicate SKU/slug detected after reconciliation: % skus, % slugs', dup_skus, dup_slugs;
  END IF;
END $$;

