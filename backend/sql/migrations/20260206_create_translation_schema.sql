-- Phase 1: DB-only translation schema
-- Start fresh: translation tables for RAADI

CREATE TABLE IF NOT EXISTS translation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,       -- common, employer, candidate, admin, seo, errors
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
  language TEXT NOT NULL,      -- en, so, etc.
  value TEXT NOT NULL,
  source TEXT DEFAULT 'manual', -- manual | admin | ai | experiment
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (translation_key_id, language)
);

CREATE TABLE IF NOT EXISTS translation_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  variant TEXT NOT NULL,        -- A, B, C
  value TEXT NOT NULL,
  UNIQUE (translation_key_id, language, variant)
);
