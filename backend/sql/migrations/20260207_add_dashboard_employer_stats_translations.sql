-- Seed translation keys for Employer Dashboard Stats
INSERT INTO translation_keys (key, domain, page) VALUES
('dashboard.employer.stats.active', 'dashboard', 'employer_dashboard'),
('dashboard.employer.stats.activeDesc', 'dashboard', 'employer_dashboard'),
('dashboard.employer.stats.applications', 'dashboard', 'employer_dashboard'),
('dashboard.employer.stats.applicationsDesc', 'dashboard', 'employer_dashboard'),
('dashboard.employer.stats.drafts', 'dashboard', 'employer_dashboard'),
('dashboard.employer.stats.draftsDesc', 'dashboard', 'employer_dashboard')
ON CONFLICT (key) DO NOTHING;

-- Seed translations for Employer Dashboard Stats (English)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', CASE key
    WHEN 'dashboard.employer.stats.active' THEN 'Active Jobs'
    WHEN 'dashboard.employer.stats.activeDesc' THEN 'Jobs currently live and visible to candidates'
    WHEN 'dashboard.employer.stats.applications' THEN 'Applications'
    WHEN 'dashboard.employer.stats.applicationsDesc' THEN 'Total applications received across all jobs'
    WHEN 'dashboard.employer.stats.drafts' THEN 'Draft Jobs'
    WHEN 'dashboard.employer.stats.draftsDesc' THEN 'Inactive jobs or drafts not yet published'
    ELSE key
END
FROM translation_keys
WHERE key LIKE 'dashboard.employer.stats.%'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- Seed translations for Employer Dashboard Stats (Somali)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key
    WHEN 'dashboard.employer.stats.active' THEN 'Shaqooyinka Firfircoon'
    WHEN 'dashboard.employer.stats.activeDesc' THEN 'Shaqooyinka hadda tooska u jira ee murashixiintu arki karaan'
    WHEN 'dashboard.employer.stats.applications' THEN 'Codsiyada'
    WHEN 'dashboard.employer.stats.applicationsDesc' THEN 'Wadarta codsiyada soo gaaray dhammaan shaqooyinka'
    WHEN 'dashboard.employer.stats.drafts' THEN 'Qabyo'
    WHEN 'dashboard.employer.stats.draftsDesc' THEN 'Shaqooyinka aan firfircoonayn ama qabyada aheyn ee aan weli la daabicin'
    ELSE key
END
FROM translation_keys
WHERE key LIKE 'dashboard.employer.stats.%'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
