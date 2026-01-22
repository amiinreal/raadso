-- Add job requirement fields for profile, CV, experience, education, languages, and nationality
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS require_profile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_cv BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_experience BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_education BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_languages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS require_nationality TEXT,
ADD COLUMN IF NOT EXISTS custom_file_requirements JSONB DEFAULT '[]'::jsonb;
