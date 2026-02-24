-- Migration: Add first_name and last_name to users, and backfill from candidate_profiles
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Backfill first_name and last_name for users who are candidates
UPDATE users
SET first_name = cp.first_name,
    last_name = cp.last_name
FROM candidate_profiles cp
WHERE users.id = cp.user_id
  AND (users.first_name IS NULL OR users.last_name IS NULL);
