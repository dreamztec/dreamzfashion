-- Redundant-column guard: the two products columns and the seven referrers
-- columns below are already created (with the same definitions and defaults)
-- by the applied migrations 20261026130000_originals_front_lock_and_products
-- and 20261026123000_partner_network_annual_plans. This file was repeatedly
-- re-emitted as a duplicate without guards and failed deploys with
-- 'column "collection_locked" of relation "products" already exists' (42701).
-- Every statement here is now IF NOT EXISTS-guarded, so it is a no-op on any
-- database that already has the columns and remains correct on a fresh seed.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "collection_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "front_original_rank" integer;--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "selling_mode" text DEFAULT 'digital' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "partner_plan" text DEFAULT 'scout' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "physical_model" text DEFAULT 'undecided' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "membership_payment_status" text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "membership_starts_at" timestamp;--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "membership_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "introducer_code" text;
