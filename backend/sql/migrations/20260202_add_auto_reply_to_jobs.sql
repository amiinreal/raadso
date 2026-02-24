-- Migration to add auto-reply fields to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reply_subject TEXT,
ADD COLUMN IF NOT EXISTS auto_reply_message TEXT,
ADD COLUMN IF NOT EXISTS hiring_contact_name TEXT,
ADD COLUMN IF NOT EXISTS hiring_contact_email TEXT;
