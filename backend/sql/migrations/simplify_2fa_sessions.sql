-- Simplify two_fa_sessions table for 30-day device trust
-- Drop unused columns and add device_fingerprint column

-- First, drop old columns if they exist
ALTER TABLE two_fa_sessions 
  DROP COLUMN IF EXISTS encrypted_data,
  DROP COLUMN IF EXISTS device,
  DROP COLUMN IF EXISTS last_activity,
  DROP COLUMN IF EXISTS completed_at;

-- Add device_fingerprint column if it doesn't exist
ALTER TABLE two_fa_sessions 
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT NOT NULL DEFAULT '';

-- Update existing rows to have a fingerprint (if any exist)
UPDATE two_fa_sessions SET device_fingerprint = MD5(CAST(created_at AS TEXT)) WHERE device_fingerprint = '';

-- Create unique constraint on user_id and device_fingerprint for upserts
ALTER TABLE two_fa_sessions 
  DROP CONSTRAINT IF EXISTS unique_user_device_fingerprint,
  ADD CONSTRAINT unique_user_device_fingerprint UNIQUE(user_id, device_fingerprint);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_user_device ON two_fa_sessions(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_expires ON two_fa_sessions(expires_at);
