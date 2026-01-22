-- Add saved jobs tracking for users

CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT now(),
  notes TEXT,
  UNIQUE(candidate_id, job_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_saved_jobs_candidate_id ON saved_jobs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_created_at ON saved_jobs(saved_at DESC);
