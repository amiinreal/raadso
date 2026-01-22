import { Router } from 'express'
import { query } from '../db.js'
import { validateRequest, isValidString, isValidPositiveInteger, isValidUUID } from '../utils/validation.js'
import { authenticate } from '../middleware/auth.js'
import { checkTenantPermission } from '../middleware/tenantPermissions.js'
import { analyzeApplicationMatch } from '../services/geminiAI.js'

const router = Router()

const applicationValidation = validateRequest({
  jobId: { required: true, validator: isValidUUID, message: 'jobId must be a valid UUID' },
  candidateId: { required: true, validator: isValidPositiveInteger, message: 'candidateId must be a valid integer' },
  coverLetter: { type: 'string', min: 0, max: 5000 },
  usedProfile: { validator: (v) => typeof v === 'boolean', message: 'usedProfile must be a boolean' },
  usedCv: { validator: (v) => typeof v === 'boolean', message: 'usedCv must be a boolean' },
  customFiles: { type: 'array' }
})

router.get('/', async (req, res) => {
  try {
    const { candidateId, jobId } = req.query
    const where = []
    const params = []
    let idx = 1

    if (candidateId) {
      where.push(`a.candidate_id = $${idx}`)
      params.push(candidateId)
      idx += 1
    }
    if (jobId) {
      where.push(`a.job_id = $${idx}`)
      params.push(jobId)
    }

    let sql = `
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
        j.title AS job_title,
        j.location AS job_location,
        t.company_name,
        t.industry,
        t.industry_id,
        t.logo_url,
        t.slug AS company_slug,
        i.name AS industry_name,
        i.slug AS industry_slug,
        i.category AS industry_category,
        CONCAT(cp.first_name, ' ', cp.last_name) AS candidate_name,
        u.email AS candidate_email,
        cp.id AS candidate_profile_id,
        cp.first_name,
        cp.last_name,
        cp.headline AS candidate_title,
        cp.summary AS bio,
        cp.location AS candidate_location,
        cp.phone,
        cp.nationality,
        cp.email AS candidate_profile_email,
        cp.seniority_level,
        cp.years_of_experience,
        cp.employment_status,
        cp.open_to_work,
        cp.portfolio_url,
        cp.linkedin_url,
        cp.github_url,
        cp.cv_file_url,
        (SELECT json_agg(json_build_object(
          'id', we.id,
          'job_title', we.job_title,
          'company_name', we.company_name,
          'employment_type', we.employment_type,
          'start_date', we.start_date,
          'end_date', we.end_date,
          'description', we.description
        )) FROM work_experiences we WHERE we.candidate_id = a.candidate_id) AS work_experiences,
        (SELECT json_agg(json_build_object(
          'id', ed.id,
          'degree', ed.degree,
          'field_of_study', ed.field_of_study,
          'institution', ed.institution,
          'start_year', ed.start_year,
          'end_year', ed.end_year
        )) FROM educations ed WHERE ed.candidate_id = a.candidate_id) AS educations,
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
        )) FROM languages lg WHERE lg.candidate_id = a.candidate_id) AS languages
      FROM applications a
      LEFT JOIN jobs j ON j.id = a.job_id
      LEFT JOIN tenants t ON t.id = j.tenant_id
      LEFT JOIN industries i ON i.id = t.industry_id
      LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
      LEFT JOIN users u ON u.id = a.candidate_id
    `

    if (where.length) {
      sql += ` WHERE ${where.join(' AND ')}`
    }

    sql += ` ORDER BY a.applied_at DESC`

    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('GET /applications failed', err)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

router.post('/', applicationValidation, async (req, res) => {
  const { jobId, candidateId, coverLetter = '', usedProfile = false, usedCv = false, customFiles = [] } = req.body

  try {
    // Check if candidate already applied to this job
    const existing = await query(
      'SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2 LIMIT 1',
      [jobId, candidateId]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already applied to this job' })
    }

    const insert = await query(
      `INSERT INTO applications (job_id, candidate_id, cover_letter, used_profile, used_cv, custom_files)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [jobId, candidateId, coverLetter, usedProfile, usedCv, JSON.stringify(customFiles)],
    )

    res.status(201).json(insert.rows[0])
  } catch (err) {
    console.error('POST /applications failed', err)
    res.status(500).json({ error: 'Failed to submit application' })
  }
})

// Update application status
router.put('/:applicationId', authenticate, checkTenantPermission('can_review_applications'), async (req, res) => {
  const { applicationId } = req.params
  const { status } = req.body

  // Allow broader set of statuses used by the UI
  const allowed = ['applied', 'reviewing', 'shortlisted', 'rejected', 'hired', 'accepted']
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const result = await query(
      `UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, applicationId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /applications/:id failed', err)
    res.status(500).json({ error: 'Failed to update application' })
  }
})

// AI Review endpoint - Analyze a single application
router.post('/:applicationId/ai-review', authenticate, async (req, res) => {
  const { applicationId } = req.params

  try {
    // Get application with full candidate and job data
    const appResult = await query(`
      SELECT
        a.id,
        a.job_id,
        a.candidate_id,
        a.cover_letter,
        a.custom_files,
        a.used_profile,
        a.used_cv,
        a.ai_match_score,
        a.ai_reviewed_at,
        j.*,
        cp.first_name,
        cp.last_name,
        cp.headline,
        cp.summary,
        cp.seniority_level,
        cp.years_of_experience,
        cp.employment_status,
        cp.profile_cv_url,
        (SELECT json_agg(json_build_object(
          'job_title', we.job_title,
          'company_name', we.company_name,
          'employment_type', we.employment_type,
          'start_date', we.start_date,
          'end_date', we.end_date,
          'description', we.description
        )) FROM work_experiences we WHERE we.candidate_id = a.candidate_id) AS work_experiences,
        (SELECT json_agg(json_build_object(
          'degree', ed.degree,
          'field_of_study', ed.field_of_study,
          'institution', ed.institution,
          'start_year', ed.start_year,
          'end_year', ed.end_year
        )) FROM educations ed WHERE ed.candidate_id = a.candidate_id) AS educations,
        (SELECT json_agg(json_build_object(
          'skill_name', sk.skill_name,
          'proficiency', sk.proficiency
        )) FROM skills sk WHERE sk.candidate_id = a.candidate_id) AS skills,
        (SELECT json_agg(json_build_object(
          'language', lg.language,
          'proficiency', lg.proficiency
        )) FROM languages lg WHERE lg.candidate_id = a.candidate_id) AS languages
      FROM applications a
      LEFT JOIN jobs j ON j.id = a.job_id
      LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
      WHERE a.id = $1
    `, [applicationId])

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    const application = appResult.rows[0]

    // Prepare job and candidate data
    const job = {
      title: application.title,
      industry: application.industry,
      location: application.location,
      employment_type: application.employment_type,
      seniority_level: application.seniority_level,
      description: application.description,
      requirements: application.requirements,
      salary_min: application.salary_min,
      salary_max: application.salary_max
    }

    const candidate = {
      profile: {
        first_name: application.first_name,
        last_name: application.last_name,
        headline: application.headline,
        summary: application.summary,
        seniority_level: application.seniority_level,
        years_of_experience: application.years_of_experience,
        employment_status: application.employment_status,
        profile_cv_url: application.profile_cv_url
      },
      workExperiences: application.work_experiences || [],
      educations: application.educations || [],
      skills: application.skills || [],
      languages: application.languages || []
    }

    // Call Gemini AI
    const { type } = req.body
    const analysis = await analyzeApplicationMatch(job, candidate, application.cover_letter, application.custom_files, type)

    // Update application with AI results
    await query(`
      UPDATE applications 
      SET ai_match_score = $1, 
          ai_analysis = $2, 
          ai_reviewed_at = NOW()
      WHERE id = $3
    `, [analysis.matchScore, analysis.analysis, applicationId])

    res.json({
      applicationId,
      matchScore: analysis.matchScore,
      analysis: analysis.analysis,
      reviewedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('AI review failed:', err)
    res.status(500).json({ error: err.message || 'Failed to analyze application' })
  }
})

// Batch AI Review - Analyze all applications for a job
router.post('/job/:jobId/ai-review-all', authenticate, async (req, res) => {
  const { jobId } = req.params

  try {
    // Get all applications for this job
    const appsResult = await query(`
      SELECT
        a.id,
        a.job_id,
        a.candidate_id,
        a.cover_letter,
        a.custom_files,
        a.used_profile,
        a.used_cv,
        a.ai_reviewed_at,
        j.*,
        cp.first_name,
        cp.last_name,
        cp.headline,
        cp.summary,
        cp.seniority_level,
        cp.years_of_experience,
        cp.employment_status,
        cp.profile_cv_url,
        (SELECT json_agg(json_build_object(
          'job_title', we.job_title,
          'company_name', we.company_name,
          'employment_type', we.employment_type,
          'start_date', we.start_date,
          'end_date', we.end_date,
          'description', we.description
        )) FROM work_experiences we WHERE we.candidate_id = a.candidate_id) AS work_experiences,
        (SELECT json_agg(json_build_object(
          'degree', ed.degree,
          'field_of_study', ed.field_of_study,
          'institution', ed.institution,
          'start_year', ed.start_year,
          'end_year', ed.end_year
        )) FROM educations ed WHERE ed.candidate_id = a.candidate_id) AS educations,
        (SELECT json_agg(json_build_object(
          'skill_name', sk.skill_name,
          'proficiency', sk.proficiency
        )) FROM skills sk WHERE sk.candidate_id = a.candidate_id) AS skills,
        (SELECT json_agg(json_build_object(
          'language', lg.language,
          'proficiency', lg.proficiency
        )) FROM languages lg WHERE lg.candidate_id = a.candidate_id) AS languages
      FROM applications a
      LEFT JOIN jobs j ON j.id = a.job_id
      LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
      WHERE a.job_id = $1
    `, [jobId])

    if (appsResult.rows.length === 0) {
      return res.json({ message: 'No applications to review', reviewed: 0 })
    }

    const results = []

    for (const app of appsResult.rows) {
      try {
        const job = {
          title: app.title,
          industry: app.industry,
          location: app.location,
          employment_type: app.employment_type,
          seniority_level: app.seniority_level,
          description: app.description,
          requirements: app.requirements,
          salary_min: app.salary_min,
          salary_max: app.salary_max
        }

        const candidate = {
          profile: {
            first_name: app.first_name,
            last_name: app.last_name,
            headline: app.headline,
            summary: app.summary,
            seniority_level: app.seniority_level,
            years_of_experience: app.years_of_experience,
            employment_status: app.employment_status,
            profile_cv_url: app.profile_cv_url
          },
          workExperiences: app.work_experiences || [],
          educations: app.educations || [],
          skills: app.skills || [],
          languages: app.languages || []
        }

        const analysis = await analyzeApplicationMatch(job, candidate, app.cover_letter, app.custom_files, 'general')

        await query(`
          UPDATE applications 
          SET ai_match_score = $1, 
              ai_analysis = $2, 
              ai_reviewed_at = NOW()
          WHERE id = $3
        `, [analysis.matchScore, analysis.analysis, app.id])

        results.push({
          applicationId: app.id,
          candidateName: `${app.first_name} ${app.last_name}`,
          matchScore: analysis.matchScore,
          success: true
        })

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (err) {
        console.error(`Failed to review application ${app.id}:`, err)
        results.push({
          applicationId: app.id,
          candidateName: `${app.first_name} ${app.last_name}`,
          success: false,
          error: err.message
        })
      }
    }

    res.json({
      message: 'Batch review completed',
      total: appsResult.rows.length,
      reviewed: results.filter(r => r.success).length,
      results
    })
  } catch (err) {
    console.error('Batch AI review failed:', err)
    res.status(500).json({ error: err.message || 'Failed to analyze applications' })
  }
})

// Update application notes
router.put('/:applicationId/notes', authenticate, checkTenantPermission('can_review_applications'), async (req, res) => {
  const { applicationId } = req.params
  const { notes } = req.body

  try {
    const result = await query(
      `UPDATE applications SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING id, notes, updated_at`,
      [notes || '', applicationId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Failed to update application notes:', err)
    res.status(500).json({ error: 'Failed to update application notes' })
  }
})

export default router
