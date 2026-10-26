-- DREAMZ Originals — the ten approved front-edit designs become the permanent,
-- priced, published catalogue (ranks 1–10 of the homepage Originals edit).
--
-- Owner's final assignment, locked so no automatic classification, price or
-- colour count can ever move a piece out of DREAMZ Originals
-- (collection_locked = true; the admin must deliberately unlock it):
--
--   1. Legacy Strap Loafer            Loafer    ₦150,000  Footwear → Loafers
--   2. Spectrum Buckle Slide          Slide     ₦45,000   Footwear → Slides
--   3. Voltage Noir Loafer            Loafer    ₦110,000  Footwear → Loafers
--   4. Heritage Medallion Oxford      Oxford    ₦158,000  Footwear → Oxfords
--   5. Executive Spectrum Briefcase   Briefcase ₦180,000  Bags → Briefcases
--   6. Voyager Colourline Pouch       Pouch     ₦35,000   Bags → Travel Bags
--   7. Regent Croc Tote               Tote      ₦120,000  Bags → Totes
--   8. Ascension Oxford               Oxford    ₦130,000  Footwear → Oxfords
--   9. Prism Cross Sandal             Sandal    ₦45,000   Footwear → Sandals
--  10. Mosaic Crest Mule              Mule      ₦45,000   Footwear → Slides
--
-- The approved photography ships with this migration under /img/products/
-- and is attached as each product's primary gallery image (kind = product).
-- Stock follows the house's made-to-order convention (production capacity
-- recorded like the canonical fifteen); availability stays "made_to_order".
--
-- Idempotent: every statement is guarded and safe to re-apply. Existing rows
-- are updated in place (matched by the prior slug/SKU and, where renamed,
-- also by SKU); nothing is deleted.

-- ── 1. Legacy Strap Loafer (was Lightning Strap Loafer, DFK-FTW-011) ────
UPDATE "products" SET
  "sku" = 'DFK-ORG-022',
  "name" = 'Legacy Strap Loafer',
  "slug" = 'legacy-strap-loafer',
  "category_slug" = 'footwear',
  "subcategory" = 'Loafers',
  "collection" = 'DREAMZ Originals',
  "collection_locked" = true,
  "front_original_rank" = 1,
  "product_line" = 'originals',
  "tier" = 'originals',
  "price" = 15000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A refined burgundy-and-black leather loafer finished with an interchangeable statement strap and signature DREAMZ lightning detail. Classic craftsmanship made adaptable for modern dressing.',
  "full_description" = 'A refined burgundy-and-black leather loafer finished with an interchangeable statement strap and the signature DREAMZ lightning detail. Classic craftsmanship made adaptable for modern dressing — one loafer, more than one character.',
  "colors" = '["Burgundy / Black"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "customizable" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","interchangeable strap","lightning detail"]'::jsonb,
  "updated_at" = now()
WHERE ("sku" = 'DFK-FTW-011' OR "slug" = 'legacy-strap-loafer')
  AND "sku" IS DISTINCT FROM 'DFK-ORG-022';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","customizable","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-022','Legacy Strap Loafer','legacy-strap-loafer','footwear','Loafers','DREAMZ Originals',true,
  1,15000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A refined burgundy-and-black leather loafer finished with an interchangeable statement strap and signature DREAMZ lightning detail. Classic craftsmanship made adaptable for modern dressing.',
  'A refined burgundy-and-black leather loafer finished with an interchangeable statement strap and the signature DREAMZ lightning detail. Classic craftsmanship made adaptable for modern dressing — one loafer, more than one character.',
  '["Burgundy / Black"]'::jsonb,'["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","interchangeable strap","lightning detail"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'legacy-strap-loafer' OR "sku" = 'DFK-ORG-022');
--> statement-breakpoint

