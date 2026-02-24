-- Seed translation keys for Admin Dashboard and Apply Flow
INSERT INTO translation_keys (key, domain) VALUES
('admin.dashboard.consoleTitle', 'default'),
('admin.dashboard.consoleDescription', 'default'),
('admin.dashboard.nav.tenants', 'default'),
('admin.dashboard.nav.users', 'default'),
('admin.dashboard.nav.employers', 'default'),
('admin.dashboard.nav.candidates', 'default'),
('admin.dashboard.nav.automation', 'default'),
('admin.dashboard.nav.settings', 'default'),
('admin.dashboard.nav.audit', 'default'),
('admin.dashboard.nav.translations', 'default'),
('admin.translations.extractTitle', 'default'),
('admin.translations.extractDesc', 'default'),
('admin.translations.actions.scanCandidate', 'default'),
('admin.translations.actions.scanEmployer', 'default'),
('admin.translations.actions.scanAll', 'default'),
('admin.translations.noNewStrings', 'default'),
('admin.translations.actions.syncBase', 'default'),
('admin.translations.actions.showLocation', 'default'),
('apply.actions.submit', 'default'),
('apply.actions.submitPreview', 'default'),
('apply.auth.registerBtn', 'default'),
('apply.auth.signinBtn', 'default'),
('apply.auth.signinHeader', 'default'),
('apply.auth.signinHint', 'default'),
('apply.backToDashboard', 'default'),
('apply.common.optional', 'default'),
('apply.common.required', 'default'),
('apply.common.types', 'default'),
('apply.employerPreview', 'default'),
('apply.errors.coverLetterLength', 'default'),
('apply.errors.customFileRequired', 'default'),
('apply.errors.cvRequired', 'default'),
('apply.errors.educationRequired', 'default'),
('apply.errors.experienceRequired', 'default'),
('apply.errors.languagesMissing', 'default'),
('apply.errors.nationalityRequired', 'default'),
('apply.errors.profileRequired', 'default'),
('apply.errors.submitFailed', 'default'),
('apply.errors.uploadFailed', 'default'),
('apply.header', 'default'),
('apply.hints.attachCv', 'default'),
('apply.labels.additionalDocs', 'default'),
('apply.labels.attachCv', 'default'),
('apply.labels.coverLetter', 'default'),
('apply.placeholders.coverLetter', 'default'),
('apply.previewBadge', 'default'),
('apply.previewDescription', 'default'),
('apply.requirements.additionalDocs', 'default'),
('apply.requirements.cv', 'default'),
('apply.requirements.education', 'default'),
('apply.requirements.experience', 'default'),
('apply.requirements.languages', 'default'),
('apply.requirements.languagesMissing', 'default'),
('apply.requirements.nationality', 'default'),
('apply.requirements.noAdditional', 'default'),
('apply.requirements.profile', 'default'),
('apply.requirementsHeader', 'default'),
('common.app.name', 'default'),
('common.back', 'default'),
('common.cancel', 'default')
ON CONFLICT (key) DO NOTHING;

