-- First, create parent categories
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

-- Update existing categories with parent_id references
-- Technology & IT
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'technology-it')
WHERE slug IN ('frontend-developer', 'backend-developer', 'full-stack-developer', 'mobile-app-development', 
               'game-development', 'web-development', 'devops-engineer', 'cloud-engineer', 'site-reliability-engineer-sre',
               'data-science', 'data-engineering', 'machine-learning-engineer', 'artificial-intelligence-engineer',
               'cybersecurity', 'information-security-analyst', 'penetration-tester', 'network-engineer',
               'systems-administrator', 'it-support', 'help-desk-technician', 'database-administrator',
               'blockchain-developer', 'embedded-systems-engineer', 'qa-engineer', 'test-automation-engineer',
               'ar-vr-developer', 'hardware-engineer', 'it-project-management', 'technical-product-manager');

-- Design & Creative
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'design-creative')
WHERE slug IN ('graphic-design', 'ui-design', 'ux-design', 'product-design', 'web-design', 'motion-graphics',
               'animation', '3d-artist', 'game-artist', 'illustration', 'branding', 'visual-design',
               'industrial-design', 'interior-design', 'fashion-design', 'textile-design', 'photography',
               'videography', 'video-editing', 'sound-design');

-- Business, Management & Operations
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'business-management-operations')
WHERE slug IN ('business-administration', 'operations-management', 'project-management', 'program-management',
               'product-management', 'business-analysis', 'strategy-consulting', 'management-consulting',
               'process-improvement', 'quality-management', 'risk-management', 'compliance', 'change-management',
               'office-management', 'executive-assistant', 'chief-executive-officer-ceo', 'chief-technology-officer-cto',
               'chief-operating-officer-coo', 'entrepreneur-founder', 'startup-operations');

-- Finance & Accounting
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'finance-accounting')
WHERE slug IN ('accounting', 'bookkeeping', 'financial-analysis', 'corporate-finance', 'investment-banking',
               'private-equity', 'venture-capital', 'asset-management', 'wealth-management', 'risk-analysis',
               'auditing', 'tax-consulting', 'payroll', 'financial-controller', 'treasury', 'insurance',
               'actuarial-science', 'credit-analysis', 'compliance-finance', 'fintech');

-- Sales, Marketing & Growth
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'sales-marketing-growth')
WHERE slug IN ('sales', 'inside-sales', 'outside-sales', 'business-development', 'account-management',
               'customer-success', 'digital-marketing', 'performance-marketing', 'growth-marketing',
               'content-marketing', 'seo', 'sem-ppc', 'social-media-marketing', 'influencer-marketing',
               'brand-management', 'product-marketing', 'market-research', 'crm-management',
               'email-marketing', 'affiliate-marketing');

-- Human Resources & People
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'human-resources-people')
WHERE slug IN ('human-resources', 'talent-acquisition', 'recruitment', 'technical-recruitment',
               'hr-business-partner', 'people-operations', 'learning-development', 'training-coordinator',
               'organizational-development', 'compensation-benefits', 'payroll-hr', 'employee-relations',
               'diversity-inclusion', 'workforce-planning', 'employer-branding');

-- Healthcare & Life Sciences
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'healthcare-life-sciences')
WHERE slug IN ('healthcare-administration', 'medical-doctor', 'general-practitioner', 'specialist-physician',
               'nursing', 'registered-nurse', 'practical-nurse', 'pharmacy', 'pharmacist', 'laboratory-technician',
               'medical-research', 'clinical-research', 'public-health', 'mental-health', 'psychology',
               'psychiatry', 'physiotherapy', 'occupational-therapy', 'radiology', 'medical-imaging');

-- Engineering & Construction
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'engineering-construction')
WHERE slug IN ('civil-engineering', 'structural-engineering', 'mechanical-engineering', 'electrical-engineering',
               'electronics-engineering', 'industrial-engineering', 'manufacturing-engineering', 'process-engineering',
               'chemical-engineering', 'petroleum-engineering', 'mining-engineering', 'construction-management',
               'site-engineer', 'project-engineer', 'quantity-surveyor', 'architecture', 'landscape-architecture',
               'urban-planning', 'surveying', 'building-inspection');

-- Logistics, Transport & Supply Chain
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'logistics-transport-supply-chain')
WHERE slug IN ('supply-chain-management', 'logistics', 'transportation', 'warehouse-management',
               'inventory-management', 'procurement', 'purchasing', 'sourcing', 'fleet-management',
               'distribution', 'shipping-maritime', 'aviation-operations', 'customs-trade-compliance');

-- Education & Research
UPDATE job_categories SET parent_id = (SELECT id FROM job_categories WHERE slug = 'education-research')
WHERE slug IN ('education', 'teaching', 'primary-school-teacher', 'secondary-school-teacher',
               'university-lecturer', 'professor', 'academic-research', 'educational-administration',
               'curriculum-development', 'instructional-design', 'online-teaching');

-- Legal & Public Sector
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
