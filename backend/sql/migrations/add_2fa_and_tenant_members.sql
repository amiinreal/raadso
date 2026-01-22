-- Add 2FA fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_verified_at TIMESTAMP;

-- Create table for 2FA OTP codes (temporary storage, expire after 10 minutes)
CREATE TABLE IF NOT EXISTS two_fa_codes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMP NULL,
  UNIQUE(user_id, code)
);

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_two_fa_codes_user_id ON two_fa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_two_fa_codes_expires_at ON two_fa_codes(expires_at);

-- Create tenant_members table to track user access to tenants
CREATE TABLE IF NOT EXISTS tenant_members (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'manager', 'member'
  permissions JSONB DEFAULT '{}', -- granular permissions per member
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'invited', 'declined'
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP NULL,
  declined_at TIMESTAMP NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_status ON tenant_members(status);

-- Create table to track 2FA verification sessions (optional, for enhanced security)
CREATE TABLE IF NOT EXISTS two_fa_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  temp_token VARCHAR(255) UNIQUE NOT NULL,
  verified_code_id INTEGER REFERENCES two_fa_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '15 minutes'),
  completed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_user_id ON two_fa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_temp_token ON two_fa_sessions(temp_token);
