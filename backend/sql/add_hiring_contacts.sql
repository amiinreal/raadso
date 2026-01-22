-- Add hiring_contacts field to jobs table
-- This allows multiple hiring managers/contact persons to be stored as JSONB

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS hiring_contacts JSONB DEFAULT '[]'::jsonb;

-- Example structure for hiring_contacts:
-- [
--   {"name": "John Doe", "email": "john@example.com", "title": "Hiring Manager"},
--   {"name": "Jane Smith", "email": "jane@example.com", "title": "HR Manager"}
-- ]
