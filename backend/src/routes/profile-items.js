import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import {
  validateRequest,
  isValidString,
  isValidDate,
  isValidYear,
  isValidUrl,
  isValidPositiveInteger,
  EMPLOYMENT_TYPES,
  PROFICIENCY_LEVELS
} from '../utils/validation.js'

const router = Router()

// Validation schemas
const workExperienceValidation = validateRequest({
  candidateId: { required: true, validator: isValidPositiveInteger },
  jobTitle: { required: true, type: 'string', min: 2, max: 200 },
  companyName: { required: true, type: 'string', min: 2, max: 200 },
  employmentType: { type: 'enum', values: EMPLOYMENT_TYPES },
  startDate: { required: true, type: 'date' },
  endDate: { type: 'date' },
  description: { type: 'string', min: 0, max: 2000 }
})

const educationValidation = validateRequest({
  candidateId: { required: true, validator: isValidPositiveInteger },
  degree: { required: true, type: 'string', min: 2, max: 200 },
  fieldOfStudy: { required: true, type: 'string', min: 2, max: 200 },
  institution: { required: true, type: 'string', min: 2, max: 200 },
  startYear: { required: true, type: 'year' },
  endYear: { type: 'year' }
})

const skillValidation = validateRequest({
  candidateId: { required: true, validator: isValidPositiveInteger },
  skillName: { required: true, type: 'string', min: 1, max: 100 },
  proficiency: { type: 'enum', values: PROFICIENCY_LEVELS }
})

const languageValidation = validateRequest({
  candidateId: { required: true, validator: isValidPositiveInteger },
  languageName: { required: true, type: 'string', min: 2, max: 100 },
  proficiency: { required: true, type: 'enum', values: PROFICIENCY_LEVELS }
})

const attachmentValidation = validateRequest({
  candidateId: { required: true, validator: isValidPositiveInteger },
  fileName: { required: true, type: 'string', min: 1, max: 255 },
  fileType: { required: true, type: 'string', min: 1, max: 100 },
  fileUrl: { required: true, type: 'url' },
  title: { type: 'string', min: 0, max: 200 }
})

// Work Experience routes
router.post('/work-experiences', authenticate, workExperienceValidation, async (req, res) => {
  try {
    const { candidateId, jobTitle, companyName, employmentType, startDate, endDate, description } = req.body
    const result = await query(
      `INSERT INTO work_experiences (candidate_id, job_title, company_name, employment_type, start_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [candidateId, jobTitle, companyName, employmentType, startDate, endDate || null, description]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/work-experiences/:id', authenticate, workExperienceValidation, async (req, res) => {
  try {
    const { id } = req.params
    const { jobTitle, companyName, employmentType, startDate, endDate, description } = req.body
    const result = await query(
      `UPDATE work_experiences 
       SET job_title = $1, company_name = $2, employment_type = $3, start_date = $4, end_date = $5, description = $6
       WHERE id = $7 RETURNING *`,
      [jobTitle, companyName, employmentType, startDate, endDate || null, description, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work experience not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/work-experiences/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM work_experiences WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Education routes
router.post('/educations', authenticate, educationValidation, async (req, res) => {
  try {
    const { candidateId, degree, fieldOfStudy, institution, startYear, endYear } = req.body
    const result = await query(
      `INSERT INTO educations (candidate_id, degree, field_of_study, institution, start_year, end_year)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [candidateId, degree, fieldOfStudy, institution, startYear, endYear || null]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/educations/:id', authenticate, educationValidation, async (req, res) => {
  try {
    const { id } = req.params
    const { degree, fieldOfStudy, institution, startYear, endYear } = req.body
    const result = await query(
      `UPDATE educations 
       SET degree = $1, field_of_study = $2, institution = $3, start_year = $4, end_year = $5
       WHERE id = $6 RETURNING *`,
      [degree, fieldOfStudy, institution, startYear, endYear || null, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Education not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/educations/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM educations WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Skills routes
router.post('/skills', authenticate, skillValidation, async (req, res) => {
  try {
    const { candidateId, skillName, proficiency } = req.body
    const result = await query(
      `INSERT INTO skills (candidate_id, skill_name, proficiency)
       VALUES ($1, $2, $3) RETURNING *`,
      [candidateId, skillName, proficiency]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/skills/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM skills WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Languages routes
router.post('/languages', authenticate, async (req, res) => {
  try {
    const { candidateId, language, proficiency } = req.body
    const result = await query(
      `INSERT INTO languages (candidate_id, language, proficiency)
       VALUES ($1, $2, $3) RETURNING *`,
      [candidateId, language, proficiency]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/languages/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM languages WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Attachments routes
router.post('/attachments', authenticate, async (req, res) => {
  try {
    const { candidateId, type, fileUrl } = req.body
    const result = await query(
      `INSERT INTO attachments (candidate_id, type, file_url)
       VALUES ($1, $2, $3) RETURNING *`,
      [candidateId, type, fileUrl]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/attachments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM attachments WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
