import express from 'express'
import { query } from '../db.js'

const router = express.Router()

// Enhanced algorithm to calculate job compatibility score with user behavior
const calculateCompatibility = (job, candidateSkills, candidateExperience, userPreferences, userInteractions = {}) => {
  let score = 0
  let componentScores = {
    skillMatch: 0,
    categoryMatch: 0,
    experienceMatch: 0,
    behaviorMatch: 0
  }

  // Skill matching (30% weight)
  if (job.required_skills && job.required_skills.length > 0 && candidateSkills && candidateSkills.length > 0) {
    const skillLower = candidateSkills.map(s => s.toLowerCase())
    const matchedSkills = job.required_skills.filter(s => 
      skillLower.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs))
    )
    componentScores.skillMatch = (matchedSkills.length / job.required_skills.length) * 100
  }

  // Category/Tag matching (25% weight) - what user has explicitly liked
  if (job.tags && job.tags.length > 0 && userPreferences && userPreferences.length > 0) {
    const preferenceTags = userPreferences.map(p => p.tag.toLowerCase())
    const matchedTags = job.tags.filter(tag => 
      preferenceTags.some(pt => pt.includes(tag.toLowerCase()) || tag.toLowerCase().includes(pt))
    )
    componentScores.categoryMatch = (matchedTags.length / job.tags.length) * 100
  }

  // Experience matching (20% weight)
  if (job.seniority_level && candidateExperience) {
    const seniorityMap = {
      'entry-level': 0,
      'junior': 1,
      'mid-level': 2,
      'senior': 3,
      'lead': 4,
      'executive': 5
    }
    const jobSeniority = seniorityMap[job.seniority_level?.toLowerCase()] || 2
    const candidateSeniority = Math.min(candidateExperience / 5, 5) // Normalize years to 0-5
    
    // Give points for matching or slightly higher experience
    const diff = Math.abs(jobSeniority - candidateSeniority)
    componentScores.experienceMatch = Math.max(0, 100 - (diff * 20))
  }

  // User behavior matching (25% weight) - what they've actually engaged with
  // Saved jobs = strongest signal (user proactively saved it)
  // Likes = strong signal (explicit preference)
  // Views = weak signal (interest shown)
  if (userInteractions) {
    let behaviorScore = 0
    if (userInteractions.saved) behaviorScore += 50 // Saved = 50 points
    if (userInteractions.liked) behaviorScore += 25 // Liked = 25 points
    if (userInteractions.viewed) behaviorScore += 10 // Viewed = 10 points
    
    componentScores.behaviorMatch = Math.min(100, behaviorScore)
  }

  // Calculate weighted score
  score = (componentScores.skillMatch * 0.30) + 
          (componentScores.categoryMatch * 0.25) + 
          (componentScores.experienceMatch * 0.20) +
          (componentScores.behaviorMatch * 0.25)

  return {
    score: Math.round(score),
    skillMatch: Math.round(componentScores.skillMatch),
    categoryMatch: Math.round(componentScores.categoryMatch),
    experienceMatch: Math.round(componentScores.experienceMatch),
    behaviorMatch: Math.round(componentScores.behaviorMatch)
  }
}

// Get top compatible jobs for a candidate
router.get('/candidate/:candidateId/top-jobs', async (req, res) => {
  try {
    const { candidateId } = req.params
    const limit = req.query.limit || 3

    // Get candidate profile with skills and experience
    const candidateResult = await query(
      `SELECT cp.id, cp.years_of_experience, 
              json_agg(DISTINCT s.skill_name) as skills,
              json_agg(DISTINCT CASE WHEN we.id IS NOT NULL THEN we.job_title ELSE NULL END) as previous_titles
       FROM candidate_profiles cp
       LEFT JOIN skills s ON cp.id = s.candidate_id
       LEFT JOIN work_experiences we ON cp.id = we.candidate_id
       WHERE cp.id = $1
       GROUP BY cp.id, cp.years_of_experience`,
      [candidateId]
    )

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' })
    }

    const candidate = candidateResult.rows[0]

    // Get user preferences (liked tags/categories)
    const preferencesResult = await query(
      `SELECT tag, category FROM user_job_preferences WHERE candidate_id = $1 ORDER BY liked_count DESC`,
      [candidateId]
    )

    const preferences = preferencesResult.rows || []

    // Get all user interactions (saved, liked, viewed)
    const interactionsResult = await query(
      `SELECT job_id, interaction_type 
       FROM job_interactions 
       WHERE candidate_id = $1`,
      [candidateId]
    )

    const interactions = {}
    interactionsResult.rows.forEach(row => {
      if (!interactions[row.job_id]) {
        interactions[row.job_id] = {}
      }
      interactions[row.job_id][row.interaction_type] = true
    })

    // Get active jobs
    const jobsResult = await query(
      `SELECT j.*, t.company_name 
       FROM jobs j
       LEFT JOIN tenants t ON j.tenant_id = t.id
       WHERE j.active = true
       ORDER BY j.created_at DESC`,
    )

    const jobs = jobsResult.rows || []

    // Calculate compatibility for each job with user interactions
    const jobsWithScores = jobs.map(job => {
      const compatibility = calculateCompatibility(
        job,
        candidate.skills,
        candidate.years_of_experience,
        preferences,
        interactions[job.id] || {}
      )
      return {
        ...job,
        ...compatibility
      }
    })

    // Sort by score and get top N
    const topJobs = jobsWithScores
      .filter(j => j.score > 30) // Only return jobs with >30% compatibility
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit))

    res.json(topJobs)
  } catch (err) {
    console.error('Error fetching top jobs:', err)
    res.status(500).json({ error: 'Failed to fetch recommendations' })
  }
})

