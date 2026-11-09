
CREATE TABLE IF NOT EXISTS designer_profiles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  dream_statement TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMP,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS designer_profiles_plan_idx ON designer_profiles(plan);

ALTER TABLE saved_briefs
  ADD COLUMN IF NOT EXISTS designer_profile_id INTEGER REFERENCES designer_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS project_mode TEXT NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS client_label TEXT,
  ADD COLUMN IF NOT EXISTS design_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_token TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS saved_briefs_public_slug_uidx
  ON saved_briefs(public_slug)
  WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS saved_briefs_designer_profile_idx
  ON saved_briefs(designer_profile_id);

CREATE INDEX IF NOT EXISTS saved_briefs_visibility_idx
  ON saved_briefs(visibility);

CREATE UNIQUE INDEX IF NOT EXISTS saved_briefs_approval_token_uidx
  ON saved_briefs(approval_token)
  WHERE approval_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS design_likes (
  id SERIAL PRIMARY KEY,
  brief_id INTEGER NOT NULL REFERENCES saved_briefs(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT design_likes_brief_customer_unique UNIQUE (brief_id, customer_id)
);

CREATE INDEX IF NOT EXISTS design_likes_brief_idx ON design_likes(brief_id);

CREATE TABLE IF NOT EXISTS designer_upgrade_requests (
  id SERIAL PRIMARY KEY,
  designer_profile_id INTEGER NOT NULL REFERENCES designer_profiles(id) ON DELETE CASCADE,
  requested_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS designer_upgrade_requests_profile_idx
  ON designer_upgrade_requests(designer_profile_id);

CREATE INDEX IF NOT EXISTS designer_upgrade_requests_status_idx
  ON designer_upgrade_requests(status);


CREATE TABLE IF NOT EXISTS design_approval_feedback (
  id SERIAL PRIMARY KEY,
  brief_id INTEGER NOT NULL REFERENCES saved_briefs(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_approval_feedback_brief_idx
  ON design_approval_feedback(brief_id);
