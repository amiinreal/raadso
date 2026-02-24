-- Create platform_config table for dynamic settings
CREATE TABLE IF NOT EXISTS platform_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Initialize privacy policy and terms version
INSERT INTO platform_config (key, value) VALUES 
('privacy_policy_content', '# RAADI Privacy Policy\n\nWelcome to RAADI...'),
('terms_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;

-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(100), -- e.g., 'tenant', 'user', 'config'
    target_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster audit log lookups
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
