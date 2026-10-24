-- Roll-forward migration: reconcile bundled product uploads with catalogue records.
--
-- Idempotent: every statement is guarded (NOT EXISTS / ON CONFLICT), so it is
-- safe to re-apply and never duplicates or overwrites existing rows.
--
-- 1. Asiwaju Mule — Brown: the detail photograph
--    (/img/products/asiwaju-mule-brown-detail.jpg) was uploaded but never
--    attached. It becomes the second gallery image after the poster.
INSERT INTO "product_images" ("product_id", "url", "alt_text", "position")
SELECT p."id", '/img/products/asiwaju-mule-brown-detail.jpg',
       'Asiwaju Mule in brown pebbled leather with embroidered monogram vamp', 1
FROM "products" p
WHERE p."sku" = 'DFK-FTW-002'
  AND NOT EXISTS (
    SELECT 1 FROM "product_images" pi
    WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/asiwaju-mule-brown-detail.jpg'
  );
--> statement-breakpoint

-- 2. Strap Twist: the house poster (/img/products/strap-twist.jpg) was
--    uploaded without a catalogue record. Prices are taken from the house's
--    own poster (Product Only ₦22,500 / Complete Package ₦30,000). Stock has
--    no source, so it is recorded as 0 and checkout stays unapproved: the
--    piece is visible with its price and imagery, and shows "Request a quote"
--    until the house enters stock and ticks Checkout approved in Admin.
INSERT INTO "products"
  ("sku", "name", "slug", "category_slug", "subcategory", "tier", "product_line",
   "price", "complete_package_price", "package_contents",
   "short_description", "full_description", "colors", "sizes",
   "stock_quantity", "availability", "delivery_information",
   "image_fit", "status", "checkout_ready")
VALUES
  ('DFK-FTW-019', 'Strap Twist', 'strap-twist', 'footwear', 'Slides / Sandals', 'essentials', 'essentials',
   2250000, 3000000,
   '["Product","Premium Gift Box","Dust Bag","Care Guide","Shoe Care Kit","Doorstep Delivery Anywhere in Nigeria","Fast-track Production & Delivery Within 7 Days"]'::jsonb,
   'Effortless style. Distinct by design.',
   'Signature overlapping burgundy leather straps for a bold, modern look, with a smooth, soft finish for all-day comfort and a sturdy, well-finished outsole for reliable grip and longevity.',
   '["Burgundy"]'::jsonb,
   '["40","41","42","43","44","45","46"]'::jsonb,
   0, 'in_stock',
   'Complete Package includes fast-track production and doorstep delivery anywhere in Nigeria within 7 days.',
   'contain', 'published', false)
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint

INSERT INTO "product_images" ("product_id", "url", "alt_text", "position")
SELECT p."id", '/img/products/strap-twist.jpg',
       'Strap Twist burgundy leather slides with twisted overlapping straps', 0
FROM "products" p
WHERE p."sku" = 'DFK-FTW-019'
  AND NOT EXISTS (
    SELECT 1 FROM "product_images" pi
    WHERE pi."product_id" = p."id" AND pi."url" = '/img/products/strap-twist.jpg'
  );
--> statement-breakpoint

INSERT INTO "product_variants" ("product_id", "size", "stock_quantity", "sku")
SELECT p."id", s.size, 0, 'DFK-FTW-019-' || s.size
FROM "products" p
CROSS JOIN (VALUES ('40'),('41'),('42'),('43'),('44'),('45'),('46')) AS s(size)
WHERE p."sku" = 'DFK-FTW-019'
  AND NOT EXISTS (
    SELECT 1 FROM "product_variants" v
    WHERE v."product_id" = p."id" AND v."size" = s.size
  );
--> statement-breakpoint

-- 3. Link the media-library records for both files to their products so the
--    Admin → Media picker shows them as assigned.
INSERT INTO "media_assets" ("url", "title", "alt_text", "category", "is_lifestyle", "product_id")
SELECT x.url, x.title, x.alt, 'PRODUCT', false, p."id"
FROM (VALUES
  ('/img/products/asiwaju-mule-brown-detail.jpg', 'Asiwaju Mule — Brown (detail)', 'Asiwaju Mule in brown pebbled leather with embroidered monogram vamp', 'DFK-FTW-002'),
  ('/img/products/strap-twist.jpg', 'Strap Twist — product artwork', 'Strap Twist burgundy leather slides with twisted overlapping straps', 'DFK-FTW-019')
) AS x(url, title, alt, sku)
JOIN "products" p ON p."sku" = x.sku
WHERE NOT EXISTS (SELECT 1 FROM "media_assets" m WHERE m."url" = x.url);
