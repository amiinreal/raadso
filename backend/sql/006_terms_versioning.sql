-- Add terms_version_accepted to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version_accepted VARCHAR(50);

-- Set existing users to version 1.0.0 if they have already agreed
UPDATE users SET terms_version_accepted = '1.0.0' WHERE agreed_to_terms = true AND terms_version_accepted IS NULL;
