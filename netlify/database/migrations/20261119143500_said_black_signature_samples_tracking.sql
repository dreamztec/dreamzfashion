-- DREAMZ Fashion — Mr Said unbranded black Signature leather samples.
-- Reconciled against the 15 November design/price brief and proforma
-- DFK-SAID-161126; owner confirms NGN35,000 already received.
-- Delivery: Abuja, Friday 20 Nov 2026, exact time/address to be agreed.
-- No delivery charge. The agreed items are 01 and 06 ONLY.
-- Never record the unknown original payment method as Paystack or
-- invent a bank/transfer receipt or confirmed transaction timestamp.
-- Integer amounts below are KOBO.
-- Each statement is idempotent and leaves historic orders unchanged.

INSERT INTO "orders" (
  "order_number","customer_name","phone","email","state","city",
  "address","delivery_note","subtotal","delivery_fee","discount_kobo",
  "payment_plan","deposit_kobo","balance_kobo","paid_kobo",
  "total","currency","payment_status","payment_reference","payment_method",
  "status","timeline","admin_notes","marketing_consent","created_at","updated_at"
)
VALUES (
  'DFK-SAID-161126','Mr Said','Contact not on file',NULL,
  'Federal Capital Territory','Abuja','Delivery address to be confirmed with client',
  'Delivery agreed for Friday 20 November 2026 in Abuja. No delivery fee. Ask customer what time is convenient and confirm location.',
  5000000,0,0,
  'deposit',3500000,1500000,3500000,
  5000000,'NGN','deposit_paid','OFF-SAID-OWNER-35K','external_payment',
  'production',
  '[
    {"status":"order_received","at":"2026-11-16","note":"Two unbranded samples selected from proposed Signature leather designs 01 and 06."},
    {"status":"deposit_received","at":"2026-11-19","note":"Owner confirms NGN35,000 received; exact payment method and receipt date not separately supplied."},
    {"status":"production","at":"2026-11-19","note":"Owner progress update: 98% complete. Delivery planned for Friday 20 Nov; confirm convenient time with customer."}
  ]'::jsonb,
  'Mr Said order DFK-SAID-161126: 01 Black Classic cardholder (NGN15,000); 06 Black Minimal reusable A5 notebook cover (NGN35,000), unbranded black Signature corrected-grain cow leather. NGN50,000 total, NGN35,000 received per owner (method/date not supplied), NGN15,000 due. Free Abuja delivery agreed Friday 20 Nov; time and address to confirm. No logo setup or laptop bag in this order.',
  false,now(),now()
)
ON CONFLICT ("order_number") DO NOTHING;
--> statement-breakpoint

INSERT INTO "order_items" (
  "order_id","sku","product_name","variant_label","quantity",
  "unit_price","purchase_option"
)
SELECT o."id",d.sku,d.name,
  'Unbranded · Black Signature corrected-grain leather',
  1,d.unit_price,'product_only'
FROM "orders" o
CROSS JOIN (VALUES
  ('SAID-01','01 Black Classic Cardholder',1500000),
  ('SAID-06','06 Black Minimal Reusable A5 Notebook Cover',3500000)
) AS d(sku,name,unit_price)
WHERE o."order_number"='DFK-SAID-161126'
AND NOT EXISTS (
  SELECT 1 FROM "order_items" i
  WHERE i."order_id"=o."id" AND i."sku"=d.sku
);
--> statement-breakpoint

INSERT INTO "payments" (
  "order_id","reference","amount_kobo","currency","kind",
  "status","channel","gateway","processed_at","raw_result","created_at","updated_at"
)
SELECT o."id",'OFF-SAID-OWNER-35K',3500000,'NGN','deposit',
  'success','external_payment','manual',now(),
  jsonb_build_object(
    'recordSource','Owner-reported payment received',
    'amountReceivedKobo',3500000,
    'method','Not supplied; do not describe as Paystack or bank-confirmed',
    'originalReceiptDate','Not supplied',
    'invoice','DFK-SAID-161126',
    'recordedAt',now(),
    'noPaystackCharge',true
  ),
  now(),now()
FROM "orders" o WHERE o."order_number"='DFK-SAID-161126'
ON CONFLICT ("reference") DO NOTHING;
--> statement-breakpoint

INSERT INTO "order_events" ("order_id","status","note")
SELECT o."id",'production',
  'Mr Said: samples 01 and 06 are 98% complete per DREAMZ. Friday 20 Nov 2026 Abuja delivery planned; confirming convenient delivery time.'
FROM "orders" o
WHERE o."order_number"='DFK-SAID-161126'
AND NOT EXISTS (
  SELECT 1 FROM "order_events" e
  WHERE e."order_id"=o."id"
    AND e."note" LIKE 'Mr Said: samples 01 and 06 are 98%'
);
--> statement-breakpoint

-- Private bearer link token itself remains outside source/database.
-- Database stores only the SHA-256 digest; do not expose publicly.
INSERT INTO "settings" ("key","value","updated_at")
VALUES (
  'shared_order:DFK-SAID-161126',
  jsonb_build_object(
    'tokenHash','7e41ccd09ad806bdb969444c649a62659881d46bd348813eeebbf4d39d93be84',
    'collection','Black Signature Leather · Two Unbranded Samples',
    'progressPercent',98,
    'deliveryDate','2026-11-20',
    'deliveryLabel','Friday 20 November 2026 · delivery time to be confirmed',
    'publicNote','Your two unbranded black Signature leather samples are 98% complete. Delivery in Abuja is planned for Friday 20 November 2026, with no delivery charge. Please tell us what time would be convenient and confirm the delivery location.',
    'itemStatuses',jsonb_build_object(
      'SAID-01','98% collection progress · final preparation',
      'SAID-06','98% collection progress · final preparation'
    ),
    'updatedAt',now()
  ),
  now()
)
ON CONFLICT ("key") DO NOTHING;
