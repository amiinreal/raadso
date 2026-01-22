-- Migration from MVP v1 to enterprise v2 schema

-- Step 1: Check if migration already applied (detect new schema)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidate_profiles' AND column_name='first_name') THEN
    RAISE NOTICE 'Schema already upgraded to v2. Skipping migration.';
    RETURN;
  END IF;
END $$;

-- Step 2: Backup old data
CREATE TABLE IF NOT EXISTS candidate_profiles_backup AS SELECT * FROM candidate_profiles;

-- Step 3: Drop dependent tables and indexes (all records will be lost)
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS job_tags CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP INDEX IF EXISTS idx_jobs_tenant_id;
DROP TABLE IF EXISTS tenants CASCADE;
DROP INDEX IF EXISTS idx_tenants_user_id;

-- Step 3: Drop and recreate candidate_profiles with new schema
ALTER TABLE candidate_profiles RENAME TO candidate_profiles_old;

CREATE TABLE candidate_profiles (
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

-- Step 4: Migrate data from old to new structure
INSERT INTO candidate_profiles (
  id, user_id, first_name, last_name, email, phone, location, headline, summary, 
  employment_status, searchable, open_to_work, created_at
)
SELECT 
  id, 
  user_id, 
  COALESCE(SPLIT_PART(full_name, ' ', 1), 'Unknown') as first_name,
  COALESCE(NULLIF(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1), ''), 'Unknown') as last_name,
  email,
  phone,
  address as location,
  headline,
  summary,
  employment_status,
  searchable,
  open_to_work,
  created_at
FROM candidate_profiles_old;

-- Step 5: Update work_experiences to reference new candidate_profiles
ALTER TABLE work_experiences DROP CONSTRAINT work_experiences_candidate_id_fkey;
ALTER TABLE work_experiences ADD CONSTRAINT work_experiences_candidate_id_fkey 
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE;

-- Step 6: Update educations to reference new candidate_profiles
ALTER TABLE educations DROP CONSTRAINT educations_candidate_id_fkey;
ALTER TABLE educations ADD CONSTRAINT educations_candidate_id_fkey 
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE;

-- Step 7: Update skills to reference new candidate_profiles
ALTER TABLE skills DROP CONSTRAINT skills_candidate_id_fkey;
ALTER TABLE skills ADD CONSTRAINT skills_candidate_id_fkey 
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE;

-- Step 8: Update languages to reference new candidate_profiles
ALTER TABLE languages DROP CONSTRAINT languages_candidate_id_fkey;
ALTER TABLE languages ADD CONSTRAINT languages_candidate_id_fkey 
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE;

-- Step 9: Update attachments to reference new candidate_profiles
ALTER TABLE attachments DROP CONSTRAINT attachments_candidate_id_fkey;
ALTER TABLE attachments ADD CONSTRAINT attachments_candidate_id_fkey 
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE;

-- Step 10: Drop old candidate_profiles_old
DROP TABLE candidate_profiles_old;

-- Step 11: Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_name TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Step 12: Create new jobs table with enterprise fields
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

-- Step 13: Create job_tags table
CREATE TABLE IF NOT EXISTS job_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  tag TEXT
);

-- Step 14: Create applications table with simplified schema
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT DEFAULT 'Applied',
  notes TEXT,
  applied_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Step 15: Create indices
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_searchable ON candidate_profiles(searchable, open_to_work);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_tags_job_id ON job_tags(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);

-- Step 16: Seed new tenant and updated jobs
INSERT INTO tenants (user_id, company_name, industry, location, description, website)
SELECT id, 'Nimbus Labs', 'SaaS', 'San Francisco, CA', 'Building the future of product development.', 'https://nimbuslab.io'
FROM users WHERE email = 'employer@example.com'
ON CONFLICT DO NOTHING;

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
