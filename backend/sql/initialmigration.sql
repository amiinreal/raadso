-- initialmigration.sql: Master migration for raadso platform
-- 1. CREATE TABLES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  preferred_locale TEXT DEFAULT 'en',
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  is_admin BOOLEAN DEFAULT false,
  agreed_to_terms BOOLEAN DEFAULT false,
  agreed_at TIMESTAMP WITH TIME ZONE,
  terms_version_accepted VARCHAR(50)
);

-- Set is_admin true for users with admin role
UPDATE users SET is_admin = true WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS supported_locales (
  locale TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  admin_only BOOLEAN DEFAULT FALSE,
  coming_soon_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO supported_locales (locale, label, enabled, admin_only, coming_soon_message)
VALUES
  ('en', 'English', TRUE, FALSE, NULL),
  ('so', 'Somali', FALSE, FALSE, 'Somali translations are coming soon. Admins can preview while content is translated.')
ON CONFLICT (locale) DO UPDATE
SET
  label = EXCLUDED.label,
  enabled = EXCLUDED.enabled,
  admin_only = EXCLUDED.admin_only,
  coming_soon_message = EXCLUDED.coming_soon_message,
  updated_at = NOW();

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
  profile_image_url TEXT,
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

CREATE TABLE IF NOT EXISTS candidate_interested_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  position_title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_session_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_role JSONB DEFAULT '{}'::jsonb,
  last_active_tab TEXT,
  last_jobs_search TEXT,
  last_jobs_location TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT now()
);

-- Translation registry (DB is the single source of truth)
CREATE TABLE IF NOT EXISTS translation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (translation_key_id, language)
);

CREATE TABLE IF NOT EXISTS translation_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  variant TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE (translation_key_id, language, variant)
);

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



-- Ensure master_languages and master_nationalities have correct structure
DROP TABLE IF EXISTS master_languages CASCADE;
CREATE TABLE IF NOT EXISTS master_languages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  iso_639_1 VARCHAR(5),
  iso_639_3 VARCHAR(5)
);

DROP TABLE IF EXISTS master_nationalities CASCADE;
CREATE TABLE IF NOT EXISTS master_nationalities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS industries (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
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
  ,industry_id INTEGER REFERENCES industries(id)
  ,social_links JSONB DEFAULT '{}'::jsonb
  ,youtube_videos JSONB DEFAULT '[]'::jsonb
  ,company_size TEXT
  ,founded_year INT
  ,about TEXT
  ,mission TEXT
  ,culture TEXT
  ,slug VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS job_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES job_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Function to generate unique 9-digit ad number
CREATE OR REPLACE FUNCTION generate_ad_number()
RETURNS VARCHAR(9) AS $$
DECLARE
  new_number VARCHAR(9);
  attempt INT := 0;
  max_attempts INT := 10;
BEGIN
  WHILE attempt < max_attempts LOOP
    new_number := LPAD((100000000 + (random() * 899999999)::INT)::TEXT, 9, '0');
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE ad_number = new_number) THEN
      RETURN new_number;
    END IF;
    attempt := attempt + 1;
  END LOOP;
  RAISE EXCEPTION 'Could not generate unique ad number after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql;

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
  ad_number VARCHAR(9) UNIQUE,
  created_at TIMESTAMP DEFAULT now()
  ,category_id UUID REFERENCES job_categories(id) ON DELETE SET NULL
  ,tech_stack TEXT[] DEFAULT '{}'
  ,hiring_contacts JSONB DEFAULT '[]'::jsonb
  ,require_profile BOOLEAN DEFAULT false
  ,require_cv BOOLEAN DEFAULT false
  ,require_experience BOOLEAN DEFAULT false
  ,require_education BOOLEAN DEFAULT false
  ,require_languages TEXT[] DEFAULT '{}'
  ,require_nationality TEXT
  ,custom_file_requirements JSONB DEFAULT '[]'
  ,auto_reply_enabled BOOLEAN DEFAULT false
  ,auto_reply_subject TEXT
  ,auto_reply_message TEXT
  ,hiring_contact_name TEXT
  ,hiring_contact_email TEXT
  ,rejection_subject TEXT
  ,rejection_message TEXT
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
  ai_requirements_match JSONB,
  ai_reviewed_at TIMESTAMP,
  applied_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE TABLE IF NOT EXISTS job_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, job_id, interaction_type)
);

CREATE TABLE IF NOT EXISTS job_compatibility_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  compatibility_score DECIMAL(5, 2),
  skill_match DECIMAL(5, 2),
  category_match DECIMAL(5, 2),
  experience_match DECIMAL(5, 2),
  calculated_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT now()
);

  -- Language and Nationality Master Tables
  CREATE TABLE IF NOT EXISTS master_languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_639_1 VARCHAR(5),
    iso_639_3 VARCHAR(5)
  );

  CREATE TABLE IF NOT EXISTS master_nationalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS language_nationalities (
    language_id INT REFERENCES master_languages(id) ON DELETE CASCADE,
    nationality_id INT REFERENCES master_nationalities(id) ON DELETE CASCADE,
    PRIMARY KEY (language_id, nationality_id)
  );

CREATE TABLE IF NOT EXISTS two_fa_codes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMP NULL,
  UNIQUE(user_id, code)
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP NULL,
  declined_at TIMESTAMP NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS two_fa_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  temp_token VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  verified_code_id INTEGER REFERENCES two_fa_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '15 minutes'),
  completed_at TIMESTAMP NULL,
  device_label TEXT,
  user_agent TEXT,
  ip_address TEXT,
  trusted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  device_fingerprint TEXT NOT NULL DEFAULT '',
  token_jti TEXT,
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  subject TEXT,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'deadline_alert',
  title TEXT NOT NULL,
  message TEXT,
  deadline DATE,
  notification_time TEXT,
  times_sent INT DEFAULT 1,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  read_at TIMESTAMP,
  UNIQUE(candidate_id, job_id, type, notification_time)
);

CREATE TABLE IF NOT EXISTS platform_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_searches (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT now(),
  notes TEXT,
  category VARCHAR(100) DEFAULT 'General',
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS job_save_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, category_name)
);





