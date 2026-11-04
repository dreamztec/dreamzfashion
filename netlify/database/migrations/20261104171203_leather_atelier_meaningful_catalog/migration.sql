CREATE TABLE "inspiration_messages" (
	"id" serial PRIMARY KEY,
	"message_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"theme" text NOT NULL,
	"source" text NOT NULL,
	"text" text NOT NULL,
	"reference" text,
	"translation" text,
	"attribution" text,
	"verification_url" text,
	"reproduction_permission" text DEFAULT 'unverified' NOT NULL,
	"is_excerpt" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"rtl" boolean DEFAULT false NOT NULL,
	"eligible_placements" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_slug_aliases" (
	"id" serial PRIMARY KEY,
	"alias" text NOT NULL UNIQUE,
	"product_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "design_requests" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "design_requests" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "design_requests" ADD COLUMN "render_prompt" text;--> statement-breakpoint
ALTER TABLE "design_requests" ADD COLUMN "artisan_brief" text;--> statement-breakpoint
ALTER TABLE "design_requests" ADD COLUMN "deadline" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "message_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "theme" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "universal_meaning" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "inspiration_eligible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "allowed_message_placements" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "inspiration_messages_uidx" ON "inspiration_messages" ("message_id","version");--> statement-breakpoint
CREATE INDEX "inspiration_messages_status_idx" ON "inspiration_messages" ("status");--> statement-breakpoint
CREATE INDEX "inspiration_messages_theme_idx" ON "inspiration_messages" ("theme");--> statement-breakpoint
ALTER TABLE "product_slug_aliases" ADD CONSTRAINT "product_slug_aliases_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
-- ── The Boot of Many Colours is a fixed DREAMZ signature design ─────
-- It is never customisable: no panel edits, no recolouring, no design
-- templates. Customers view it, choose a size where applicable, choose a
-- package and an optional inspiration message, and purchase it as designed.
UPDATE "products" SET "customizable" = false WHERE "sku" = 'DFK-FTW-001';
--> statement-breakpoint
-- ── Coherent naming architecture: MEANINGFUL NAME + PRODUCT TYPE ────
-- Renames preserve the database product ID, SKU, orders, referrals and
-- imagery. Every slug change gains a permanent alias below so old links
-- keep working.
UPDATE "products" SET "name" = 'Crimson Slide', "slug" = 'crimson-slide', "theme" = 'Courage', "universal_meaning" = 'Courage shows up before comfort does.' WHERE "sku" = 'DFK-FTW-004';--> statement-breakpoint
UPDATE "products" SET "name" = 'Onyx Slide', "slug" = 'onyx-slide', "theme" = 'Resilience', "universal_meaning" = 'Bend, but never break.' WHERE "sku" = 'DFK-FTW-005';--> statement-breakpoint
UPDATE "products" SET "name" = 'Onyx Sandal', "slug" = 'onyx-sandal', "theme" = 'Growth', "universal_meaning" = 'Every step forward counts.' WHERE "sku" = 'DFK-FTW-006';--> statement-breakpoint
UPDATE "products" SET "name" = 'Terra Cross Sandal', "slug" = 'terra-cross-sandal', "theme" = 'Peace', "universal_meaning" = 'Move through life with a settled heart.' WHERE "sku" = 'DFK-FTW-007';--> statement-breakpoint
UPDATE "products" SET "name" = 'Crimson Cross Sandal', "slug" = 'crimson-cross-sandal', "theme" = 'Love', "universal_meaning" = 'Let love shape what you leave behind.' WHERE "sku" = 'DFK-FTW-008';--> statement-breakpoint
UPDATE "products" SET "name" = 'Pinnacle Slide', "slug" = 'pinnacle-slide', "theme" = 'Focus', "universal_meaning" = 'Give your attention to what matters.' WHERE "sku" = 'DFK-FTW-009';--> statement-breakpoint
UPDATE "products" SET "name" = 'Terra Cove Mule', "slug" = 'terra-cove-mule', "theme" = 'Gratitude', "universal_meaning" = 'Count the good in every step.' WHERE "sku" = 'DFK-FTW-010';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Legacy', "universal_meaning" = 'Made to be handed down.' WHERE "sku" = 'DFK-ORG-022';--> statement-breakpoint
UPDATE "products" SET "name" = 'Exotic Elegance Tote', "slug" = 'exotic-elegance-tote', "theme" = 'Excellence', "universal_meaning" = 'Carry excellence everywhere.' WHERE "sku" = 'DFK-BAG-014';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Service', "universal_meaning" = 'Made for giving.' WHERE "sku" = 'DFK-ACC-015';--> statement-breakpoint
UPDATE "products" SET "name" = 'Lagos Tassel Loafer', "slug" = 'lagos-tassel-loafer', "theme" = 'Leadership', "universal_meaning" = 'Lead the room you walk into.' WHERE "sku" = 'DFK-FTW-016';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Commitment', "universal_meaning" = 'Fasten your intention. Keep it.' WHERE "sku" = 'DFK-FTW-017';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Leadership', "universal_meaning" = 'Carry decisions with confidence.' WHERE "sku" = 'DZE-HB-001';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Wisdom', "universal_meaning" = 'Carry what you learn.' WHERE "sku" = 'DFK-BAG-018';--> statement-breakpoint
UPDATE "products" SET "name" = 'Harmony Slide', "slug" = 'harmony-slide', "theme" = 'Unity', "universal_meaning" = 'Move together, move far.' WHERE "sku" = 'DFK-ORG-014';--> statement-breakpoint
UPDATE "products" SET "name" = 'Vision Brogue', "slug" = 'vision-brogue', "theme" = 'Vision', "universal_meaning" = 'See beyond where you are.' WHERE "sku" = 'DFK-ORG-002';--> statement-breakpoint
UPDATE "products" SET "name" = 'Focus Brogue', "slug" = 'focus-brogue', "theme" = 'Focus', "universal_meaning" = 'Attention is the first craft.' WHERE "sku" = 'DFK-ORG-003';--> statement-breakpoint
UPDATE "products" SET "name" = 'Faith Loafer', "slug" = 'faith-loafer', "theme" = 'Faith', "universal_meaning" = 'Move even when the whole path is not visible.' WHERE "sku" = 'DFK-ORG-001';--> statement-breakpoint
UPDATE "products" SET "name" = 'Integrity Loafer', "slug" = 'integrity-loafer', "theme" = 'Integrity', "universal_meaning" = 'Be the same in every room.' WHERE "sku" = 'DFK-ORG-005';--> statement-breakpoint
UPDATE "products" SET "name" = 'Purpose Monk Strap', "slug" = 'purpose-monk-strap', "theme" = 'Purpose', "universal_meaning" = 'Let your steps serve something meaningful.' WHERE "sku" = 'DFK-ORG-006';--> statement-breakpoint
UPDATE "products" SET "name" = 'Discipline Monk Strap', "slug" = 'discipline-monk-strap', "theme" = 'Discipline', "universal_meaning" = 'Show up for your dream every day.' WHERE "sku" = 'DFK-ORG-007';--> statement-breakpoint
UPDATE "products" SET "name" = 'Grace Loafer', "slug" = 'grace-loafer', "theme" = 'Grace', "universal_meaning" = 'Move with kindness and poise.' WHERE "sku" = 'DFK-ORG-010';--> statement-breakpoint
UPDATE "products" SET "name" = 'Balance Slide', "slug" = 'balance-slide', "theme" = 'Balance', "universal_meaning" = 'Keep steady on every path.' WHERE "sku" = 'DFK-ORG-013';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Possibility', "universal_meaning" = 'Colour meets every direction.' WHERE "sku" = 'DFK-ORG-026';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Believe', "universal_meaning" = 'Wear the charge of what you believe.' WHERE "sku" = 'DFK-ORG-023';--> statement-breakpoint
UPDATE "products" SET "name" = 'Ambition Monk Strap', "slug" = 'ambition-monk-strap', "theme" = 'Ambition', "universal_meaning" = 'Keep reaching for what calls you higher.' WHERE "sku" = 'DFK-ORG-008';--> statement-breakpoint
UPDATE "products" SET "name" = 'Excellence Brogue', "slug" = 'excellence-brogue', "theme" = 'Excellence', "universal_meaning" = 'Give your best to what carries your name.' WHERE "sku" = 'DFK-ORG-009';--> statement-breakpoint
UPDATE "products" SET "name" = 'Confidence Slide', "slug" = 'confidence-slide', "theme" = 'Confidence', "universal_meaning" = 'Walk like the work is already done.' WHERE "sku" = 'DFK-ORG-011';--> statement-breakpoint
UPDATE "products" SET "name" = 'Resolve Slide', "slug" = 'resolve-slide', "theme" = 'Resolve', "universal_meaning" = 'Decide once. Keep going.' WHERE "sku" = 'DFK-ORG-015';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Growth', "universal_meaning" = 'Rise one deliberate step at a time.' WHERE "sku" = 'DFK-ORG-025';--> statement-breakpoint
UPDATE "products" SET "name" = 'Strap Twist Slide', "slug" = 'strap-twist-slide', "theme" = 'Patience', "universal_meaning" = 'Good things take their time.' WHERE "sku" = 'DFK-FTW-019';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Joy', "universal_meaning" = 'Colour your every day.' WHERE "sku" = 'DFK-ORG-016';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Legacy', "universal_meaning" = 'What you carry forward carries you.' WHERE "sku" = 'DFK-ORG-017';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Ambition', "universal_meaning" = 'Built for rooms where decisions happen.' WHERE "sku" = 'DFK-ORG-018';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Hope', "universal_meaning" = 'Every journey holds possibility.' WHERE "sku" = 'DFK-ORG-024';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Mentorship', "universal_meaning" = 'Carry wisdom with room to spare.' WHERE "sku" = 'DFK-ORG-020';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Unity', "universal_meaning" = 'Many pieces, one picture.' WHERE "sku" = 'DFK-ORG-021';--> statement-breakpoint
UPDATE "products" SET "theme" = 'Vision', "universal_meaning" = 'See beyond where you are. Walk toward what you can become.' WHERE "sku" = 'DFK-FTW-001';--> statement-breakpoint
--> statement-breakpoint
-- Permanent aliases: old public slugs resolve to the renamed product.
INSERT INTO "product_slug_aliases" ("alias", "product_id")
SELECT v.alias, p.id FROM (VALUES
  ('crimson-pin', 'DFK-FTW-004'),
  ('onyx-wave', 'DFK-FTW-005'),
  ('onyx-stride', 'DFK-FTW-006'),
  ('terra-cross', 'DFK-FTW-007'),
  ('crimson-cross', 'DFK-FTW-008'),
  ('pinnacle-denim', 'DFK-FTW-009'),
  ('terra-cove', 'DFK-FTW-010'),
  ('exotic-elegance', 'DFK-BAG-014'),
  ('lagos-tassel', 'DFK-FTW-016'),
  ('dreamz-harmony', 'DFK-ORG-014'),
  ('dreamz-vision', 'DFK-ORG-002'),
  ('dreamz-focus', 'DFK-ORG-003'),
  ('dreamz-faith', 'DFK-ORG-001'),
  ('dreamz-integrity', 'DFK-ORG-005'),
  ('dreamz-purpose', 'DFK-ORG-006'),
  ('dreamz-discipline', 'DFK-ORG-007'),
  ('dreamz-grace', 'DFK-ORG-010'),
  ('dreamz-balance', 'DFK-ORG-013'),
  ('dreamz-ambition', 'DFK-ORG-008'),
  ('dreamz-excellence', 'DFK-ORG-009'),
  ('dreamz-confidence', 'DFK-ORG-011'),
  ('dreamz-resolve', 'DFK-ORG-015'),
  ('strap-twist', 'DFK-FTW-019')
) AS v(alias, sku)
JOIN "products" p ON p."sku" = v.sku
ON CONFLICT ("alias") DO NOTHING;
