import { Router } from 'express'
import { query, getClient } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import {
  validateRequest,
  isValidString,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidInteger,
  isValidPositiveInteger
} from '../utils/validation.js'

const router = Router()

// Validation schemas
const candidateValidation = validateRequest({
  firstName: { required: true, type: 'string', min: 1, max: 100 },
  lastName: { type: 'string', min: 0, max: 100 },
  email: { required: true, type: 'email' },
  phone: { type: 'phone' },
  location: { type: 'string', min: 0, max: 200 },
  nationality: { type: 'string', min: 0, max: 100 },
  headline: { type: 'string', min: 0, max: 200 },
  summary: { type: 'string', min: 0, max: 2000 },
  seniorityLevel: { type: 'string', min: 0, max: 100 },
  yearsOfExperience: { validator: (v) => !v || isValidPositiveInteger(v, 100), message: 'Years of experience must be 0-100' },
  cvFileUrl: { type: 'url' },
  portfolioUrl: { type: 'url' },
  linkedinUrl: { type: 'url' },
  githubUrl: { type: 'url' },
  employmentStatus: { type: 'string', min: 0, max: 100 },
  workExperiences: { type: 'array', maxLength: 50 },
  educations: { type: 'array', maxLength: 20 },
  skills: { type: 'array', maxLength: 100 },
  languages: { type: 'array', maxLength: 20 },
  attachments: { type: 'array', maxLength: 10 }
})

const candidateUpdateValidation = validateRequest({
  firstName: { type: 'string', min: 1, max: 100 },
  lastName: { type: 'string', min: 0, max: 100 },
  email: { type: 'email' },
  phone: { type: 'phone' },
  location: { type: 'string', min: 0, max: 200 },
  nationality: { type: 'string', min: 0, max: 100 },
  headline: { type: 'string', min: 0, max: 200 },
  summary: { type: 'string', min: 0, max: 2000 },
  seniorityLevel: { type: 'string', min: 0, max: 100 },
  yearsOfExperience: { validator: (v) => !v || isValidPositiveInteger(v, 100), message: 'Years of experience must be 0-100' },
  cvFileUrl: { type: 'url' },
  profileImageUrl: { type: 'url' },
  portfolioUrl: { type: 'url' },
  linkedinUrl: { type: 'url' },
  githubUrl: { type: 'url' },
  employmentStatus: { type: 'string', min: 0, max: 100 }
})

const fetchCandidateBundle = async (candidateId) => {
  const [profileResult, work, edu, skills, languages, attachments, interestedPositions] = await Promise.all([
    query('SELECT * FROM candidate_profiles WHERE id = $1', [candidateId]),
    query('SELECT * FROM work_experiences WHERE candidate_id = $1 ORDER BY start_date DESC NULLS LAST', [candidateId]),
    query('SELECT * FROM educations WHERE candidate_id = $1 ORDER BY end_year DESC NULLS LAST', [candidateId]),
    query('SELECT * FROM skills WHERE candidate_id = $1 ORDER BY skill_type, skill_name', [candidateId]),
    query('SELECT * FROM languages WHERE candidate_id = $1 ORDER BY language', [candidateId]),
    query('SELECT * FROM attachments WHERE candidate_id = $1', [candidateId]),
    query('SELECT * FROM candidate_interested_positions WHERE candidate_id = $1 ORDER BY created_at DESC', [candidateId]),
  ])

  if (!profileResult.rows.length) return null

  return {
    profile: profileResult.rows[0],
    workExperiences: work.rows,
    educations: edu.rows,
    skills: skills.rows,
    languages: languages.rows,
    attachments: attachments.rows,
    interestedPositions: interestedPositions.rows,
  }
}

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, first_name, last_name, email, headline, seniority_level, years_of_experience, searchable, open_to_work, created_at
       FROM candidate_profiles
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /candidates failed', err)
    res.status(500).json({ error: 'Failed to fetch candidates' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const data = await fetchCandidateBundle(req.params.id)
    if (!data) return res.status(404).json({ error: 'Candidate not found' })
    res.json(data)
  } catch (err) {
    console.error('GET /candidates/:id failed', err)
    res.status(500).json({ error: 'Failed to fetch candidate' })
  }
})

