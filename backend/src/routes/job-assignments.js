import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// POST /job-assignments - Assign job to members (manager/owner only)
router.post('/', authenticate, async (req, res) => {
  const { jobId, userIds } = req.body
  if (!jobId || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'jobId and userIds[] required' })
  }
  // Check if requester is manager/owner for the job's tenant
  const roleCheck = await query(
    `SELECT tm.role FROM jobs j
     JOIN tenants t ON t.id = j.tenant_id
     JOIN tenant_members tm ON tm.tenant_id = t.id AND tm.user_id = $1 AND tm.status = 'active'
     WHERE j.id = $2`,
    [req.user.userId, jobId]
  )
  if (!roleCheck.rows.length || !['owner', 'manager'].includes(roleCheck.rows[0].role)) {
    return res.status(403).json({ error: 'Only managers or owners can assign jobs' })
  }
  // Insert assignments
  const values = userIds.map(uid => `('${jobId}', '${uid}', '${req.user.userId}')`).join(',')
  await query(
    `INSERT INTO job_assignments (job_id, user_id, assigned_by)
     VALUES ${values}
     ON CONFLICT DO NOTHING`
  )
  res.json({ success: true })
})

// GET /job-assignments/:jobId - Get assigned members for a job
router.get('/:jobId', authenticate, async (req, res) => {
  const { jobId } = req.params
  const result = await query(
    `SELECT ja.user_id, u.email, u.first_name, u.last_name
     FROM job_assignments ja
     JOIN users u ON u.id = ja.user_id
     WHERE ja.job_id = $1`,
    [jobId]
  )
  res.json(result.rows)
})

export default router