-- ── 2. Spectrum Buckle Slide (staged draft DFK-ORG-016) ─────────────────
UPDATE "products" SET
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A bold black leather slide accented with red, green and royal-blue buckle straps. Easy to wear, distinctive and unmistakably DREAMZ.',
  "full_description" = 'A bold black leather slide accented with red, green and royal-blue buckle straps. Easy to wear, distinctive and unmistakably DREAMZ — a restrained black base carrying the house''s spectrum of colour.',
  "colors" = '["Black / Red / Green / Royal Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "customizable" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","buckle straps","multicolour"]'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'spectrum-buckle-slide' AND "sku" = 'DFK-ORG-016';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","customizable","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-016','Spectrum Buckle Slide','spectrum-buckle-slide','footwear','Slides','DREAMZ Originals',true,
  2,4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A bold black leather slide accented with red, green and royal-blue buckle straps. Easy to wear, distinctive and unmistakably DREAMZ.',
  'A bold black leather slide accented with red, green and royal-blue buckle straps. Easy to wear, distinctive and unmistakably DREAMZ — a restrained black base carrying the house''s spectrum of colour.',
  '["Black / Red / Green / Royal Blue"]'::jsonb,'["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","buckle straps","multicolour"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'spectrum-buckle-slide' OR "sku" = 'DFK-ORG-016');
--> statement-breakpoint

-- ── 3. Voltage Noir Loafer (was Dreamz Courage, DFK-ORG-004) ────────────
UPDATE "products" SET
  "sku" = 'DFK-ORG-023',
  "name" = 'Voltage Noir Loafer',
  "slug" = 'voltage-noir-loafer',
  "category_slug" = 'footwear',
  "subcategory" = 'Loafers',
  "collection" = 'DREAMZ Originals',
  "collection_locked" = true,
  "front_original_rank" = 3,
  "product_line" = 'originals',
  "tier" = 'originals',
  "price" = 11000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'Sleek black leather meets a vivid red strap and sculpted lightning detail. A confident dress loafer designed for men who prefer understated power with one unmistakable signature.',
  "full_description" = 'Sleek black leather meets a vivid red strap and a sculpted lightning detail. A confident dress loafer designed for men who prefer understated power with one unmistakable signature — the DREAMZ mark, worn low and worn well.',
  "colors" = '["Black / Red"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "customizable" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","red strap","lightning detail"]'::jsonb,
  "updated_at" = now()
WHERE ("slug" = 'dreamz-courage' OR "slug" = 'voltage-noir-loafer')
  AND "sku" IS DISTINCT FROM 'DFK-ORG-023';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","customizable","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-023','Voltage Noir Loafer','voltage-noir-loafer','footwear','Loafers','DREAMZ Originals',true,
  3,11000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'Sleek black leather meets a vivid red strap and sculpted lightning detail. A confident dress loafer designed for men who prefer understated power with one unmistakable signature.',
  'Sleek black leather meets a vivid red strap and a sculpted lightning detail. A confident dress loafer designed for men who prefer understated power with one unmistakable signature — the DREAMZ mark, worn low and worn well.',
  '["Black / Red"]'::jsonb,'["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","red strap","lightning detail"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'voltage-noir-loafer' OR "sku" = 'DFK-ORG-023');
--> statement-breakpoint

-- ── 4. Heritage Medallion Oxford (staged draft DFK-ORG-017) ─────────────
UPDATE "products" SET
  "price" = 15800000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A rich patina-brown Oxford combining traditional lace-up construction with an artistic perforated medallion toe and dark welt finishing. Heritage craftsmanship with character.',
  "full_description" = 'A rich patina-brown Oxford combining traditional lace-up construction with an artistic perforated medallion toe and dark welt finishing. Heritage craftsmanship with character — burnished by hand, finished for the long run.',
  "colors" = '["Patina Brown"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "customizable" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","medallion toe","patina"]'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'heritage-medallion-oxford' AND "sku" = 'DFK-ORG-017';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","customizable","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-017','Heritage Medallion Oxford','heritage-medallion-oxford','footwear','Oxfords','DREAMZ Originals',true,
  4,15800000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A rich patina-brown Oxford combining traditional lace-up construction with an artistic perforated medallion toe and dark welt finishing. Heritage craftsmanship with character.',
  'A rich patina-brown Oxford combining traditional lace-up construction with an artistic perforated medallion toe and dark welt finishing. Heritage craftsmanship with character — burnished by hand, finished for the long run.',
  '["Patina Brown"]'::jsonb,'["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","medallion toe","patina"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'heritage-medallion-oxford' OR "sku" = 'DFK-ORG-017');
--> statement-breakpoint

