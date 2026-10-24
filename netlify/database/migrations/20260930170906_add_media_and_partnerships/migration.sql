CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY,
	"url" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'OTHER' NOT NULL,
	"is_lifestyle" boolean DEFAULT false NOT NULL,
	"product_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partnership_enquiries" (
	"id" serial PRIMARY KEY,
	"business_name" text NOT NULL,
	"contact_person" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"city" text NOT NULL,
	"state_country" text NOT NULL,
	"business_type" text NOT NULL,
	"presence" text NOT NULL,
	"product_interest" text NOT NULL,
	"order_volume" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "media_assets_category_idx" ON "media_assets" ("category");