// Record a job interaction (view, like, dislike, apply)
router.post('/candidate/:candidateId/job/:jobId/interact', async (req, res) => {
  try {
    const { candidateId, jobId } = req.params
    const { interactionType } = req.body // 'view', 'like', 'dislike', 'applied'

    // If it's a like, update user preferences
    if (interactionType === 'like') {
      // Get job tags to add to preferences
      const jobResult = await query('SELECT tags FROM jobs WHERE id = $1', [jobId])
      const tags = jobResult.rows[0]?.tags || []

      for (const tag of tags) {
        await query(
          `INSERT INTO user_job_preferences (candidate_id, tag, category)
           VALUES ($1, $2, $2)
           ON CONFLICT (candidate_id, tag) 
           DO UPDATE SET liked_count = liked_count + 1, updated_at = now()`,
          [candidateId, tag]
        )
      }
    }

    // Record interaction
    await query(
      `INSERT INTO job_interactions (candidate_id, job_id, interaction_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (candidate_id, job_id, interaction_type) DO NOTHING`,
      [candidateId, jobId, interactionType]
    )

    res.json({ success: true, message: `Job ${interactionType} recorded` })
  } catch (err) {
    console.error('Error recording interaction:', err)
    res.status(500).json({ error: 'Failed to record interaction' })
  }
})

