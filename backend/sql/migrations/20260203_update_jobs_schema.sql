-- Consolidation migration: Add all missing columns to jobs table
-- This ensures the running database matches the updated initialmigration.sql

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS require_experience BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_education BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS require_nationality TEXT,
ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reply_subject TEXT,
ADD COLUMN IF NOT EXISTS auto_reply_message TEXT,
ADD COLUMN IF NOT EXISTS hiring_contact_name TEXT,
ADD COLUMN IF NOT EXISTS hiring_contact_email TEXT,
ADD COLUMN IF NOT EXISTS rejection_subject TEXT,
ADD COLUMN IF NOT EXISTS rejection_message TEXT;
