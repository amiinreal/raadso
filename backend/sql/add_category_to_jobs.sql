-- Add category_id to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES job_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id);
