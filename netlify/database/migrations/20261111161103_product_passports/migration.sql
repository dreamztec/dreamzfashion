CREATE TABLE "passport_bookmarks" (
	"id" serial PRIMARY KEY,
	"passport_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"dream" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passport_tickets" (
	"id" serial PRIMARY KEY,
	"passport_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'Received' NOT NULL,
	"reply" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_passports" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"collection" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'footwear' NOT NULL,
	"story" text NOT NULL,
	"encouragement" text DEFAULT 'Every dream is valid. Take your next step with purpose.' NOT NULL,
	"materials" text DEFAULT 'Final material specification will be added after production checks.' NOT NULL,
	"care" text DEFAULT 'Keep dry, wipe gently with a soft cloth and store away from direct heat. Ask DREAMZ before applying a cleaning product.' NOT NULL,
	"lifespan" text DEFAULT 'Service-life estimate pending wear data. Actual wear depends on use, care and construction; this is not a warranty.' NOT NULL,
	"production_status" text DEFAULT 'In production' NOT NULL,
	"image_url" text,
	"owner_customer_id" integer,
	"claim_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "passport_bookmark_customer_unique" ON "passport_bookmarks" ("passport_id","customer_id");
--> statement-breakpoint
ALTER TABLE "passport_bookmarks" ADD CONSTRAINT "passport_bookmarks_passport_id_product_passports_id_fkey" FOREIGN KEY ("passport_id") REFERENCES "product_passports"("id");
--> statement-breakpoint
ALTER TABLE "passport_bookmarks" ADD CONSTRAINT "passport_bookmarks_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");
--> statement-breakpoint
ALTER TABLE "passport_tickets" ADD CONSTRAINT "passport_tickets_passport_id_product_passports_id_fkey" FOREIGN KEY ("passport_id") REFERENCES "product_passports"("id");
--> statement-breakpoint
ALTER TABLE "passport_tickets" ADD CONSTRAINT "passport_tickets_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");
--> statement-breakpoint
ALTER TABLE "product_passports" ADD CONSTRAINT "product_passports_owner_customer_id_customers_id_fkey" FOREIGN KEY ("owner_customer_id") REFERENCES "customers"("id");