// Get user's job preferences/interests
router.get('/candidate/:candidateId/preferences', async (req, res) => {
  try {
    const { candidateId } = req.params

    const result = await query(
      `SELECT tag, category, liked_count, updated_at 
       FROM user_job_preferences 
       WHERE candidate_id = $1 
       ORDER BY liked_count DESC`,
      [candidateId]
    )

    res.json(result.rows || [])
  } catch (err) {
    console.error('Error fetching preferences:', err)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

// Add or update user preference
router.post('/candidate/:candidateId/preferences', async (req, res) => {
  try {
    const { candidateId } = req.params
    const { tag, category } = req.body

    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' })
    }

    await query(
      `INSERT INTO user_job_preferences (candidate_id, tag, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (candidate_id, tag) 
       DO UPDATE SET liked_count = liked_count + 1, updated_at = now()`,
      [candidateId, tag, category || tag]
    )

    res.json({ success: true, message: 'Preference added' })
  } catch (err) {
    console.error('Error adding preference:', err)
    res.status(500).json({ error: 'Failed to add preference' })
  }
})

// Get jobs filtered by user preferences
router.get('/candidate/:candidateId/filtered-jobs', async (req, res) => {
  try {
    const { candidateId } = req.params

    // Get user preferences
    const preferencesResult = await query(
      `SELECT tag FROM user_job_preferences WHERE candidate_id = $1 ORDER BY liked_count DESC LIMIT 5`,
      [candidateId]
    )

    const preferences = preferencesResult.rows.map(p => p.tag)

    if (preferences.length === 0) {
      // If no preferences, return all active jobs
      const jobsResult = await query(`SELECT * FROM jobs WHERE active = true`)
      return res.json(jobsResult.rows || [])
    }

    // Get jobs that match user preferences
    const placeholders = preferences.map((_, i) => `$${i + 1}`).join(',')
    const jobsResult = await query(
      `SELECT DISTINCT j.* FROM jobs j
       WHERE j.active = true AND (
         j.tags && ARRAY[${placeholders}]
         OR j.description ILIKE ANY(ARRAY[${preferences.map(p => `'%' || '${p}' || '%'`).join(',')}])
       )
       ORDER BY j.created_at DESC`,
      preferences
    )

    res.json(jobsResult.rows || [])
  } catch (err) {
    console.error('Error fetching filtered jobs:', err)
    res.status(500).json({ error: 'Failed to fetch filtered jobs' })
  }
})

// Save a job
router.post('/candidate/:candidateId/job/:jobId/save', async (req, res) => {
  try {
    const { candidateId, jobId } = req.params
    const { notes, category } = req.body

    await query(
      `INSERT INTO saved_jobs (candidate_id, job_id, notes, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (candidate_id, job_id) DO UPDATE SET notes = $3, category = $4`,
      [candidateId, jobId, notes || null, category || 'General']
    )

    // Also record as interaction
    await query(
      `INSERT INTO job_interactions (candidate_id, job_id, interaction_type)
       VALUES ($1, $2, 'saved')
       ON CONFLICT (candidate_id, job_id, interaction_type) DO NOTHING`,
      [candidateId, jobId]
    )

    res.json({ success: true, message: 'Job saved' })
  } catch (err) {
    console.error('Error saving job:', err)
    res.status(500).json({ error: 'Failed to save job' })
  }
})

// Unsave a job
router.delete('/candidate/:candidateId/job/:jobId/save', async (req, res) => {
  try {
    const { candidateId, jobId } = req.params

    await query(
      `DELETE FROM saved_jobs WHERE candidate_id = $1 AND job_id = $2`,
      [candidateId, jobId]
    )

    res.json({ success: true, message: 'Job unsaved' })
  } catch (err) {
    console.error('Error unsaving job:', err)
    res.status(500).json({ error: 'Failed to unsave job' })
  }
})

// Check if a job is saved
router.get('/candidate/:candidateId/job/:jobId/is-saved', async (req, res) => {
  try {
    const { candidateId, jobId } = req.params

    const result = await query(
      `SELECT id FROM saved_jobs WHERE candidate_id = $1 AND job_id = $2`,
      [candidateId, jobId]
    )

    res.json({ isSaved: result.rows.length > 0 })
  } catch (err) {
    console.error('Error checking saved status:', err)
    res.status(500).json({ error: 'Failed to check saved status' })
  }
})

// Get user's interest analysis (most liked categories)
router.get('/candidate/:candidateId/interests-analysis', async (req, res) => {
  try {
    const { candidateId } = req.params

    // Get top preferences
    const preferencesResult = await query(
      `SELECT tag, category, liked_count, updated_at
       FROM user_job_preferences
       WHERE candidate_id = $1
       ORDER BY liked_count DESC
       LIMIT 10`,
      [candidateId]
    )

    // Get interaction counts
    const interactionsResult = await query(
      `SELECT 
         interaction_type,
         COUNT(*) as count
       FROM job_interactions
       WHERE candidate_id = $1
       GROUP BY interaction_type`,
      [candidateId]
    )

    const interactions = {}
    interactionsResult.rows.forEach(row => {
      interactions[row.interaction_type] = parseInt(row.count)
    })

    // Get saved jobs count
    const savedResult = await query(
      `SELECT COUNT(*) as count FROM saved_jobs WHERE candidate_id = $1`,
      [candidateId]
    )

    res.json({
      topPreferences: preferencesResult.rows || [],
      interactionCounts: interactions,
      savedJobsCount: parseInt(savedResult.rows[0]?.count || 0),
      analysis: {
        mostInterested: preferencesResult.rows[0]?.tag || null,
        totalPreferences: preferencesResult.rows.length,
        totalInteractions: Object.values(interactions).reduce((a, b) => a + b, 0)
      }
    })
  } catch (err) {
    console.error('Error fetching interests analysis:', err)
    res.status(500).json({ error: 'Failed to fetch interests analysis' })
  }
})

// Get all save categories for a candidate
router.get('/candidate/:candidateId/save-categories', async (req, res) => {
  try {
    const { candidateId } = req.params

    const result = await query(
      `SELECT id, candidate_id, category_name, color, created_at
       FROM job_save_categories
       WHERE candidate_id = $1
       ORDER BY created_at DESC`,
      [candidateId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching categories:', err)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// Create a new save category
router.post('/candidate/:candidateId/save-categories', async (req, res) => {
  try {
    const { candidateId } = req.params
    const { categoryName, color } = req.body

    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const result = await query(
      `INSERT INTO job_save_categories (candidate_id, category_name, color)
       VALUES ($1, $2, $3)
       ON CONFLICT (candidate_id, category_name) DO UPDATE 
       SET color = EXCLUDED.color
       RETURNING id, candidate_id, category_name, color, created_at`,
      [candidateId, categoryName.trim(), color || '#6366f1']
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('Error creating category:', err)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

// Delete a save category
router.delete('/candidate/:candidateId/save-categories/:categoryId', async (req, res) => {
  try {
    const { candidateId, categoryId } = req.params

    await query(
      `DELETE FROM job_save_categories
       WHERE id = $1 AND candidate_id = $2`,
      [categoryId, candidateId]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting category:', err)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

// Get saved jobs with optional category filter
router.get('/candidate/:candidateId/saved-jobs', async (req, res) => {
  try {
    const { candidateId } = req.params
    const { category } = req.query

    let sql = `
      SELECT sj.id, sj.candidate_id, sj.job_id, sj.saved_at, sj.notes, sj.category,
             j.id as job_id, j.title, j.about_role, j.about_company, j.location, 
             j.employment_type, j.workplace_type, j.required_skills, j.ad_number, 
             j.seniority_level, j.application_deadline,
             t.company_name, t.logo_url as tenant_logo_url
      FROM saved_jobs sj
      LEFT JOIN jobs j ON sj.job_id = j.id
      LEFT JOIN tenants t ON j.tenant_id = t.id
      WHERE sj.candidate_id = $1
    `
    const params = [candidateId]

    if (category) {
      sql += ` AND COALESCE(sj.category, 'General') = $2`
      params.push(category)
    }

    sql += ` ORDER BY sj.saved_at DESC`

    const result = await query(sql, params)
    
    const jobsWithDetails = result.rows.map(row => ({
      id: row.job_id,
      job_id: row.job_id,
      candidate_id: row.candidate_id,
      saved_at: row.saved_at,
      notes: row.notes,
      save_category: row.category || 'General',
      saved_category: row.category || 'General',
      category: row.category || 'General',
      category_name: row.category || 'General',
      title: row.title,
      description: row.about_role,
      about_role: row.about_role,
      about_company: row.about_company,
      location: row.location,
      job_type: row.employment_type,
      employment_type: row.employment_type,
      work_mode: row.workplace_type,
      workplace_type: row.workplace_type,
      required_skills: row.required_skills || [],
      tags: row.tags || [],
      ad_number: row.ad_number,
      seniority_level: row.seniority_level,
      application_deadline: row.application_deadline,
      deadline: row.application_deadline,
      company_name: row.company_name,
      company_logo_url: row.tenant_logo_url,
      logo_url: row.tenant_logo_url
    }))

    res.json(jobsWithDetails)
  } catch (err) {
    console.error('Error fetching saved jobs:', err)
    res.status(500).json({ error: 'Failed to fetch saved jobs' })
  }
})

// Update job save category
router.put('/candidate/:candidateId/job/:jobId/save-category', async (req, res) => {
  try {
    const { candidateId, jobId } = req.params
    const { category } = req.body

    if (!category) {
      return res.status(400).json({ error: 'Category is required' })
    }

    await query(
      `UPDATE saved_jobs
       SET category = $1
       WHERE candidate_id = $2 AND job_id = $3`,
      [category, candidateId, jobId]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Error updating category:', err)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

// Get notifications for candidate
router.get('/candidate/:candidateId/notifications', async (req, res) => {
  try {
    const { candidateId } = req.params
    const { unreadOnly = false } = req.query

    let sql = `
      SELECT n.id, n.candidate_id, n.job_id, n.type, n.title, n.message, 
             n.deadline, n.notification_time, n.times_sent, n.is_read, n.created_at, n.read_at,
             j.title as job_title, j.application_deadline, j.ad_number
      FROM notifications n
      LEFT JOIN jobs j ON n.job_id = j.id
      WHERE n.candidate_id = $1
    `
    
    const params = [candidateId]
    
    if (unreadOnly === 'true' || unreadOnly === true) {
      sql += ` AND n.is_read = false`
    }
    
    sql += ` ORDER BY n.created_at DESC LIMIT 50`

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching notifications:', err)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// Mark notification as read
router.put('/candidate/:candidateId/notifications/:notificationId/read', async (req, res) => {
  try {
    const { candidateId, notificationId } = req.params

    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = now() 
       WHERE id = $1 AND candidate_id = $2
       RETURNING *`,
      [notificationId, candidateId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Error marking notification as read:', err)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// Create deadline notification for saved jobs
router.post('/candidate/:candidateId/check-deadline-notifications', async (req, res) => {
  try {
    const { candidateId } = req.params
    
    // Resolve candidateId if it's actually a userId
    let actualCandidateId = candidateId
    const userCheckResult = await query(
      `SELECT id FROM candidate_profiles WHERE id = $1 OR user_id = $1 LIMIT 1`,
      [candidateId]
    )
    
    if (userCheckResult.rows.length > 0) {
      actualCandidateId = userCheckResult.rows[0].id
    }
    
    console.log(`[Deadline Check] Starting check for candidate ${actualCandidateId} (input: ${candidateId})`)

    // First check if candidate has any saved jobs at all
    const allSavedResult = await query(
      `SELECT sj.id, sj.job_id, j.title, j.application_deadline FROM saved_jobs sj 
       LEFT JOIN jobs j ON sj.job_id = j.id 
       WHERE sj.candidate_id = $1`,
      [actualCandidateId]
    )
    console.log(`[Deadline Check] Found ${allSavedResult.rows.length} total saved jobs for candidate`)
    allSavedResult.rows.forEach(row => {
      console.log(`  - Job: ${row.title}, Deadline: ${row.application_deadline}`)
    })

    // Get candidate's saved jobs with upcoming deadlines that haven't been applied to
    const savedJobsResult = await query(
      `SELECT sj.id as saved_job_id, sj.job_id, j.title, j.application_deadline
       FROM saved_jobs sj
       JOIN jobs j ON sj.job_id = j.id
       WHERE sj.candidate_id = $1 
         AND j.application_deadline IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM applications 
           WHERE job_id = j.id AND candidate_id = $1
         )`,
      [actualCandidateId]
    )

    console.log(`[Deadline Check] Found ${savedJobsResult.rows.length} saved jobs with deadlines (not yet applied)`)
    savedJobsResult.rows.forEach(row => {
      console.log(`  - Deadline query result: Job ID ${row.job_id}, Title: ${row.title}, Deadline: ${row.application_deadline}`)
    })

    // Get existing notifications to track what's been sent
    const existingResult = await query(
      `SELECT job_id, notification_time, times_sent 
       FROM notifications 
       WHERE candidate_id = $1 AND type = 'deadline_alert'`,
      [actualCandidateId]
    )
    
    // Map existing notifications by job_id and notification_time
    const existingNotifications = new Map()
    existingResult.rows.forEach(row => {
      const key = `${row.job_id}_${row.notification_time}`
      existingNotifications.set(key, row.times_sent)

      console.log(`[Deadline Check] Existing notifications: ${existingNotifications.size}`)
    })

    const now = new Date()
    const createdNotifications = []
  const checkedJobs = []

    // Create notifications for upcoming deadlines
    for (const row of savedJobsResult.rows) {
      const deadline = new Date(row.application_deadline)
      const hoursLeft = (deadline - now) / (1000 * 60 * 60)
      const daysLeft = Math.ceil(hoursLeft / 24)

      checkedJobs.push({
        jobId: row.job_id,
        title: row.title,
        deadline: row.application_deadline,
        hoursLeft: Math.round(hoursLeft),
        daysLeft
      })

      // Only send if deadline hasn't passed
      if (hoursLeft > 0) {
        // Send 5-day notification (between 5 days and 4.5 days)
        if (daysLeft >= 4 && daysLeft <= 5) {
          const key = `${row.job_id}_5_days`
          if (!existingNotifications.has(key)) {
            console.log(`[Deadline Check] Creating 5-day notification for: ${row.title}`)
            try {
              const notifResult = await query(
                `INSERT INTO notifications (candidate_id, job_id, type, title, message, deadline, notification_time)
                 VALUES ($1, $2, 'deadline_alert', $3, $4, $5, '5_days')
                 ON CONFLICT (candidate_id, job_id, type, notification_time) 
                 DO UPDATE SET times_sent = notifications.times_sent + 1
                 RETURNING *`,
                [
                  actualCandidateId,
                  row.job_id,
                  `Application Deadline: ${row.title}`,
                  `5 days left to apply for this saved job`,
                  row.application_deadline
                ]
              )
              
              if (notifResult.rows.length > 0) {
                createdNotifications.push(notifResult.rows[0])
              }
            } catch (insertErr) {
              console.error(`Failed to create 5-day notification for job ${row.job_id}:`, insertErr)
            }
          } else {
            console.log(`[Deadline Check] 5-day notification already exists for: ${row.title}`)
          }
        }
        
        // Send 24-hour notification (less than 24 hours)
        if (hoursLeft < 24 && hoursLeft > 0) {
          const key = `${row.job_id}_24_hours`
          if (!existingNotifications.has(key)) {
            console.log(`[Deadline Check] Creating 24-hour URGENT notification for: ${row.title}`)
            try {
              const notifResult = await query(
                `INSERT INTO notifications (candidate_id, job_id, type, title, message, deadline, notification_time)
                 VALUES ($1, $2, 'deadline_alert', $3, $4, $5, '24_hours')
                 ON CONFLICT (candidate_id, job_id, type, notification_time) 
                 DO UPDATE SET times_sent = notifications.times_sent + 1
                 RETURNING *`,
                [
                  actualCandidateId,
                  row.job_id,
                  `🚨 URGENT: ${row.title}`,
                  `Less than 24 hours left to apply!`,
                  row.application_deadline
                ]
              )
              
              if (notifResult.rows.length > 0) {
                createdNotifications.push(notifResult.rows[0])
              }
            } catch (insertErr) {
              console.error(`Failed to create 24-hour notification for job ${row.job_id}:`, insertErr)
            }
          } else {
            console.log(`[Deadline Check] 24-hour notification already exists for: ${row.title}`)
          }
        }
      }
    }

    console.log(`[Deadline Check] Created ${createdNotifications.length} new notifications`)

    res.json({ 
      checked: checkedJobs.length,
      created: createdNotifications.length, 
      notifications: createdNotifications,
      checkedJobs
    })
  } catch (err) {
    console.error('Error checking deadline notifications:', err)
    res.status(500).json({ error: 'Failed to check deadline notifications' })
  }
})

// Delete/dismiss notification
router.delete('/candidate/:candidateId/notifications/:notificationId', async (req, res) => {
  try {
    const { candidateId, notificationId } = req.params

    const result = await query(
      `DELETE FROM notifications 
       WHERE id = $1 AND candidate_id = $2
       RETURNING *`,
      [notificationId, candidateId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting notification:', err)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

// Create a test 24-hour deadline notification (manual trigger)
router.post('/candidate/:candidateId/test-deadline-notification', async (req, res) => {
  try {
    const { candidateId } = req.params
    const { jobId, title: customTitle, message: customMessage, deadline: customDeadline } = req.body || {}

    // Find a target job if not provided
    let targetJob = null
    if (jobId) {
      const jobResult = await query(
        `SELECT id, title, application_deadline FROM jobs WHERE id = $1 LIMIT 1`,
        [jobId]
      )
      targetJob = jobResult.rows[0]
    } else {
      const savedResult = await query(
        `SELECT j.id, j.title, j.application_deadline
         FROM saved_jobs sj
         JOIN jobs j ON j.id = sj.job_id
         WHERE sj.candidate_id = $1
         ORDER BY sj.created_at DESC
         LIMIT 1`,
        [candidateId]
      )
      targetJob = savedResult.rows[0]
    }

    if (!targetJob) {
      return res.status(404).json({ error: 'No job found to create test notification' })
    }

    const deadlineDate = customDeadline ? new Date(customDeadline) : (targetJob.application_deadline || new Date(Date.now() + 23 * 60 * 60 * 1000))

    const notifResult = await query(
      `INSERT INTO notifications (candidate_id, job_id, type, title, message, deadline, notification_time)
       VALUES ($1, $2, 'deadline_alert', $3, $4, $5, '24_hours')
       ON CONFLICT (candidate_id, job_id, type, notification_time)
       DO UPDATE SET times_sent = notifications.times_sent + 1
       RETURNING *`,
      [
        candidateId,
        targetJob.id,
        customTitle || `🚨 TEST URGENT: ${targetJob.title}`,
        customMessage || 'Test notification: less than 24 hours left to apply!',
        deadlineDate
      ]
    )

    res.json({ success: true, notification: notifResult.rows[0], job: targetJob })
  } catch (err) {
    console.error('Error creating test deadline notification:', err)
    res.status(500).json({ error: 'Failed to create test deadline notification' })
  }
})

export { router as recommendationsRouter }
