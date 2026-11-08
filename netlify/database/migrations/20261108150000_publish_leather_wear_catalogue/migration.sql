-- ── Publish the Leather Wear catalogue batch ─────────────────────────
--
-- Forward-only, idempotent correction for the 16 approved pieces ingested
-- by 20261104200000_leather_wear_catalogue_batch as unpublished drafts at
-- zero price. The house has approved principal prices for every one of them,
-- so each piece becomes a real storefront product:
--
--   status           = published   (was draft — this hid the products)
--   checkout_ready   = true        (valid price assigned → purchasable)
--   availability     = made_to_order (unchanged — no invented stock;
--                                    stock_quantity stays untouched at 0)
--   new_arrival      = true        (honest merchandising: the current new batch)
--
-- Also:
--   * Boot of Many Colours (DFK-FTW-001) principal "Product Only" price is
--     set to ₦120,000 (12000000 kobo) and the Complete Package to ₦160,000
--     (Product Only stays exactly 25% below the Complete Package, preserving
--     the house's commercial rule). The old ₦90,000 principal disappears.
--   * Purpose Wrist Pouch (DFK-ACC-206) moves from Accessories to Bags —
--     small leather pouches live in the Bags category ("Wrist Pouches"
--     subcategory), so cards, filters and the product page agree.
--   * Category browsing order becomes Footwear → Leather Wear → Bags →
--     Accessories (shop sort_order), without renaming or duplicating any
--     category.
--
-- Every statement is guarded/idempotent: re-applying produces the same state.

-- 1. Approved prices for the 16 products (kobo), keyed by stable SKU.
UPDATE "products" AS p
SET "price" = v."price",
    "status" = 'published',
    "checkout_ready" = true,
    "availability" = 'made_to_order',
    "new_arrival" = true
FROM (VALUES
  ('DFK-ACC-201', 4500000),  -- Resolve Double-Buckle Cuff — ₦45,000
  ('DFK-ACC-202', 3500000),  -- Unity Beaded Bracelet — ₦35,000
  ('DFK-ACC-203', 4000000),  -- Mercy Wrap Cuff — ₦40,000
  ('DFK-ACC-204', 3500000),  -- Hope Slim Bracelet Set — ₦35,000
  ('DFK-ACC-205', 6500000),  -- Legacy Leather Belt — ₦65,000
  ('DFK-ACC-206', 8500000),  -- Purpose Wrist Pouch — ₦85,000
  ('DFK-LWR-201', 18000000), -- Ambition Leather Tee — ₦180,000
  ('DFK-LWR-202', 22000000), -- Courage Lace-Up Vest — ₦220,000
  ('DFK-LWR-203', 24000000), -- Discipline Wide-Leg Trousers — ₦240,000
  ('DFK-LWR-204', 22000000), -- Excellence Tailored Trousers — ₦220,000
  ('DFK-LWR-205', 26000000), -- Resilience Cargo Trousers — ₦260,000
  ('DFK-LWR-206', 22000000), -- Focus Cargo Joggers — ₦220,000
  ('DFK-LWR-207', 15000000), -- Growth Tailored Shorts — ₦150,000
  ('DFK-LWR-208', 14000000), -- Possibility Cargo Shorts — ₦140,000
  ('DFK-LWR-209', 24000000), -- Leadership Utility Vest — ₦240,000
  ('DFK-LWR-210', 16000000)  -- Sacrifice Cargo Shorts — ₦160,000
) AS v("sku", "price")
WHERE p."sku" = v."sku";
--> statement-breakpoint

-- 2. Boot of Many Colours — the signature hero: ₦120,000 Product Only,
--    ₦160,000 Complete Package (25% relationship preserved).
UPDATE "products"
SET "price" = 12000000,
    "complete_package_price" = 16000000,
    "checkout_ready" = true,
    "status" = 'published',
    "customizable" = false
WHERE "sku" = 'DFK-FTW-001';
--> statement-breakpoint

-- 3. Purpose Wrist Pouch belongs to Bags (small leather pouches), not
--    Accessories. Same product row — never a duplicate.
UPDATE "products"
SET "category_slug" = 'bags'
WHERE "sku" = 'DFK-ACC-206' AND "category_slug" = 'accessories';
--> statement-breakpoint

-- 4. Category browsing order everywhere: Footwear → Leather Wear → Bags →
--    Accessories. (Footwear already sorts first.)
UPDATE "categories" SET "sort_order" = 2 WHERE "slug" = 'leather-wear' AND "sort_order" <> 2;
--> statement-breakpoint
UPDATE "categories" SET "sort_order" = 3 WHERE "slug" = 'bags' AND "sort_order" <> 3;
--> statement-breakpoint
UPDATE "categories" SET "sort_order" = 4 WHERE "slug" = 'accessories' AND "sort_order" <> 4;
