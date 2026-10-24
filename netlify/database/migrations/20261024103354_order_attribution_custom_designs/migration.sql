CREATE TABLE "custom_designs" (
	"id" serial PRIMARY KEY,
	"design_id" text NOT NULL UNIQUE,
	"edit_token" text NOT NULL,
	"product_id" integer NOT NULL,
	"model_id" text NOT NULL,
	"model_version" text NOT NULL,
	"config_version" integer DEFAULT 1 NOT NULL,
	"parts" jsonb DEFAULT '{}' NOT NULL,
	"materials" jsonb DEFAULT '{}' NOT NULL,
	"geometry" jsonb DEFAULT '{}' NOT NULL,
	"size" text,
	"reference_ids" jsonb DEFAULT '[]' NOT NULL,
	"preview_key" text,
	"notes" text,
	"price_status" text DEFAULT 'quote_required' NOT NULL,
	"quoted_price_kobo" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "design_references" (
	"id" serial PRIMARY KEY,
	"ref_id" text NOT NULL UNIQUE,
	"blob_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"original_name" text,
	"design_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "client_request_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "referrer_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "attribution_source" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "attribution_outcome" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "self_purchase_benefit_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_request_id_key" UNIQUE("client_request_id");--> statement-breakpoint
CREATE INDEX "custom_designs_product_idx" ON "custom_designs" ("product_id");