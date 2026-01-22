import express from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// GET /users - Admin only - fetch all users
router.get('/', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' })
  }

  try {
    const result = await query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        c.id as candidate_id,
        c.full_name,
        c.phone,
        c.location,
        t.id as tenant_id,
        t.company_name,
        t.status as tenant_status
      FROM users u
      LEFT JOIN candidates c ON u.id = c.user_id
      LEFT JOIN tenants t ON u.id = t.user_id
      ORDER BY u.created_at DESC`
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// GET /users/employers - Admin only - fetch all employers
router.get('/employers', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' })
  }

  try {
    const result = await query(
      `SELECT 
        u.id as user_id,
        u.email,
        u.created_at as user_created_at,
        t.id as tenant_id,
        t.company_name,
        t.industry,
        t.location,
        t.website,
        t.phone,
        t.company_email,
        t.org_number,
        t.status,
        t.approved,
        t.rejection_reason,
        (SELECT COUNT(*) FROM jobs WHERE tenant_id = t.id) as job_count,
        (SELECT COUNT(*) FROM jobs WHERE tenant_id = t.id AND active = true) as active_job_count
      FROM users u
      INNER JOIN tenants t ON u.id = t.user_id
      WHERE u.role = 'employer'
      ORDER BY u.created_at DESC`
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching employers:', error)
    res.status(500).json({ error: 'Failed to fetch employers' })
  }
})

// GET /users/candidates - Admin only - fetch all candidates
router.get('/candidates', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' })
  }

  try {
    const result = await query(
      `SELECT 
        u.id as user_id,
        u.email,
        u.created_at as user_created_at,
        c.id as candidate_id,
        c.full_name,
        c.phone,
        c.location,
        c.bio,
        c.website,
        (SELECT COUNT(*) FROM applications WHERE candidate_id = c.id) as application_count
      FROM users u
      INNER JOIN candidates c ON u.id = c.user_id
      WHERE u.role = 'candidate'
      ORDER BY u.created_at DESC`
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    res.status(500).json({ error: 'Failed to fetch candidates' })
  }
})

export default router
