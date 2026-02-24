-- Add allow_replies column to jobs table
-- This controls whether candidates can reply to messages from employers

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS allow_replies BOOLEAN DEFAULT TRUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS allow_messaging BOOLEAN DEFAULT TRUE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_allow_replies ON jobs(allow_replies);