-- Add slug column to tenants table

-- Make slug NOT NULL after populating
ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;

-- 3. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_tenants_industry_id ON tenants(industry_id);
CREATE INDEX IF NOT EXISTS idx_industries_slug ON industries(slug);
CREATE INDEX IF NOT EXISTS idx_industries_category ON industries(category);
CREATE INDEX IF NOT EXISTS idx_job_categories_slug ON job_categories(slug);
CREATE INDEX IF NOT EXISTS idx_job_categories_parent_id ON job_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tech_stack ON jobs USING GIN(tech_stack);
CREATE INDEX IF NOT EXISTS idx_company_followers_company ON company_followers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_followers_user ON company_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_user_device ON two_fa_sessions(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_two_fa_sessions_expires ON two_fa_sessions(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS two_fa_sessions_token_jti_idx
  ON two_fa_sessions(token_jti)
  WHERE token_jti IS NOT NULL;

-- 4. DATA MIGRATIONS (INSERT/UPDATE/SEED)

-- Seed industries data
INSERT INTO industries (name, slug, category) VALUES
('Technology & Software', 'technology-software', 'Technology & Software'),
('Software Development', 'software-development', 'Technology & Software'),
('Web Development', 'web-development', 'Technology & Software'),
('Mobile App Development', 'mobile-app-development', 'Technology & Software'),
('SaaS', 'saas', 'Technology & Software'),
('Cloud Computing', 'cloud-computing', 'Technology & Software'),
('Artificial Intelligence', 'artificial-intelligence', 'Technology & Software'),
('Machine Learning', 'machine-learning', 'Technology & Software'),
('Data Analytics', 'data-analytics', 'Technology & Software'),
('Big Data', 'big-data', 'Technology & Software'),
('Cybersecurity', 'cybersecurity', 'Technology & Software'),
('Blockchain', 'blockchain', 'Technology & Software'),
('Web3', 'web3', 'Technology & Software'),
('FinTech', 'fintech', 'Technology & Software'),
('HealthTech', 'healthtech', 'Technology & Software'),
('EdTech', 'edtech', 'Technology & Software'),
('GovTech', 'govtech', 'Technology & Software'),
('InsurTech', 'insurtech', 'Technology & Software'),
('LegalTech', 'legaltech', 'Technology & Software'),
('PropTech', 'proptech', 'Technology & Software'),
('MarTech', 'martech', 'Technology & Software'),
('Manufacturing', 'manufacturing', 'Manufacturing & Industrial'),
('Industrial Manufacturing', 'industrial-manufacturing', 'Manufacturing & Industrial'),
('Heavy Industry', 'heavy-industry', 'Manufacturing & Industrial'),
('Light Manufacturing', 'light-manufacturing', 'Manufacturing & Industrial'),
('Automotive Manufacturing', 'automotive-manufacturing', 'Manufacturing & Industrial'),
('Aerospace Manufacturing', 'aerospace-manufacturing', 'Manufacturing & Industrial'),
('Defense Manufacturing', 'defense-manufacturing', 'Manufacturing & Industrial'),
('Electronics Manufacturing', 'electronics-manufacturing', 'Manufacturing & Industrial'),
('Semiconductor Manufacturing', 'semiconductor-manufacturing', 'Manufacturing & Industrial'),
('Machinery Manufacturing', 'machinery-manufacturing', 'Manufacturing & Industrial'),
('Robotics Manufacturing', 'robotics-manufacturing', 'Manufacturing & Industrial'),
('Chemical Manufacturing', 'chemical-manufacturing', 'Manufacturing & Industrial'),
('Pharmaceutical Manufacturing', 'pharmaceutical-manufacturing', 'Manufacturing & Industrial'),
('Medical Device Manufacturing', 'medical-device-manufacturing', 'Manufacturing & Industrial'),
('Textile Manufacturing', 'textile-manufacturing', 'Manufacturing & Industrial'),
('Apparel Manufacturing', 'apparel-manufacturing', 'Manufacturing & Industrial'),
('Food Manufacturing', 'food-manufacturing', 'Manufacturing & Industrial'),
('Beverage Manufacturing', 'beverage-manufacturing', 'Manufacturing & Industrial'),
('Packaging Manufacturing', 'packaging-manufacturing', 'Manufacturing & Industrial'),
('Printing Manufacturing', 'printing-manufacturing', 'Manufacturing & Industrial'),
('Construction', 'construction', 'Construction, Engineering & Real Estate'),
('Civil Engineering', 'civil-engineering', 'Construction, Engineering & Real Estate'),
('Structural Engineering', 'structural-engineering', 'Construction, Engineering & Real Estate'),
('Mechanical Engineering', 'mechanical-engineering', 'Construction, Engineering & Real Estate'),
('Electrical Engineering', 'electrical-engineering', 'Construction, Engineering & Real Estate'),
('Architecture', 'architecture', 'Construction, Engineering & Real Estate'),
('Urban Planning', 'urban-planning', 'Construction, Engineering & Real Estate'),
('Infrastructure Development', 'infrastructure-development', 'Construction, Engineering & Real Estate'),
('Real Estate Development', 'real-estate-development', 'Construction, Engineering & Real Estate'),
('Property Management', 'property-management', 'Construction, Engineering & Real Estate'),
('Commercial Real Estate', 'commercial-real-estate', 'Construction, Engineering & Real Estate'),
('Residential Real Estate', 'residential-real-estate', 'Construction, Engineering & Real Estate'),
('Facility Management', 'facility-management', 'Construction, Engineering & Real Estate'),
('Building Materials', 'building-materials', 'Construction, Engineering & Real Estate'),
('Smart Buildings', 'smart-buildings', 'Construction, Engineering & Real Estate'),
('Healthcare Services', 'healthcare-services', 'Healthcare & Life Sciences'),
('Hospitals & Clinics', 'hospitals-clinics', 'Healthcare & Life Sciences'),
('Medical Practices', 'medical-practices', 'Healthcare & Life Sciences'),
('Dental Services', 'dental-services', 'Healthcare & Life Sciences'),
('Veterinary Services', 'veterinary-services', 'Healthcare & Life Sciences'),
('Mental Health Services', 'mental-health-services', 'Healthcare & Life Sciences'),
('Home Healthcare', 'home-healthcare', 'Healthcare & Life Sciences'),
('Elder Care', 'elder-care', 'Healthcare & Life Sciences'),
('Medical Research', 'medical-research', 'Healthcare & Life Sciences'),
('Clinical Research', 'clinical-research', 'Healthcare & Life Sciences'),
('Biotechnology', 'biotechnology', 'Healthcare & Life Sciences'),
('Pharmaceutical Research', 'pharmaceutical-research', 'Healthcare & Life Sciences'),
('Life Sciences', 'life-sciences', 'Healthcare & Life Sciences'),
('Public Health', 'public-health', 'Healthcare & Life Sciences'),
('Health Insurance', 'health-insurance', 'Healthcare & Life Sciences'),
('Banking', 'banking', 'Finance, Banking & Insurance'),
('Retail Banking', 'retail-banking', 'Finance, Banking & Insurance'),
('Investment Banking', 'investment-banking', 'Finance, Banking & Insurance'),
('Corporate Banking', 'corporate-banking', 'Finance, Banking & Insurance'),
('Asset Management', 'asset-management', 'Finance, Banking & Insurance'),
('Wealth Management', 'wealth-management', 'Finance, Banking & Insurance'),
('Insurance', 'insurance', 'Finance, Banking & Insurance'),
('Reinsurance', 'reinsurance', 'Finance, Banking & Insurance'),
('Accounting', 'accounting', 'Finance, Banking & Insurance'),
('Auditing', 'auditing', 'Finance, Banking & Insurance'),
('Tax Advisory', 'tax-advisory', 'Finance, Banking & Insurance'),
('Financial Consulting', 'financial-consulting', 'Finance, Banking & Insurance'),
('Risk Management', 'risk-management', 'Finance, Banking & Insurance'),
('Payments', 'payments', 'Finance, Banking & Insurance'),
('Digital Banking', 'digital-banking', 'Finance, Banking & Insurance'),
('Retail', 'retail', 'Retail, Wholesale & E-Commerce'),
('Wholesale', 'wholesale', 'Retail, Wholesale & E-Commerce'),
('E-Commerce', 'e-commerce', 'Retail, Wholesale & E-Commerce'),
('Online Marketplaces', 'online-marketplaces', 'Retail, Wholesale & E-Commerce'),
('Fashion Retail', 'fashion-retail', 'Retail, Wholesale & E-Commerce'),
('Luxury Goods', 'luxury-goods', 'Retail, Wholesale & E-Commerce'),
('Consumer Electronics', 'consumer-electronics', 'Retail, Wholesale & E-Commerce'),
('Grocery & Supermarkets', 'grocery-supermarkets', 'Retail, Wholesale & E-Commerce'),
('Convenience Stores', 'convenience-stores', 'Retail, Wholesale & E-Commerce'),
('Specialty Retail', 'specialty-retail', 'Retail, Wholesale & E-Commerce'),
('Direct-to-Consumer (DTC)', 'direct-to-consumer-dtc', 'Retail, Wholesale & E-Commerce'),
('Subscription Commerce', 'subscription-commerce', 'Retail, Wholesale & E-Commerce'),
('Omnichannel Retail', 'omnichannel-retail', 'Retail, Wholesale & E-Commerce'),
('Import & Export', 'import-export', 'Retail, Wholesale & E-Commerce'),
('Merchandising', 'merchandising', 'Retail, Wholesale & E-Commerce'),
('Logistics', 'logistics', 'Logistics, Transportation & Supply Chain'),
('Supply Chain Management', 'supply-chain-management', 'Logistics, Transportation & Supply Chain'),
('Freight & Shipping', 'freight-shipping', 'Logistics, Transportation & Supply Chain'),
('Maritime Transport', 'maritime-transport', 'Logistics, Transportation & Supply Chain'),
('Aviation & Airlines', 'aviation-airlines', 'Logistics, Transportation & Supply Chain'),
('Rail Transport', 'rail-transport', 'Logistics, Transportation & Supply Chain'),
('Road Transport', 'road-transport', 'Logistics, Transportation & Supply Chain'),
('Courier & Delivery', 'courier-delivery', 'Logistics, Transportation & Supply Chain'),
('Warehousing', 'warehousing', 'Logistics, Transportation & Supply Chain'),
('Distribution', 'distribution', 'Logistics, Transportation & Supply Chain'),
('Fleet Management', 'fleet-management', 'Logistics, Transportation & Supply Chain'),
('Cold Chain Logistics', 'cold-chain-logistics', 'Logistics, Transportation & Supply Chain'),
('International Trade', 'international-trade', 'Logistics, Transportation & Supply Chain'),
('Customs Brokerage', 'customs-brokerage', 'Logistics, Transportation & Supply Chain'),
('Last-Mile Delivery', 'last-mile-delivery', 'Logistics, Transportation & Supply Chain'),
('Marketing Services', 'marketing-services', 'Marketing, Media & Communications'),
('Digital Marketing', 'digital-marketing', 'Marketing, Media & Communications'),
('Advertising', 'advertising', 'Marketing, Media & Communications'),
('Media Production', 'media-production', 'Marketing, Media & Communications'),
('Broadcasting', 'broadcasting', 'Marketing, Media & Communications'),
('Publishing', 'publishing', 'Marketing, Media & Communications'),
('Public Relations', 'public-relations', 'Marketing, Media & Communications'),
('Branding Agencies', 'branding-agencies', 'Marketing, Media & Communications'),
('Influencer Marketing', 'influencer-marketing', 'Marketing, Media & Communications'),
('Content Creation', 'content-creation', 'Marketing, Media & Communications'),
('Social Media', 'social-media', 'Marketing, Media & Communications'),
('Performance Marketing', 'performance-marketing', 'Marketing, Media & Communications'),
('Market Research', 'market-research', 'Marketing, Media & Communications'),
('Creative Agencies', 'creative-agencies', 'Marketing, Media & Communications'),
('Communications', 'communications', 'Marketing, Media & Communications'),
('Education', 'education', 'Education & Training'),
('Higher Education', 'higher-education', 'Education & Training'),
('Primary Education', 'primary-education', 'Education & Training'),
('Secondary Education', 'secondary-education', 'Education & Training'),
('Vocational Training', 'vocational-training', 'Education & Training'),
('Corporate Training', 'corporate-training', 'Education & Training'),
('Online Education', 'online-education', 'Education & Training'),
('E-Learning Platforms', 'e-learning-platforms', 'Education & Training'),
('Educational Consulting', 'educational-consulting', 'Education & Training'),
('Research Institutions', 'research-institutions', 'Education & Training'),
('Legal Services', 'legal-services', 'Legal, Government & Public Sector'),
('Law Firms', 'law-firms', 'Legal, Government & Public Sector'),
('Corporate Legal Services', 'corporate-legal-services', 'Legal, Government & Public Sector'),
('Government', 'government', 'Legal, Government & Public Sector'),
('Public Administration', 'public-administration', 'Legal, Government & Public Sector'),
('Local Government', 'local-government', 'Legal, Government & Public Sector'),
('National Government', 'national-government', 'Legal, Government & Public Sector'),
('International Organizations', 'international-organizations', 'Legal, Government & Public Sector'),
('NGOs & Nonprofits', 'ngos-nonprofits', 'Legal, Government & Public Sector'),
('Think Tanks', 'think-tanks', 'Legal, Government & Public Sector'),
('Hospitality', 'hospitality', 'Hospitality, Tourism & Leisure'),
('Hotels & Resorts', 'hotels-resorts', 'Hospitality, Tourism & Leisure'),
('Restaurants', 'restaurants', 'Hospitality, Tourism & Leisure'),
('Cafés & Bars', 'cafes-bars', 'Hospitality, Tourism & Leisure'),
('Catering Services', 'catering-services', 'Hospitality, Tourism & Leisure'),
('Travel Agencies', 'travel-agencies', 'Hospitality, Tourism & Leisure'),
('Tourism', 'tourism', 'Hospitality, Tourism & Leisure'),
('Airlines Services', 'airlines-services', 'Hospitality, Tourism & Leisure'),
('Event Management', 'event-management', 'Hospitality, Tourism & Leisure'),
('Recreation & Leisure', 'recreation-leisure', 'Hospitality, Tourism & Leisure'),
('Agriculture', 'agriculture', 'Agriculture, Food & Natural Resources'),
('Farming', 'farming', 'Agriculture, Food & Natural Resources'),
('Livestock', 'livestock', 'Agriculture, Food & Natural Resources'),
('Fisheries', 'fisheries', 'Agriculture, Food & Natural Resources'),
('Aquaculture', 'aquaculture', 'Agriculture, Food & Natural Resources'),
('Forestry', 'forestry', 'Agriculture, Food & Natural Resources'),
('Food Processing', 'food-processing', 'Agriculture, Food & Natural Resources'),
('Agribusiness', 'agribusiness', 'Agriculture, Food & Natural Resources'),
('Organic Farming', 'organic-farming', 'Agriculture, Food & Natural Resources'),
('Sustainable Agriculture', 'sustainable-agriculture', 'Agriculture, Food & Natural Resources'),
('Energy', 'energy', 'Energy, Utilities & Environment'),
('Renewable Energy', 'renewable-energy', 'Energy, Utilities & Environment'),
('Solar Energy', 'solar-energy', 'Energy, Utilities & Environment'),
('Wind Energy', 'wind-energy', 'Energy, Utilities & Environment'),
('Hydropower', 'hydropower', 'Energy, Utilities & Environment'),
('Oil & Gas', 'oil-gas', 'Energy, Utilities & Environment'),
('Utilities', 'utilities', 'Energy, Utilities & Environment'),
('Water Management', 'water-management', 'Energy, Utilities & Environment'),
('Waste Management', 'waste-management', 'Energy, Utilities & Environment'),
('Environmental Services', 'environmental-services', 'Energy, Utilities & Environment'),
('Gaming', 'gaming', 'Gaming, Entertainment & Sports'),
('Video Game Development', 'video-game-development', 'Gaming, Entertainment & Sports'),
('Esports', 'esports', 'Gaming, Entertainment & Sports'),
('Entertainment', 'entertainment', 'Gaming, Entertainment & Sports'),
('Film Production', 'film-production', 'Gaming, Entertainment & Sports'),
('Television Production', 'television-production', 'Gaming, Entertainment & Sports'),
('Music Industry', 'music-industry', 'Gaming, Entertainment & Sports'),
('Sports Organizations', 'sports-organizations', 'Gaming, Entertainment & Sports'),
('Fitness & Wellness', 'fitness-wellness', 'Gaming, Entertainment & Sports'),
('Recreation', 'recreation', 'Gaming, Entertainment & Sports'),
('Consulting', 'consulting', 'Professional & Business Services'),
('Management Consulting', 'management-consulting', 'Professional & Business Services'),
('IT Consulting', 'it-consulting', 'Professional & Business Services'),
('HR Consulting', 'hr-consulting', 'Professional & Business Services'),
('Staffing & Recruitment', 'staffing-recruitment', 'Professional & Business Services'),
('Outsourcing', 'outsourcing', 'Professional & Business Services'),
('Business Process Services', 'business-process-services', 'Professional & Business Services'),
('Market Intelligence', 'market-intelligence', 'Professional & Business Services'),
('Corporate Services', 'corporate-services', 'Professional & Business Services'),
('Employer Branding', 'employer-branding', 'Professional & Business Services'),
('Climate Tech', 'climate-tech', 'Niche Industries'),
('Space Technology', 'space-technology', 'Niche Industries'),
('Defense & Security', 'defense-security', 'Niche Industries'),
('Smart Cities', 'smart-cities', 'Niche Industries'),
('Internet of Things (IoT)', 'internet-of-things-iot', 'Niche Industries'),
('Robotics', 'robotics', 'Niche Industries'),
('Nanotechnology', 'nanotechnology', 'Niche Industries'),
('Quantum Computing', 'quantum-computing', 'Niche Industries'),
('Accessibility Services', 'accessibility-services', 'Niche Industries'),
('Ethical AI', 'ethical-ai', 'Niche Industries')
ON CONFLICT (slug) DO NOTHING;

-- Seed job categories
INSERT INTO job_categories (name, slug) VALUES
('Frontend Developer', 'frontend-developer'),
('Backend Developer', 'backend-developer'),
('Full Stack Developer', 'full-stack-developer'),
('Mobile App Development', 'mobile-app-development'),
('Game Development', 'game-development'),
('Web Development', 'web-development'),
('DevOps Engineer', 'devops-engineer'),
('Cloud Engineer', 'cloud-engineer'),
('Site Reliability Engineer (SRE)', 'site-reliability-engineer-sre'),
('Data Science', 'data-science'),
('Data Engineering', 'data-engineering'),
('Machine Learning Engineer', 'machine-learning-engineer'),
('Artificial Intelligence Engineer', 'artificial-intelligence-engineer'),
('Cybersecurity', 'cybersecurity'),
('Information Security Analyst', 'information-security-analyst'),
('Penetration Tester', 'penetration-tester'),
('Network Engineer', 'network-engineer'),
('Systems Administrator', 'systems-administrator'),
('IT Support', 'it-support'),
('Help Desk Technician', 'help-desk-technician'),
('Database Administrator', 'database-administrator'),
('Blockchain Developer', 'blockchain-developer'),
('Embedded Systems Engineer', 'embedded-systems-engineer'),
('QA Engineer', 'qa-engineer'),
('Test Automation Engineer', 'test-automation-engineer'),
('AR/VR Developer', 'ar-vr-developer'),
('Hardware Engineer', 'hardware-engineer'),
('IT Project Management', 'it-project-management'),
('Technical Product Manager', 'technical-product-manager'),
('Graphic Design', 'graphic-design'),
('UI Design', 'ui-design'),
('UX Design', 'ux-design'),
('Product Design', 'product-design'),
('Web Design', 'web-design'),
('Motion Graphics', 'motion-graphics'),
('Animation', 'animation'),
('3D Artist', '3d-artist'),
('Game Artist', 'game-artist'),
('Illustration', 'illustration'),
('Branding', 'branding'),
('Visual Design', 'visual-design'),
('Industrial Design', 'industrial-design'),
('Interior Design', 'interior-design'),
('Fashion Design', 'fashion-design'),
('Textile Design', 'textile-design'),
('Photography', 'photography'),
('Videography', 'videography'),
('Video Editing', 'video-editing'),
('Sound Design', 'sound-design'),
('Business Administration', 'business-administration'),
('Operations Management', 'operations-management'),
('Project Management', 'project-management'),
('Program Management', 'program-management'),
('Product Management', 'product-management'),
('Business Analysis', 'business-analysis'),
('Strategy Consulting', 'strategy-consulting'),
('Management Consulting', 'management-consulting'),
('Process Improvement', 'process-improvement'),
('Quality Management', 'quality-management'),
('Risk Management', 'risk-management'),
('Compliance', 'compliance'),
('Change Management', 'change-management'),
('Office Management', 'office-management'),
('Executive Assistant', 'executive-assistant'),
('Chief Executive Officer (CEO)', 'chief-executive-officer-ceo'),
('Chief Technology Officer (CTO)', 'chief-technology-officer-cto'),
('Chief Operating Officer (COO)', 'chief-operating-officer-coo'),
('Entrepreneur / Founder', 'entrepreneur-founder'),
('Startup Operations', 'startup-operations'),
('Accounting', 'accounting'),
('Bookkeeping', 'bookkeeping'),
('Financial Analysis', 'financial-analysis'),
('Corporate Finance', 'corporate-finance'),
('Investment Banking', 'investment-banking'),
('Private Equity', 'private-equity'),
('Venture Capital', 'venture-capital'),
('Asset Management', 'asset-management'),
('Wealth Management', 'wealth-management'),
('Risk Analysis', 'risk-analysis'),
('Auditing', 'auditing'),
('Tax Consulting', 'tax-consulting'),
('Payroll', 'payroll'),
('Financial Controller', 'financial-controller'),
('Treasury', 'treasury'),
('Insurance', 'insurance'),
('Actuarial Science', 'actuarial-science'),
('Credit Analysis', 'credit-analysis'),
('Compliance Finance', 'compliance-finance'),
('FinTech', 'fintech'),
('Sales', 'sales'),
('Inside Sales', 'inside-sales'),
('Outside Sales', 'outside-sales'),
('Business Development', 'business-development'),
('Account Management', 'account-management'),
('Customer Success', 'customer-success'),
('Digital Marketing', 'digital-marketing'),
('Performance Marketing', 'performance-marketing'),
('Growth Marketing', 'growth-marketing'),
('Content Marketing', 'content-marketing'),
('SEO', 'seo'),
('SEM / PPC', 'sem-ppc'),
('Social Media Marketing', 'social-media-marketing'),
('Influencer Marketing', 'influencer-marketing'),
('Brand Management', 'brand-management'),
('Product Marketing', 'product-marketing'),
('Market Research', 'market-research'),
('CRM Management', 'crm-management'),
('Email Marketing', 'email-marketing'),
('Affiliate Marketing', 'affiliate-marketing'),
('Human Resources', 'human-resources'),
('Talent Acquisition', 'talent-acquisition'),
('Recruitment', 'recruitment'),
('Technical Recruitment', 'technical-recruitment'),
('HR Business Partner', 'hr-business-partner'),
('People Operations', 'people-operations'),
('Learning & Development', 'learning-development'),
('Training Coordinator', 'training-coordinator'),
('Organizational Development', 'organizational-development'),
('Compensation & Benefits', 'compensation-benefits'),
('Payroll HR', 'payroll-hr'),
('Employee Relations', 'employee-relations'),
('Diversity & Inclusion', 'diversity-inclusion'),
('Workforce Planning', 'workforce-planning'),
('Employer Branding', 'employer-branding'),
('Healthcare Administration', 'healthcare-administration'),
('Medical Doctor', 'medical-doctor'),
('General Practitioner', 'general-practitioner'),
('Specialist Physician', 'specialist-physician'),
('Nursing', 'nursing'),
('Registered Nurse', 'registered-nurse'),
('Practical Nurse', 'practical-nurse'),
('Pharmacy', 'pharmacy'),
('Pharmacist', 'pharmacist'),
('Laboratory Technician', 'laboratory-technician'),
('Medical Research', 'medical-research'),
('Clinical Research', 'clinical-research'),
('Public Health', 'public-health'),
('Mental Health', 'mental-health'),
('Psychology', 'psychology'),
('Psychiatry', 'psychiatry'),
('Physiotherapy', 'physiotherapy'),
('Occupational Therapy', 'occupational-therapy'),
('Radiology', 'radiology'),
('Medical Imaging', 'medical-imaging'),
('Civil Engineering', 'civil-engineering'),
('Structural Engineering', 'structural-engineering'),
('Mechanical Engineering', 'mechanical-engineering'),
('Electrical Engineering', 'electrical-engineering'),
('Electronics Engineering', 'electronics-engineering'),
('Industrial Engineering', 'industrial-engineering'),
('Manufacturing Engineering', 'manufacturing-engineering'),
('Process Engineering', 'process-engineering'),
('Chemical Engineering', 'chemical-engineering'),
('Petroleum Engineering', 'petroleum-engineering'),
('Mining Engineering', 'mining-engineering'),
('Construction Management', 'construction-management'),
('Site Engineer', 'site-engineer'),
('Project Engineer', 'project-engineer'),
('Quantity Surveyor', 'quantity-surveyor'),
('Architecture', 'architecture'),
('Landscape Architecture', 'landscape-architecture'),
('Urban Planning', 'urban-planning'),
('Surveying', 'surveying'),
('Building Inspection', 'building-inspection'),
('Supply Chain Management', 'supply-chain-management'),
('Logistics', 'logistics'),
('Transportation', 'transportation'),
('Warehouse Management', 'warehouse-management'),
('Inventory Management', 'inventory-management'),
('Procurement', 'procurement'),
('Purchasing', 'purchasing'),
('Sourcing', 'sourcing'),
('Fleet Management', 'fleet-management'),
('Distribution', 'distribution'),
('Shipping & Maritime', 'shipping-maritime'),
('Aviation Operations', 'aviation-operations'),
('Customs & Trade Compliance', 'customs-trade-compliance'),
('Education', 'education'),
('Teaching', 'teaching'),
('Primary School Teacher', 'primary-school-teacher'),
('Secondary School Teacher', 'secondary-school-teacher'),
('University Lecturer', 'university-lecturer'),
('Professor', 'professor'),
('Academic Research', 'academic-research'),
('Educational Administration', 'educational-administration'),
('Curriculum Development', 'curriculum-development'),
('Instructional Design', 'instructional-design'),
('Online Teaching', 'online-teaching'),
('Law', 'law'),
('Legal Counsel', 'legal-counsel'),
('Corporate Lawyer', 'corporate-lawyer'),
('Criminal Law', 'criminal-law'),
('Civil Law', 'civil-law'),
('Compliance & Regulation', 'compliance-regulation'),
('Public Administration', 'public-administration'),
('Government Services', 'government-services'),
('Policy Analysis', 'policy-analysis'),
('International Relations', 'international-relations'),
('Diplomacy', 'diplomacy'),
('NGO / Non-Profit', 'ngo-non-profit'),
('Sustainability', 'sustainability'),
('Environmental Science', 'environmental-science'),
('Climate & Energy', 'climate-energy'),
('Renewable Energy', 'renewable-energy'),
('Social Work', 'social-work'),
('Community Development', 'community-development')
ON CONFLICT (slug) DO NOTHING;

-- Parent categories and hierarchy for job_categories
INSERT INTO job_categories (id, name, slug, parent_id, created_at) VALUES
  (gen_random_uuid(), 'Technology & IT', 'technology-it', NULL, NOW()),
  (gen_random_uuid(), 'Design & Creative', 'design-creative', NULL, NOW()),
  (gen_random_uuid(), 'Business, Management & Operations', 'business-management-operations', NULL, NOW()),
  (gen_random_uuid(), 'Finance & Accounting', 'finance-accounting', NULL, NOW()),
  (gen_random_uuid(), 'Sales, Marketing & Growth', 'sales-marketing-growth', NULL, NOW()),
  (gen_random_uuid(), 'Human Resources & People', 'human-resources-people', NULL, NOW()),
  (gen_random_uuid(), 'Healthcare & Life Sciences', 'healthcare-life-sciences', NULL, NOW()),
  (gen_random_uuid(), 'Engineering & Construction', 'engineering-construction', NULL, NOW()),
  (gen_random_uuid(), 'Logistics, Transport & Supply Chain', 'logistics-transport-supply-chain', NULL, NOW()),
  (gen_random_uuid(), 'Education & Research', 'education-research', NULL, NOW()),
  (gen_random_uuid(), 'Legal & Public Sector', 'legal-public-sector', NULL, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Update job_categories with parent_id references (hierarchy)
-- (All UPDATE statements from restructure_job_categories.sql go here)
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'technology-it')
WHERE slug IN ('frontend-developer', 'backend-developer', 'full-stack-developer', 'mobile-app-development', 
               'game-development', 'web-development', 'devops-engineer', 'cloud-engineer', 'site-reliability-engineer-sre',
               'data-science', 'data-engineering', 'machine-learning-engineer', 'artificial-intelligence-engineer',
               'cybersecurity', 'information-security-analyst', 'penetration-tester', 'network-engineer',
               'systems-administrator', 'it-support', 'help-desk-technician', 'database-administrator',
               'blockchain-developer', 'embedded-systems-engineer', 'qa-engineer', 'test-automation-engineer',
               'ar-vr-developer', 'hardware-engineer', 'it-project-management', 'technical-product-manager');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'design-creative')
WHERE slug IN ('graphic-design', 'ui-design', 'ux-design', 'product-design', 'web-design', 'motion-graphics',
               'animation', '3d-artist', 'game-artist', 'illustration', 'branding', 'visual-design',
               'industrial-design', 'interior-design', 'fashion-design', 'textile-design', 'photography',
               'videography', 'video-editing', 'sound-design');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'business-management-operations')