-- Seed translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', CASE key 
    WHEN 'admin.dashboard.consoleTitle' THEN 'RAADI Admin'
    WHEN 'admin.dashboard.consoleDescription' THEN 'Manage platform settings, users, and content.'
    WHEN 'admin.dashboard.nav.tenants' THEN 'Tenants'
    WHEN 'admin.dashboard.nav.users' THEN 'Users'
    WHEN 'admin.dashboard.nav.employers' THEN 'Employers'
    WHEN 'admin.dashboard.nav.candidates' THEN 'Candidates'
    WHEN 'admin.dashboard.nav.automation' THEN 'Automation'
    WHEN 'admin.dashboard.nav.settings' THEN 'Settings'
    WHEN 'admin.dashboard.nav.audit' THEN 'Audit Logs'
    WHEN 'admin.dashboard.nav.translations' THEN 'Translations'
    WHEN 'admin.translations.extractTitle' THEN 'Scan for new strings'
    WHEN 'admin.translations.extractDesc' THEN 'Scan the codebase for any new translation keys that have been added by developers.'
    WHEN 'admin.translations.actions.scanCandidate' THEN 'Scan Candidate App'
    WHEN 'admin.translations.actions.scanEmployer' THEN 'Scan Employer App'
    WHEN 'admin.translations.actions.scanAll' THEN 'Scan All Apps'
    WHEN 'admin.translations.noNewStrings' THEN 'No new strings found.'
    WHEN 'admin.translations.actions.syncBase' THEN 'Sync with Base'
    WHEN 'admin.translations.actions.showLocation' THEN 'Show Location'
    WHEN 'apply.actions.submit' THEN 'Submit'
    WHEN 'apply.actions.submitPreview' THEN 'Submit Application (Preview)'
    WHEN 'apply.auth.registerBtn' THEN 'Register'
    WHEN 'apply.auth.signinBtn' THEN 'Sign In'
    WHEN 'apply.auth.signinHeader' THEN 'Sign in to Apply'
    WHEN 'apply.auth.signinHint' THEN 'You need an account to apply for this job.'
    WHEN 'apply.backToDashboard' THEN 'Back to Dashboard'
    WHEN 'apply.common.optional' THEN 'optional'
    WHEN 'apply.common.required' THEN 'required'
    WHEN 'apply.common.types' THEN 'types'
    WHEN 'apply.employerPreview' THEN 'Employer Preview Mode'
    WHEN 'apply.errors.coverLetterLength' THEN 'Cover letter is too long (max 5000 chars).'
    WHEN 'apply.errors.customFileRequired' THEN '{fileName} is required'
    WHEN 'apply.errors.cvRequired' THEN 'CV is required'
    WHEN 'apply.errors.educationRequired' THEN 'Education is required'
    WHEN 'apply.errors.experienceRequired' THEN 'Work experience is required'
    WHEN 'apply.errors.languagesMissing' THEN 'Missing required languages: {languages}'
    WHEN 'apply.errors.nationalityRequired' THEN 'Nationality is required'
    WHEN 'apply.errors.profileRequired' THEN 'Profile is required'
    WHEN 'apply.errors.submitFailed' THEN 'Failed to submit application. Please try again.'
    WHEN 'apply.errors.uploadFailed' THEN 'File upload failed. Please try again.'
    WHEN 'apply.header' THEN 'Apply for {jobTitle}'
    WHEN 'apply.hints.attachCv' THEN 'PDF, DOC, DOCX up to 5MB'
    WHEN 'apply.labels.additionalDocs' THEN 'Additional Documents'
    WHEN 'apply.labels.attachCv' THEN 'Attach CV/Resume'
    WHEN 'apply.labels.coverLetter' THEN 'Cover Letter'
    WHEN 'apply.placeholders.coverLetter' THEN 'Tell us why you''re a perfect fit for this role...'
    WHEN 'apply.previewBadge' THEN 'Preview Mode'
    WHEN 'apply.previewDescription' THEN 'This is a preview of how candidates will see your job application form. You cannot submit applications from this view.'
    WHEN 'apply.requirements.additionalDocs' THEN 'Additional Documents'
    WHEN 'apply.requirements.cv' THEN 'CV / Resume'
    WHEN 'apply.requirements.education' THEN 'Education History'
    WHEN 'apply.requirements.experience' THEN 'Work Experience'
    WHEN 'apply.requirements.languages' THEN 'Languages: {languages}'
    WHEN 'apply.requirements.languagesMissing' THEN 'Missing required languages: {languages}'
    WHEN 'apply.requirements.nationality' THEN 'Nationality'
    WHEN 'apply.requirements.noAdditional' THEN 'No additional requirements'
    WHEN 'apply.requirements.profile' THEN 'Complete Profile'
    WHEN 'apply.requirementsHeader' THEN 'Application Requirements'
    WHEN 'common.app.name' THEN 'RAADI'
    WHEN 'common.back' THEN 'Back'
    WHEN 'common.cancel' THEN 'Cancel'
