-- Add token-level tracking to trusted device sessions
ALTER TABLE two_fa_sessions
  ADD COLUMN IF NOT EXISTS token_jti TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Ensure we can quickly look up active sessions by token id
CREATE UNIQUE INDEX IF NOT EXISTS two_fa_sessions_token_jti_idx
  ON two_fa_sessions(token_jti)
  WHERE token_jti IS NOT NULL;

CREATE INDEX IF NOT EXISTS two_fa_sessions_expires_at_idx
  ON two_fa_sessions(expires_at);
