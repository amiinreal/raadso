import express from 'express'
import { query } from '../db.js'

const router = express.Router()

export async function getPlatformMetrics(req, res) {
  try {
    const { range = 'month' } = req.query

    // Calculate real-time metrics instead of relying solely on the platform_metrics table
    // which might not be updated by a cron job yet.
    const [
      candidatesCount,
      jobsCount,
      employersCount,
      appsCount,
      recentCandidates,
      recentJobs,
      recentEmployers,
      recentApps
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM candidate_profiles'),
      query('SELECT COUNT(*) FROM jobs WHERE active = true'),
      query('SELECT COUNT(*) FROM tenants'),
      query('SELECT COUNT(*) FROM applications'),
      query("SELECT COUNT(*) FROM candidate_profiles WHERE created_at >= NOW() - INTERVAL '30 days'"),
      query("SELECT COUNT(*) FROM jobs WHERE created_at >= NOW() - INTERVAL '30 days'"),
      query("SELECT COUNT(*) FROM tenants WHERE created_at >= NOW() - INTERVAL '30 days'"),
      query("SELECT COUNT(*) FROM applications WHERE created_at >= NOW() - INTERVAL '30 days'")
    ])

    const total_candidates = parseInt(candidatesCount.rows[0].count)
    const total_jobs = parseInt(jobsCount.rows[0].count)
    const total_employers = parseInt(employersCount.rows[0].count)
    const total_applications = parseInt(appsCount.rows[0].count)

    // Calculate growth percentages (simple comparison vs last 30 days)
    const calcChange = (current, total) => {
      if (total === 0 || current === 0) return '+0%'
      const prev = total - current
      if (prev <= 0) return '+100%'
      return '+' + Math.round((current / prev) * 100) + '%'
    }

    res.json({
      total_candidates,
      total_jobs,
      total_employers,
      total_applications,
      candidate_change: calcChange(parseInt(recentCandidates.rows[0].count), total_candidates),
      job_change: calcChange(parseInt(recentJobs.rows[0].count), total_jobs),
      employer_change: calcChange(parseInt(recentEmployers.rows[0].count), total_employers),
      app_change: calcChange(parseInt(recentApps.rows[0].count), total_applications),
      hire_rate: 15.5, // Mocked for now until we have hired status tracking
      avg_time_to_hire: 12
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getRecentActivity(req, res) {
  try {
    const limit = req.query.limit || 5

    const result = await query(`
      SELECT 
        'job_posted' as type,
        'New job posted by ' || t.company_name as action,
        j.created_at,
        'work' as icon
      FROM jobs j
      JOIN tenants t ON j.tenant_id = t.id
      WHERE j.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY j.created_at DESC
      LIMIT $1
    `, [limit])

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching activity:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Routes
router.get('/metrics', getPlatformMetrics)
router.get('/activity', getRecentActivity)

export default router