END
FROM translation_keys 
WHERE key IN (
    'admin.dashboard.consoleTitle', 'admin.dashboard.consoleDescription', 'admin.dashboard.nav.tenants', 
    'admin.dashboard.nav.users', 'admin.dashboard.nav.employers', 'admin.dashboard.nav.candidates', 
    'admin.dashboard.nav.automation', 'admin.dashboard.nav.settings', 'admin.dashboard.nav.audit', 
    'admin.dashboard.nav.translations', 'admin.translations.extractTitle', 'admin.translations.extractDesc',
    'admin.translations.actions.scanCandidate', 'admin.translations.actions.scanEmployer', 'admin.translations.actions.scanAll',
    'admin.translations.noNewStrings', 'admin.translations.actions.syncBase', 'admin.translations.actions.showLocation',
    'apply.actions.submit', 'apply.actions.submitPreview', 'apply.auth.registerBtn', 'apply.auth.signinBtn',
    'apply.auth.signinHeader', 'apply.auth.signinHint', 'apply.backToDashboard', 'apply.common.optional',
    'apply.common.required', 'apply.common.types', 'apply.employerPreview', 'apply.errors.coverLetterLength',
    'apply.errors.customFileRequired', 'apply.errors.cvRequired', 'apply.errors.educationRequired',
    'apply.errors.experienceRequired', 'apply.errors.languagesMissing', 'apply.errors.nationalityRequired',
    'apply.errors.profileRequired', 'apply.errors.submitFailed', 'apply.errors.uploadFailed', 'apply.header',
    'apply.hints.attachCv', 'apply.labels.additionalDocs', 'apply.labels.attachCv', 'apply.labels.coverLetter',
    'apply.placeholders.coverLetter', 'apply.previewBadge', 'apply.previewDescription', 'apply.requirements.additionalDocs',
    'apply.requirements.cv', 'apply.requirements.education', 'apply.requirements.experience', 'apply.requirements.languages',
    'apply.requirements.languagesMissing', 'apply.requirements.nationality', 'apply.requirements.noAdditional',
    'apply.requirements.profile', 'apply.requirementsHeader', 'common.app.name', 'common.back', 'common.cancel'
)
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key 
    WHEN 'admin.dashboard.consoleTitle' THEN 'RAADI Maamule'
    WHEN 'admin.dashboard.consoleDescription' THEN 'Maamul habka, isticmaalayaasha, iyo nuxurka.'
    WHEN 'admin.dashboard.nav.tenants' THEN 'Kiraystayaasha'
    WHEN 'admin.dashboard.nav.users' THEN 'Isticmaalayaasha'
    WHEN 'admin.dashboard.nav.employers' THEN 'Shaqo-bixiyayaasha'
    WHEN 'admin.dashboard.nav.candidates' THEN 'Musharraxiinta'
    WHEN 'admin.dashboard.nav.automation' THEN 'Otomaatiga'
    WHEN 'admin.dashboard.nav.settings' THEN 'Dejinta'
    WHEN 'admin.dashboard.nav.audit' THEN 'Baaritaanka'
    WHEN 'admin.dashboard.nav.translations' THEN 'Turjumaada'
    WHEN 'admin.translations.extractTitle' THEN 'Raadi Qoraallo Cusub'
    WHEN 'admin.translations.extractDesc' THEN 'Ka baaq codebase-ka fureyaasha cusub ee lagu daray.'
    WHEN 'admin.translations.actions.scanCandidate' THEN 'Baar App-ka Musharraxa'
    WHEN 'admin.translations.actions.scanEmployer' THEN 'Baar App-ka Shaqo-bixiyaha'
    WHEN 'admin.translations.actions.scanAll' THEN 'Baar Dhammaan'
    WHEN 'admin.translations.noNewStrings' THEN 'Majiraan fureyaal cusub.'
    WHEN 'admin.translations.actions.syncBase' THEN 'La Mideey Base'
    WHEN 'admin.translations.actions.showLocation' THEN 'Muuji Goobta'
    WHEN 'apply.actions.submit' THEN 'Gudbi'
    WHEN 'apply.actions.submitPreview' THEN 'Gudbi Codsiga (Hordhac)'
    WHEN 'apply.auth.registerBtn' THEN 'Is-diiwaangeli'
    WHEN 'apply.auth.signinBtn' THEN 'Soo Gal'
    WHEN 'apply.auth.signinHeader' THEN 'Soo Gal si aad u Codsato'
    WHEN 'apply.auth.signinHint' THEN 'Waxaad u baahan tahay akoon si aad u codsato shaqadan.'
    WHEN 'apply.backToDashboard' THEN 'Ku Noqo Dashboard-ka'
    WHEN 'apply.common.optional' THEN 'ikhtiyaari'
    WHEN 'apply.common.required' THEN 'loo baahan yahay'
    WHEN 'apply.common.types' THEN 'noocyada'
    WHEN 'apply.employerPreview' THEN 'Habka Hordhaca Shaqo-bixiyaha'
    WHEN 'apply.errors.coverLetterLength' THEN 'Warqadda codsigu aad bay u dheer tahay (ugu badnaan 5000 xaraf).'
    WHEN 'apply.errors.customFileRequired' THEN '{fileName} ayaa loo baahan yahay'
    WHEN 'apply.errors.cvRequired' THEN 'CV ayaa loo baahan yahay'
    WHEN 'apply.errors.educationRequired' THEN 'Waxbarasho ayaa loo baahan yahay'
    WHEN 'apply.errors.experienceRequired' THEN 'Khibrad shaqo ayaa loo baahan yahay'
    WHEN 'apply.errors.languagesMissing' THEN 'Waxaa dhiman luuqadaha loo baahan yahay: {languages}'
    WHEN 'apply.errors.nationalityRequired' THEN 'Dhalasho ayaa loo baahan yahay'
    WHEN 'apply.errors.profileRequired' THEN 'Profayl ayaa loo baahan yahay'
    WHEN 'apply.errors.submitFailed' THEN 'Codsiga waa la gudbin waayay. Fadlan isku day mar kale.'
    WHEN 'apply.errors.uploadFailed' THEN 'Faylka oo la soo rogi waayay. Fadlan isku day mar kale.'
    WHEN 'apply.header' THEN 'Codso {jobTitle}'
    WHEN 'apply.hints.attachCv' THEN 'PDF, DOC, DOCX ilaa 5MB'
    WHEN 'apply.labels.additionalDocs' THEN 'Dukumeentiyo Dheeraad ah'
    WHEN 'apply.labels.attachCv' THEN 'Ku lifaaq CV/Resume'
    WHEN 'apply.labels.coverLetter' THEN 'Warqadda Codsiga (Cover Letter)'
    WHEN 'apply.placeholders.coverLetter' THEN 'Noo sheeg sababta aad ugu haboontahay doorkan...'
    WHEN 'apply.previewBadge' THEN 'Habka Hordhaca'
    WHEN 'apply.previewDescription' THEN 'Kani waa hordhac ku saabsan sida murashixiintu u arki doonaan foomka codsigaaga shaqo. Kama gudbin kartid codsiyo halkan.'
    WHEN 'apply.requirements.additionalDocs' THEN 'Dukumeentiyo Dheeraad ah'
    WHEN 'apply.requirements.cv' THEN 'CV / Resume'
    WHEN 'apply.requirements.education' THEN 'Taariikh Waxbarasho'
    WHEN 'apply.requirements.experience' THEN 'Khibrad Shaqo'
    WHEN 'apply.requirements.languages' THEN 'Luuqadaha: {languages}'
    WHEN 'apply.requirements.languagesMissing' THEN 'Waxaa dhiman luuqadaha loo baahan yahay: {languages}'
    WHEN 'apply.requirements.nationality' THEN 'Dhalasho'
    WHEN 'apply.requirements.noAdditional' THEN 'Majiraan shuruudo dheeraad ah'
    WHEN 'apply.requirements.profile' THEN 'Profayl Dhamaystiran'
    WHEN 'apply.requirementsHeader' THEN 'Shuruudaha Codsiga'
    WHEN 'common.app.name' THEN 'RAADI'
    WHEN 'common.back' THEN 'Dib u noqo'
    WHEN 'common.cancel' THEN 'Ka noqo'
