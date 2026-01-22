-- Schema for advanced job platform MVP
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
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

-- Seed data for quick start
-- bcrypt hash for password "changeme"
INSERT INTO users (email, password, role)
VALUES 
  ('candidate@example.com', '$2a$10$1GYbZux41DmvNmO6PsK0s.2F1uWshxupCSvJzpuG1HsRvN7kYM/qy', 'candidate'),
  ('employer@example.com', '$2a$10$1GYbZux41DmvNmO6PsK0s.2F1uWshxupCSvJzpuG1HsRvN7kYM/qy', 'employer'),
  ('admin@example.com', '$2a$10$1GYbZux41DmvNmO6PsK0s.2F1uWshxupCSvJzpuG1HsRvN7kYM/qy', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create tenant for employer
INSERT INTO tenants (user_id, company_name, industry, location, description, website, phone, company_email, org_number, status, approved)
SELECT id, 'Nimbus Labs', 'SaaS', 'San Francisco, CA', 'Building the future of product development.', 'https://nimbuslab.io', '+1 (415) 555-0199', 'hq@nimbuslab.io', 'ORG-123456', 'approved', true
FROM users WHERE email = 'employer@example.com'
ON CONFLICT DO NOTHING;

-- Create candidate profile
WITH inserted_candidate AS (
  INSERT INTO candidate_profiles (user_id, first_name, last_name, email, phone, location, nationality, headline, summary, seniority_level, years_of_experience, employment_status, open_to_work)
  VALUES (
    (SELECT id FROM users WHERE email = 'candidate@example.com'),
    'Jordan',
    'Avery',
    'candidate@example.com',
    '+1 (555) 123-4567',
    'Remote / Austin, TX',
    'United States',
    'Senior Fullstack Engineer',
    'Builder with a product mindset who ships reliable experiences across React, Node, and PostgreSQL.',
    'Senior',
    8,
    'Open to roles',
    true
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id
)
SELECT 1;

-- Safely capture candidate id from either insert or existing row
DO $$
DECLARE
  cid UUID;
BEGIN
  SELECT id INTO cid FROM candidate_profiles WHERE email = 'candidate@example.com' LIMIT 1;

  IF cid IS NOT NULL THEN
    INSERT INTO work_experiences (candidate_id, job_title, company_name, employment_type, start_date, end_date, description)
    VALUES
      (cid, 'Staff Software Engineer', 'Nimbus Labs', 'Full-time', '2022-01-01', NULL, 'Led feature squads, modernized frontend, and improved platform reliability.'),
      (cid, 'Senior Fullstack Engineer', 'Atlas Cloud', 'Full-time', '2019-02-01', '2021-12-01', 'Shipped customer onboarding, billing, and data export features.');

    INSERT INTO educations (candidate_id, degree, field_of_study, institution, start_year, end_year)
    VALUES (cid, 'B.Sc.', 'Computer Science', 'State University', 2012, 2016);

    INSERT INTO skills (candidate_id, skill_name, skill_type, proficiency)
    VALUES
      (cid, 'React', 'frontend', 'Expert'),
      (cid, 'Node.js', 'backend', 'Advanced'),
      (cid, 'PostgreSQL', 'database', 'Advanced'),
      (cid, 'TypeScript', 'frontend', 'Advanced');

    INSERT INTO languages (candidate_id, language, proficiency)
    VALUES (cid, 'English', 'Native'), (cid, 'Spanish', 'Professional');

    INSERT INTO attachments (candidate_id, type, file_url)
    VALUES (cid, 'cv', 'https://example.com/cv/jordan-avery.pdf');
  END IF;
END $$;

-- Create sample jobs from tenant
INSERT INTO jobs (tenant_id, title, location, employment_type, workplace_type, seniority_level, about_role, about_company, key_responsibilities, required_skills, preferred_skills, salary_min, salary_max, currency, active)
SELECT 
  t.id,
  'Lead Frontend Engineer',
  'Remote - US',
  'Full-time',
  'Remote',
  'Senior',
  'Own design systems and product surfaces across web.',
  'Fast-growing B2B SaaS reinventing onboarding.',
  ARRAY['Design and ship components across web platform', 'Mentor junior engineers', 'Drive architecture improvements'],
  ARRAY['React', 'TypeScript', 'CSS'],
  ARRAY['Design Systems', 'GraphQL'],
  140000,
  180000,
  'USD',
  true
FROM tenants t WHERE company_name = 'Nimbus Labs'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (tenant_id, title, location, employment_type, workplace_type, seniority_level, about_role, about_company, key_responsibilities, required_skills, preferred_skills, salary_min, salary_max, currency, active)
SELECT 
  t.id,
  'Senior Backend Engineer',
  'New York, NY',
  'Full-time',
  'Hybrid',
  'Senior',
  'Scale APIs, improve reliability, and drive infra improvements.',
  'AI-native data platform.',
  ARRAY['Design scalable APIs', 'Optimize database performance', 'Lead technical design reviews'],
  ARRAY['Node.js', 'PostgreSQL', 'AWS'],
  ARRAY['Go', 'Rust', 'Kubernetes'],
  150000,
  200000,
  'USD',
  true
FROM tenants t WHERE company_name = 'Nimbus Labs'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (tenant_id, title, location, employment_type, workplace_type, seniority_level, about_role, about_company, key_responsibilities, required_skills, preferred_skills, active)
SELECT 
  t.id,
  'Product Engineer',
  'Austin, TX',
  'Contract-to-hire',
  'Remote',
  'Mid',
  'Work across stack, talk to users, ship quickly.',
  'Early-stage startup shipping rapidly.',
  ARRAY['Ship features end-to-end', 'Own user research', 'Build with customers'],
  ARRAY['JavaScript', 'React', 'Node.js'],
  ARRAY['Product thinking', 'Design collaboration'],
  NULL,
  NULL,
  NULL,
  true
FROM tenants t WHERE company_name = 'Nimbus Labs'
ON CONFLICT DO NOTHING;
INSERT INTO job_tags (job_id, tag)
SELECT j.id, tag
FROM jobs j
JOIN (VALUES
  ('Lead Frontend Engineer', 'React'),
  ('Lead Frontend Engineer', 'Design Systems'),
  ('Lead Frontend Engineer', 'TypeScript'),
  ('Senior Backend Engineer', 'PostgreSQL'),
  ('Senior Backend Engineer', 'Node.js'),
  ('Senior Backend Engineer', 'AWS'),
  ('Product Engineer', 'Fullstack'),
  ('Product Engineer', 'JavaScript'),
  ('Product Engineer', 'Startup')
) AS t(title, tag) ON j.title = t.title
ON CONFLICT DO NOTHING;