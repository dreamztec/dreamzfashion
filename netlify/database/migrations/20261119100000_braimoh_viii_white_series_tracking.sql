-- Owner-authorized historical offline order registration for Mr Braimoh.
-- Based on DFK-QPI-20261111-BRA-01 (revised 12 Nov 2026) and reconciled
-- GTBank receipt of N139,992 on 12 Nov 2026. All amounts are in KOBO.
-- Eight selected slide designs = N279,992; outstanding = N140,000.
-- The proforma lists a N139,996 target deposit (N4 more than actually paid).
-- Never invent a customer telephone number, email, delivery street or time.
-- A long random bearer token is stored ONLY as a SHA-256 hash in settings.
-- Safe to reapply: every insert has a natural/unique idempotency guard.

INSERT INTO "orders" (
  "order_number", "customer_name", "phone", "email", "state", "city",
  "address", "delivery_note", "subtotal", "delivery_fee", "discount_kobo",
  "payment_plan", "deposit_kobo", "balance_kobo", "paid_kobo",
  "total", "currency", "payment_status", "payment_reference", "payment_method",
  "status", "timeline", "admin_notes", "marketing_consent", "created_at", "updated_at"
)
VALUES (
  'DFK-BRA-261112-VIII', 'Mr Braimoh', 'Contact not on file', NULL,
  'To confirm', 'To confirm', 'Address pending confirmation',
  'Delivery target 26 November 2026; shipping details to be confirmed.',
  27999200, 0, 0,
  'deposit', 13999200, 14000000, 13999200,
  27999200, 'NGN', 'deposit_paid', 'OFF-GTB-BRA-VIII-121126', 'bank_transfer',
  'production',
  '[
    {"status":"order_received","at":"2026-11-12T12:00:00+01:00","note":"VIII White Series proforma issued; historical order registered in DREAMZ tracking."},
    {"status":"deposit_received","at":"2026-11-12T12:00:00+01:00","note":"GTBank customer deposit of NGN 139,992 received on 12 November 2026. Original proforma requested NGN 139,996."},
    {"status":"production","at":"2026-11-19T09:00:00+01:00","note":"Production progress reported by DREAMZ: 47%. Scheduled delivery 26 November 2026."}
  ]'::jsonb,
  'Historical offline order. Source: DFK-QPI-20261111-BRA-01; GTBank deposit review. Amount paid = NGN 139,992; original quoted deposit = NGN 139,996 (NGN 4 discrepancy). No customer phone or delivery address on file. Progress 47% stated by the owner.',
  false,
  now(), now()
)
ON CONFLICT ("order_number") DO NOTHING;
--> statement-breakpoint

INSERT INTO "order_items" (
  "order_id", "sku", "product_name", "variant_label", "quantity",
  "unit_price", "purchase_option"
)
SELECT o."id", d.sku, d.name, 'VIII White Series', 1, 3499900, 'product_only'
FROM "orders" o
CROSS JOIN (VALUES
 ('VIII-01', 'Chocolate & White Layered Slide'),
 ('VIII-02', 'Cobalt & White Slide'),
 ('VIII-03', 'Red Accent Wrap Slide'),
 ('VIII-04', 'White Folded-Tab Slide'),
 ('VIII-05', 'Black & White Keeper Slide'),
 ('VIII-06', 'White Bridge / Brown Footbed'),
 ('VIII-07', 'White Double-Band Slide'),
 ('VIII-08', 'White & Green Lace Slide')
) AS d(sku, name)
WHERE o."order_number" = 'DFK-BRA-261112-VIII'
  AND NOT EXISTS (
    SELECT 1 FROM "order_items" i
    WHERE i."order_id" = o."id" AND i."sku" = d.sku
  );
--> statement-breakpoint

-- The received 12 Nov bank transfer belongs to a MANUAL ledger, not Paystack.
INSERT INTO "payments" (
  "order_id", "reference", "amount_kobo", "currency", "kind",
  "status", "channel", "gateway", "processed_at", "raw_result", "created_at", "updated_at"
)
SELECT o."id", 'OFF-GTB-BRA-VIII-121126', 13999200, 'NGN', 'deposit',
       'success', 'bank_transfer', 'manual', now(),
       jsonb_build_object(
         'recordSource', 'Owner-confirmed GTBank receipt reconciliation',
         'originalPaymentDate', '2026-11-12',
         'originalProforma', 'DFK-QPI-20261111-BRA-01',
         'proformaDepositKobo', 13999600,
         'actuallyReceivedKobo', 13999200,
         'importedOn', now(),
         'noPaystackCharge', true
       ),
       now(), now()
FROM "orders" o
WHERE o."order_number" = 'DFK-BRA-261112-VIII'
ON CONFLICT ("reference") DO NOTHING;
--> statement-breakpoint

INSERT INTO "order_events" ("order_id", "status", "note")
SELECT o."id", 'production',
       'The VIII White Series: 47% production progress reported by DREAMZ. Delivery scheduled for 26 November 2026.'
FROM "orders" o
WHERE o."order_number" = 'DFK-BRA-261112-VIII'
AND NOT EXISTS (
  SELECT 1 FROM "order_events" e
  WHERE e."order_id" = o."id" AND e."status" = 'production'
    AND e."note" LIKE 'The VIII White Series: 47%'
);
--> statement-breakpoint

-- Link token is never persisted as plaintext in the DB or repository.
-- The owner shares the one-click URL privately with Mr Braimoh.
INSERT INTO "settings" ("key", "value", "updated_at")
VALUES (
  'shared_order:DFK-BRA-261112-VIII',
  jsonb_build_object(
    'tokenHash', '55dbf4e52731985e382adaf4502ab43bf54c174f1ee69fe30f96873ef17186ab',
    'progressPercent', 47,
    'deliveryDate', '2026-11-26',
    'publicNote', 'Your eight selected leather slides are being crafted. We are 47% complete and remain on schedule for delivery on 26 November 2026.',
    'updatedAt', now()
  ),
  now()
)
ON CONFLICT ("key") DO NOTHING;
