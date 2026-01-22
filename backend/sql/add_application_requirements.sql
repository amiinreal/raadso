-- Add application requirements configuration to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS require_profile BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS require_cv BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_file_requirements JSONB DEFAULT '[]';

-- custom_file_requirements structure:
-- [
--   {
--     "id": "req-1",
--     "name": "Certificate",
--     "description": "Professional certification",
--     "required": true,
--     "fileTypes": ["pdf", "doc", "docx"]
--   },
--   ...
-- ]

-- Add custom files storage to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS custom_files JSONB DEFAULT '[]';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS used_profile BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS used_cv BOOLEAN DEFAULT false;

-- custom_files structure:
-- [
--   {
--     "requirementId": "req-1",
--     "requirementName": "Certificate",
--     "fileName": "cert.pdf",
--     "fileUrl": "https://cdn.bunny.net/..."
--   },
--   ...
-- ]

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id) WHERE job_id IS NOT NULL;
