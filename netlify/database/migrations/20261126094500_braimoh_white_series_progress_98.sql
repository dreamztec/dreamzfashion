-- Owner-directed progress update for Mr Braimoh's VIII White Series.
-- Order: DFK-BRA-261112-VIII. Keep 8 items, receipt ledger,
-- deposit/balance, order status and scheduled delivery date untouched.
-- This migration is idempotent; do not divide/alter prices or payments.

UPDATE "settings"
SET
  "value" = "value" || jsonb_build_object(
    'progressPercent', 98,
    'publicNote', 'Your VIII White Series is now 98% complete according to the latest DREAMZ production update. Delivery remains scheduled for 26 November 2026.',
    'updatedAt', now()
  ),
  "updated_at" = now()
WHERE "key" = 'shared_order:DFK-BRA-261112-VIII'
  AND COALESCE("value"->>'progressPercent', '') <> '98';
--> statement-breakpoint

INSERT INTO "order_events" ("order_id", "status", "note")
SELECT o."id", 'production',
  'The VIII White Series is now 98% complete, as confirmed by DREAMZ on 26 November 2026. Delivery remains scheduled for 26 November 2026.'
FROM "orders" o
WHERE o."order_number" = 'DFK-BRA-261112-VIII'
AND NOT EXISTS (
  SELECT 1
  FROM "order_events" e
  WHERE e."order_id" = o."id"
    AND e."status" = 'production'
    AND e."note" LIKE 'The VIII White Series is now 98% complete%'
);
