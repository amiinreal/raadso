import { query } from '../db.js'

export async function recordTenantAudit({
  tenantId,
  actorUserId,
  actorRole = 'member',
  action,
  targetType,
  targetId = null,
  metadata = {}
}) {
  if (!tenantId || !actorUserId || !action || !targetType) {
    return
  }

  let payload = metadata
  if (payload && typeof payload !== 'string') {
    payload = JSON.stringify(payload)
  } else if (!payload) {
    payload = null
  }

  await query(
    `INSERT INTO tenant_audit_logs (tenant_id, actor_user_id, actor_role, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::jsonb, '{}'::jsonb))`,
    [tenantId, actorUserId, actorRole, action, targetType, targetId, payload]
  )
}
