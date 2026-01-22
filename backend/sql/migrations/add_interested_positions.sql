-- Add interested positions table for notification system
CREATE TABLE IF NOT EXISTS candidate_interested_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  position_title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidate_interested_positions_candidate_id 
  ON candidate_interested_positions(candidate_id);

-- Add language and nationality foreign key relationships if they don't exist
-- First, ensure master_languages table has proper structure
CREATE TABLE IF NOT EXISTS master_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  iso_639_1 TEXT,
  iso_639_3 TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Ensure master_nationalities table has proper structure  
CREATE TABLE IF NOT EXISTS master_nationalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Add foreign key constraints for languages to use master_languages (if not already)
-- This requires updating the languages table structure
-- For now, we keep the current structure and will use the master tables for UI dropdowns

CREATE INDEX IF NOT EXISTS idx_master_languages_name ON master_languages(name);
CREATE INDEX IF NOT EXISTS idx_master_nationalities_name ON master_nationalities(name);
