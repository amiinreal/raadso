-- Tracks actions performed by tenant members for owner visibility
CREATE TABLE IF NOT EXISTS tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant_created
    ON tenant_audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_actor
    ON tenant_audit_logs (actor_user_id, created_at DESC);
