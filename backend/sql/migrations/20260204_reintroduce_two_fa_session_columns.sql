-- Ensure two_fa_sessions has all columns required by application logic
ALTER TABLE two_fa_sessions
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS device_label TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS trusted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS token_jti TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Enforce expected uniqueness for device trust entries
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_user_device_fingerprint'
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    EXECUTE 'ALTER TABLE two_fa_sessions ADD CONSTRAINT unique_user_device_fingerprint UNIQUE (user_id, device_fingerprint)';
  ELSE
    RAISE NOTICE 'unique_user_device_fingerprint already exists, skipping';
  END IF;
END $$;

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_user_device ON two_fa_sessions(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_expires ON two_fa_sessions(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS two_fa_sessions_token_jti_idx
  ON two_fa_sessions(token_jti)
  WHERE token_jti IS NOT NULL;
