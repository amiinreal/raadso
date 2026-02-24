import { Router } from 'express'
import { query } from '../db.js'
import { validateRequest, isValidString, isValidPositiveInteger, isValidUUID } from '../utils/validation.js'
import { authenticate } from '../middleware/auth.js'
import { checkTenantPermission } from '../middleware/tenantPermissions.js'
import { emailService } from '../services/emailService.js'
import { analyzeApplicationMatch, analyzeApplicationMatchMultiLang, translateText } from '../services/geminiAI.js'
import { recordTenantAudit } from '../services/auditService.js'
import { ensureApplicationActionAccess } from '../utils/applicationAccess.js'

const router = Router()

const resolveEmployerTenantAccess = async (userId, tenantIdParam, jobId) => {
  let resolvedTenantId = tenantIdParam || null

  if (jobId) {
    const jobResult = await query('SELECT tenant_id FROM jobs WHERE id = $1', [jobId])
    if (!jobResult.rows.length) {
      const err = new Error('Job not found')
      err.status = 404
      throw err
    }
    const jobTenantId = jobResult.rows[0].tenant_id
    if (resolvedTenantId && resolvedTenantId !== jobTenantId) {
      const err = new Error('Job does not belong to the specified tenant')
      err.status = 400
      throw err
    }
    resolvedTenantId = jobTenantId
  }

  if (!resolvedTenantId) {
    const err = new Error('tenantId or jobId is required to view applications')
    err.status = 400
    throw err
  }

  const membership = await query(
    `SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
    [resolvedTenantId, userId]
  )

  if (membership.rows.length) {
    return { tenantId: resolvedTenantId, tenantRole: membership.rows[0].role }
  }

  const ownerResult = await query('SELECT user_id FROM tenants WHERE id = $1', [resolvedTenantId])
  if (ownerResult.rows.length && ownerResult.rows[0].user_id === userId) {
    return { tenantId: resolvedTenantId, tenantRole: 'owner' }
  }

  return null
}

const applicationValidation = validateRequest({
  jobId: { required: true, validator: isValidUUID, message: 'jobId must be a valid UUID' },
  candidateId: { required: true, validator: isValidUUID, message: 'candidateId must be a valid UUID' },
  coverLetter: { type: 'string', min: 0, max: 5000 },
  usedProfile: { validator: (v) => typeof v === 'boolean', message: 'usedProfile must be a boolean' },
  usedCv: { validator: (v) => typeof v === 'boolean', message: 'usedCv must be a boolean' },
  customFiles: { type: 'array' }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const { jobId, tenantId: tenantIdParam, candidateId: candidateIdFilter } = req.query
    const params = []
    const whereClauses = []
    let assignmentJoin = ''

    const addParam = (value) => {
      params.push(value)
      return `$${params.length}`
    }

    const wantsEmployerScope = Boolean(tenantIdParam || jobId)

    if (req.user.role === 'candidate' && !wantsEmployerScope) {
      if (!req.user.candidateId) {
        return res.status(400).json({ error: 'Candidate profile not found' })
      }
      if (candidateIdFilter && candidateIdFilter !== req.user.candidateId) {
        return res.status(403).json({ error: 'You can only view your own applications' })
      }
      whereClauses.push(`a.candidate_id = ${addParam(req.user.candidateId)}`)
      if (jobId) {
        whereClauses.push(`a.job_id = ${addParam(jobId)}`)
      }
    } else if (req.user.role === 'admin') {
      if (tenantIdParam) {
        whereClauses.push(`j.tenant_id = ${addParam(tenantIdParam)}`)
      }
      if (jobId) {
        whereClauses.push(`a.job_id = ${addParam(jobId)}`)
      }
      if (candidateIdFilter) {
        whereClauses.push(`a.candidate_id = ${addParam(candidateIdFilter)}`)
      }
    } else if (req.user.userId && (req.user.role === 'employer' || wantsEmployerScope)) {
      const access = await resolveEmployerTenantAccess(req.user.userId, tenantIdParam, jobId)
      if (!access) {
        return res.status(403).json({ error: 'Not authorized to view applications for this tenant' })
      }
      whereClauses.push(`j.tenant_id = ${addParam(access.tenantId)}`)
      if (jobId) {
        whereClauses.push(`a.job_id = ${addParam(jobId)}`)
      }
      if (access.tenantRole === 'member') {
        assignmentJoin = `JOIN application_assignments aa ON aa.application_id = a.id AND aa.user_id = ${addParam(req.user.userId)}`
      }
    } else {
      return res.status(403).json({ error: 'Role not permitted to view applications' })
    }

    const joins = [
      assignmentJoin,
      'LEFT JOIN jobs j ON j.id = a.job_id',
      'LEFT JOIN tenants t ON t.id = j.tenant_id',
      'LEFT JOIN industries i ON i.id = t.industry_id',
      'LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id',
      'LEFT JOIN users u ON u.id = a.candidate_id'
    ].filter(Boolean).join('\n')

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
        j.allow_replies,
        j.allow_messaging,
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
        , COALESCE((
          SELECT json_agg(json_build_object(
            'user_id', tm.user_id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email,
            'role', tm.role
          ) ORDER BY tm.role, u.first_name)
          FROM application_assignments aa
          JOIN tenant_members tm ON tm.user_id = aa.user_id AND tm.tenant_id = j.tenant_id
          JOIN users u ON u.id = tm.user_id
          WHERE aa.application_id = a.id
        ), '[]'::json) AS assigned_members
      FROM applications a
      ${joins}
    `

    if (whereClauses.length) {
      sql += `\nWHERE ${whereClauses.join(' AND ')}`
    }

    sql += `\nORDER BY a.applied_at DESC`

    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
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

    const application = insert.rows[0]

    // 2. TRIGGER AUTO-REPLY (Async)
    const triggerAutoReply = async () => {
      try {
        // Fetch job and candidate details
        const jobResult = await query(
          `SELECT j.title, j.auto_reply_enabled, j.auto_reply_subject, j.auto_reply_message, 
                  j.hiring_contact_name, j.hiring_contact_email, t.company_name
           FROM jobs j
           JOIN tenants t ON j.tenant_id = t.id
           WHERE j.id = $1`,
          [jobId]
        )
        const candResult = await query(
          `SELECT first_name, last_name, email FROM candidate_profiles WHERE id = $1`,
          [candidateId]
        )

        const jobData = jobResult.rows[0];
        const candData = candResult.rows[0];

        if (jobData?.auto_reply_enabled && jobData.auto_reply_message && candData?.email) {
          const subject = jobData.auto_reply_subject || `Application Received: ${jobData.title}`;
          const employerName = jobData.company_name || 'Employer';

          const sendResult = await emailService.sendCandidateMessage(
            candData.email,
            `${candData.first_name || ''} ${candData.last_name || ''}`.trim() || 'Candidate',
            subject,
            jobData.auto_reply_message,
            employerName,
            0, // unreadCount
            {
              job_title: jobData.title,
              hiring_contact_name: jobData.hiring_contact_name,
              hiring_contact_email: jobData.hiring_contact_email
            }
          );

          if (sendResult.success) {
            // Save the auto-reply message to the messages table
            // We need to find the employer user ID (sender)
            const empUser = await query(`SELECT user_id FROM tenants t JOIN jobs j ON j.tenant_id = t.id WHERE j.id = $1`, [jobId]);
            const senderId = empUser.rows[0]?.user_id;

            if (senderId) {
              await query(
                `INSERT INTO messages (application_id, sender_id, content, subject) VALUES ($1, $2, $3, $4)`,
                [application.id, senderId, jobData.auto_reply_message, subject]
              );
            }
          }
        }
      } catch (err) {
        console.error('Auto-reply trigger failed:', err);
      }
    };

    // Run trigger in background
    triggerAutoReply();

    res.status(201).json(application)
  } catch (err) {
    console.error('POST /applications failed', err)
    res.status(500).json({ error: 'Failed to submit application' })
  }
})

