-- Reconcile DREAMZ Originals SKUs to match the 15-design collection specification.
-- 1. Free obsolete provisional SKUs (dreamz-depth, dreamz-freedom, dreamz-legacy, dreamz-rhythm).
UPDATE "products"
SET "sku" = 'ARCHIVED-' || id, "status" = 'archived'
WHERE "slug" IN ('dreamz-depth', 'dreamz-freedom', 'dreamz-legacy', 'dreamz-rhythm');

-- 2. Shift all existing DFK-ORG-* SKUs to temporary values to prevent unique constraint collisions.
UPDATE "products"
SET "sku" = 'TEMP-' || id
WHERE "sku" LIKE 'DFK-ORG-%';

-- 3. Set canonical SKUs for each official DREAMZ Originals product.
UPDATE "products" SET "sku" = 'DFK-ORG-001' WHERE "slug" = 'dreamz-faith';
UPDATE "products" SET "sku" = 'DFK-ORG-002' WHERE "slug" = 'dreamz-vision';
UPDATE "products" SET "sku" = 'DFK-ORG-003' WHERE "slug" = 'dreamz-focus';
UPDATE "products" SET "sku" = 'DFK-ORG-004' WHERE "slug" = 'dreamz-courage';
UPDATE "products" SET "sku" = 'DFK-ORG-005' WHERE "slug" = 'dreamz-integrity';
UPDATE "products" SET "sku" = 'DFK-ORG-006' WHERE "slug" = 'dreamz-purpose';
UPDATE "products" SET "sku" = 'DFK-ORG-007' WHERE "slug" = 'dreamz-discipline';
UPDATE "products" SET "sku" = 'DFK-ORG-008' WHERE "slug" = 'dreamz-ambition';
UPDATE "products" SET "sku" = 'DFK-ORG-009' WHERE "slug" = 'dreamz-excellence';
UPDATE "products" SET "sku" = 'DFK-ORG-010' WHERE "slug" = 'dreamz-grace';
UPDATE "products" SET "sku" = 'DFK-ORG-011' WHERE "slug" = 'dreamz-confidence';
UPDATE "products" SET "sku" = 'DFK-ORG-012' WHERE "slug" = 'dreamz-unity';
UPDATE "products" SET "sku" = 'DFK-ORG-013' WHERE "slug" = 'dreamz-balance';
UPDATE "products" SET "sku" = 'DFK-ORG-014' WHERE "slug" = 'dreamz-harmony';
UPDATE "products" SET "sku" = 'DFK-ORG-015' WHERE "slug" = 'dreamz-resolve';
