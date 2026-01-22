-- Create notifications table for deadline alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'deadline_alert', -- deadline_alert, deadline_5days, deadline_24hours, application_sent, etc
  title TEXT NOT NULL,
  message TEXT,
  deadline DATE,
  notification_time TEXT, -- '5_days', '24_hours' to track which notification was sent
  times_sent INT DEFAULT 1,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  read_at TIMESTAMP,
  UNIQUE(candidate_id, job_id, type, notification_time)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_candidate_unread ON notifications(candidate_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_job_tracking ON notifications(candidate_id, job_id, notification_time);
