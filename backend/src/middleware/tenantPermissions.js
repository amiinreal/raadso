import { query } from '../db.js'

const MANAGER_DEFAULT_PERMISSIONS = new Set(['can_post_job', 'can_update_job', 'can_assign_application', 'can_view_audit_logs'])
const OWNER_ONLY_PERMISSIONS = new Set([])

const parsePermissions = (raw) => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

async function resolveTenantId(req) {
  const directTenantId =
    req.body?.tenantId ||
    req.params?.tenantId ||
    req.query?.tenantId ||
    req.body?.companyId ||
    req.params?.companyId ||
    req.body?.tenant_id
  if (directTenantId) return directTenantId

  const applicationId = req.params?.applicationId || req.body?.applicationId
  if (applicationId) {
    const applicationResult = await query(
      `SELECT j.tenant_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = $1`,
      [applicationId]
    )
    if (applicationResult.rows.length) {
      return applicationResult.rows[0].tenant_id
    }
  }

  const jobId = req.params?.jobId || req.body?.jobId || (req.baseUrl?.includes('/jobs') ? req.params?.id : null)
  if (jobId) {
    const jobResult = await query('SELECT tenant_id FROM jobs WHERE id = $1', [jobId])
    if (jobResult.rows.length) {
      return jobResult.rows[0].tenant_id
    }
  }

  if (req.params?.slug) {
    const tenantResult = await query('SELECT id FROM tenants WHERE slug = $1', [req.params.slug])
    if (tenantResult.rows.length) {
      return tenantResult.rows[0].id
    }
  }

  if (req.baseUrl?.includes('/tenants') && req.params?.id) {
    return req.params.id
  }

  return null
}

/**
 * Middleware to check tenant member permissions for a specific action.
 * Usage: checkTenantPermission('can_update_company_profile')
 */
export function checkTenantPermission(permissionKey) {
  return async (req, res, next) => {
    const userId = req.user.userId
    let tenantId = req.body?.tenantId || req.params?.tenantId || req.body?.companyId || req.params?.companyId

    if (!tenantId) {
      tenantId = await resolveTenantId(req)
    }

    if (!userId || !tenantId) {
      return res.status(403).json({ error: 'Missing user or tenant context' })
    }

    const memberResult = await query(
      'SELECT role, permissions FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = $3',
      [tenantId, userId, 'active']
    )

    if (memberResult.rows.length > 0) {
      const { role, permissions } = memberResult.rows[0]
      const parsedPerms = parsePermissions(permissions)

      if (role === 'owner') return next()

      if (OWNER_ONLY_PERMISSIONS.has(permissionKey)) {
        return res.status(403).json({ error: 'Only tenant owners can perform this action' })
      }

      if (role === 'manager' && MANAGER_DEFAULT_PERMISSIONS.has(permissionKey)) {
        return next()
      }

      if (parsedPerms[permissionKey]) {
        return next()
      }
    } else {
      const ownerCheck = await query('SELECT user_id FROM tenants WHERE id = $1', [tenantId])
      if (ownerCheck.rows.length && ownerCheck.rows[0].user_id === userId) {
        return next()
      }
    }

    return res.status(403).json({ error: 'Insufficient permissions' })
  }
}
