-- Add user preferences and job interaction tracking for personalized recommendations

-- Table for tracking user's interested job categories/tags
CREATE TABLE IF NOT EXISTS user_job_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  category TEXT,
  liked_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, tag)
);

-- Table for tracking user interactions with jobs (views, likes, dislikes)
CREATE TABLE IF NOT EXISTS job_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'view', 'like', 'dislike', 'applied'
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, job_id, interaction_type)
);

-- Table for job compatibility scores (cached for performance)
CREATE TABLE IF NOT EXISTS job_compatibility_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  compatibility_score DECIMAL(5, 2), -- 0-100
  skill_match DECIMAL(5, 2),
  category_match DECIMAL(5, 2),
  experience_match DECIMAL(5, 2),
  calculated_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_job_preferences_candidate_id ON user_job_preferences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_interactions_candidate_id ON job_interactions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_interactions_job_id ON job_interactions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_compatibility_scores_candidate_id ON job_compatibility_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_compatibility_scores_score ON job_compatibility_scores(compatibility_score DESC);
