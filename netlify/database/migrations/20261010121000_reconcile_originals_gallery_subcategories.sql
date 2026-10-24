-- Roll-forward migration: Reconcile subcategories and gallery images for DREAMZ Originals
-- Updates Dreamz Faith subcategory to 'Loafers' if not set
UPDATE "products"
SET "subcategory" = 'Loafers', "updated_at" = now()
WHERE "slug" = 'dreamz-faith' AND ("subcategory" IS NULL OR "subcategory" = '');

-- Ensure Dreamz Faith gallery images are present in product_images
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position")
SELECT p."id", img, alt, ord - 1
FROM "products" p
CROSS JOIN (
  VALUES 
    ('/img/products/dreamz-faith-tan-green.jpg', 'Dreamz Faith tan and forest-green suede slip-on loafers with contrast vamp and cream outsole', 1),
    ('/img/products/dreamz-faith-taupe-navy.jpg', 'Dreamz Faith taupe and navy suede slip-on loafers with contrast vamp and cream outsole', 2)
) AS g(img, alt, ord)
WHERE p."slug" = 'dreamz-faith'
  AND NOT EXISTS (
    SELECT 1 FROM "product_images" pi
    WHERE pi."product_id" = p."id" AND pi."url" = g.img
  );
