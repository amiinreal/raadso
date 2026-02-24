-- Add metadata to trusted device records
ALTER TABLE two_fa_sessions
  ADD COLUMN IF NOT EXISTS device_label TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS trusted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();

-- Backfill any nulls with sane defaults
UPDATE two_fa_sessions
SET device_label = COALESCE(device_label, 'Unknown'),
    trusted_at = COALESCE(trusted_at, NOW())
WHERE device_label IS NULL OR trusted_at IS NULL;

-- Ensure fingerprint constraint remains (idempotent)
DO $$
BEGIN
  ALTER TABLE two_fa_sessions
    ADD CONSTRAINT unique_user_device_fingerprint UNIQUE (user_id, device_fingerprint);
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'unique_user_device_fingerprint already exists, skipping';
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_expires ON two_fa_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_user_device ON two_fa_sessions(user_id, device_fingerprint);
