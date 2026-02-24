import { query } from '../db.js'

export async function fetchApplicationTenantContext(applicationId) {
  const result = await query(
    `SELECT a.id, a.job_id, a.candidate_id, j.tenant_id, j.title AS job_title, j.ad_number AS job_ad_number,
            COALESCE(NULLIF(TRIM(CONCAT(cp.first_name, ' ', cp.last_name)), ''), u.email, a.id::text) AS candidate_name,
            COALESCE(NULLIF(cp.email, ''), u.email) AS candidate_email
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
     LEFT JOIN users u ON u.id = a.candidate_id
     WHERE a.id = $1`,
    [applicationId]
  )

  if (!result.rows.length) {
    const err = new Error('Application not found')
    err.status = 404
    throw err
  }

  return result.rows[0]
}

export async function fetchTenantRoleForUser(tenantId, userId) {
  if (!tenantId || !userId) return null

  const membership = await query(
    `SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
    [tenantId, userId]
  )

  if (membership.rows.length) {
    return membership.rows[0].role
  }

  const ownerCheck = await query('SELECT user_id FROM tenants WHERE id = $1', [tenantId])
  if (ownerCheck.rows.length && ownerCheck.rows[0].user_id === userId) {
    return 'owner'
  }

  return null
}

export async function ensureApplicationActionAccess(userId, applicationId, { requireAssignmentForMembers = true } = {}) {
  if (!userId) {
    const err = new Error('Authentication required')
    err.status = 401
    throw err
  }

  const context = await fetchApplicationTenantContext(applicationId)
  const tenantRole = await fetchTenantRoleForUser(context.tenant_id, userId)

  if (!tenantRole) {
    const err = new Error('Not authorized to access this application')
    err.status = 403
    throw err
  }

  if (tenantRole === 'member' && requireAssignmentForMembers) {
    const assignment = await query(
      `SELECT 1 FROM application_assignments WHERE application_id = $1 AND user_id = $2 LIMIT 1`,
      [applicationId, userId]
    )

    if (!assignment.rows.length) {
      const err = new Error('You are not assigned to this application')
      err.status = 403
      throw err
    }
  }

  return {
    tenantId: context.tenant_id,
    tenantRole,
    jobId: context.job_id,
    jobTitle: context.job_title,
    jobAdNumber: context.job_ad_number,
    candidateId: context.candidate_id,
    candidateName: context.candidate_name,
    candidateEmail: context.candidate_email
  }
}
