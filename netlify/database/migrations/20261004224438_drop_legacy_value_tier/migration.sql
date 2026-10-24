-- Carry the old value-tier assignment across: Signature and Prestige pieces
-- become DREAMZ Originals (house collections / signature releases); Essentials
-- rows keep their line. The tier concept is retired after this runs.
UPDATE "products" SET "product_line" = 'originals' WHERE "value_tier" IN ('signature', 'prestige');--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "value_tier";
