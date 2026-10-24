-- Align printed voucher statuses with the house standard: a voucher held
-- against a pending order is 'reserved' (never consumed until verified
-- payment). Migrates the legacy 'applied' hold state forward.
-- Idempotent by nature: re-running matches no rows once applied.
-- String literals use single quotes; double quotes would be parsed as
-- column identifiers and fail with 42703.
UPDATE "vouchers" SET "status" = 'reserved' WHERE "status" = 'applied';
