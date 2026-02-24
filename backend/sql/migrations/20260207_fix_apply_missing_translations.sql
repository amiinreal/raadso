-- Migration: Fix missing apply page translations
-- Date: 2026-02-07

-- 1. Insert Translation Keys
INSERT INTO translation_keys (key, domain, page, description) VALUES
('apply.labels.shareProfile', 'candidate', 'apply', 'Label: Share my profile'),
('apply.ownJobWarning', 'employer', 'apply', 'Warning: Cannot apply to own job'),
('apply.labels.useProfile', 'candidate', 'apply', 'Label: Use existing profile'),
('apply.hints.useProfile', 'candidate', 'apply', 'Hint: Use existing profile data'),
('apply.actions.completeProfileToApply', 'candidate', 'apply', 'Button: Complete Profile to Apply'),
('apply.errors.missingReqs', 'candidate', 'apply', 'Error: Missing requirements'),
('apply.errors.unmetListPrefix', 'candidate', 'apply', 'Error: Missing requirements list prefix'),
('apply.errors.updateProfileHint', 'candidate', 'apply', 'Hint: Update profile to apply')
ON CONFLICT (key) DO UPDATE SET page = 'apply';

-- 2. Insert English Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', 'Share full profile' FROM translation_keys WHERE key = 'apply.labels.shareProfile'
UNION ALL
SELECT id, 'en', 'You cannot apply to your own job.' FROM translation_keys WHERE key = 'apply.ownJobWarning'
UNION ALL
SELECT id, 'en', 'Use my profile' FROM translation_keys WHERE key = 'apply.labels.useProfile'
UNION ALL
SELECT id, 'en', 'Use your existing profile information for this application.' FROM translation_keys WHERE key = 'apply.hints.useProfile'
UNION ALL
SELECT id, 'en', 'Complete Profile to Apply' FROM translation_keys WHERE key = 'apply.actions.completeProfileToApply'
UNION ALL
SELECT id, 'en', 'You do not meet all requirements' FROM translation_keys WHERE key = 'apply.errors.missingReqs'
UNION ALL
SELECT id, 'en', 'The following requirements are missing:' FROM translation_keys WHERE key = 'apply.errors.unmetListPrefix'
UNION ALL
SELECT id, 'en', 'Please update your profile to meet these requirements.' FROM translation_keys WHERE key = 'apply.errors.updateProfileHint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- 3. Insert Somali Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', 'La wadaag xogta oo dhan' FROM translation_keys WHERE key = 'apply.labels.shareProfile'
UNION ALL
SELECT id, 'so', 'Ma codsan kartid shaqo aad adigu soo dhejisay.' FROM translation_keys WHERE key = 'apply.ownJobWarning'
UNION ALL
SELECT id, 'so', 'Isticmaal xogtayda' FROM translation_keys WHERE key = 'apply.labels.useProfile'
UNION ALL
SELECT id, 'so', 'Isticmaal xogtaada hadda kuu diiwaan gashan.' FROM translation_keys WHERE key = 'apply.hints.useProfile'
UNION ALL
SELECT id, 'so', 'Dhameystir Xogta si aad u Codsato' FROM translation_keys WHERE key = 'apply.actions.completeProfileToApply'
UNION ALL
SELECT id, 'so', 'Ma buuxisid shuruudaha oo dhan' FROM translation_keys WHERE key = 'apply.errors.missingReqs'
UNION ALL
SELECT id, 'so', 'Shuruudahan soo socda ayaa maqan:' FROM translation_keys WHERE key = 'apply.errors.unmetListPrefix'
UNION ALL
SELECT id, 'so', 'Fadlan cusbooneysii xogtaada si aad u buuxiso shuruudahan.' FROM translation_keys WHERE key = 'apply.errors.updateProfileHint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
