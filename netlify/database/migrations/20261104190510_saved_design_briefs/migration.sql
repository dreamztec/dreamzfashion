CREATE TABLE "saved_briefs" (
	"id" serial PRIMARY KEY,
	"customer_id" integer NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"piece" text,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "saved_briefs_customer_idx" ON "saved_briefs" ("customer_id");--> statement-breakpoint
ALTER TABLE "saved_briefs" ADD CONSTRAINT "saved_briefs_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;