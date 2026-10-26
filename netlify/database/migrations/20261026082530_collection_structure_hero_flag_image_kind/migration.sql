ALTER TABLE "product_images" ADD COLUMN "kind" text DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "homepage_hero" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Product photography defaults to "contain": the entire product stays
-- visible on every device. Admins can still choose "cover" per product for
-- lifestyle/editorial imagery. The previous 'cover' value was the old
-- platform default, not a deliberate per-product choice. (The column
-- DEFAULT change itself is applied by 20261026084309_lush_mesmero.)
UPDATE "products" SET "image_fit" = 'contain' WHERE "image_fit" = 'cover';--> statement-breakpoint

-- Present stored legacy tier values under their new customer-facing
-- collection names: Signature → Originals, Bespoke → Royale. This is a
-- rename of the same concepts, not a reclassification; ambiguous products
-- are surfaced in the admin "Needs Category Confirmation" review queue.
UPDATE "products" SET "tier" = 'originals' WHERE "tier" = 'signature';--> statement-breakpoint
UPDATE "products" SET "tier" = 'royale' WHERE "tier" = 'bespoke';--> statement-breakpoint

-- The Boot of Many Colours is the house hero by explicit admin choice.
UPDATE "products" SET "homepage_hero" = true WHERE "sku" = 'DFK-FTW-001';
-- (The SELL DREAMZ partnership-category column is applied by
-- 20261026084309_lush_mesmero.)