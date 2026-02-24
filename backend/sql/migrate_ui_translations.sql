-- Migration script: Transfer data from ui_translations to translation_keys/translations
-- This script should be run BEFORE dropping the ui_translations table

-- Step 1: Migrate translation keys and values from ui_translations to new tables
DO $$
DECLARE
  rec RECORD;
  key_id UUID;
  domain_name TEXT;
BEGIN
  -- Iterate through all unique translation keys in ui_translations
  FOR rec IN 
    SELECT DISTINCT translation_key, namespace 
    FROM ui_translations 
    ORDER BY translation_key
  LOOP
    -- Extract domain from the translation key (e.g., 'nav.dashboard' -> 'nav')
    domain_name := split_part(rec.translation_key, '.', 1);
    
    -- If the key doesn't have a dot, use the namespace as domain
    IF domain_name = rec.translation_key THEN
      domain_name := rec.namespace;
    END IF;
    
    -- Insert or get the translation key
    INSERT INTO translation_keys (key, domain, description)
    VALUES (rec.translation_key, domain_name, NULL)
    ON CONFLICT (key) DO UPDATE SET domain = EXCLUDED.domain
    RETURNING id INTO key_id;
    
    -- If the INSERT didn't return an id (because of conflict), fetch it
    IF key_id IS NULL THEN
      SELECT id INTO key_id FROM translation_keys WHERE key = rec.translation_key;
    END IF;
    
    -- Insert translations for each locale
    INSERT INTO translations (translation_key_id, language, value, source, updated_by, updated_at)
    SELECT 
      key_id,
      LOWER(locale),
      value,
      'migrated_from_ui_translations',
      updated_by,
      COALESCE(updated_at, NOW())
    FROM ui_translations
    WHERE translation_key = rec.translation_key
    ON CONFLICT (translation_key_id, language) 
    DO UPDATE SET 
      value = EXCLUDED.value,
      source = EXCLUDED.source,
      updated_at = EXCLUDED.updated_at;
    
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END $$;

-- Step 2: Verify the migration
DO $$
DECLARE
  ui_count INTEGER;
  keys_count INTEGER;
  trans_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT translation_key) INTO ui_count FROM ui_translations;
  SELECT COUNT(*) INTO keys_count FROM translation_keys;
  SELECT COUNT(*) INTO trans_count FROM translations WHERE source = 'migrated_from_ui_translations';
  
  RAISE NOTICE 'Original ui_translations unique keys: %', ui_count;
  RAISE NOTICE 'Translation keys in new table: %', keys_count;
  RAISE NOTICE 'Migrated translations: %', trans_count;
  
  IF ui_count > keys_count THEN
    RAISE WARNING 'Some translation keys may not have been migrated!';
  ELSE
    RAISE NOTICE 'Migration verification passed';
  END IF;
END $$;

-- Step 3: Show sample of migrated data
SELECT 
  tk.key,
  tk.domain,
  t.language,
  LEFT(t.value, 50) as value_preview,
  t.source
FROM translation_keys tk
JOIN translations t ON t.translation_key_id = tk.id
WHERE t.source = 'migrated_from_ui_translations'
ORDER BY tk.key, t.language
LIMIT 20;
