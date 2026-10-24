CREATE TABLE "bnpl_transactions" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'BNPL_APPLICATION_STARTED' NOT NULL,
	"provider_reference" text,
	"checkout_url" text,
	"raw_result" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY,
	"identity_user_id" text NOT NULL UNIQUE,
	"email" text NOT NULL UNIQUE,
	"full_name" text DEFAULT '' NOT NULL,
	"phone" text,
	"city" text,
	"state" text,
	"referral_code" text NOT NULL UNIQUE,
	"is_student_ambassador" boolean DEFAULT false NOT NULL,
	"student_school" text,
	"referrer_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "external_reward_transactions" (
	"id" serial PRIMARY KEY,
	"customer_id" integer,
	"provider" text DEFAULT 'tisasng' NOT NULL,
	"operation" text NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"reference" text,
	"result" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" serial PRIMARY KEY,
	"referrer_id" integer NOT NULL,
	"status" text DEFAULT 'clicked' NOT NULL,
	"session_id" text,
	"customer_id" integer,
	"order_number" text,
	"order_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_clicks" (
	"id" serial PRIMARY KEY,
	"referrer_id" integer NOT NULL,
	"landing_path" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_programs" (
	"id" serial PRIMARY KEY,
	"track" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"reward_type" text DEFAULT 'points' NOT NULL,
	"commission_bps" integer DEFAULT 0 NOT NULL,
	"points_per_naira_1000" integer DEFAULT 0 NOT NULL,
	"min_order_kobo" integer DEFAULT 0 NOT NULL,
	"payout_threshold_kobo" integer DEFAULT 0 NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"eligibility_note" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" serial PRIMARY KEY,
	"referrer_id" integer NOT NULL,
	"attribution_id" integer,
	"buyer_customer_id" integer,
	"order_id" integer,
	"order_number" text,
	"order_total_kobo" integer DEFAULT 0 NOT NULL,
	"reward_type" text DEFAULT 'points' NOT NULL,
	"amount_kobo" integer DEFAULT 0 NOT NULL,
	"amount_points" integer DEFAULT 0 NOT NULL,
	"program_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrers" (
	"id" serial PRIMARY KEY,
	"customer_id" integer,
	"code" text NOT NULL UNIQUE,
	"track" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"email" text,
	"phone" text,
	"school" text,
	"social_profile" text,
	"agreed_terms" boolean DEFAULT false NOT NULL,
	"program_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reward_accounts" (
	"id" serial PRIMARY KEY,
	"customer_id" integer NOT NULL UNIQUE,
	"points_available" integer DEFAULT 0 NOT NULL,
	"points_pending" integer DEFAULT 0 NOT NULL,
	"points_lifetime" integer DEFAULT 0 NOT NULL,
	"credit_kobo" integer DEFAULT 0 NOT NULL,
	"credit_pending_kobo" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reward_ledger" (
	"id" serial PRIMARY KEY,
	"customer_id" integer NOT NULL,
	"currency" text DEFAULT 'points' NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"source" text DEFAULT 'dreamz' NOT NULL,
	"order_number" text,
	"reference" text,
	"campaign" text,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "royale_requests" (
	"id" serial PRIMARY KEY,
	"request_number" text NOT NULL UNIQUE,
	"customer_id" integer,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"product_type" text DEFAULT '' NOT NULL,
	"design_direction" text,
	"colors" text,
	"materials" text,
	"size" text,
	"monogram" text,
	"hardware" text,
	"sole" text,
	"finishing" text,
	"occasion" text,
	"budget_min" integer,
	"budget_max" integer,
	"deadline" text,
	"reference_url" text,
	"inspiration_notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_progress" (
	"id" serial PRIMARY KEY,
	"campaign_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"task_key" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"target" integer DEFAULT 1 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"reward_granted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tisasng_connections" (
	"id" serial PRIMARY KEY,
	"customer_id" integer NOT NULL UNIQUE,
	"external_id" text NOT NULL,
	"external_label" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voucher_redemptions" (
	"id" serial PRIMARY KEY,
	"voucher_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"discount_kobo" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"released_at" timestamp,
	"redeemed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"campaign" text,
	"type" text DEFAULT 'fixed' NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"minimum_spend" integer DEFAULT 0 NOT NULL,
	"maximum_discount" integer,
	"eligible_products" jsonb DEFAULT '[]' NOT NULL,
	"eligible_categories" jsonb DEFAULT '[]' NOT NULL,
	"valid_from" timestamp,
	"expires_at" timestamp,
	"single_use" boolean DEFAULT true NOT NULL,
	"customer_id" integer,
	"status" text DEFAULT 'available' NOT NULL,
	"claimed_by_customer_id" integer,
	"claimed_at" timestamp,
	"redeemed_order_id" integer,
	"redeemed_at" timestamp,
	"claim_token" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_line" text DEFAULT 'essentials' NOT NULL;--> statement-breakpoint
CREATE INDEX "bnpl_transactions_order_idx" ON "bnpl_transactions" ("order_id");--> statement-breakpoint
CREATE INDEX "customers_referrer_idx" ON "customers" ("referrer_id");--> statement-breakpoint
CREATE INDEX "ext_reward_tx_customer_idx" ON "external_reward_transactions" ("customer_id");--> statement-breakpoint
CREATE INDEX "referral_attributions_referrer_idx" ON "referral_attributions" ("referrer_id");--> statement-breakpoint
CREATE INDEX "referral_attributions_session_idx" ON "referral_attributions" ("session_id");--> statement-breakpoint
CREATE INDEX "referral_clicks_referrer_idx" ON "referral_clicks" ("referrer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_rewards_order_uidx" ON "referral_rewards" ("order_id","referrer_id");--> statement-breakpoint
CREATE INDEX "referral_rewards_referrer_idx" ON "referral_rewards" ("referrer_id");--> statement-breakpoint
CREATE INDEX "referral_rewards_status_idx" ON "referral_rewards" ("status");--> statement-breakpoint
CREATE INDEX "referrers_status_idx" ON "referrers" ("status");--> statement-breakpoint
CREATE INDEX "reward_ledger_customer_idx" ON "reward_ledger" ("customer_id");--> statement-breakpoint
CREATE INDEX "reward_ledger_type_idx" ON "reward_ledger" ("type");--> statement-breakpoint
CREATE INDEX "royale_requests_status_idx" ON "royale_requests" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "task_progress_uidx" ON "task_progress" ("campaign_id","customer_id","task_key");--> statement-breakpoint
CREATE INDEX "task_progress_customer_idx" ON "task_progress" ("customer_id");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_order_idx" ON "voucher_redemptions" ("order_id");--> statement-breakpoint
CREATE INDEX "vouchers_status_idx" ON "vouchers" ("status");--> statement-breakpoint
CREATE INDEX "vouchers_claimed_by_idx" ON "vouchers" ("claimed_by_customer_id");--> statement-breakpoint
ALTER TABLE "bnpl_transactions" ADD CONSTRAINT "bnpl_transactions_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "external_reward_transactions" ADD CONSTRAINT "external_reward_transactions_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referrer_id_referrers_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_referrer_id_referrers_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_referrers_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_attribution_id_referral_attributions_id_fkey" FOREIGN KEY ("attribution_id") REFERENCES "referral_attributions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_buyer_customer_id_customers_id_fkey" FOREIGN KEY ("buyer_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_program_id_referral_programs_id_fkey" FOREIGN KEY ("program_id") REFERENCES "referral_programs"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referrers" ADD CONSTRAINT "referrers_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referrers" ADD CONSTRAINT "referrers_program_id_referral_programs_id_fkey" FOREIGN KEY ("program_id") REFERENCES "referral_programs"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "reward_accounts" ADD CONSTRAINT "reward_accounts_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "royale_requests" ADD CONSTRAINT "royale_requests_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_campaign_id_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tisasng_connections" ADD CONSTRAINT "tisasng_connections_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_claimed_by_customer_id_customers_id_fkey" FOREIGN KEY ("claimed_by_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_redeemed_order_id_orders_id_fkey" FOREIGN KEY ("redeemed_order_id") REFERENCES "orders"("id") ON DELETE SET NULL;