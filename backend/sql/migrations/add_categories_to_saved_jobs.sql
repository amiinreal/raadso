-- Add category support to saved jobs

ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';

-- Create job_categories table for tracking user's custom categories
CREATE TABLE IF NOT EXISTS job_save_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, category_name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_job_save_categories_candidate_id ON job_save_categories(candidate_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_category ON saved_jobs(candidate_id, category);