WHERE slug IN ('business-administration', 'operations-management', 'project-management', 'program-management',
               'product-management', 'business-analysis', 'strategy-consulting', 'management-consulting',
               'process-improvement', 'quality-management', 'risk-management', 'compliance', 'change-management',
               'office-management', 'executive-assistant', 'chief-executive-officer-ceo', 'chief-technology-officer-cto',
               'chief-operating-officer-coo', 'entrepreneur-founder', 'startup-operations');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'finance-accounting')
WHERE slug IN ('accounting', 'bookkeeping', 'financial-analysis', 'corporate-finance', 'investment-banking',
               'private-equity', 'venture-capital', 'asset-management', 'wealth-management', 'risk-analysis',
               'auditing', 'tax-consulting', 'payroll', 'financial-controller', 'treasury', 'insurance',
               'actuarial-science', 'credit-analysis', 'compliance-finance', 'fintech');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'sales-marketing-growth')
WHERE slug IN ('sales', 'inside-sales', 'outside-sales', 'business-development', 'account-management',
               'customer-success', 'digital-marketing', 'performance-marketing', 'growth-marketing',
               'content-marketing', 'seo', 'sem-ppc', 'social-media-marketing', 'influencer-marketing',
               'brand-management', 'product-marketing', 'market-research', 'crm-management',
               'email-marketing', 'affiliate-marketing');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'human-resources-people')