-- ── 5. Executive Spectrum Briefcase (staged draft DFK-ORG-018) ──────────
UPDATE "products" SET
  "price" = 18000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A structured black leather business bag elevated by carefully placed DREAMZ colour panels. Designed for work, travel and executives who want professional utility with identity.',
  "full_description" = 'A structured black leather business bag elevated by carefully placed DREAMZ colour panels. Designed for work, travel and executives who want professional utility with identity — organised interior, confident exterior.',
  "colors" = '["Black / Multicolour Panels"]'::jsonb,
  "sizes" = '[]'::jsonb,
  "stock_quantity" = 15,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","business bag","colour panels"]'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'executive-spectrum-briefcase' AND "sku" = 'DFK-ORG-018';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-018','Executive Spectrum Briefcase','executive-spectrum-briefcase','bags','Briefcases','DREAMZ Originals',true,
  5,18000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A structured black leather business bag elevated by carefully placed DREAMZ colour panels. Designed for work, travel and executives who want professional utility with identity.',
  'A structured black leather business bag elevated by carefully placed DREAMZ colour panels. Designed for work, travel and executives who want professional utility with identity — organised interior, confident exterior.',
  '["Black / Multicolour Panels"]'::jsonb,'[]'::jsonb,
  15,'made_to_order',true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","business bag","colour panels"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'executive-spectrum-briefcase' OR "sku" = 'DFK-ORG-018');
--> statement-breakpoint

-- ── 6. Voyager Colourline Pouch (was Heritage Spectrum Wrist Pouch) ─────
UPDATE "products" SET
  "sku" = 'DFK-ORG-024',
  "name" = 'Voyager Colourline Pouch',
  "slug" = 'voyager-colourline-pouch',
  "category_slug" = 'bags',
  "subcategory" = 'Travel Bags',
  "collection" = 'DREAMZ Originals',
  "collection_locked" = true,
  "front_original_rank" = 6,
  "product_line" = 'originals',
  "tier" = 'originals',
  "price" = 3500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A compact brown leather travel pouch brought to life with subtle multicolour detailing, multiple zipped sections and a strong carry handle. Practical, expressive and easy to travel with.',
  "full_description" = 'A compact brown leather travel pouch brought to life with subtle multicolour detailing, multiple zipped sections and a strong carry handle. Practical, expressive and easy to travel with — the essentials, carried in character.',
  "colors" = '["Brown / Multicolour"]'::jsonb,
  "sizes" = '[]'::jsonb,
  "stock_quantity" = 15,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","travel pouch","multicolour"]'::jsonb,
  "updated_at" = now()
WHERE ("slug" = 'heritage-spectrum-wrist-pouch' OR "slug" = 'voyager-colourline-pouch')
  AND "sku" IS DISTINCT FROM 'DFK-ORG-024';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-024','Voyager Colourline Pouch','voyager-colourline-pouch','bags','Travel Bags','DREAMZ Originals',true,
  6,3500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A compact brown leather travel pouch brought to life with subtle multicolour detailing, multiple zipped sections and a strong carry handle. Practical, expressive and easy to travel with.',
  'A compact brown leather travel pouch brought to life with subtle multicolour detailing, multiple zipped sections and a strong carry handle. Practical, expressive and easy to travel with — the essentials, carried in character.',
  '["Brown / Multicolour"]'::jsonb,'[]'::jsonb,
  15,'made_to_order',true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","travel pouch","multicolour"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'voyager-colourline-pouch' OR "sku" = 'DFK-ORG-024');
--> statement-breakpoint

-- ── 7. Regent Croc Tote (was Executive Croc Tote, DFK-ORG-020) ──────────
UPDATE "products" SET
  "name" = 'Regent Croc Tote',
  "slug" = 'regent-croc-tote',
  "category_slug" = 'bags',
  "subcategory" = 'Totes',
  "collection" = 'DREAMZ Originals',
  "collection_locked" = true,
  "front_original_rank" = 7,
  "product_line" = 'originals',
  "tier" = 'originals',
  "price" = 12000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A structured black croc-textured tote with burgundy and gold accents, generous handles and a commanding silhouette. A sophisticated statement for business and everyday luxury.',
  "full_description" = 'A structured black croc-textured tote with burgundy and gold accents, generous handles and a commanding silhouette. A sophisticated statement for business and everyday luxury — texture, held with restraint.',
  "colors" = '["Black / Burgundy / Gold"]'::jsonb,
  "sizes" = '[]'::jsonb,
  "stock_quantity" = 15,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","croc texture","gold accents"]'::jsonb,
  "updated_at" = now()
