import express from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

const mapPreferencesRow = (row) => ({
  activeRole: row?.active_role || null,
  lastActiveTab: row?.last_active_tab || null,
  lastJobsSearch: row?.last_jobs_search || null,
  lastJobsLocation: row?.last_jobs_location || null,
  metadata: row?.metadata || {},
  updatedAt: row?.updated_at || null,
})

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
        CONCAT(c.first_name, ' ', c.last_name) as full_name,
        c.phone,
        c.location,
        t.id as tenant_id,
        t.company_name,
        t.status as tenant_status
      FROM users u
      LEFT JOIN candidate_profiles c ON u.id = c.user_id
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
        CONCAT(c.first_name, ' ', c.last_name) as full_name,
        c.phone,
        c.location,
        c.summary as bio,
        c.portfolio_url as website,
        (SELECT COUNT(*) FROM applications WHERE candidate_id = c.id) as application_count
      FROM users u
      INNER JOIN candidate_profiles c ON u.id = c.user_id
      WHERE u.role = 'candidate'
      ORDER BY u.created_at DESC`
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    res.status(500).json({ error: 'Failed to fetch candidates' })
  }
})

router.patch('/me/locale', authenticate, async (req, res) => {
  const { locale } = req.body || {}
  if (!locale) {
    return res.status(400).json({ error: 'locale is required' })
  }

  try {
    const supported = await query(
      `SELECT locale, label, enabled, admin_only, coming_soon_message
       FROM supported_locales
       WHERE locale = $1`,
      [locale]
    )

    if (!supported.rows.length) {
      return res.status(404).json({ error: 'Locale not found' })
    }

    const localeMeta = supported.rows[0]
    const isAdmin = req.user.role === 'admin' || req.user.is_admin
    if (!localeMeta.enabled && !isAdmin) {
      return res.status(403).json({ error: localeMeta.coming_soon_message || 'Locale is coming soon.' })
    }

    await query('UPDATE users SET preferred_locale = $1 WHERE id = $2', [localeMeta.locale, req.user.userId])
    res.json({ preferredLocale: localeMeta.locale })
  } catch (error) {
    console.error('PATCH /users/me/locale failed', error)
    res.status(500).json({ error: 'Failed to update locale preference' })
  }
})

router.get('/me/preferences', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT active_role, last_active_tab, last_jobs_search, last_jobs_location, metadata, updated_at
       FROM user_session_preferences
       WHERE user_id = $1`,
      [req.user.userId]
    )

    if (!result.rows.length) {
      return res.json(mapPreferencesRow(null))
    }

    res.json(mapPreferencesRow(result.rows[0]))
  } catch (error) {
    console.error('GET /users/me/preferences failed', error)
    res.status(500).json({ error: 'Failed to load preferences' })
  }
})

router.put('/me/preferences', authenticate, async (req, res) => {
  const { activeRole, lastActiveTab, lastJobsSearch, lastJobsLocation, metadata } = req.body || {}
  const providedFields = ['activeRole', 'lastActiveTab', 'lastJobsSearch', 'lastJobsLocation', 'metadata']
    .filter((field) => Object.prototype.hasOwnProperty.call(req.body || {}, field))

  if (!providedFields.length) {
    return res.status(400).json({ error: 'No preference fields supplied' })
  }

  try {
    await query(
      `INSERT INTO user_session_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.userId]
    )

    const updates = []
    const values = []
    let idx = 1

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'activeRole')) {
      updates.push(`active_role = $${idx++}`)
      values.push(activeRole ? JSON.stringify(activeRole) : null)
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'lastActiveTab')) {
      updates.push(`last_active_tab = $${idx++}`)
      values.push(lastActiveTab ?? null)
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'lastJobsSearch')) {
      updates.push(`last_jobs_search = $${idx++}`)
      values.push(lastJobsSearch ?? null)
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'lastJobsLocation')) {
      updates.push(`last_jobs_location = $${idx++}`)
      values.push(lastJobsLocation ?? null)
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'metadata')) {
      updates.push(`metadata = $${idx++}`)
      values.push(metadata ? JSON.stringify(metadata) : null)
    }

    const result = await query(
      `UPDATE user_session_preferences
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_id = $${idx}
       RETURNING active_role, last_active_tab, last_jobs_search, last_jobs_location, metadata, updated_at`,
      [...values, req.user.userId]
    )

    res.json(mapPreferencesRow(result.rows[0]))
  } catch (error) {
    console.error('PUT /users/me/preferences failed', error)
    res.status(500).json({ error: 'Failed to save preferences' })
  }
})

export default router
