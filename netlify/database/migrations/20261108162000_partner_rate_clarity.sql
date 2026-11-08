-- DREAMZ partner programme clarification.
-- Forward-only DML: keep historical commission rows untouched while updating
-- the active settings used for new qualifying sales.
INSERT INTO "settings" ("key", "value")
SELECT
  'partners',
  '{"commissionBps":1500,"scoutCommissionBps":1000,"creatorCommissionBps":1500,"tradeCommissionBps":1500,"payoutThresholdKobo":0,"attributionWindowDays":30,"termsNote":"Commission applies only to qualifying verified sales. No recruitment or downline commission.","selfPurchaseBenefitBps":0,"returnWindowDays":2}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'partners');

UPDATE "settings"
SET "value" =
  COALESCE("value", '{}'::jsonb)
  || jsonb_build_object(
    'commissionBps', 1500,
    'scoutCommissionBps', 1000,
    'creatorCommissionBps', 1500,
    'tradeCommissionBps', 1500,
    'partnerIntroductionBonusKobo', 0,
    'termsNote', 'Commission applies only to qualifying verified sales. No recruitment or downline commission.'
  )
WHERE "key" = 'partners';
