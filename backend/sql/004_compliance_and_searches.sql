-- Compliance: terms agreement
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMP WITH TIME ZONE;

-- Recommendations: Search History
CREATE TABLE IF NOT EXISTS user_searches (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB, -- Store location, type, etc used during search
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast retrieval of recent searches
CREATE INDEX IF NOT EXISTS idx_user_searches_user_created ON user_searches(user_id, created_at DESC);
