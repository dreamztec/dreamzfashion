-- DREAMZ Partner Network — annual plan and selling-mode fields.
-- Additive and idempotent-safe for the current production schema.

ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "selling_mode" text DEFAULT 'digital' NOT NULL;
--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "partner_plan" text DEFAULT 'scout' NOT NULL;
--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "physical_model" text DEFAULT 'undecided' NOT NULL;
--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "membership_payment_status" text DEFAULT 'not_required' NOT NULL;
--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "membership_starts_at" timestamp;
--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "membership_expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "introducer_code" text;