WHERE ("slug" = 'executive-croc-tote' OR "slug" = 'regent-croc-tote')
  AND "slug" IS DISTINCT FROM 'regent-croc-tote';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-020','Regent Croc Tote','regent-croc-tote','bags','Totes','DREAMZ Originals',true,
  7,12000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A structured black croc-textured tote with burgundy and gold accents, generous handles and a commanding silhouette. A sophisticated statement for business and everyday luxury.',
  'A structured black croc-textured tote with burgundy and gold accents, generous handles and a commanding silhouette. A sophisticated statement for business and everyday luxury — texture, held with restraint.',
  '["Black / Burgundy / Gold"]'::jsonb,'[]'::jsonb,
  15,'made_to_order',true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","croc texture","gold accents"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'regent-croc-tote' OR "sku" = 'DFK-ORG-020');
--> statement-breakpoint

-- ── 8. Ascension Oxford (was Ascension Oxford — Blue / Black, DFT-150) ──
UPDATE "products" SET
  "sku" = 'DFK-ORG-025',
  "name" = 'Ascension Oxford',
  "slug" = 'ascension-oxford',
  "category_slug" = 'footwear',
  "subcategory" = 'Oxfords',
  "collection" = 'DREAMZ Originals',
  "collection_locked" = true,
  "front_original_rank" = 8,
  "product_line" = 'originals',
  "tier" = 'originals',
  "price" = 13000000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A striking midnight-and-electric-blue Oxford inspired by upward movement and ambition. Its sleek elongated profile and textured quarter combine heritage shoemaking with modern confidence.',
  "full_description" = 'A striking midnight-and-electric-blue Oxford inspired by upward movement and ambition. Its sleek elongated profile and textured quarter combine heritage shoemaking with modern confidence — a dress shoe with direction.',
  "colors" = '["Midnight / Electric Blue"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "customizable" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","electric blue","heritage"]'::jsonb,
  "updated_at" = now()
WHERE ("slug" = 'ascension-oxford-blue-black' OR "slug" = 'ascension-oxford')
  AND "sku" IS DISTINCT FROM 'DFK-ORG-025';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","customizable","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-025','Ascension Oxford','ascension-oxford','footwear','Oxfords','DREAMZ Originals',true,
  8,13000000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A striking midnight-and-electric-blue Oxford inspired by upward movement and ambition. Its sleek elongated profile and textured quarter combine heritage shoemaking with modern confidence.',
  'A striking midnight-and-electric-blue Oxford inspired by upward movement and ambition. Its sleek elongated profile and textured quarter combine heritage shoemaking with modern confidence — a dress shoe with direction.',
  '["Midnight / Electric Blue"]'::jsonb,'["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","electric blue","heritage"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'ascension-oxford' OR "sku" = 'DFK-ORG-025');
--> statement-breakpoint

-- ── 9. Prism Cross Sandal (was Dreamz Unity, DFK-ORG-012) ───────────────
UPDATE "products" SET
  "sku" = 'DFK-ORG-026',
  "name" = 'Prism Cross Sandal',
  "slug" = 'prism-cross-sandal',
  "category_slug" = 'footwear',
  "subcategory" = 'Sandals',
  "collection" = 'DREAMZ Originals',
  "collection_locked" = true,
  "front_original_rank" = 9,
  "product_line" = 'originals',
  "tier" = 'originals',
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A clean white-footbed sandal built around warm tan leather and contrasting DREAMZ colour straps. Lightweight, energetic and designed for relaxed statement dressing.',
  "full_description" = 'A clean white-footbed sandal built around warm tan leather and contrasting DREAMZ colour straps. Lightweight, energetic and designed for relaxed statement dressing — colour that moves with the day.',
  "colors" = '["Tan / Multicolour Straps"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","cross straps","white footbed"]'::jsonb,
  "updated_at" = now()
WHERE ("slug" = 'dreamz-unity' OR "slug" = 'prism-cross-sandal')
  AND "sku" IS DISTINCT FROM 'DFK-ORG-026';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-026','Prism Cross Sandal','prism-cross-sandal','footwear','Sandals','DREAMZ Originals',true,
  9,4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A clean white-footbed sandal built around warm tan leather and contrasting DREAMZ colour straps. Lightweight, energetic and designed for relaxed statement dressing.',
  'A clean white-footbed sandal built around warm tan leather and contrasting DREAMZ colour straps. Lightweight, energetic and designed for relaxed statement dressing — colour that moves with the day.',
  '["Tan / Multicolour Straps"]'::jsonb,'["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","cross straps","white footbed"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'prism-cross-sandal' OR "sku" = 'DFK-ORG-026');
