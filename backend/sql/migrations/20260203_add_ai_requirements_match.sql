-- Add ai_requirements_match column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_requirements_match JSONB;
