import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { query, getClient } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { checkTenantPermission } from '../middleware/tenantPermissions.js'
import { emailService } from '../services/emailService.js'
import {
  validateRequest,
  isValidString,
  isValidInteger,
  isValidPositiveInteger,
  isValidDate,
  EMPLOYMENT_TYPES,
  WORKPLACE_TYPES,
  CURRENCIES
} from '../utils/validation.js'

const router = Router()
const jwtSecret = process.env.JWT_SECRET || 'dev-secret'

const checkJobOwnership = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.userId || req.user.id
    const userRole = req.user.role

    if (userRole !== 'employer') {
      return res.status(403).json({ error: 'Access denied. Employers only.' })
    }

    const result = await query(
      `SELECT j.id 
       FROM jobs j
       JOIN tenants t ON j.tenant_id = t.id
       WHERE j.id = $1 AND t.user_id = $2`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to access this job' })
    }

    next()
  } catch (err) {
    console.error('checkJobOwnership error:', err)
    res.status(500).json({ error: 'Server error checking job ownership' })
  }
}

const getUserFromHeader = (req) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null
  try {
    return jwt.verify(token, jwtSecret)
  } catch (err) {
    return null
  }
}

const getEmployerTenant = async (userId) => {
  if (!userId) return null
  const res = await query('SELECT id, approved FROM tenants WHERE user_id = $1 LIMIT 1', [userId])
  return res.rows[0] || null
}

const baseSelect = `
SELECT
  j.id,
  j.ad_number,
  j.tenant_id,
  j.title,
  j.location,
  j.employment_type,
  j.workplace_type,
  j.seniority_level,
  j.about_role,
  j.about_company,
  j.key_responsibilities,
  j.required_skills,
  j.preferred_skills,
  j.salary_min,
  j.salary_max,
  j.currency,
  j.application_deadline,
  j.hiring_contacts,
  j.category_id,
  j.active,
  j.created_at,
  j.tech_stack,
  j.require_profile,
  j.require_cv,
  j.require_experience,
  j.require_education,
  j.require_languages,
  j.require_nationality,
  j.custom_file_requirements,
  tn.company_name,
  tn.logo_url,
  tn.slug AS company_slug,
  COALESCE(app_counts.count, 0) AS application_count,
  COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'parent_id', c.parent_id)) FILTER (WHERE c.id IS NOT NULL), '[]') AS categories,
  COALESCE(json_agg(DISTINCT t.tag) FILTER (WHERE t.tag IS NOT NULL), '[]') AS tags
FROM jobs j
LEFT JOIN tenants tn ON tn.id = j.tenant_id
LEFT JOIN job_tags t ON t.job_id = j.id
LEFT JOIN job_category_assignments jca ON jca.job_id = j.id
LEFT JOIN job_categories c ON c.id = jca.category_id
LEFT JOIN (
  SELECT job_id, COUNT(*) AS count
  FROM applications
  GROUP BY job_id
) app_counts ON app_counts.job_id = j.id
`