--> statement-breakpoint

-- ── 10. Mosaic Crest Mule (was Heritage Panel Slide, DFK-ORG-021) ───────
UPDATE "products" SET
  "name" = 'Mosaic Crest Mule',
  "slug" = 'mosaic-crest-mule',
  "category_slug" = 'footwear',
  "subcategory" = 'Slides',
  "collection" = 'DREAMZ Originals',
  "collection_locked" = true,
  "front_original_rank" = 10,
  "product_line" = 'originals',
  "tier" = 'originals',
  "price" = 4500000,
  "complete_package_price" = NULL,
  "package_contents" = '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  "short_description" = 'A handcrafted brown easy-wear mule framed by burgundy, mustard and forest-green leather panels. Comfortable enough for everyday wear while retaining the character of an Originals piece.',
  "full_description" = 'A handcrafted brown easy-wear mule framed by burgundy, mustard and forest-green leather panels. Comfortable enough for everyday wear while retaining the character of an Originals piece — craft first, ease always.',
  "colors" = '["Brown / Burgundy / Mustard / Forest Green"]'::jsonb,
  "sizes" = '["40","41","42","43","44","45","46"]'::jsonb,
  "stock_quantity" = 20,
  "availability" = 'made_to_order',
  "featured" = true,
  "new_arrival" = true,
  "customizable" = true,
  "checkout_ready" = true,
  "image_fit" = 'contain',
  "status" = 'published',
  "tags" = '["front-original","DREAMZ Originals","easy-wear","panel accents"]'::jsonb,
  "updated_at" = now()
WHERE ("slug" = 'heritage-panel-slide' OR "slug" = 'mosaic-crest-mule')
  AND "slug" IS DISTINCT FROM 'mosaic-crest-mule';
--> statement-breakpoint
INSERT INTO "products"
  ("sku","name","slug","category_slug","subcategory","collection","collection_locked",
   "front_original_rank","price","package_contents","short_description","full_description","colors","sizes",
   "stock_quantity","availability","featured","new_arrival","customizable","product_line","tier",
   "checkout_ready","image_fit","status","tags")
SELECT
  'DFK-ORG-021','Mosaic Crest Mule','mosaic-crest-mule','footwear','Slides','DREAMZ Originals',true,
  10,4500000,
  '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
  'A handcrafted brown easy-wear mule framed by burgundy, mustard and forest-green leather panels. Comfortable enough for everyday wear while retaining the character of an Originals piece.',
  'A handcrafted brown easy-wear mule framed by burgundy, mustard and forest-green leather panels. Comfortable enough for everyday wear while retaining the character of an Originals piece — craft first, ease always.',
  '["Brown / Burgundy / Mustard / Forest Green"]'::jsonb,'["40","41","42","43","44","45","46"]'::jsonb,
  20,'made_to_order',true,true,true,'originals','originals',
  true,'contain','published','["front-original","DREAMZ Originals","easy-wear","panel accents"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "slug" = 'mosaic-crest-mule' OR "sku" = 'DFK-ORG-021');
--> statement-breakpoint

