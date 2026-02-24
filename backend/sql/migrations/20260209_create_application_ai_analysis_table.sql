-- Create dedicated table for multilingual AI analysis results
-- This stores AI match analysis for applications in multiple languages

CREATE TABLE IF NOT EXISTS application_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  match_score SMALLINT CHECK (match_score >= 0 AND match_score <= 100),
  analysis_text TEXT,
  analysis_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure one analysis per application per language
  CONSTRAINT unique_app_lang UNIQUE(application_id, language_code)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_application_ai_analysis_app_id 
  ON application_ai_analysis(application_id);

CREATE INDEX IF NOT EXISTS idx_application_ai_analysis_language 
  ON application_ai_analysis(language_code);

CREATE INDEX IF NOT EXISTS idx_application_ai_analysis_score 
  ON application_ai_analysis(match_score);

-- Add comments to table and columns
COMMENT ON TABLE application_ai_analysis IS 'Stores multilingual AI match analysis results for job applications';
COMMENT ON COLUMN application_ai_analysis.application_id IS 'Foreign key to applications table';
COMMENT ON COLUMN application_ai_analysis.language_code IS 'Language code (en=English, so=Somali)';
COMMENT ON COLUMN application_ai_analysis.match_score IS 'AI match percentage (0-100)';
COMMENT ON COLUMN application_ai_analysis.analysis_text IS 'Full text AI analysis result';
COMMENT ON COLUMN application_ai_analysis.analysis_json IS 'Structured analysis data (for future parsing/sections)';
