-- Add AI review fields to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS ai_match_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMP;

-- Add index for AI reviewed applications
CREATE INDEX IF NOT EXISTS idx_applications_ai_reviewed ON applications(ai_reviewed_at);
