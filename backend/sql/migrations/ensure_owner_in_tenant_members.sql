-- Migration: Ensure all tenant creators are in tenant_members as 'owner'
INSERT INTO tenant_members (tenant_id, user_id, role, status, accepted_at)
SELECT t.id, t.user_id, 'owner', 'active', NOW()
FROM tenants t
LEFT JOIN tenant_members tm ON tm.tenant_id = t.id AND tm.user_id = t.user_id
WHERE tm.id IS NULL;

-- If owner is already present but not 'owner' or not 'active', update them
UPDATE tenant_members tm
SET role = 'owner', status = 'active', accepted_at = NOW()
FROM tenants t
WHERE tm.tenant_id = t.id AND tm.user_id = t.user_id AND (tm.role IS DISTINCT FROM 'owner' OR tm.status IS DISTINCT FROM 'active');
