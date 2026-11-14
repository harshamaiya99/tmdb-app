CREATE TABLE IF NOT EXISTS tmdb_user_sessions (
  session_hash TEXT PRIMARY KEY,
  tmdb_session_id_encrypted TEXT,
  tmdb_account_id BIGINT,
  tmdb_account_name TEXT NOT NULL DEFAULT '',
  tmdb_username TEXT NOT NULL DEFAULT '',
  tmdb_avatar_path TEXT,
  tmdb_v4_access_token_encrypted TEXT,
  tmdb_v4_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tmdb_oauth_states (
  state_hash TEXT PRIMARY KEY,
  session_hash TEXT NOT NULL REFERENCES tmdb_user_sessions(session_hash) ON DELETE CASCADE,
  flow TEXT NOT NULL CHECK (flow IN ('v3', 'v4')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS tmdb_oauth_states_expires_at_idx
  ON tmdb_oauth_states(expires_at);
