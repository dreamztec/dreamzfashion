-- Remove duplicate referral programme rows left by a non-idempotent seed
-- (keep the lowest id per track), then enforce one row per track.
-- Idempotent: if the constraint (or its backing index) already exists —
-- e.g. the branch database was created from a snapshot that already has it —
-- the ALTER is skipped instead of failing the deploy.
DELETE FROM "referral_programs" p
  USING "referral_programs" q
  WHERE p.track = q.track AND p.id > q.id;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referral_programs_track_key'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'referral_programs_track_key'
  ) THEN
    ALTER TABLE "referral_programs" ADD CONSTRAINT "referral_programs_track_key" UNIQUE("track");
  END IF;
END $$;
