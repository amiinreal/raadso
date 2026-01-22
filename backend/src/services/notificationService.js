import { query } from '../db.js'

/**
 * Check all candidates for upcoming deadlines and create notifications
 */
export const checkAllDeadlines = async () => {
  try {
    console.log('[Notification Service] Starting deadline check for all candidates')
    
    // Get all candidates
    const candidatesResult = await query(
      `SELECT DISTINCT sj.candidate_id 
       FROM saved_jobs sj 
       JOIN jobs j ON j.id = sj.job_id 
       WHERE j.application_deadline IS NOT NULL`
    )

    let totalChecked = 0
    let totalCreated = 0

    // Check each candidate's deadlines
    for (const row of candidatesResult.rows) {
      try {
        const candidateId = row.candidate_id
        
        // Get saved jobs with upcoming deadlines
        const savedJobsResult = await query(
          `SELECT sj.id as saved_job_id, sj.job_id, j.title, j.application_deadline
           FROM saved_jobs sj
           LEFT JOIN jobs j ON sj.job_id = j.id
           LEFT JOIN applications a ON a.job_id = j.id AND a.candidate_id = sj.candidate_id
           WHERE sj.candidate_id = $1 
             AND j.application_deadline IS NOT NULL
             AND a.id IS NULL`,
          [candidateId]
        )

        // Get existing notifications
        const existingResult = await query(
          `SELECT job_id, notification_time, times_sent 
           FROM notifications 
           WHERE candidate_id = $1 AND type = 'deadline_alert'`,
          [candidateId]
        )
        
        const existingNotifications = new Map()
        existingResult.rows.forEach(row => {
          const key = `${row.job_id}_${row.notification_time}`
          existingNotifications.set(key, row.times_sent)
        })

        const now = new Date()

        // Create notifications for upcoming deadlines
        for (const jobRow of savedJobsResult.rows) {
          const deadline = new Date(jobRow.application_deadline)
          const hoursLeft = (deadline - now) / (1000 * 60 * 60)
          const daysLeft = Math.ceil(hoursLeft / 24)

          totalChecked++

          // 5-day notification (between 5 days and 4.5 days)
          if (daysLeft >= 4 && daysLeft <= 5) {
            const key = `${jobRow.job_id}_5_days`
            if (!existingNotifications.has(key)) {
              await query(
                `INSERT INTO notifications (candidate_id, job_id, type, title, message, deadline, notification_time)
                 VALUES ($1, $2, 'deadline_alert', $3, $4, $5, '5_days')
                 ON CONFLICT (candidate_id, job_id, type, notification_time) 
                 DO UPDATE SET times_sent = notifications.times_sent + 1`,
                [
                  candidateId,
                  jobRow.job_id,
                  `Application Deadline: ${jobRow.title}`,
                  `5 days left to apply for this saved job`,
                  jobRow.application_deadline
                ]
              )
              totalCreated++
            }
          }

          // 24-hour notification
          if (hoursLeft < 24 && hoursLeft > 0) {
            const key = `${jobRow.job_id}_24_hours`
            if (!existingNotifications.has(key)) {
              await query(
                `INSERT INTO notifications (candidate_id, job_id, type, title, message, deadline, notification_time)
                 VALUES ($1, $2, 'deadline_alert', $3, $4, $5, '24_hours')
                 ON CONFLICT (candidate_id, job_id, type, notification_time) 
                 DO UPDATE SET times_sent = notifications.times_sent + 1`,
                [
                  candidateId,
                  jobRow.job_id,
                  `🚨 URGENT: ${jobRow.title}`,
                  `Less than 24 hours left to apply!`,
                  jobRow.application_deadline
                ]
              )
              totalCreated++
            }
          }
        }
      } catch (candidateErr) {
        console.error(`Error checking deadlines for candidate ${row.candidate_id}:`, candidateErr)
      }
    }

    console.log(`[Notification Service] Checked ${totalChecked} saved jobs, created ${totalCreated} notifications`)
    return { checked: totalChecked, created: totalCreated }
  } catch (err) {
    console.error('[Notification Service] Error checking all deadlines:', err)
    throw err
  }
}

/**
 * Start a scheduled notification check service
 * @param {number} intervalMinutes - How often to check (in minutes)
 */
export const startNotificationScheduler = (intervalMinutes = 120) => {
  console.log(`[Notification Service] Starting notification scheduler (check every ${intervalMinutes} minutes)`)
  
  // Run immediately on startup
  checkAllDeadlines().catch(err => console.error('Initial deadline check failed:', err))
  
  // Then run on schedule
  const intervalMs = intervalMinutes * 60 * 1000
  const intervalId = setInterval(() => {
    checkAllDeadlines().catch(err => console.error('Scheduled deadline check failed:', err))
  }, intervalMs)

  return intervalId
}

/**
 * Stop the notification scheduler
 */
export const stopNotificationScheduler = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId)
    console.log('[Notification Service] Notification scheduler stopped')
  }
}
