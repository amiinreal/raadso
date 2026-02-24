-- Minimal seed for DB-backed translations (English only)
-- Safe to run multiple times; keys are upserted.

INSERT INTO translation_keys (key, domain, description)
VALUES
  ('common.app.name', 'common', 'Application name'),
  ('common.save.cta', 'common', 'Save button'),
  ('job.apply.cta', 'common', 'Apply to job call-to-action')
ON CONFLICT (key) DO UPDATE
  SET domain = EXCLUDED.domain,
      description = COALESCE(EXCLUDED.description, translation_keys.description);

INSERT INTO translations (translation_key_id, language, value)
SELECT tk.id, 'en', seed.value
FROM translation_keys tk
JOIN (
  VALUES
    ('common.app.name', 'Raadso'),
    ('common.save.cta', 'Save'),
    ('job.apply.cta', 'Apply')
) AS seed(key, value) ON seed.key = tk.key
ON CONFLICT (translation_key_id, language) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();
