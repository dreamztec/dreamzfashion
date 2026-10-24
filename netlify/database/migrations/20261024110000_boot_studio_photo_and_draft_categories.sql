-- Roll-forward migration: presentation fixes for the production storefront.
--
-- Idempotent: every statement is guarded, safe to re-apply; no prices,
-- stock or published states are changed.
--
-- 1. Boot of Many Colours (DFK-FTW-001): the approved clean studio photograph
--    (/img/products/boot-of-many-colours-studio.jpg — same file as the
--    approved homepage hero image) leads the gallery; the house poster with
--    printed prices stays as the second image. Nothing is deleted.
UPDATE "product_images" pi
SET "position" = pi."position" + 1
FROM "products" p
WHERE pi."product_id" = p."id"
  AND p."sku" = 'DFK-FTW-001'
  AND NOT EXISTS (
    SELECT 1 FROM "product_images" x
    WHERE x."product_id" = p."id" AND x."url" = '/img/products/boot-of-many-colours-studio.jpg'
  );
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position")
SELECT p."id", '/img/products/boot-of-many-colours-studio.jpg',
       'Boot of Many Colours — multicolour patchwork leather lace-up boots on a lug sole', 0
FROM "products" p
WHERE p."sku" = 'DFK-FTW-001'
  AND NOT EXISTS (
    SELECT 1 FROM "product_images" x
    WHERE x."product_id" = p."id" AND x."url" = '/img/products/boot-of-many-colours-studio.jpg'
  );
--> statement-breakpoint

-- 2. Shop structure for the staged new-drop drafts: wrist pouches and
--    briefcases belong under Bags (Footwear → Shoes/Loafers/Boots/Slides,
--    Bags → Briefcases/Wrist Pouches, Accessories → Belts). Drafts only.
UPDATE "products"
SET "category_slug" = 'bags', "subcategory" = 'Wrist Pouches', "updated_at" = now()
WHERE "sku" = 'DFK-DFT-154' AND "status" = 'draft' AND "subcategory" IS DISTINCT FROM 'Wrist Pouches';
--> statement-breakpoint
UPDATE "products"
SET "subcategory" = 'Briefcases', "updated_at" = now()
WHERE "sku" = 'DFK-DFT-156' AND "status" = 'draft' AND "subcategory" IS DISTINCT FROM 'Briefcases';
