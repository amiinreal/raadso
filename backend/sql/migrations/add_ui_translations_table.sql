CREATE TABLE IF NOT EXISTS ui_translations (
    id SERIAL PRIMARY KEY,
    translation_key TEXT NOT NULL,
    locale TEXT NOT NULL,
    value TEXT NOT NULL,
    namespace TEXT NOT NULL DEFAULT 'common',
    updated_by UUID NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ui_translations_unique UNIQUE (translation_key, locale)
);

-- Seed baseline English phrases for new i18n layer
INSERT INTO ui_translations (translation_key, locale, value)
VALUES
    ('nav.dashboard', 'en', 'Dashboard'),
    ('nav.jobs', 'en', 'Jobs'),
    ('nav.companies', 'en', 'Companies'),
    ('nav.profile', 'en', 'Profile'),
    ('nav.applications', 'en', 'Applications'),
    ('nav.teamMembers', 'en', 'Team Members'),
    ('nav.postJob', 'en', 'Post Job'),
    ('nav.admin', 'en', 'Admin'),
    ('jobs.deadline', 'en', 'Deadline'),
    ('jobs.jobCategory', 'en', 'Job Category'),
    ('jobs.jobClassification', 'en', 'Job Classification'),
    ('jobs.employmentType', 'en', 'Employment Type'),
    ('jobs.jobDescription', 'en', 'Job Description'),
    ('jobs.applyNow', 'en', 'Apply Now'),
    ('profile.status.ready', 'en', 'Ready to share'),
    ('profile.status.needsDetails', 'en', 'Needs details'),
    ('profile.status.notLooking', 'en', 'Not looking'),
    ('admin.translations.title', 'en', 'Interface Translations'),
    ('admin.translations.description', 'en', 'Update the copy that appears across the application.'),
    ('admin.translations.saveButton', 'en', 'Save copy')
ON CONFLICT (translation_key, locale) DO NOTHING;

-- Somali equivalents for the same keys
INSERT INTO ui_translations (translation_key, locale, value)
VALUES
    ('nav.dashboard', 'so', 'Guddi Hagid'),
    ('nav.jobs', 'so', 'Shaqooyin'),
    ('nav.companies', 'so', 'Shirkado'),
    ('nav.profile', 'so', 'Xogta'),
    ('nav.applications', 'so', 'Codsiyo'),
    ('nav.teamMembers', 'so', 'Xubnaha Kooxda'),
    ('nav.postJob', 'so', 'Ku Dar Shaqo'),
    ('nav.admin', 'so', 'Maamul'),
    ('jobs.deadline', 'so', 'Waqtiga Dhammaadka'),
    ('jobs.jobCategory', 'so', 'Nooca Shaqada'),
    ('jobs.jobClassification', 'so', 'Fasaleynta Shaqada'),
    ('jobs.employmentType', 'so', 'Nooca Shaqaalaynta'),
    ('jobs.jobDescription', 'so', 'Sharaxaadda Shaqada'),
    ('jobs.applyNow', 'so', 'Codso Hadda'),
    ('profile.status.ready', 'so', 'Diyaar in la wadaago'),
    ('profile.status.needsDetails', 'so', 'Faahfaahin ayaa maqan'),
    ('profile.status.notLooking', 'so', 'Shaqo ma raadinayo'),
    ('admin.translations.title', 'so', 'Tarjumada Interface-ka'),
    ('admin.translations.description', 'so', 'Cusboonaysii qoraallada ka muuqda barnaamijka oo dhan.'),
    ('admin.translations.saveButton', 'so', 'Kaydi qoraalka')
ON CONFLICT (translation_key, locale) DO NOTHING;