WHERE slug IN ('human-resources', 'talent-acquisition', 'recruitment', 'technical-recruitment',
               'hr-business-partner', 'people-operations', 'learning-development', 'training-coordinator',
               'organizational-development', 'compensation-benefits', 'payroll-hr', 'employee-relations',
               'diversity-inclusion', 'workforce-planning', 'employer-branding');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'healthcare-life-sciences')
WHERE slug IN ('healthcare-administration', 'medical-doctor', 'general-practitioner', 'specialist-physician',
               'nursing', 'registered-nurse', 'practical-nurse', 'pharmacy', 'pharmacist', 'laboratory-technician',
               'medical-research', 'clinical-research', 'public-health', 'mental-health', 'psychology',
               'psychiatry', 'physiotherapy', 'occupational-therapy', 'radiology', 'medical-imaging');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'engineering-construction')
WHERE slug IN ('civil-engineering', 'structural-engineering', 'mechanical-engineering', 'electrical-engineering',
               'electronics-engineering', 'industrial-engineering', 'manufacturing-engineering', 'process-engineering',
               'chemical-engineering', 'petroleum-engineering', 'mining-engineering', 'construction-management',
               'site-engineer', 'project-engineer', 'quantity-surveyor', 'architecture', 'landscape-architecture',
               'urban-planning', 'surveying', 'building-inspection');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'logistics-transport-supply-chain')
