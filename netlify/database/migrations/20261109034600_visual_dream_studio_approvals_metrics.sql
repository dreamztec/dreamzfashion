ALTER TABLE saved_briefs
  ADD COLUMN IF NOT EXISTS approval_token TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS saved_briefs_approval_token_uidx
  ON saved_briefs(approval_token)
  WHERE approval_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS design_approval_feedback (
  id SERIAL PRIMARY KEY,
  brief_id INTEGER NOT NULL REFERENCES saved_briefs(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_approval_feedback_brief_idx
  ON design_approval_feedback(brief_id);