// Update application status
router.put('/:applicationId', authenticate, checkTenantPermission('can_assign_application'), async (req, res) => {
  const { applicationId } = req.params
  const { status } = req.body

  const allowed = ['applied', 'reviewing', 'shortlisted', 'rejected', 'hired', 'accepted']
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const accessContext = await ensureApplicationActionAccess(req.user.userId, applicationId)

    const currentStatusResult = await query('SELECT status FROM applications WHERE id = $1', [applicationId])
    if (!currentStatusResult.rows.length) {
      return res.status(404).json({ error: 'Application not found' })
    }
    const previousStatus = currentStatusResult.rows[0].status

    const result = await query(
      `UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, applicationId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    const application = result.rows[0]

    await recordTenantAudit({
      tenantId: accessContext.tenantId,
      actorUserId: req.user.userId,
      actorRole: accessContext.tenantRole,
      action: 'application_status_change',
      targetType: 'application',
      targetId: applicationId,
      metadata: {
        jobId: accessContext.jobId,
        jobTitle: accessContext.jobTitle,
        jobAdNumber: accessContext.jobAdNumber,
        applicationName: accessContext.candidateName,
        candidateId: accessContext.candidateId,
        candidateEmail: accessContext.candidateEmail,
        from: previousStatus,
        to: status
      }
    })

    // 3. TRIGGER REJECTION EMAIL (Async)
    if (status === 'rejected') {
      const triggerRejectionEmail = async () => {
        try {
          // Fetch job and candidate details
          const jobResult = await query(
            `SELECT j.title, j.rejection_subject, j.rejection_message, 
                    j.hiring_contact_name, j.hiring_contact_email, t.company_name, t.user_id as employer_id
             FROM jobs j
             JOIN tenants t ON j.tenant_id = t.id
             WHERE j.id = $1`,
            [application.job_id]
          )
          const candResult = await query(
            `SELECT first_name, last_name, email FROM candidate_profiles WHERE id = $1`,
            [application.candidate_id]
          )

          const jobData = jobResult.rows[0];
          const candData = candResult.rows[0];

          if (jobData?.rejection_message && candData?.email) {
            const subject = jobData.rejection_subject || `Update on your application: ${jobData.title}`;
            const employerName = jobData.company_name || 'Employer';

            const sendResult = await emailService.sendCandidateMessage(
              candData.email,
              `${candData.first_name || ''} ${candData.last_name || ''}`.trim() || 'Candidate',
              subject,
              jobData.rejection_message,
              employerName,
              0, // unreadCount
              {
                job_title: jobData.title,
                hiring_contact_name: jobData.hiring_contact_name,
                hiring_contact_email: jobData.hiring_contact_email
              }
            );

            if (sendResult.success && jobData.employer_id) {
              // Save the rejection message to the messages table
              await query(
                `INSERT INTO messages (application_id, sender_id, content, subject) VALUES ($1, $2, $3, $4)`,
                [application.id, jobData.employer_id, jobData.rejection_message, subject]
              );
            }
          }
        } catch (err) {
          console.error('Rejection email trigger failed:', err);
        }
      };

      triggerRejectionEmail();
    }

    res.json(application)
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
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
      salary_max: application.salary_max,
      id: application.job_id
    }

    const candidate = {
      id: application.candidate_id,
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

    // Use existing analysis from applications table, or generate new one if needed
    let englishAnalysis = application.ai_analysis
    let matchScore = application.ai_match_score

    // Check if force reanalysis is requested
    const { type, forceReanalyze } = req.body

    // If no existing analysis or force reanalyze is requested, generate new one
    if (!englishAnalysis || forceReanalyze) {
      const analysisResult = await analyzeApplicationMatchMultiLang(
        job,
        candidate,
        application.cover_letter,
        application.custom_files,
        type || 'general',
        ['en', 'so'] // Generate in English and Somali
      )
      englishAnalysis = analysisResult.analyses.en
      matchScore = analysisResult.matchScore

      // Store the primary (English) analysis in applications table
      await query(`
        UPDATE applications 
        SET ai_match_score = $1, 
            ai_analysis = $2, 
            ai_reviewed_at = NOW()
        WHERE id = $3
      `, [matchScore, englishAnalysis, applicationId])
    }

    // Translate to Somali
    const analyses = {
      en: englishAnalysis
    }

    // Translate to Somali
    try {
      const somaliAnalysis = await translateText({
        sourceText: englishAnalysis,
        sourceLanguage: 'en',
        targetLanguage: 'so'
      })
      analyses.so = somaliAnalysis
    } catch (transErr) {
      console.warn('Failed to translate analysis to Somali:', transErr.message)
      analyses.so = englishAnalysis // Fallback to English
    }

    // Save multilingual analyses to dedicated application_ai_analysis table
    try {
      for (const [lang, analysisText] of Object.entries(analyses)) {
        // Upsert: insert or update if already exists
        await query(`
          INSERT INTO application_ai_analysis (application_id, language_code, match_score, analysis_text, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (application_id, language_code) 
          DO UPDATE SET 
            match_score = EXCLUDED.match_score,
            analysis_text = EXCLUDED.analysis_text,
            updated_at = NOW()
        `, [applicationId, lang, matchScore, analysisText])
      }
    } catch (dbErr) {
      console.warn('Warning: Failed to save AI analysis to database:', dbErr.message)
      // Don't fail the entire request if database saving fails
    }

    res.json({
      applicationId,
      matchScore,
      analysis: englishAnalysis,
      analyses,
      reviewedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('AI review failed:', err)
    res.status(500).json({ error: err.message || 'Failed to analyze application' })
  }
})

// Update application notes
router.put('/:applicationId/notes', authenticate, checkTenantPermission('can_assign_application'), async (req, res) => {
  const { applicationId } = req.params
  const { notes } = req.body

  try {
    const accessContext = await ensureApplicationActionAccess(req.user.userId, applicationId)

    const currentNotesResult = await query('SELECT notes FROM applications WHERE id = $1', [applicationId])
    if (!currentNotesResult.rows.length) {
      return res.status(404).json({ error: 'Application not found' })
    }
    const previousNotes = currentNotesResult.rows[0].notes || ''

    const result = await query(
      `UPDATE applications SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING id, notes, updated_at`,
      [notes || '', applicationId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    await recordTenantAudit({
      tenantId: accessContext.tenantId,
      actorUserId: req.user.userId,
      actorRole: accessContext.tenantRole,
      action: 'application_notes_update',
      targetType: 'application',
      targetId: applicationId,
      metadata: {
        jobId: accessContext.jobId,
        jobTitle: accessContext.jobTitle,
        jobAdNumber: accessContext.jobAdNumber,
        applicationName: accessContext.candidateName,
        candidateId: accessContext.candidateId,
        candidateEmail: accessContext.candidateEmail,
        previousLength: previousNotes.length,
        newLength: (notes || '').length
      }
    })

    res.json(result.rows[0])
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('Failed to update application notes:', err)
    res.status(500).json({ error: 'Failed to update application notes' })
  }
})

// Get AI analysis for a specific application in a specific language
router.get('/:applicationId/ai-analysis/:languageCode', authenticate, async (req, res) => {
  const { applicationId, languageCode } = req.params

  try {
    const result = await query(`
      SELECT 
        application_id,
        language_code,
        match_score,
        analysis_text,
        created_at,
        updated_at
      FROM application_ai_analysis
      WHERE application_id = $1 AND language_code = $2
    `, [applicationId, languageCode])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI analysis not found for this language' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Failed to fetch AI analysis:', err)
    res.status(500).json({ error: 'Failed to fetch AI analysis' })
  }
})

// Get all AI analyses for a specific application (all languages)
router.get('/:applicationId/ai-analyses', authenticate, async (req, res) => {
  const { applicationId } = req.params

  try {
    const result = await query(`
      SELECT 
        application_id,
        language_code,
        match_score,
        analysis_text,
        created_at,
        updated_at
      FROM application_ai_analysis
      WHERE application_id = $1
      ORDER BY language_code ASC
    `, [applicationId])

    res.json(result.rows)
  } catch (err) {
    console.error('Failed to fetch AI analyses:', err)
    res.status(500).json({ error: 'Failed to fetch AI analyses' })
  }
})

// Get job applications with optional sorting and filtering
router.get('/job/:jobId/with-ai-scores', authenticate, async (req, res) => {
  const { jobId } = req.params
  const { sort = 'applied_date_desc', searchTerm = '' } = req.query

  try {
    let queryStr = `
      SELECT
        a.id,
        a.job_id,
        a.candidate_id,
        a.status,
        a.cover_letter,
        a.custom_files,
        a.ai_match_score,
        a.ai_reviewed_at,
        a.applied_at,
        a.created_at,
        cp.first_name,
        cp.last_name,
        cp.headline,
        (SELECT COUNT(*) FROM application_ai_analysis WHERE application_id = a.id) as has_ai_analysis
      FROM applications a
      LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
      WHERE a.job_id = $1
    `

    const params = [jobId]

    if (searchTerm) {
      queryStr += ` AND (cp.first_name ILIKE $${params.length + 1} OR cp.last_name ILIKE $${params.length + 1})`
      params.push(`%${searchTerm}%`)
    }

    // Apply sorting
    switch (sort) {
      case 'ai_score_highest':
        queryStr += ' ORDER BY a.ai_match_score DESC NULLS LAST'
        break
      case 'ai_score_lowest':
        queryStr += ' ORDER BY a.ai_match_score ASC NULLS LAST'
        break
      case 'applied_date_first':
        queryStr += ' ORDER BY a.applied_at ASC'
        break
      case 'applied_date_last':
        queryStr += ' ORDER BY a.applied_at DESC'
        break
      case 'name_alphabetical':
        queryStr += ' ORDER BY cp.first_name ASC, cp.last_name ASC'
        break
      case 'name_reverse':
        queryStr += ' ORDER BY cp.first_name DESC, cp.last_name DESC'
        break
      default:
        queryStr += ' ORDER BY a.applied_at DESC'
    }

    const qResult = await query(queryStr, params)
    res.json(qResult.rows)
  } catch (err) {
    console.error('Failed to fetch job applications:', err)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

export default router