WHERE slug IN ('supply-chain-management', 'logistics', 'transportation', 'warehouse-management',
               'inventory-management', 'procurement', 'purchasing', 'sourcing', 'fleet-management',
               'distribution', 'shipping-maritime', 'aviation-operations', 'customs-trade-compliance');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'education-research')
WHERE slug IN ('education', 'teaching', 'primary-school-teacher', 'secondary-school-teacher',
               'university-lecturer', 'professor', 'academic-research', 'educational-administration',
               'curriculum-development', 'instructional-design', 'online-teaching');

UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'legal-public-sector')
WHERE slug IN ('law', 'legal-counsel', 'corporate-lawyer', 'criminal-law', 'civil-law',
               'compliance-regulation', 'public-administration', 'government-services', 'policy-analysis',
               'international-relations', 'diplomacy');

-- Create junction table for multiple categories per job
CREATE TABLE IF NOT EXISTS job_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES job_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_job_category_assignments_job_id ON job_category_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_category_assignments_category_id ON job_category_assignments(category_id);

-- Migrate existing category_id data to junction table
INSERT INTO job_category_assignments (job_id, category_id, created_at)
SELECT id, category_id, created_at FROM jobs WHERE category_id IS NOT NULL
ON CONFLICT (job_id, category_id) DO NOTHING;

