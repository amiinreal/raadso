import { query } from '../db.js'

/**
 * Middleware to check tenant member permissions for a specific action.
 * Usage: checkTenantPermission('can_edit_company')
 */
export function checkTenantPermission(permissionKey) {
  return async (req, res, next) => {
    const userId = req.user.userId
    const tenantId = req.body.tenantId || req.params.tenantId || req.body.companyId || req.params.companyId
    if (!userId || !tenantId) {
      return res.status(403).json({ error: 'Missing user or tenant context' })
    }
    // Get member permissions
    const result = await query(
      'SELECT role, permissions FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = $3',
      [tenantId, userId, 'active']
    )
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this tenant' })
    }
    const { role, permissions } = result.rows[0]
    // Owner always allowed
    if (role === 'owner') return next()
    // Check permission
    if (permissions && permissions[permissionKey]) return next()
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
}
