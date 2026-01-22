-- Add encrypted session tracking
ALTER TABLE two_fa_sessions 
ADD COLUMN IF NOT EXISTS encrypted_data TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_completed ON two_fa_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_expires ON two_fa_sessions(expires_at);
