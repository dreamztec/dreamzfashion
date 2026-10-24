CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"display_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'operations' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY,
	"referrer_id" integer NOT NULL,
	"order_id" integer,
	"order_number" text,
	"order_total_kobo" integer DEFAULT 0 NOT NULL,
	"rate_bps" integer DEFAULT 0 NOT NULL,
	"amount_kobo" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"eligible_at" timestamp,
	"paid_at" timestamp,
	"payout_request_id" integer,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "corporate_enquiries" (
	"id" serial PRIMARY KEY,
	"enquiry_number" text NOT NULL UNIQUE,
	"company_name" text NOT NULL,
	"contact_person" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"product_interests" text DEFAULT '' NOT NULL,
	"quantity" text DEFAULT '' NOT NULL,
	"budget_range" text DEFAULT '' NOT NULL,
	"deadline" text,
	"delivery_location" text DEFAULT '' NOT NULL,
	"branding_requirements" text,
	"reference_url" text,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"next_action" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "corporate_quotes" (
	"id" serial PRIMARY KEY,
	"quote_number" text NOT NULL UNIQUE,
	"enquiry_id" integer,
	"company_name" text NOT NULL,
	"contact_person" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"lines" jsonb DEFAULT '[]' NOT NULL,
	"branding_charge_kobo" integer DEFAULT 0 NOT NULL,
	"delivery_charge_kobo" integer DEFAULT 0 NOT NULL,
	"subtotal_kobo" integer DEFAULT 0 NOT NULL,
	"total_kobo" integer DEFAULT 0 NOT NULL,
	"valid_until" timestamp,
	"milestones" jsonb DEFAULT '[]' NOT NULL,
	"terms" text,
	"delivery_expectation" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"access_token" text NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_profiles" (
	"id" serial PRIMARY KEY,
	"referrer_id" integer NOT NULL UNIQUE,
	"partner_type" text DEFAULT 'creator' NOT NULL,
	"store_name" text,
	"store_slug" text UNIQUE,
	"bio" text,
	"instagram" text,
	"curated_product_ids" jsonb DEFAULT '[]' NOT NULL,
	"storefront_status" text DEFAULT 'off' NOT NULL,
	"trade_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" serial PRIMARY KEY,
	"referrer_id" integer NOT NULL,
	"amount_kobo" integer NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"destination" text,
	"admin_reference" text,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"interest" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'anniversary' NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_cost_kobo" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_plan" text DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "balance_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "balance_due_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "kind" text DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "corporate_quote_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tier" text DEFAULT 'essentials' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "internal_cost_kobo" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deposit_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deposit_percent" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "personalization_label" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "personalization_charge_kobo" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "size_guide" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "returns_terms" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "checkout_ready" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "admin_users_role_idx" ON "admin_users" ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "commissions_order_partner_uidx" ON "commissions" ("order_id","referrer_id");--> statement-breakpoint
CREATE INDEX "commissions_status_idx" ON "commissions" ("status");--> statement-breakpoint
CREATE INDEX "commissions_referrer_idx" ON "commissions" ("referrer_id");--> statement-breakpoint
CREATE INDEX "corporate_enquiries_status_idx" ON "corporate_enquiries" ("status");--> statement-breakpoint
CREATE INDEX "corporate_quotes_status_idx" ON "corporate_quotes" ("status");--> statement-breakpoint
CREATE INDEX "partner_profiles_referrer_idx" ON "partner_profiles" ("referrer_id");--> statement-breakpoint
CREATE INDEX "payout_requests_referrer_idx" ON "payout_requests" ("referrer_id");--> statement-breakpoint
CREATE INDEX "payout_requests_status_idx" ON "payout_requests" ("status");--> statement-breakpoint
CREATE INDEX "products_tier_idx" ON "products" ("tier");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_source_uidx" ON "waitlist" ("email","source");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_referrer_id_referrers_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "corporate_quotes" ADD CONSTRAINT "corporate_quotes_enquiry_id_corporate_enquiries_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "corporate_enquiries"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_referrer_id_referrers_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_referrer_id_referrers_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE CASCADE;--> statement-breakpoint
UPDATE "products" SET "tier" = 'signature' WHERE "product_line" = 'originals' AND "tier" = 'essentials';--> statement-breakpoint
UPDATE "products" SET "tier" = 'bespoke' WHERE "product_line" = 'royale' AND "tier" = 'essentials';
