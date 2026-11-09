CREATE TABLE IF NOT EXISTS design_order_intents (
  id SERIAL PRIMARY KEY,
  brief_id INTEGER NOT NULL REFERENCES saved_briefs(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  session_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intent',
  order_reference TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS design_order_intents_brief_session_uidx
  ON design_order_intents(brief_id, session_key);
CREATE INDEX IF NOT EXISTS design_order_intents_brief_idx
  ON design_order_intents(brief_id);
CREATE INDEX IF NOT EXISTS design_order_intents_status_idx
  ON design_order_intents(status);
