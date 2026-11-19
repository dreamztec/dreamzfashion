-- DREAMZ owner-approved catalogue repricing — 19 Nov 2026.
-- Divide existing, positive NGN catalogue prices by FOUR for:
--   1) Leather Wear garments (jackets, trousers, tops, shorts, vests etc.)
--   2) Wrist jewellery (bracelets, cuffs, bangles) in Accessories.
-- Footwear, bags, belts, wallets, pouches, unpublished/unpriced drafts,
-- past order snapshots, past payment records, internal production costs
-- and historical quotations are deliberately untouched.
--
-- The settings sentinel makes this DML one-shot even if migrations are
-- replayed. It also preserves an audit snapshot of old and new prices.
DO $wearable_quarter_prices$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "settings"
    WHERE "key" = 'catalog_reprice_wearables_wristwear_div4_20261119'
  ) THEN
    INSERT INTO "settings" ("key", "value", "updated_at")
    SELECT
      'catalog_reprice_wearables_wristwear_div4_20261119',
      jsonb_build_object(
        'applied_at', now(),
        'divisor', 4,
        'scope', 'published leather-wear garments and accessories bracelets/cuffs/bangles',
        'item_count', count(*),
        'items', coalesce(jsonb_agg(jsonb_build_object(
          'sku', "sku",
          'name', "name",
          'old_price_kobo', "price",
          'new_price_kobo', round("price"::numeric / 4)::integer,
          'old_complete_package_price_kobo', "complete_package_price",
          'new_complete_package_price_kobo', CASE WHEN "complete_package_price" > 0
            THEN round("complete_package_price"::numeric / 4)::integer ELSE "complete_package_price" END
        )), '[]'::jsonb)
      ),
      now()
    FROM "products"
    WHERE "status" = 'published'
      AND "currency" = 'NGN'
      AND "price" > 0
      AND (
        "category_slug" = 'leather-wear'
        OR (
          "category_slug" = 'accessories'
          AND (
            lower(coalesce("subcategory", '')) LIKE '%bracelet%'
            OR lower(coalesce("subcategory", '')) LIKE '%cuff%'
            OR lower(coalesce("subcategory", '')) LIKE '%bangle%'
            OR lower("name") LIKE '%bracelet%'
            OR lower("name") LIKE '%bangle%'
            OR lower("name") LIKE '%cuff%'
          )
        )
      );

    -- Variant-specific overrides must match the new main product price band.
    UPDATE "product_variants" pv
    SET "price" = round(pv."price"::numeric / 4)::integer
    FROM "products" p
    WHERE pv."product_id" = p."id"
      AND p."status" = 'published'
      AND p."currency" = 'NGN'
      AND p."price" > 0
      AND pv."price" > 0
      AND (
        p."category_slug" = 'leather-wear'
        OR (
          p."category_slug" = 'accessories'
          AND (
            lower(coalesce(p."subcategory", '')) LIKE '%bracelet%'
            OR lower(coalesce(p."subcategory", '')) LIKE '%cuff%'
            OR lower(coalesce(p."subcategory", '')) LIKE '%bangle%'
            OR lower(p."name") LIKE '%bracelet%'
            OR lower(p."name") LIKE '%bangle%'
            OR lower(p."name") LIKE '%cuff%'
          )
        )
      );

    UPDATE "products"
    SET "price" = round("price"::numeric / 4)::integer,
        "complete_package_price" = CASE
          WHEN "complete_package_price" > 0
            THEN round("complete_package_price"::numeric / 4)::integer
          ELSE "complete_package_price"
        END,
        "compare_at_price" = CASE
          WHEN "compare_at_price" > 0
            THEN round("compare_at_price"::numeric / 4)::integer
          ELSE "compare_at_price"
        END,
        "updated_at" = now()
    WHERE "status" = 'published'
      AND "currency" = 'NGN'
      AND "price" > 0
      AND (
        "category_slug" = 'leather-wear'
        OR (
          "category_slug" = 'accessories'
          AND (
            lower(coalesce("subcategory", '')) LIKE '%bracelet%'
            OR lower(coalesce("subcategory", '')) LIKE '%cuff%'
            OR lower(coalesce("subcategory", '')) LIKE '%bangle%'
            OR lower("name") LIKE '%bracelet%'
            OR lower("name") LIKE '%bangle%'
            OR lower("name") LIKE '%cuff%'
          )
        )
      );
  END IF;
END
$wearable_quarter_prices$;
