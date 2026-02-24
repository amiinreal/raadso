-- Seed translation keys for Profile Edit section
INSERT INTO translation_keys (key, domain) VALUES
('profileEdit.badge', 'default'),
('profileEdit.title', 'default'),
('profileEdit.firstName', 'default'),
('profileEdit.lastName', 'default'),
('profileEdit.headline', 'default'),
('profileEdit.phone', 'default'),
('profileEdit.location', 'default'),
('profileEdit.nationality', 'default'),
('profileEdit.selectNationality', 'default'),
('profileEdit.yearsOfExperience', 'default'),
('profileEdit.seniorityLevel', 'default'),
('profileEdit.selectLevel', 'default'),
('profileEdit.levels.entry', 'default'),
('profileEdit.levels.mid', 'default'),
('profileEdit.levels.senior', 'default'),
('profileEdit.levels.lead', 'default'),
('profileEdit.levels.principal', 'default'),
('profileEdit.summary', 'default'),
('profileEdit.summary.placeholder', 'default'),
('profileEdit.links.title', 'default'),
('profileEdit.links.cv', 'default'),
('profileEdit.links.portfolio', 'default'),
('profileEdit.links.linkedin', 'default'),
('profileEdit.links.github', 'default'),
('profileEdit.openToWork', 'default'),
('profileEdit.save', 'default')
ON CONFLICT (key) DO NOTHING;

-- Seed English values
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', val FROM (VALUES
('profileEdit.badge', 'Profile'),
('profileEdit.title', 'Edit your profile'),
('profileEdit.firstName', 'First name *'),
('profileEdit.lastName', 'Last name *'),
('profileEdit.headline', 'Headline'),
('profileEdit.phone', 'Phone'),
('profileEdit.location', 'Location'),
('profileEdit.nationality', 'Nationality'),
('profileEdit.selectNationality', 'Select Nationality'),
('profileEdit.yearsOfExperience', 'Years of Experience'),
('profileEdit.seniorityLevel', 'Seniority Level'),
('profileEdit.selectLevel', 'Select level'),
('profileEdit.levels.entry', 'Entry Level'),
('profileEdit.levels.mid', 'Mid Level'),
('profileEdit.levels.senior', 'Senior'),
('profileEdit.levels.lead', 'Lead'),
('profileEdit.levels.principal', 'Principal'),
('profileEdit.summary', 'Summary'),
('profileEdit.summary.placeholder', 'Brief overview of your background and expertise...'),
('profileEdit.links.title', 'Links & Attachments'),
('profileEdit.links.cv', 'CV File URL'),
('profileEdit.links.portfolio', 'Portfolio URL'),
('profileEdit.links.linkedin', 'LinkedIn URL'),
('profileEdit.links.github', 'GitHub URL'),
('profileEdit.openToWork', 'Open to work'),
('profileEdit.save', 'Save profile')
) AS v(key, val)
JOIN translation_keys k ON k.key = v.key
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- Seed Somali values
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', val FROM (VALUES
('profileEdit.badge', 'Xogta'),
('profileEdit.title', 'Wax ka bedel xogtaada'),
('profileEdit.firstName', 'Magaca koowaad *'),
('profileEdit.lastName', 'Magaca dambe *'),
('profileEdit.headline', 'Cinwaanka Shaqada'),
('profileEdit.phone', 'Telefoon'),
('profileEdit.location', 'Goobta'),
('profileEdit.nationality', 'Dhalashada'),
('profileEdit.selectNationality', 'Xulo Dhalashada'),
('profileEdit.yearsOfExperience', 'Khibrad (Sano)'),
('profileEdit.seniorityLevel', 'Darajada Khibrada'),
('profileEdit.selectLevel', 'Xulo darajada'),
('profileEdit.levels.entry', 'Bilow'),
('profileEdit.levels.mid', 'Dhexdhexaad'),
('profileEdit.levels.senior', 'Sare'),
('profileEdit.levels.lead', 'Hogaamiye'),
('profileEdit.levels.principal', 'Agaasime / Sare'),
('profileEdit.summary', 'Faahfaahin Kooban'),
('profileEdit.summary.placeholder', 'Faahfaahin kooban oo ku saabsan khibradaada...'),
('profileEdit.links.title', 'Xiriirinta & Lifaaqyada'),
('profileEdit.links.cv', 'CV File URL'),
('profileEdit.links.portfolio', 'Portfolio URL'),
('profileEdit.links.linkedin', 'LinkedIn URL'),
('profileEdit.links.github', 'GitHub URL'),
('profileEdit.openToWork', 'U furan shaqo'),
('profileEdit.save', 'Kaydi Xogta')
) AS v(key, val)
JOIN translation_keys k ON k.key = v.key
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
