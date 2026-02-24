-- Add missing translation for filter dropdown
-- Created: 2026-02-09

WITH keys AS (
  INSERT INTO translation_keys (key, domain, page, description) VALUES
    ('applications.employer.status.filterAll', 'employer', 'applications', 'Filter: All Status (Dropdown option)')
  ON CONFLICT (key) DO NOTHING
  RETURNING id, key
)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', 'All Status' FROM keys
UNION ALL
SELECT id, 'so', 'Dhammaan Heerarka' FROM keys;

-- Handle case where key already existed (though unlikely given my check) but translations were missing
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', 'All Status'
FROM translation_keys WHERE key = 'applications.employer.status.filterAll'
ON CONFLICT (translation_key_id, language) DO NOTHING;

INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', 'Dhammaan Heerarka'
FROM translation_keys WHERE key = 'applications.employer.status.filterAll'
ON CONFLICT (translation_key_id, language) DO NOTHING;
