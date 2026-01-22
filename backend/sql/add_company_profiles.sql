-- Add company profile enhancements to tenants table
-- This allows companies to have rich profiles with social media, videos, and followers

-- Add social media and video fields
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS youtube_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS founded_year INT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS mission TEXT,
ADD COLUMN IF NOT EXISTS culture TEXT;

-- Create company_followers table for follow functionality
CREATE TABLE IF NOT EXISTS company_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_followers_company ON company_followers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_followers_user ON company_followers(user_id);

-- Example structure for social_links:
-- {
--   "linkedin": "https://linkedin.com/company/example",
--   "twitter": "https://twitter.com/example",
--   "facebook": "https://facebook.com/example",
--   "instagram": "https://instagram.com/example"
-- }

-- Example structure for youtube_videos:
-- [
--   {"title": "Company Overview", "url": "https://youtube.com/watch?v=xxxxx", "embed_id": "xxxxx"},
--   {"title": "Culture Video", "url": "https://youtube.com/watch?v=yyyyy", "embed_id": "yyyyy"}
-- ]