END
FROM translation_keys 
WHERE key IN (
    'admin.dashboard.consoleTitle', 'admin.dashboard.consoleDescription', 'admin.dashboard.nav.tenants', 
    'admin.dashboard.nav.users', 'admin.dashboard.nav.employers', 'admin.dashboard.nav.candidates', 
    'admin.dashboard.nav.automation', 'admin.dashboard.nav.settings', 'admin.dashboard.nav.audit', 
    'admin.dashboard.nav.translations', 'admin.translations.extractTitle', 'admin.translations.extractDesc',
    'admin.translations.actions.scanCandidate', 'admin.translations.actions.scanEmployer', 'admin.translations.actions.scanAll',
    'admin.translations.noNewStrings', 'admin.translations.actions.syncBase', 'admin.translations.actions.showLocation',
    'apply.actions.submit', 'apply.actions.submitPreview', 'apply.auth.registerBtn', 'apply.auth.signinBtn',
    'apply.auth.signinHeader', 'apply.auth.signinHint', 'apply.backToDashboard', 'apply.common.optional',
    'apply.common.required', 'apply.common.types', 'apply.employerPreview', 'apply.errors.coverLetterLength',
    'apply.errors.customFileRequired', 'apply.errors.cvRequired', 'apply.errors.educationRequired',
    'apply.errors.experienceRequired', 'apply.errors.languagesMissing', 'apply.errors.nationalityRequired',
    'apply.errors.profileRequired', 'apply.errors.submitFailed', 'apply.errors.uploadFailed', 'apply.header',
    'apply.hints.attachCv', 'apply.labels.additionalDocs', 'apply.labels.attachCv', 'apply.labels.coverLetter',
    'apply.placeholders.coverLetter', 'apply.previewBadge', 'apply.previewDescription', 'apply.requirements.additionalDocs',
    'apply.requirements.cv', 'apply.requirements.education', 'apply.requirements.experience', 'apply.requirements.languages',
    'apply.requirements.languagesMissing', 'apply.requirements.nationality', 'apply.requirements.noAdditional',
    'apply.requirements.profile', 'apply.requirementsHeader', 'common.app.name', 'common.back', 'common.cancel'
)
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
