-- Add tech_stack column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_jobs_tech_stack ON jobs USING GIN(tech_stack);