router.post('/', candidateValidation, async (req, res) => {
  const {
    userId,
    firstName,
    lastName,
    email,
    phone,
    location,
    nationality,
    headline,
    summary,
    seniorityLevel,
    yearsOfExperience,
    cvFileUrl,
    portfolioUrl,
    linkedinUrl,
    githubUrl,
    employmentStatus,
    searchable = true,
    openToWork = true,
    workExperiences = [],
    educations = [],
    skills = [],
    languages = [],
    attachments = [],
  } = req.body

  const client = await getClient()

  try {
    await client.query('BEGIN')
    const profileResult = await client.query(
      `INSERT INTO candidate_profiles (
        user_id, first_name, last_name, email, phone, location, nationality, headline, summary, seniority_level, years_of_experience, cv_file_url, portfolio_url, linkedin_url, github_url, employment_status, searchable, open_to_work
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING id`,
      [userId || null, firstName, lastName || '', email, phone || '', location || '', nationality || '', headline || '', summary || '', seniorityLevel || '', yearsOfExperience || null, cvFileUrl || '', portfolioUrl || '', linkedinUrl || '', githubUrl || '', employmentStatus || '', searchable, openToWork],
    )

    const candidateId = profileResult.rows[0].id

    if (Array.isArray(workExperiences) && workExperiences.length) {
      for (const item of workExperiences) {
        const { jobTitle, companyName, employmentType, startDate, endDate, description } = item
        await client.query(
          `INSERT INTO work_experiences (candidate_id, job_title, company_name, employment_type, start_date, end_date, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [candidateId, jobTitle || '', companyName || '', employmentType || '', startDate || null, endDate || null, description || ''],
        )
      }
    }

    if (Array.isArray(educations) && educations.length) {
      for (const item of educations) {
        const { degree, fieldOfStudy, institution, startYear, endYear } = item
        await client.query(
          `INSERT INTO educations (candidate_id, degree, field_of_study, institution, start_year, end_year)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [candidateId, degree || '', fieldOfStudy || '', institution || '', startYear || null, endYear || null],
        )
      }
    }

    if (Array.isArray(skills) && skills.length) {
      for (const item of skills) {
        const { skillName, skillType, proficiency } = item
        await client.query(
          `INSERT INTO skills (candidate_id, skill_name, skill_type, proficiency)
           VALUES ($1, $2, $3, $4)`,
          [candidateId, skillName || '', skillType || '', proficiency || ''],
        )
      }
    }

    if (Array.isArray(languages) && languages.length) {
      for (const item of languages) {
        const { language, proficiency } = item
        await client.query(
          `INSERT INTO languages (candidate_id, language, proficiency)
           VALUES ($1, $2, $3)`,
          [candidateId, language || '', proficiency || ''],
        )
      }
    }

    if (Array.isArray(attachments) && attachments.length) {
      for (const item of attachments) {
        const { type, fileUrl } = item
        await client.query(
          `INSERT INTO attachments (candidate_id, type, file_url)
           VALUES ($1, $2, $3)`,
          [candidateId, type || 'other', fileUrl || ''],
        )
      }
    }

    await client.query('COMMIT')
    const data = await fetchCandidateBundle(candidateId)
    res.status(201).json(data)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /candidates failed', err)
    res.status(500).json({ error: 'Failed to create candidate' })
  } finally {
    client.release()
  }
})

