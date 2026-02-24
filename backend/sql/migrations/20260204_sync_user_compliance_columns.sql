-- Ensure compliance-related columns exist on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS terms_version_accepted VARCHAR(50);

-- Backfill admin flag and terms version
UPDATE users
SET is_admin = true
WHERE role = 'admin' AND (is_admin IS DISTINCT FROM true);

UPDATE users
SET terms_version_accepted = COALESCE(terms_version_accepted, '1.0.0')
WHERE agreed_to_terms = true;

-- Ensure user_searches table exists (compliance/search history)
CREATE TABLE IF NOT EXISTS user_searches (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_searches_user_created
  ON user_searches(user_id, created_at DESC);

-- Ensure platform_config table exists for dynamic settings
CREATE TABLE IF NOT EXISTS platform_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

INSERT INTO platform_config (key, value) VALUES 
  ('privacy_policy_content', '# RAADI Privacy Policy\n\nWelcome to RAADI...'),
  ('terms_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;

-- Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
