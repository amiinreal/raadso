-- Add notes field to applications table for employer feedback
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_notes ON applications(id) WHERE notes != '';
