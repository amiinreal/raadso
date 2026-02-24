import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { checkTenantPermission } from '../middleware/tenantPermissions.js'
import { ensureApplicationActionAccess } from '../utils/applicationAccess.js'
import { recordTenantAudit } from '../services/auditService.js'

const router = Router()

// POST /application-assignments - Assign application to members (permission-gated)
router.post('/', authenticate, checkTenantPermission('can_assign_application'), async (req, res) => {
  const { applicationId, userIds } = req.body
  if (!applicationId || !Array.isArray(userIds)) {
    return res.status(400).json({ error: 'applicationId and userIds[] are required' })
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]

  try {
    const accessContext = await ensureApplicationActionAccess(req.user.userId, applicationId, { requireAssignmentForMembers: false })

    if (accessContext.tenantRole === 'member') {
      return res.status(403).json({ error: 'Only owners or managers can assign applications' })
    }

    if (uniqueUserIds.length) {
      const memberCheck = await query(
        `SELECT user_id FROM tenant_members WHERE tenant_id = $1 AND status = 'active' AND user_id = ANY($2::uuid[])`,
        [accessContext.tenantId, uniqueUserIds]
      )

      const validIds = memberCheck.rows.map(row => row.user_id)
      const invalidIds = uniqueUserIds.filter(id => !validIds.includes(id))
      if (invalidIds.length) {
        return res.status(400).json({ error: 'Some users are not active members of this tenant', invalidUserIds: invalidIds })
      }
    }

    const existingAssignments = await query(
      'SELECT user_id FROM application_assignments WHERE application_id = $1',
      [applicationId]
    )

    const existingIds = existingAssignments.rows.map(row => row.user_id)
    const toAdd = uniqueUserIds.filter(id => !existingIds.includes(id))
    const toRemove = existingIds.filter(id => !uniqueUserIds.includes(id))

    if (toRemove.length) {
      await query(
        'DELETE FROM application_assignments WHERE application_id = $1 AND user_id = ANY($2::uuid[])',
        [applicationId, toRemove]
      )
    }

    for (const userId of toAdd) {
      await query(
        `INSERT INTO application_assignments (application_id, user_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [applicationId, userId, req.user.userId]
      )
    }

    const assignedMembers = await query(
      `SELECT aa.user_id, u.email, u.first_name, u.last_name, tm.role
       FROM application_assignments aa
       JOIN tenant_members tm ON tm.user_id = aa.user_id AND tm.tenant_id = $2
       JOIN users u ON u.id = tm.user_id
       WHERE aa.application_id = $1
       ORDER BY tm.role, u.first_name`,
      [applicationId, accessContext.tenantId]
    )

    await recordTenantAudit({
      tenantId: accessContext.tenantId,
      actorUserId: req.user.userId,
      actorRole: accessContext.tenantRole,
      action: 'application_assignments_updated',
      targetType: 'application',
      targetId: applicationId,
      metadata: {
        jobId: accessContext.jobId,
        jobTitle: accessContext.jobTitle,
        jobAdNumber: accessContext.jobAdNumber,
        applicationName: accessContext.candidateName,
        candidateId: accessContext.candidateId,
        candidateEmail: accessContext.candidateEmail,
        added: toAdd,
        removed: toRemove
      }
    })

    res.json({ success: true, assigned: assignedMembers.rows })
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('Failed to update application assignments', err)
    res.status(500).json({ error: 'Failed to update application assignments' })
  }
})

// GET /application-assignments/:applicationId - Get assigned members for an application
router.get('/:applicationId', authenticate, async (req, res) => {
  const { applicationId } = req.params
  try {
    const accessContext = await ensureApplicationActionAccess(req.user.userId, applicationId, { requireAssignmentForMembers: false })

    if (accessContext.tenantRole === 'member') {
      const assignment = await query(
        `SELECT 1 FROM application_assignments WHERE application_id = $1 AND user_id = $2 LIMIT 1`,
        [applicationId, req.user.userId]
      )
      if (!assignment.rows.length) {
        return res.status(403).json({ error: 'You are not assigned to this application' })
      }
    }

    const result = await query(
      `SELECT aa.user_id, u.email, u.first_name, u.last_name, tm.role
       FROM application_assignments aa
       JOIN tenant_members tm ON tm.user_id = aa.user_id AND tm.tenant_id = $2
       JOIN users u ON u.id = tm.user_id
       WHERE aa.application_id = $1
       ORDER BY tm.role, u.first_name`,
      [applicationId, accessContext.tenantId]
    )

    res.json(result.rows)
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('Failed to fetch application assignments', err)
    res.status(500).json({ error: 'Failed to fetch application assignments' })
  }
})

export default router
