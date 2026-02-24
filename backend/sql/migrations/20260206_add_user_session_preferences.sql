-- Track per-user UI/session preferences outside the browser
CREATE TABLE IF NOT EXISTS user_session_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_role JSONB DEFAULT '{}'::jsonb,
  last_active_tab TEXT,
  last_jobs_search TEXT,
  last_jobs_location TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT now()
);
