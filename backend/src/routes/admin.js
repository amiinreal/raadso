import express from 'express'
import { query } from '../db.js'

const router = express.Router()

export async function getPlatformMetrics(req, res) {
  try {
    const { range = 'month' } = req.query

    // Get metrics from platform_metrics table
    const result = await query(`
      SELECT 
        total_candidates,
        total_jobs,
        total_employers,
        total_applications,
        new_candidates_today,
        new_jobs_today,
        new_employers_today,
        applications_today,
        hire_rate,
        avg_time_to_hire
      FROM platform_metrics
      WHERE metric_date = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return res.json({
        total_candidates: 0,
        total_jobs: 0,
        total_employers: 0,
        total_applications: 0,
        candidate_change: '+0%',
        job_change: '+0%',
        employer_change: '+0%',
        app_change: '+0%'
      })
    }

    const metrics = result.rows[0]

    res.json({
      total_candidates: metrics.total_candidates || 0,
      total_jobs: metrics.total_jobs || 0,
      total_employers: metrics.total_employers || 0,
      total_applications: metrics.total_applications || 0,
      candidate_change: '+' + (metrics.new_candidates_today || 0) + '%',
      job_change: '+' + (metrics.new_jobs_today || 0) + '%',
      employer_change: '+' + (metrics.new_employers_today || 0) + '%',
      app_change: '+' + (metrics.applications_today || 0) + '%',
      hire_rate: metrics.hire_rate || 0,
      avg_time_to_hire: metrics.avg_time_to_hire || 0
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
