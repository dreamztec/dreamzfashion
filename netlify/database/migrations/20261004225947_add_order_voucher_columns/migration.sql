ALTER TABLE "orders" ADD COLUMN "discount_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "voucher_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "updated_at" timestamp DEFAULT now();