CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT '{}',
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_sessions_expiry ON chat_sessions(expires_at);
CREATE TABLE IF NOT EXISTS chat_events (
  session_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  response TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, event_id)
);
CREATE INDEX IF NOT EXISTS chat_events_expiry ON chat_events(expires_at);
CREATE TABLE IF NOT EXISTS chat_usage (
  bucket TEXT PRIMARY KEY,
  calls INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
