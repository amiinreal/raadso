-- Migration: Add ad_number field to jobs table
-- This migration adds a unique 9-digit ad number to identify jobs in URLs

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ad_number VARCHAR(9) UNIQUE;

-- Create index for ad_number lookups
CREATE INDEX IF NOT EXISTS idx_jobs_ad_number ON jobs(ad_number);

-- Function to generate unique 9-digit ad number
CREATE OR REPLACE FUNCTION generate_ad_number()
RETURNS VARCHAR(9) AS $$
DECLARE
  new_number VARCHAR(9);
  attempt INT := 0;
  max_attempts INT := 10;
BEGIN
  WHILE attempt < max_attempts LOOP
    -- Generate random 9-digit number (100000000-999999999)
    new_number := LPAD((100000000 + (random() * 899999999)::INT)::TEXT, 9, '0');
    
    -- Check if number already exists
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE ad_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    attempt := attempt + 1;
  END LOOP;
  
  -- If we couldn't generate a unique number, raise an error
  RAISE EXCEPTION 'Could not generate unique ad number after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Update existing jobs to have ad_number if they don't already
UPDATE jobs
SET ad_number = generate_ad_number()
WHERE ad_number IS NULL;

-- Make ad_number NOT NULL after populating existing records
ALTER TABLE jobs ALTER COLUMN ad_number SET NOT NULL;
