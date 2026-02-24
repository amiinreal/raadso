-- Create platform_metrics table to track growth
CREATE TABLE IF NOT EXISTS platform_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_candidates INT DEFAULT 0,
  total_jobs INT DEFAULT 0,
  total_employers INT DEFAULT 0,
  total_applications INT DEFAULT 0,
  active_users INT DEFAULT 0,
  new_candidates_today INT DEFAULT 0,
  new_jobs_today INT DEFAULT 0,
  new_employers_today INT DEFAULT 0,
  applications_today INT DEFAULT 0,
  avg_application_rate DECIMAL(5,2) DEFAULT 0,
  hire_rate DECIMAL(5,2) DEFAULT 0,
  avg_time_to_hire INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_date)
);

-- Create daily_stats table for historical tracking
CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
  stat_date DATE NOT NULL,
  stat_type VARCHAR(50) NOT NULL, -- 'candidate_signup', 'job_posted', 'application_submitted', 'hire_completed'
  count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(stat_date, stat_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_type ON daily_stats(stat_type);

-- Function to update platform metrics
CREATE OR REPLACE FUNCTION update_platform_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO platform_metrics (
    metric_date,
    total_candidates,
    total_jobs,
    total_employers,
    total_applications,
    active_users,
    new_candidates_today,
    new_jobs_today,
    new_employers_today,
    applications_today
  )
  SELECT
    CURRENT_DATE,
    (SELECT COUNT(*) FROM candidate_profiles),
    (SELECT COUNT(*) FROM jobs WHERE active = true),
    (SELECT COUNT(*) FROM tenants),
    (SELECT COUNT(*) FROM applications),
    (SELECT COUNT(DISTINCT user_id) FROM two_fa_sessions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM candidate_profiles WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM jobs WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM tenants WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM applications WHERE applied_at >= CURRENT_DATE AND applied_at < CURRENT_DATE + INTERVAL '1 day')
  ON CONFLICT (metric_date) DO UPDATE SET
    total_candidates = EXCLUDED.total_candidates,
    total_jobs = EXCLUDED.total_jobs,
    total_employers = EXCLUDED.total_employers,
    total_applications = EXCLUDED.total_applications,
    active_users = EXCLUDED.active_users,
    new_candidates_today = EXCLUDED.new_candidates_today,
    new_jobs_today = EXCLUDED.new_jobs_today,
    new_employers_today = EXCLUDED.new_employers_today,
    applications_today = EXCLUDED.applications_today,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Seed initial data for today
SELECT update_platform_metrics();
