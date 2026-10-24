CREATE TABLE "design_requests" (
	"id" serial PRIMARY KEY,
	"request_number" text NOT NULL UNIQUE,
	"session_id" text,
	"customer_name" text,
	"email" text,
	"phone" text,
	"specification" jsonb DEFAULT '{}' NOT NULL,
	"ai_summary" text,
	"recommended_product_ids" jsonb DEFAULT '[]' NOT NULL,
	"reference_image_url" text,
	"concept_image_url" text,
	"budget_min" integer,
	"budget_max" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"reference" text NOT NULL UNIQUE,
	"amount_kobo" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'initialized' NOT NULL,
	"channel" text,
	"gateway" text DEFAULT 'paystack' NOT NULL,
	"processed_at" timestamp,
	"gateway_event_id" text,
	"raw_result" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"customer_name" text NOT NULL,
	"email" text NOT NULL,
	"order_number" text,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "size" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "purchase_option" text DEFAULT 'product_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_note" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "value_tier" text DEFAULT 'signature' NOT NULL;--> statement-breakpoint
CREATE INDEX "design_requests_status_idx" ON "design_requests" ("status");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" ("status");--> statement-breakpoint
CREATE INDEX "product_reviews_product_idx" ON "product_reviews" ("product_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;