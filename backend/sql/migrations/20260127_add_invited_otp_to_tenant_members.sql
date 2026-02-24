-- Migration to ensure invited_otp and invited_otp_expires columns exist in tenant_members
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS invited_otp TEXT;
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS invited_otp_expires TIMESTAMP;
