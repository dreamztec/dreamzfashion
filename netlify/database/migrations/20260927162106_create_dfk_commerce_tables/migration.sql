CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY,
	"event_name" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bespoke_requests" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"product_type" text NOT NULL,
	"color" text,
	"material" text,
	"size" text,
	"budget" text,
	"deadline" text,
	"reference_url" text,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"description" text DEFAULT '',
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"order_number" text,
	"feedback_type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"variant_label" text,
	"customization" jsonb,
	"image_url" text,
	"unit_price" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"order_number" text NOT NULL UNIQUE,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"state" text NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"delivery_note" text,
	"subtotal" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_reference" text,
	"payment_method" text,
	"status" text DEFAULT 'order_received' NOT NULL,
	"timeline" jsonb DEFAULT '[]' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"color" text,
	"size" text,
	"price" integer,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"sku" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"sku" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"category_slug" text NOT NULL,
	"subcategory" text,
	"collection" text,
	"price" integer NOT NULL,
	"compare_at_price" integer,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"full_description" text DEFAULT '' NOT NULL,
	"materials" text,
	"colors" jsonb DEFAULT '[]' NOT NULL,
	"sizes" jsonb DEFAULT '[]' NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"availability" text DEFAULT 'in_stock' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"new_arrival" boolean DEFAULT false NOT NULL,
	"bestseller" boolean DEFAULT false NOT NULL,
	"customizable" boolean DEFAULT false NOT NULL,
	"care_information" text,
	"delivery_information" text,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "analytics_events_name_idx" ON "analytics_events" ("event_name");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" ("product_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" ("category_slug");--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;