router.put('/:id', authenticate, candidateUpdateValidation, async (req, res) => {
  const candidateId = req.params.id
  const {
    firstName,
    lastName,
    email,
    phone,
    location,
    nationality,
    headline,
    summary,
    seniorityLevel,
    yearsOfExperience,
    cvFileUrl,
    profileImageUrl,
    portfolioUrl,
    linkedinUrl,
    githubUrl,
    openToWork = true,
    searchable = true,
    employmentStatus,
  } = req.body

  const statusValue = employmentStatus || (openToWork ? 'Open to roles' : 'Not looking')
  // Convert empty string years to null
  const yearsValue = yearsOfExperience === '' || yearsOfExperience === null ? null : yearsOfExperience

  try {
    const ownerCheck = await query('SELECT user_id FROM candidate_profiles WHERE id = $1', [candidateId])
    const ownerId = ownerCheck.rows[0]?.user_id
    if (ownerId && ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Not allowed to edit this profile' })
    }

    // Ensure column exists when updating profile image URL (for older DBs)
    if (profileImageUrl) {
      try {
        await query('ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT')
      } catch (e) {
        console.warn('Could not ensure profile_image_url column:', e.message)
      }
    }

    const update = await query(
      `UPDATE candidate_profiles
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           location = COALESCE($5, location),
           nationality = COALESCE($6, nationality),
           headline = COALESCE($7, headline),
           summary = COALESCE($8, summary),
           seniority_level = COALESCE($9, seniority_level),
           years_of_experience = COALESCE($10, years_of_experience),
           cv_file_url = COALESCE($11, cv_file_url),
           profile_image_url = COALESCE($12, profile_image_url),
           portfolio_url = COALESCE($13, portfolio_url),
           linkedin_url = COALESCE($14, linkedin_url),
           github_url = COALESCE($15, github_url),
           open_to_work = $16,
           searchable = $17,
           employment_status = $18,
           last_updated = now()
       WHERE id = $19
       RETURNING *`,
      [firstName, lastName, email, phone, location, nationality, headline, summary, seniorityLevel, yearsValue, cvFileUrl, profileImageUrl, portfolioUrl, linkedinUrl, githubUrl, openToWork, searchable, statusValue, candidateId],
    )

    if (!update.rows.length) return res.status(404).json({ error: 'Candidate not found' })

    const data = await query('SELECT * FROM candidate_profiles WHERE id = $1', [candidateId])
    return res.json({ profile: data.rows[0] })
  } catch (err) {
    console.error('PUT /candidates/:id failed', err)
    return res.status(500).json({ error: 'Failed to update candidate' })
  }
})

// Get interested positions for a candidate
router.get('/:id/interested-positions', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, position_title, created_at FROM candidate_interested_positions WHERE candidate_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /candidates/:id/interested-positions failed', err)
    res.status(500).json({ error: 'Failed to fetch interested positions' })
  }
})

// Add interested position
router.post('/:id/interested-positions', authenticate, async (req, res) => {
  const { candidateId, positionTitle } = req.body

  if (!positionTitle || !positionTitle.trim()) {
    return res.status(400).json({ error: 'Position title is required' })
  }

  try {
    const ownerCheck = await query('SELECT user_id FROM candidate_profiles WHERE id = $1', [candidateId])
    const ownerId = ownerCheck.rows[0]?.user_id
    if (ownerId && ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Not allowed to modify this profile' })
    }

    const result = await query(
      'INSERT INTO candidate_interested_positions (candidate_id, position_title) VALUES ($1, $2) RETURNING *',
      [candidateId, positionTitle.trim()]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /candidates/:id/interested-positions failed', err)
    res.status(500).json({ error: 'Failed to add interested position' })
  }
})

// Delete interested position
router.delete('/:id/interested-positions/:positionId', authenticate, async (req, res) => {
  const { id: candidateId, positionId } = req.params

  try {
    const ownerCheck = await query('SELECT user_id FROM candidate_profiles WHERE id = $1', [candidateId])
    const ownerId = ownerCheck.rows[0]?.user_id
    if (ownerId && ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Not allowed to modify this profile' })
    }

    await query('DELETE FROM candidate_interested_positions WHERE id = $1 AND candidate_id = $2', [positionId, candidateId])
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /candidates/:id/interested-positions/:positionId failed', err)
    res.status(500).json({ error: 'Failed to delete interested position' })
  }
})

export default router