router.get('/', async (req, res) => {
  try {
    const { search, location, tag } = req.query
    const user = getUserFromHeader(req)
    const where = []
    const params = []
    let idx = 1

    if (user?.role === 'employer') {
      const tenant = await getEmployerTenant(user.userId)
      if (!tenant?.id) {
        return res.json([])
      }
      where.push(`j.tenant_id = $${idx}`)
      params.push(tenant.id)
      idx += 1
      // Employers see all their jobs (draft and published)
    } else {
      // Non-employers only see active jobs
      where.push(`j.active = true`)
    }

    if (search) {
      where.push(`(j.title ILIKE $${idx} OR j.about_role ILIKE $${idx} OR j.about_company ILIKE $${idx})`)
      params.push(`%${search}%`)
      idx += 1
    }
    if (location) {
      where.push(`j.location ILIKE $${idx}`)
      params.push(`%${location}%`)
      idx += 1
    }
    if (tag) {
      where.push(`EXISTS (SELECT 1 FROM job_tags jt WHERE jt.job_id = j.id AND jt.tag ILIKE $${idx})`)
      params.push(`%${tag}%`)
      idx += 1
    }

    let sql = baseSelect
    if (where.length) {
      sql += ` WHERE ${where.join(' AND ')}`
    }
    sql += ' GROUP BY j.id, tn.id, app_counts.count ORDER BY j.created_at DESC'

    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('GET /jobs failed', err)
    res.status(500).json({ error: 'Failed to fetch jobs' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = getUserFromHeader(req)
    let params = [id]
    let whereClause = 'j.id = $1'

    // Check if id is 9-digit number (ad_number) or UUID
    if (/^\d{9}$/.test(id)) {
      whereClause = 'j.ad_number = $1'
    }

    let sql = `${baseSelect} WHERE ${whereClause}`

    if (user?.role === 'employer') {
      const tenant = await getEmployerTenant(user.userId)
      if (!tenant?.id) {
        return res.status(404).json({ error: 'Job not found' })
      }
      sql += ' AND j.tenant_id = $2'
      params.push(tenant.id)
    }

    sql += ' GROUP BY j.id, tn.id, app_counts.count'
    const { rows } = await query(sql, params)
    if (!rows.length) {
      return res.status(404).json({ error: 'Job not found' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('GET /jobs/:id failed', err)
    res.status(500).json({ error: 'Failed to fetch job' })
  }
})
// Validation schemas
const jobValidation = validateRequest({
  title: { required: true, type: 'string', min: 3, max: 200 },
  location: { type: 'string', min: 0, max: 200 },
  employmentType: { type: 'enum', values: EMPLOYMENT_TYPES },
  workplaceType: { type: 'enum', values: WORKPLACE_TYPES },
  seniorityLevel: { type: 'string', min: 0, max: 100 },
  aboutRole: { type: 'string', min: 0, max: 5000 },
  aboutCompany: { type: 'string', min: 0, max: 5000 },
  keyResponsibilities: { type: 'array', maxLength: 50 },
  requiredSkills: { type: 'array', maxLength: 50 },
  preferredSkills: { type: 'array', maxLength: 50 },
  salaryMin: { validator: (v) => !v || isValidPositiveInteger(v), message: 'salaryMin must be a positive integer' },
  salaryMax: { validator: (v) => !v || isValidPositiveInteger(v), message: 'salaryMax must be a positive integer' },
  currency: { type: 'enum', values: CURRENCIES },
  applicationDeadline: { type: 'date' },
  hiringContacts: { type: 'array', maxLength: 10 },
  techStack: { type: 'array', maxLength: 50 },
  tags: { type: 'array', maxLength: 20 },
  requireProfile: { validator: (v) => typeof v === 'boolean', message: 'requireProfile must be a boolean' },
  requireCv: { validator: (v) => typeof v === 'boolean', message: 'requireCv must be a boolean' },
  customFileRequirements: { type: 'array', maxLength: 10 }
})

router.post('/', authenticate, checkTenantPermission('can_post_job'), jobValidation, async (req, res) => {
  const {
    tenantId,
    title,
    location,
    employmentType,
    workplaceType,
    seniorityLevel,
    aboutRole,
    aboutCompany,
    keyResponsibilities = [],
    requiredSkills = [],
    preferredSkills = [],
    salaryMin,
    salaryMax,
    currency,
    applicationDeadline,
    hiringContacts = [],
    categoryId,
    categoryIds = [],
    techStack = [],
    tags = [],
    requireProfile = false,
    requireCv = false,
    customFileRequirements = [],
    active = true
  } = req.body

  if (req.user.role !== 'employer') {
    return res.status(403).json({ error: 'Only employers can post jobs' })
  }

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' })
  }

  const tenant = await query('SELECT id, approved, phone, company_email, org_number, status FROM tenants WHERE id = $1 AND user_id = $2 LIMIT 1', [tenantId, req.user.userId])
  const tenantRow = tenant.rows[0]
  if (!tenantRow) {
    return res.status(403).json({ error: 'You can only post jobs for your own tenant' })
  }
  if (!tenantRow.approved || tenantRow.status !== 'approved') {
    return res.status(403).json({ error: 'Tenant not approved by admin yet. Please wait for approval before posting jobs.' })
  }
  if (!tenantRow.phone || !tenantRow.company_email || !tenantRow.org_number) {
    return res.status(400).json({ error: 'Tenant contact details (phone, company_email, org_number) are required before posting jobs.' })
  }

  const client = await getClient()
  try {
    await client.query('BEGIN')
    // Generate unique 9-digit ad_number
    let adNumber = null
    let attempts = 0
    while (!adNumber && attempts < 10) {
      const randomNum = String(Math.floor(Math.random() * 900000000) + 100000000)
      const checkExists = await client.query('SELECT id FROM jobs WHERE ad_number = $1', [randomNum])
      if (checkExists.rows.length === 0) {
        adNumber = randomNum
      }
      attempts++
    }
    if (!adNumber) {
      await client.query('ROLLBACK')
      return res.status(500).json({ error: 'Failed to generate unique ad number' })
    }
    const insertJob = await client.query(
      `INSERT INTO jobs (tenant_id, title, location, employment_type, workplace_type, seniority_level, about_role, about_company, key_responsibilities, required_skills, preferred_skills, salary_min, salary_max, currency, application_deadline, hiring_contacts, category_id, tech_stack, require_profile, require_cv, require_experience, require_education, require_languages, require_nationality, custom_file_requirements, ad_number, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
       RETURNING *`,
      [tenantId, title, location || '', employmentType || '', workplaceType || '', seniorityLevel || '', aboutRole || '', aboutCompany || '', keyResponsibilities, requiredSkills, preferredSkills, salaryMin || null, salaryMax || null, currency || 'USD', applicationDeadline || null, JSON.stringify(hiringContacts), categoryId || null, techStack, requireProfile, requireCv, requireExperience, requireEducation, JSON.stringify(requireLanguages), requireNationality || null, JSON.stringify(customFileRequirements), adNumber, active],
    )

    const jobId = insertJob.rows[0].id

    // Insert category assignments
    const categoriesToInsert = categoryIds.length > 0 ? categoryIds : (categoryId ? [categoryId] : [])
    if (categoriesToInsert.length > 0) {
      for (const catId of categoriesToInsert) {
        await client.query(
          'INSERT INTO job_category_assignments (job_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [jobId, catId]
        )
      }
    }

    const job = insertJob.rows[0]

    if (Array.isArray(tags) && tags.length) {
      const tagValues = tags.map((tagValue, idx) => `($1, $${idx + 2})`).join(',')
      await client.query(`INSERT INTO job_tags (job_id, tag) VALUES ${tagValues}`, [job.id, ...tags])
    }

    const { rows } = await client.query(`${baseSelect} WHERE j.id = $1 GROUP BY j.id, tn.id, app_counts.count`, [job.id])
    await client.query('COMMIT')
    res.status(201).json(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /jobs failed', err)
    res.status(500).json({ error: 'Failed to create job' })
  } finally {
    client.release()
  }
})

// PUT /jobs/:id - Update a job
router.put('/:id', authenticate, checkTenantPermission('can_update_job'), jobValidation, async (req, res) => {
  const { id } = req.params
  const {
    title,
    location,
    employmentType,
    workplaceType,
    seniorityLevel,
    aboutRole,
    aboutCompany,
    keyResponsibilities = [],
    requiredSkills = [],
    preferredSkills = [],
    salaryMin,
    salaryMax,
    currency,
    applicationDeadline,
    hiringContacts = [],
    categoryId,
    categoryIds = [],
    techStack = [],
    requireProfile,
    requireCv,
    requireExperience,
    requireEducation,
    requireLanguages = [],
    requireNationality,
    customFileRequirements = [],
    active
  } = req.body

  if (req.user.role !== 'employer') {
    return res.status(403).json({ error: 'Only employers can update jobs' })
  }

  const client = await getClient()
  try {
    await client.query('BEGIN')

    // Check ownership
    const ownerCheck = await client.query(
      'SELECT j.id FROM jobs j JOIN tenants t ON j.tenant_id = t.id WHERE j.id = $1 AND t.user_id = $2',
      [id, req.user.userId]
    )

    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'You can only update your own jobs' })
    }

    // Convert empty strings to null for UUID fields
    const cleanCategoryId = categoryId === '' ? null : categoryId

    // Update job
    await client.query(
      `UPDATE jobs SET 
        title = COALESCE($2, title),
        location = COALESCE($3, location),
        employment_type = COALESCE($4, employment_type),
        workplace_type = COALESCE($5, workplace_type),
        seniority_level = COALESCE($6, seniority_level),
        about_role = COALESCE($7, about_role),
        about_company = COALESCE($8, about_company),
        key_responsibilities = COALESCE($9, key_responsibilities),
        required_skills = COALESCE($10, required_skills),
        preferred_skills = COALESCE($11, preferred_skills),
        salary_min = COALESCE($12, salary_min),
        salary_max = COALESCE($13, salary_max),
        currency = COALESCE($14, currency),
        application_deadline = COALESCE($15, application_deadline),
        hiring_contacts = COALESCE($16, hiring_contacts),
        category_id = COALESCE($17, category_id),
        tech_stack = COALESCE($18, tech_stack),
        require_profile = COALESCE($19, require_profile),
        require_cv = COALESCE($20, require_cv),
        require_experience = COALESCE($21, require_experience),
        require_education = COALESCE($22, require_education),
        require_languages = COALESCE($23, require_languages),
        require_nationality = COALESCE($24, require_nationality),
        custom_file_requirements = COALESCE($25, custom_file_requirements),
        active = COALESCE($26, active)
      WHERE id = $1`,
      [id, title, location, employmentType, workplaceType, seniorityLevel, aboutRole, aboutCompany,
        keyResponsibilities, requiredSkills, preferredSkills, salaryMin, salaryMax, currency,
        applicationDeadline, JSON.stringify(hiringContacts), cleanCategoryId, techStack, requireProfile,
        requireCv, requireExperience, requireEducation, JSON.stringify(requireLanguages), requireNationality || null, JSON.stringify(customFileRequirements), active]
    )

    // Update category assignments
    if (categoryIds && categoryIds.length > 0) {
      await client.query('DELETE FROM job_category_assignments WHERE job_id = $1', [id])
      for (const catId of categoryIds) {
        await client.query(
          'INSERT INTO job_category_assignments (job_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, catId]
        )
      }
    }

    const { rows } = await client.query(`${baseSelect} WHERE j.id = $1 GROUP BY j.id, tn.id, app_counts.count`, [id])
    await client.query('COMMIT')
    res.json(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('PUT /jobs/:id failed', err)
    res.status(500).json({ error: 'Failed to update job' })
  } finally {
    client.release()
  }
})

// PATCH /jobs/:id/publish - Toggle job publish status
router.patch('/:id/publish', authenticate, async (req, res) => {
  const { id } = req.params
  const { active } = req.body

  if (req.user.role !== 'employer') {
    return res.status(403).json({ error: 'Only employers can publish/unpublish jobs' })
  }

  try {
    // Check ownership
    const ownerCheck = await query(
      'SELECT j.id FROM jobs j JOIN tenants t ON j.tenant_id = t.id WHERE j.id = $1 AND t.user_id = $2',
      [id, req.user.userId]
    )

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only publish/unpublish your own jobs' })
    }

    // Toggle or set active status
    const result = await query(
      'UPDATE jobs SET active = COALESCE($2, NOT active) WHERE id = $1 RETURNING *',
      [id, active]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('PATCH /jobs/:id/publish failed', err)
    res.status(500).json({ error: 'Failed to update job status' })
  }
})

// GET /jobs/:id/applications - Get all applications for a specific job
router.get('/:id/applications', authenticate, async (req, res) => {
  const { id } = req.params

  if (req.user.role !== 'employer') {
    return res.status(403).json({ error: 'Only employers can view job applications' })
  }

  try {
    // Check ownership
    const ownerCheck = await query(
      'SELECT j.id FROM jobs j JOIN tenants t ON j.tenant_id = t.id WHERE j.id = $1 AND t.user_id = $2',
      [id, req.user.userId]
    )

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found or you do not have permission to view its applications' })
    }

    // Fetch all applications for this job with COMPLETE candidate profiles
    const { rows } = await query(`
      SELECT
        a.id,
        a.job_id,
        a.candidate_id,
        a.cover_letter,
        a.used_profile,
        a.used_cv,
        a.custom_files,
        a.notes,
        a.status,
        a.ai_match_score,
        a.ai_analysis,
        a.ai_reviewed_at,
        a.applied_at,
        a.updated_at,
        CONCAT(cp.first_name, ' ', cp.last_name) AS candidate_name,
        u.email AS candidate_email,
        cp.first_name,
        cp.last_name,
        cp.headline AS candidate_title,
        cp.summary AS bio,
        cp.location AS candidate_location,
        cp.phone,
        cp.nationality,
        cp.seniority_level,
        cp.years_of_experience,
        cp.employment_status,
        cp.open_to_work,
        cp.cv_file_url,
        cp.portfolio_url,
        cp.linkedin_url,
        cp.github_url,
        cp.email AS candidate_profile_email,
        (SELECT json_agg(json_build_object(
          'id', we.id,
          'job_title', we.job_title,
          'company_name', we.company_name,
          'employment_type', we.employment_type,
          'start_date', we.start_date,
          'end_date', we.end_date,
          'description', we.description
        ) ORDER BY we.start_date DESC) FROM work_experiences we WHERE we.candidate_id = a.candidate_id) AS work_experiences,
        (SELECT json_agg(json_build_object(
          'id', ed.id,
          'degree', ed.degree,
          'field_of_study', ed.field_of_study,
          'institution', ed.institution,
          'start_year', ed.start_year,
          'end_year', ed.end_year
        ) ORDER BY ed.start_year DESC) FROM educations ed WHERE ed.candidate_id = a.candidate_id) AS educations,
        (SELECT json_agg(json_build_object(
          'id', sk.id,
          'skill_name', sk.skill_name,
          'skill_type', sk.skill_type,
          'proficiency', sk.proficiency
        )) FROM skills sk WHERE sk.candidate_id = a.candidate_id) AS skills,
        (SELECT json_agg(json_build_object(
          'id', lg.id,
          'language', lg.language,
          'proficiency', lg.proficiency
        )) FROM languages lg WHERE lg.candidate_id = a.candidate_id) AS languages,
        (SELECT json_agg(json_build_object(
          'id', att.id,
          'type', att.type,
          'file_url', att.file_url
        )) FROM attachments att WHERE att.candidate_id = a.candidate_id) AS attachments
      FROM applications a
      LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE a.job_id = $1
      ORDER BY a.applied_at DESC
    `, [id])

    res.json(rows)
  } catch (err) {
    console.error('GET /jobs/:id/applications failed', err)
    res.status(500).json({ error: 'Failed to fetch job applications' })
  }
})


// Send bulk emails to applicants
router.post('/:id/bulk-email', authenticate, checkJobOwnership, async (req, res) => {
  const { id } = req.params // job id
  const { applicationIds, subject, message } = req.body

  if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
    return res.status(400).json({ error: 'No applicants selected' })
  }
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' })
  }

  try {
    // Fetch candidate details for the selected applications
    // We join with candidate_profiles to get names/emails
    const result = await query(
      `SELECT a.id, cp.first_name, cp.last_name, cp.email
       FROM applications a
       JOIN candidate_profiles cp ON a.candidate_id = cp.id
       WHERE a.job_id = $1 AND a.id = ANY($2::uuid[])`,
      [id, applicationIds]
    )

    const candidates = result.rows

    // Fetch company name for the email signature
    const tenantResult = await query(
      `SELECT company_name FROM tenants WHERE id = (SELECT tenant_id FROM jobs WHERE id = $1)`,
      [id]
    )
    const employerName = tenantResult.rows[0]?.company_name || 'Employer'

    // Process each email
    const results = await Promise.all(candidates.map(async (candidate) => {
      // Replace template variables
      let personalizedMessage = message
        .replace(/{first_name}/g, candidate.first_name || 'Candidate')
        .replace(/{last_name}/g, candidate.last_name || '')
        .replace(/{full_name}/g, `${candidate.first_name} ${candidate.last_name}`.trim())
        .replace(/{email}/g, candidate.email)

      // Send email
      const sendResult = await emailService.sendCandidateMessage(
        candidate.email,
        candidate.first_name,
        subject,
        personalizedMessage,
        employerName
      )

      // Insert into messages table (as new message thread with subject, no parent)
      if (sendResult.success) {
        try {
          await query(
            `INSERT INTO messages (application_id, sender_id, content, subject, parent_message_id) VALUES ($1, $2, $3, $4, NULL)`,
            [candidate.id, req.user.userId, personalizedMessage, subject]
          )
        } catch (dbErr) {
          console.error('Failed to save message to DB for application ' + candidate.id, dbErr)
          // Don't fail the whole operation if DB save fails, but log it
        }
      }

      return {
        id: candidate.id,
        email: candidate.email,
        success: sendResult.success,
        error: sendResult.error
      }
    }))

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    res.json({
      success: true,
      message: `Sent ${successCount} emails, failed ${failCount}`,
      details: results
    })

  } catch (err) {
    console.error('Bulk email error:', err)
    res.status(500).json({ error: 'Failed to send bulk emails' })
  }
})

export default router
