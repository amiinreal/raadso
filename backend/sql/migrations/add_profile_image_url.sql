-- Add profile image URL to candidate profiles
ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
