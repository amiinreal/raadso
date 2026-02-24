-- Migration: Add user profile translations
-- Date: 2026-02-07

-- 1. Insert Translation Keys
INSERT INTO translation_keys (key, domain, description) VALUES
('profile.autoUpdateHint', 'profile', 'Hint about auto-saving'),
('profile.hideImage', 'profile', 'Toggle to hide profile image'),
('profile.sections.experience', 'profile', 'Experience section header'),
('profile.actions.addExperience', 'profile', 'Add experience button'),
('profile.sections.education', 'profile', 'Education section header'),
('profile.actions.addEducation', 'profile', 'Add education button'),
('profile.hints.addEducation', 'profile', 'Hint for empty education section'),
('profile.sections.skills', 'profile', 'Skills section header'),
('profile.actions.addSkill', 'profile', 'Add skill button'),
('profile.sections.languages', 'profile', 'Languages section header'),
('profile.actions.addLanguage', 'profile', 'Add language button'),
('profile.sections.attachments', 'profile', 'Attachments section header'),
('profile.actions.addAttachment', 'profile', 'Add attachment button'),
('common.app.name', 'common', 'Application Name')
ON CONFLICT (key) DO NOTHING;

-- 2. Insert English Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', 'Your profile is automatically updated.' FROM translation_keys WHERE key = 'profile.autoUpdateHint'
UNION ALL
SELECT id, 'en', 'Hide profile image' FROM translation_keys WHERE key = 'profile.hideImage'
UNION ALL
SELECT id, 'en', 'Experience' FROM translation_keys WHERE key = 'profile.sections.experience'
UNION ALL
SELECT id, 'en', '+ Add Experience' FROM translation_keys WHERE key = 'profile.actions.addExperience'
UNION ALL
SELECT id, 'en', 'Education' FROM translation_keys WHERE key = 'profile.sections.education'
UNION ALL
SELECT id, 'en', '+ Add Education' FROM translation_keys WHERE key = 'profile.actions.addEducation'
UNION ALL
SELECT id, 'en', 'Add your educational background' FROM translation_keys WHERE key = 'profile.hints.addEducation'
UNION ALL
SELECT id, 'en', 'Skills' FROM translation_keys WHERE key = 'profile.sections.skills'
UNION ALL
SELECT id, 'en', '+ Add Skill' FROM translation_keys WHERE key = 'profile.actions.addSkill'
UNION ALL
SELECT id, 'en', 'Languages' FROM translation_keys WHERE key = 'profile.sections.languages'
UNION ALL
SELECT id, 'en', '+ Add Language' FROM translation_keys WHERE key = 'profile.actions.addLanguage'
UNION ALL
SELECT id, 'en', 'Attachments' FROM translation_keys WHERE key = 'profile.sections.attachments'
UNION ALL
SELECT id, 'en', '+ Add Attachment' FROM translation_keys WHERE key = 'profile.actions.addAttachment'
UNION ALL
SELECT id, 'en', 'RAADI' FROM translation_keys WHERE key = 'common.app.name'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- 3. Insert Somali Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', 'Xogtaadu si toos ah ayaa loo cusbooneysiiyaa.' FROM translation_keys WHERE key = 'profile.autoUpdateHint'
UNION ALL
SELECT id, 'so', 'Qari sawirka profile-ka' FROM translation_keys WHERE key = 'profile.hideImage'
UNION ALL
SELECT id, 'so', 'Khibrad' FROM translation_keys WHERE key = 'profile.sections.experience'
UNION ALL
SELECT id, 'so', '+ Ku dar Khibrad' FROM translation_keys WHERE key = 'profile.actions.addExperience'
UNION ALL
SELECT id, 'so', 'Waxbarasho' FROM translation_keys WHERE key = 'profile.sections.education'
UNION ALL
SELECT id, 'so', '+ Ku dar Waxbarasho' FROM translation_keys WHERE key = 'profile.actions.addEducation'
UNION ALL
SELECT id, 'so', 'Ku dar taariikhdaada waxbarasho' FROM translation_keys WHERE key = 'profile.hints.addEducation'
UNION ALL
SELECT id, 'so', 'Xirfado' FROM translation_keys WHERE key = 'profile.sections.skills'
UNION ALL
SELECT id, 'so', '+ Ku dar Xirfad' FROM translation_keys WHERE key = 'profile.actions.addSkill'
UNION ALL
SELECT id, 'so', 'Luqado' FROM translation_keys WHERE key = 'profile.sections.languages'
UNION ALL
SELECT id, 'so', '+ Ku dar Luqad' FROM translation_keys WHERE key = 'profile.actions.addLanguage'
UNION ALL
SELECT id, 'so', 'Dokumenti Gali' FROM translation_keys WHERE key = 'profile.sections.attachments'
UNION ALL
SELECT id, 'so', '+ Ku dar Lifaaq' FROM translation_keys WHERE key = 'profile.actions.addAttachment'
UNION ALL
SELECT id, 'so', 'RAADI' FROM translation_keys WHERE key = 'common.app.name'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
