ALTER TABLE "partnership_enquiries" ADD COLUMN "partnership_category" text DEFAULT 'undecided' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "image_fit" SET DEFAULT 'contain';