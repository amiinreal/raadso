-- Migration: Fix incorrect values for admin translation keys
-- Date: 2026-02-07

-- Update English Translations
UPDATE translations 
SET value = CASE 
    WHEN k.key = 'admin.translations.workspaceTitle' THEN 'Translate the product'
    WHEN k.key = 'admin.translations.persona.shared' THEN 'Shared copy'
    WHEN k.key = 'admin.translations.searchPlaceholder' THEN 'Search key or text...'
    WHEN k.key = 'admin.translations.actions.saveAll' THEN 'Save all changes'
    ELSE value
END
FROM translation_keys k
WHERE translations.translation_key_id = k.id 
AND translations.language = 'en'
AND k.key IN (
    'admin.translations.workspaceTitle', 
    'admin.translations.persona.shared', 
    'admin.translations.searchPlaceholder', 
    'admin.translations.actions.saveAll'
);

-- Update Somali Translations
UPDATE translations 
SET value = CASE 
    WHEN k.key = 'admin.translations.workspaceTitle' THEN 'Tarjum muuqaalka alaabta'
    WHEN k.key = 'admin.translations.persona.shared' THEN 'La wadaago'
    WHEN k.key = 'admin.translations.searchPlaceholder' THEN 'Raadi furaha ama qoraalka...'
    WHEN k.key = 'admin.translations.actions.saveAll' THEN 'Kaydi dhammaan isbeddelada'
    ELSE value
END
FROM translation_keys k
WHERE translations.translation_key_id = k.id 
AND translations.language = 'so'
AND k.key IN (
    'admin.translations.workspaceTitle', 
    'admin.translations.persona.shared', 
    'admin.translations.searchPlaceholder', 
    'admin.translations.actions.saveAll'
);