-- ── Approved photography ────────────────────────────────────────────────
-- Demote any pre-existing gallery image that sits at position 0 on the ten
-- pieces (e.g. a renamed row's earlier photograph) so the approved photo
-- leads each gallery. Nothing is deleted — earlier photography stays in the
-- gallery behind the approved image.
UPDATE "product_images" pi
SET "position" = 1
FROM "products" p
WHERE pi."product_id" = p."id"
  AND p."sku" IN ('DFK-ORG-022','DFK-ORG-016','DFK-ORG-023','DFK-ORG-017','DFK-ORG-018','DFK-ORG-024','DFK-ORG-020','DFK-ORG-025','DFK-ORG-026','DFK-ORG-021')
  AND pi."position" = 0
  AND pi."url" NOT IN (
    '/img/products/legacy-strap-loafer.jpg',
    '/img/products/spectrum-buckle-slide.jpg',
    '/img/products/voltage-noir-loafer.jpg',
    '/img/products/heritage-medallion-oxford.jpg',
    '/img/products/executive-spectrum-briefcase.jpg',
    '/img/products/voyager-colourline-pouch.jpg',
    '/img/products/regent-croc-tote.jpg',
    '/img/products/ascension-oxford.jpg',
    '/img/products/prism-cross-sandal.jpg',
    '/img/products/mosaic-crest-mule.jpg'
  );
--> statement-breakpoint
-- The ten approved images become each product's primary gallery image
-- (position 0, kind "product" — clean product photography, shown "contain").
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position", "kind")
SELECT p."id", x.url, x.alt, 0, 'product'
FROM (VALUES
  ('DFK-ORG-022', '/img/products/legacy-strap-loafer.jpg', 'Legacy Strap Loafer — burgundy and black leather loafer with statement strap and lightning detail'),
  ('DFK-ORG-016', '/img/products/spectrum-buckle-slide.jpg', 'Spectrum Buckle Slide — black leather slide with red, green and royal-blue buckle straps'),
  ('DFK-ORG-023', '/img/products/voltage-noir-loafer.jpg', 'Voltage Noir Loafer — black leather dress loafer with vivid red strap and sculpted lightning detail'),
  ('DFK-ORG-017', '/img/products/heritage-medallion-oxford.jpg', 'Heritage Medallion Oxford — patina-brown Oxford with perforated medallion toe and dark welt'),
  ('DFK-ORG-018', '/img/products/executive-spectrum-briefcase.jpg', 'Executive Spectrum Briefcase — structured black leather business bag with DREAMZ colour panels'),
  ('DFK-ORG-024', '/img/products/voyager-colourline-pouch.jpg', 'Voyager Colourline Pouch — brown leather travel pouch with multicolour detailing'),
  ('DFK-ORG-020', '/img/products/regent-croc-tote.jpg', 'Regent Croc Tote — black croc-textured tote with burgundy and gold accents'),
  ('DFK-ORG-025', '/img/products/ascension-oxford.jpg', 'Ascension Oxford — midnight and electric-blue Oxford with textured quarter'),
  ('DFK-ORG-026', '/img/products/prism-cross-sandal.jpg', 'Prism Cross Sandal — white-footbed sandal in tan leather with contrasting colour straps'),
  ('DFK-ORG-021', '/img/products/mosaic-crest-mule.jpg', 'Mosaic Crest Mule — brown easy-wear mule with burgundy, mustard and forest-green panels')
) AS x(sku, url, alt)
JOIN "products" p ON p."sku" = x.sku
WHERE NOT EXISTS (
  SELECT 1 FROM "product_images" pi
  WHERE pi."product_id" = p."id" AND pi."url" = x.url
);
--> statement-breakpoint

-- Keep the approved photo first in each gallery.
UPDATE "product_images" pi
SET "position" = 0, "kind" = 'product'
FROM "products" p
WHERE pi."product_id" = p."id"
  AND pi."url" IN (
    '/img/products/legacy-strap-loafer.jpg',
    '/img/products/spectrum-buckle-slide.jpg',
    '/img/products/voltage-noir-loafer.jpg',
    '/img/products/heritage-medallion-oxford.jpg',
    '/img/products/executive-spectrum-briefcase.jpg',
    '/img/products/voyager-colourline-pouch.jpg',
    '/img/products/regent-croc-tote.jpg',
    '/img/products/ascension-oxford.jpg',
    '/img/products/prism-cross-sandal.jpg',
    '/img/products/mosaic-crest-mule.jpg'
  );
--> statement-breakpoint

-- ── Media library records ───────────────────────────────────────────────
-- So Admin → Media lists each approved image as assigned PRODUCT media.
INSERT INTO "media_assets" ("url", "title", "alt_text", "category", "is_lifestyle", "product_id")
SELECT x.url, x.title, x.alt, 'PRODUCT', false, p."id"
FROM (VALUES
  ('/img/products/legacy-strap-loafer.jpg', 'Legacy Strap Loafer — product photography', 'Legacy Strap Loafer — burgundy and black leather loafer with statement strap and lightning detail', 'DFK-ORG-022'),
  ('/img/products/spectrum-buckle-slide.jpg', 'Spectrum Buckle Slide — product photography', 'Spectrum Buckle Slide — black leather slide with red, green and royal-blue buckle straps', 'DFK-ORG-016'),
  ('/img/products/voltage-noir-loafer.jpg', 'Voltage Noir Loafer — product photography', 'Voltage Noir Loafer — black leather dress loafer with vivid red strap and sculpted lightning detail', 'DFK-ORG-023'),
  ('/img/products/heritage-medallion-oxford.jpg', 'Heritage Medallion Oxford — product photography', 'Heritage Medallion Oxford — patina-brown Oxford with perforated medallion toe and dark welt', 'DFK-ORG-017'),
  ('/img/products/executive-spectrum-briefcase.jpg', 'Executive Spectrum Briefcase — product photography', 'Executive Spectrum Briefcase — structured black leather business bag with DREAMZ colour panels', 'DFK-ORG-018'),
  ('/img/products/voyager-colourline-pouch.jpg', 'Voyager Colourline Pouch — product photography', 'Voyager Colourline Pouch — brown leather travel pouch with multicolour detailing', 'DFK-ORG-024'),
  ('/img/products/regent-croc-tote.jpg', 'Regent Croc Tote — product photography', 'Regent Croc Tote — black croc-textured tote with burgundy and gold accents', 'DFK-ORG-020'),
  ('/img/products/ascension-oxford.jpg', 'Ascension Oxford — product photography', 'Ascension Oxford — midnight and electric-blue Oxford with textured quarter', 'DFK-ORG-025'),
  ('/img/products/prism-cross-sandal.jpg', 'Prism Cross Sandal — product photography', 'Prism Cross Sandal — white-footbed sandal in tan leather with contrasting colour straps', 'DFK-ORG-026'),
  ('/img/products/mosaic-crest-mule.jpg', 'Mosaic Crest Mule — product photography', 'Mosaic Crest Mule — brown easy-wear mule with burgundy, mustard and forest-green panels', 'DFK-ORG-021')
) AS x(url, title, alt, sku)
JOIN "products" p ON p."sku" = x.sku
WHERE NOT EXISTS (SELECT 1 FROM "media_assets" m WHERE m."url" = x.url);
--> statement-breakpoint

-- ── Variants ────────────────────────────────────────────────────────────
-- Size rows for every footwear piece (bags carry no sizes). Made-to-order
-- production capacity is distributed across sizes as in the house seed.
INSERT INTO "product_variants" ("product_id", "color", "size", "stock_quantity", "sku")
SELECT p."id", NULL, s.size, 2, p."sku" || '-' || s.size
FROM "products" p
CROSS JOIN (VALUES ('40'),('41'),('42'),('43'),('44'),('45'),('46')) AS s(size)
WHERE p."sku" IN ('DFK-ORG-022','DFK-ORG-016','DFK-ORG-023','DFK-ORG-017','DFK-ORG-025','DFK-ORG-026','DFK-ORG-021')
  AND NOT EXISTS (
    SELECT 1 FROM "product_variants" v
    WHERE v."product_id" = p."id" AND v."size" = s.size
  );
--> statement-breakpoint

-- Rekey variant SKUs left over from the renames so variant SKU prefixes
-- follow the new canonical SKUs.
UPDATE "product_variants" v
SET "sku" = p."sku" || '-' || v."size"
FROM "products" p
WHERE v."product_id" = p."id"
  AND p."sku" IN ('DFK-ORG-022','DFK-ORG-025','DFK-ORG-023','DFK-ORG-026')
  AND v."sku" IS DISTINCT FROM p."sku" || '-' || v."size";
--> statement-breakpoint

-- ── Retire presentations displaced by the renames ───────────────────────
-- The front edit supersedes the earlier published presentations of these
-- pieces (Lightning Strap Loafer, Dreamz Courage, Dreamz Unity). Their rows
-- were renamed in place above; these guards archive any genuinely separate
-- leftover rows so no duplicate presentation remains. Nothing is deleted.
UPDATE "products"
SET "status" = 'archived', "featured" = false, "front_original_rank" = NULL, "updated_at" = now()
WHERE "slug" IN (
  'lightning-strap-loafer', 'dreamz-courage', 'dreamz-unity',
  'ascension-oxford-blue-black', 'heritage-spectrum-wrist-pouch',
  'executive-croc-tote', 'heritage-panel-slide'
)
AND "status" <> 'archived';
