-- DREAMZ Vanity Flex private commission — historical manual order import.
-- Exact commission: VF-261110-01 for Dr Ugochukwu Omeogu, 10 Nov 2026.
-- Source: Nov 10 six-page brochure; 4 items, total NGN750,000.
-- Verified Moniepoint 10 Nov deposit: NGN375,000. Due: NGN375,000.
-- Owner update 19 Nov: only Oxford has been delivered; review awaited;
-- collection reported 25% complete. Do not invent a new delivery promise.
-- Prices are aggregate, not apportioned per item. Lines are marked as
-- included in commissioned collection (unit_price=0); do not sell them
-- separately or collect Paystack against unapproved line prices.
-- Token stored as SHA256 only; no private contact/address is invented.

INSERT INTO "orders" (
  "order_number","customer_name","phone","email","state","city",
  "address","delivery_note","subtotal","delivery_fee","discount_kobo",
  "payment_plan","deposit_kobo","balance_kobo","paid_kobo",
  "total","currency","payment_status","payment_reference","payment_method",
  "status","timeline","admin_notes","marketing_consent","created_at","updated_at"
)
VALUES (
  'DFK-VF-261110-01','Dr Ugochukwu Omeogu','Contact not on file',NULL,
  'To confirm','To confirm','Delivery contact and address to confirm',
  'Vanity Flex Oxford delivered. Customer review is pending. Remaining three pieces pending completion; revised dates to be agreed after feedback.',
  75000000,0,0,
  'deposit',37500000,37500000,37500000,
  75000000,'NGN','deposit_paid','OFF-MON-VF-101126','bank_transfer',
  'production',
  '[
    {"status":"order_received","at":"2026-11-10","note":"Private commission VF-261110-01: Oxford, Zip Sneaker, Slingback Clog and Carry Purse."},
    {"status":"deposit_received","at":"2026-11-10","note":"NGN375,000 manual deposit recorded from 10 November Moniepoint receipt."},
    {"status":"production","at":"2026-11-19","note":"Owner progress update: Oxford delivered (one of four items); customer fit/review awaited; overall 25% complete."}
  ]'::jsonb,
  'Historical private commission VF-261110-01; brochure dated 10 Nov 2026. Moniepoint deposit verified: NGN375,000 on 10 Nov. Original balance: NGN375,000. Original target for other three items was 17 Nov 2026 and is now past; do not promise a replacement date until customer review/production plan confirmed. No telephone, email, address, or actual Oxford delivery date on file. Do not apportion bundle price to items.',
  false,now(),now()
)
ON CONFLICT ("order_number") DO NOTHING;
--> statement-breakpoint

INSERT INTO "order_items" (
  "order_id","sku","product_name","variant_label","quantity",
  "unit_price","purchase_option"
)
SELECT o."id", d.sku, d.name,
  'Private commissioned collection · price included in NGN750,000 total',
  1, 0, 'product_only'
FROM "orders" o
CROSS JOIN (VALUES
  ('VF-01','Vanity Flex Oxford'),
  ('VF-02','Vanity Flex Zip Sneaker'),
  ('VF-03','Vanity Flex Slingback Clog'),
  ('VF-04','Vanity Carry Purse')
) AS d(sku,name)
WHERE o."order_number" = 'DFK-VF-261110-01'
AND NOT EXISTS (
  SELECT 1 FROM "order_items" i
  WHERE i."order_id"=o."id" AND i."sku"=d.sku
);
--> statement-breakpoint

INSERT INTO "payments" (
  "order_id","reference","amount_kobo","currency","kind",
  "status","channel","gateway","processed_at","raw_result","created_at","updated_at"
)
SELECT o."id",'OFF-MON-VF-101126',37500000,'NGN','deposit',
  'success','bank_transfer','manual',now(),
  jsonb_build_object(
    'recordSource','Owner-confirmed Moniepoint receipt reconciliation',
    'originalPaymentDate','2026-11-10',
    'invoiceReference','VF-261110-01',
    'receivedKobo',37500000,
    'importedAt',now(),
    'noPaystackCharge',true
  ),
  now(),now()
FROM "orders" o WHERE o."order_number"='DFK-VF-261110-01'
ON CONFLICT ("reference") DO NOTHING;
--> statement-breakpoint

INSERT INTO "order_events" ("order_id","status","note")
SELECT o."id",'production',
  'Vanity Flex owner update (19 Nov): Oxford delivered and awaiting client review. 3 pieces remain. Overall progress 25%.'
FROM "orders" o
WHERE o."order_number"='DFK-VF-261110-01'
AND NOT EXISTS (
  SELECT 1 FROM "order_events" e
  WHERE e."order_id"=o."id"
    AND e."note" LIKE 'Vanity Flex owner update (19 Nov)%'
);
--> statement-breakpoint

INSERT INTO "settings" ("key","value","updated_at")
VALUES (
  'shared_order:DFK-VF-261110-01',
  jsonb_build_object(
    'tokenHash','941b9ac28368a3d639b993683242f155f5e66aeb9b5d019c7d1d1810463af8e3',
    'collection','Vanity Flex · Private Commission',
    'progressPercent',25,
    'deliveryDate',NULL,
    'deliveryLabel','Remaining delivery date to be confirmed after review',
    'publicNote','The Vanity Flex Oxford has been delivered. We are awaiting your review and fit feedback before confirming the next steps for the remaining three pieces.',
    'itemStatuses',jsonb_build_object(
      'VF-01','Delivered · awaiting your review',
      'VF-02','Remaining · pending completion',
      'VF-03','Remaining · pending completion',
      'VF-04','Remaining · pending completion'
    ),
    'updatedAt',now()
  ),
  now()
)
ON CONFLICT ("key") DO NOTHING;