-- Function to generate slug from company name
CREATE OR REPLACE FUNCTION generate_slug(company_name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(company_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing companies
UPDATE tenants 
SET slug = generate_slug(company_name) || '-' || id
WHERE slug IS NULL AND company_name IS NOT NULL;

-- 2. ALTER TABLES
-- (Add all ALTER TABLE statements from your migrations here...)

-- 3. CREATE INDEXES
-- (Add all CREATE INDEX statements from your migrations here...)

-- 4. DATA MIGRATIONS (INSERT/UPDATE/SEED)

-- Seed Languages
INSERT INTO master_languages (name, iso_639_1, iso_639_3) VALUES
('Afrikaans', 'af', NULL),
('Albanian', 'sq', NULL),
('Amharic', 'am', NULL),
('Arabic', 'ar', NULL),
('Armenian (Eastern)', 'hy', NULL),
('Armenian (Western)', NULL, 'hyw'),
('Azerbaijani (Azeri)', 'az', NULL),
('Bassa', NULL, 'bsq'),
('Belarusian', 'be', NULL),
('Bengali', 'bn', NULL),
('Bosnian', 'bs', NULL),
('Braille', NULL, NULL),
('Bulgarian', 'bg', NULL),
('Burmese', 'my', NULL),
('Cambodian (Khmer)', 'km', NULL),
('Cape Verde Creole', NULL, 'kea'),
('Cebuano', NULL, 'ceb'),
('Chinese (Simplified)', 'zh', NULL),
('Chinese (Traditional)', 'zh', NULL),
('Chuukese', NULL, 'chk'),
('Croatian', 'hr', NULL),
('Czech', 'cs', NULL),
('Danish', 'da', NULL),
('Dari', NULL, 'prs'),
('Dutch', 'nl', NULL),
('English', 'en', NULL),
('Estonian', 'et', NULL),
('Farsi (Persian)', 'fa', NULL),
('Finnish', 'fi', NULL),
('Flemish', 'nl', NULL),
('French (Canada)', 'fr', NULL),
('French (France)', 'fr', NULL),
('Fulani', 'ff', NULL),
('Georgian', 'ka', NULL),
('German', 'de', NULL),
('Greek', 'el', NULL),
('Gujarati', 'gu', NULL),
('Haitian Creole', 'ht', NULL),
('Hakha Chin', NULL, 'cnh'),
('Hakka (Chinese)', NULL, 'hak'),
('Hebrew', 'he', NULL),
('Hindi', 'hi', NULL),
('Hmong', NULL, 'hmn'),
('Hungarian', 'hu', NULL),
('Icelandic', 'is', NULL),
('Igbo', 'ig', NULL),
('Ilocano', NULL, 'ilo'),
('Ilonggo (Hiligaynon)', NULL, 'hil'),
('Indonesian', 'id', NULL),
('Italian', 'it', NULL),
('Japanese', 'ja', NULL),
('Javanese', 'jv', NULL),
('Kannada', 'kn', NULL),
('Karen', NULL, 'kar'),
('Kazakh', 'kk', NULL),
('Kinyarwanda', 'rw', NULL),
('Kirundi', 'rn', NULL),
('Korean', 'ko', NULL),
('Kurdish (Kurmanji)', 'ku', NULL),
('Kurdish (Sorani)', NULL, 'ckb'),
('Kyrgyz', 'ky', NULL),
('Lao', 'lo', NULL),
('Latvian', 'lv', NULL),
('Lithuanian', 'lt', NULL),
('Macedonian', 'mk', NULL),
('Malay (Malaysian)', 'ms', NULL),
('Mandinka', NULL, 'mnk'),
('Marathi', 'mr', NULL),
('Marshallese', 'mh', NULL),
('Mien', NULL, 'pcv'),
('Mongolian', 'mn', NULL),
('Montenegrin', NULL, 'cnr'),
('Navajo', 'nv', NULL),
('Nepali', 'ne', NULL),
('Norwegian', 'no', NULL),
('Oromo', 'om', NULL),
('Pashto', 'ps', NULL),
('Polish', 'pl', NULL),
('Portuguese (Brazil)', 'pt', NULL),
('Portuguese (Portugal)', 'pt', NULL),
('Punjabi', 'pa', NULL),
('Rohingya', NULL, 'rhg'),
('Romanian (Moldovan)', 'ro', NULL),
('Russian', 'ru', NULL),
('Serbian', 'sr', NULL),
('Slovak', 'sk', NULL),
('Slovenian', 'sl', NULL),
('Somali (Af-Maxaa Tiri)', 'so', 'som'),
('Somali (Af-Maay)', NULL, 'ymm'),
('Spanish (Castilian)', 'es', NULL),
('Spanish (Latin American)', 'es', NULL),
('Spanish (Other Varieties)', 'es', NULL),
('Swahili', 'sw', NULL),
('Swedish', 'sv', NULL),
('Tagalog', 'tl', NULL),
('Tamil', 'ta', NULL),
('Telugu', 'te', NULL),
('Thai', 'th', NULL),
('Tibetan', 'bo', NULL),
('Tigrinya', 'ti', NULL),
('Turkish', 'tr', NULL),
('Ukrainian', 'uk', NULL),
('Urdu', 'ur', NULL),
('Uzbek', 'uz', NULL),
('Vietnamese', 'vi', NULL),
('Wolof', 'wo', NULL),
('Yoruba', 'yo', NULL)
ON CONFLICT DO NOTHING;

-- Seed Nationalities
INSERT INTO master_nationalities (name) VALUES
('Afghan'),
('Albanian'),
('American'),
('Arab'),
('Armenian'),
('Azerbaijani'),
('Bangladeshi'),
('Belgian'),
('Bosnian'),
('Brazilian'),
('British'),
('Bulgarian'),
('Burmese'),
('Cambodian'),
('Canadian'),
('Cape Verdean'),
('Chinese'),
('Croatian'),
('Czech'),
('Danish'),
('Dutch'),
('Eritrean'),
('Ethiopian'),
('Finnish'),
('French'),
('Georgian'),
('German'),
('Greek'),
('Haitian'),
('Hungarian'),
('Icelandic'),
('Indian'),
('Indonesian'),
('Iranian'),
('Iraqi'),
('Israeli'),
('Italian'),
('Japanese'),
('Kenyan'),
('Korean'),
('Laotian'),
('Latvian'),
('Lithuanian'),
('Malaysian'),
('Moldovan'),
('Mongolian'),
('Nepalese'),
('Nigerian'),
('Norwegian'),
('Pakistani'),
('Polish'),
('Portuguese'),
('Romanian'),
('Russian'),
('Rwandan'),
('Senegalese'),
('Serbian'),
('Slovak'),
('Slovenian'),
('Somali'),
('Spanish'),
('Sri Lankan'),
('Swedish'),
('Syrian'),
('Thai'),
('Turkish'),
('Ukrainian'),
('Uzbek'),
('Vietnamese'),
('Yemeni')
ON CONFLICT (name) DO NOTHING;

-- Seed language-nationality relationships
-- Somali
INSERT INTO language_nationalities (language_id, nationality_id)
SELECT l.id, n.id
FROM master_languages l, master_nationalities n
WHERE l.name IN ('Somali (Af-Maxaa Tiri)', 'Somali (Af-Maay)')
AND n.name = 'Somali'
ON CONFLICT DO NOTHING;

-- English
INSERT INTO language_nationalities (language_id, nationality_id)
SELECT l.id, n.id
FROM master_languages l
JOIN master_nationalities n ON n.name IN ('American','British','Canadian')
WHERE l.name = 'English'
ON CONFLICT DO NOTHING;

-- Arabic
INSERT INTO language_nationalities (language_id, nationality_id)
SELECT l.id, n.id
FROM master_languages l
JOIN master_nationalities n ON n.name IN ('Arab','Syrian','Yemeni','Iraqi')
WHERE l.name = 'Arabic'
ON CONFLICT DO NOTHING;

-- Seed platform configuration
INSERT INTO platform_config (key, value) VALUES 
('privacy_policy_content', '# RAADI Privacy Policy\n\nWelcome to RAADI...'),
('terms_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;
