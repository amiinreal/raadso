-- Schema for advanced job platform MVP
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  nationality TEXT,
  headline TEXT,
  summary TEXT,
  seniority_level TEXT,
  years_of_experience INT,
  cv_file_url TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  employment_status TEXT,
  searchable BOOLEAN DEFAULT true,
  open_to_work BOOLEAN DEFAULT true,
  last_updated TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_title TEXT,
  company_name TEXT,
  employment_type TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  degree TEXT,
  field_of_study TEXT,
  institution TEXT,
  start_year INT,
  end_year INT
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  skill_name TEXT,
  skill_type TEXT,
  proficiency TEXT
);

CREATE TABLE IF NOT EXISTS languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  language TEXT,
  proficiency TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  type TEXT,
  file_url TEXT
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_name TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  phone TEXT,
  company_email TEXT,
  org_number TEXT,
  status TEXT DEFAULT 'pending',
  approved BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  title TEXT NOT NULL,
  location TEXT,
  employment_type TEXT,
  workplace_type TEXT,
  seniority_level TEXT,
  about_role TEXT,
  about_company TEXT,
  key_responsibilities TEXT[],
  required_skills TEXT[],
  preferred_skills TEXT[],
  salary_min NUMERIC,
  salary_max NUMERIC,
  currency TEXT,
  application_deadline DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  tag TEXT
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT DEFAULT 'Applied',
  notes TEXT,
  used_profile BOOLEAN DEFAULT false,
  used_cv BOOLEAN DEFAULT false,
  custom_files JSONB DEFAULT '[]'::jsonb,
  ai_match_score INTEGER,
  ai_analysis TEXT,
  ai_reviewed_at TIMESTAMP,
  applied_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_searchable ON candidate_profiles(searchable, open_to_work);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_tags_job_id ON job_tags(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);

-- All seed/example data removed for a clean schema