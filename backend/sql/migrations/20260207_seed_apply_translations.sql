-- Seed translation keys for the Apply page
INSERT INTO translation_keys (key, domain, page) VALUES
('apply.employerPreview', 'apply', 'apply_page'),
('apply.previewDescription', 'apply', 'apply_page'),
('apply.backToDashboard', 'apply', 'apply_page'),
('apply.header', 'apply', 'apply_page'),
('apply.previewBadge', 'apply', 'apply_page'),
('apply.requirements.profile', 'apply', 'apply_page'),
('apply.requirements.experience', 'apply', 'apply_page'),
('apply.requirements.education', 'apply', 'apply_page'),
('apply.requirements.nationality', 'apply', 'apply_page'),
('apply.requirements.languages', 'apply', 'apply_page'),
('apply.requirements.cv', 'apply', 'apply_page'),
('apply.requirements.noAdditional', 'apply', 'apply_page'),
('apply.labels.attachCv', 'apply', 'apply_page'),
('apply.hints.attachCv', 'apply', 'apply_page'),
('apply.labels.additionalDocs', 'apply', 'apply_page'),
('apply.placeholders.coverLetter', 'apply', 'apply_page'),
('apply.labels.coverLetter', 'apply', 'apply_page'),
('apply.actions.submitPreview', 'apply', 'apply_page'),
('apply.auth.signinHeader', 'apply', 'apply_page'),
('apply.auth.signinHint', 'apply', 'apply_page'),
('apply.requirementsHeader', 'apply', 'apply_page'),
('apply.requirements.additionalDocs', 'apply', 'apply_page'),
('apply.auth.signinBtn', 'apply', 'apply_page'),
('apply.auth.registerBtn', 'apply', 'apply_page'),
('apply.requirements.languagesMissing', 'apply', 'apply_page'),
('apply.errors.uploadFailed', 'apply', 'apply_page'),
('apply.errors.coverLetterLength', 'apply', 'apply_page'),
('apply.errors.profileRequired', 'apply', 'apply_page'),
('apply.errors.experienceRequired', 'apply', 'apply_page'),
('apply.errors.educationRequired', 'apply', 'apply_page'),
('apply.errors.languagesMissing', 'apply', 'apply_page'),
('apply.errors.nationalityRequired', 'apply', 'apply_page'),
('apply.errors.cvRequired', 'apply', 'apply_page'),
('apply.errors.customFileRequired', 'apply', 'apply_page'),
('apply.errors.submitFailed', 'apply', 'apply_page'),
('apply.common.required', 'apply', 'apply_page'),
('apply.common.optional', 'apply', 'apply_page'),
('apply.common.types', 'apply', 'apply_page'),
('apply.errors.missingReqs', 'apply', 'apply_page'),
('apply.errors.unmetListPrefix', 'apply', 'apply_page'),
('apply.errors.updateProfileHint', 'apply', 'apply_page'),
('apply.labels.useProfile', 'apply', 'apply_page'),
('apply.hints.useProfile', 'apply', 'apply_page'),
('apply.errors.fixBeforeApplying', 'apply', 'apply_page'),
('apply.actions.completeProfileToApply', 'apply', 'apply_page'),
('apply.actions.submit', 'apply', 'apply_page')
ON CONFLICT (key) DO NOTHING;

-- Seed translations for Apply page (English)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', CASE key
    WHEN 'apply.employerPreview' THEN 'Employer Preview Mode'
    WHEN 'apply.previewDescription' THEN 'This is a preview of how candidates will see your job application form. You cannot submit applications from this view.'
    WHEN 'apply.backToDashboard' THEN 'Back to Dashboard'
    WHEN 'apply.header' THEN 'Apply for {jobTitle}'
    WHEN 'apply.previewBadge' THEN 'Preview Mode'
    WHEN 'apply.requirements.profile' THEN 'Complete Profile'
    WHEN 'apply.requirements.experience' THEN 'Work Experience'
    WHEN 'apply.requirements.education' THEN 'Education History'
    WHEN 'apply.requirements.nationality' THEN 'Nationality'
    WHEN 'apply.requirements.languages' THEN 'Languages: {languages}'
    WHEN 'apply.requirements.cv' THEN 'CV / Resume'
    WHEN 'apply.requirements.noAdditional' THEN 'No additional requirements'
    WHEN 'apply.labels.attachCv' THEN 'Attach CV/Resume'
    WHEN 'apply.hints.attachCv' THEN 'PDF, DOC, DOCX up to 5MB'
    WHEN 'apply.labels.additionalDocs' THEN 'Additional Documents'
    WHEN 'apply.placeholders.coverLetter' THEN 'Tell us why you''re a perfect fit for this role...'
    WHEN 'apply.labels.coverLetter' THEN 'Cover Letter'
    WHEN 'apply.actions.submitPreview' THEN 'Submit Application (Preview)'
    WHEN 'apply.auth.signinHeader' THEN 'Sign in to Apply'
    WHEN 'apply.auth.signinHint' THEN 'You need an account to apply for this job.'
    WHEN 'apply.requirementsHeader' THEN 'Application Requirements'
    WHEN 'apply.requirements.additionalDocs' THEN 'Additional Documents'
    WHEN 'apply.auth.signinBtn' THEN 'Sign In'
    WHEN 'apply.auth.registerBtn' THEN 'Register'
    WHEN 'apply.requirements.languagesMissing' THEN 'Missing required languages: {languages}'
    WHEN 'apply.errors.uploadFailed' THEN 'File upload failed. Please try again.'
    WHEN 'apply.errors.coverLetterLength' THEN 'Cover letter is too long (max 5000 chars).'
    WHEN 'apply.errors.profileRequired' THEN 'Profile is required'
    WHEN 'apply.errors.experienceRequired' THEN 'Work experience is required'
    WHEN 'apply.errors.educationRequired' THEN 'Education is required'
    WHEN 'apply.errors.languagesMissing' THEN 'Missing required languages: {languages}'
    WHEN 'apply.errors.nationalityRequired' THEN 'Nationality is required'
    WHEN 'apply.errors.cvRequired' THEN 'CV is required'
    WHEN 'apply.errors.customFileRequired' THEN '{fileName} is required'
    WHEN 'apply.errors.submitFailed' THEN 'Failed to submit application. Please try again.'
    WHEN 'apply.common.required' THEN 'required'
    WHEN 'apply.common.optional' THEN 'optional'
    WHEN 'apply.common.types' THEN 'types'
    WHEN 'apply.errors.missingReqs' THEN 'You do not meet all requirements'
    WHEN 'apply.errors.unmetListPrefix' THEN 'The following requirements are missing:'
    WHEN 'apply.errors.updateProfileHint' THEN 'Please update your profile to apply.'
    WHEN 'apply.labels.useProfile' THEN 'Use my profile'
    WHEN 'apply.hints.useProfile' THEN 'We''ll use your profile details for this application.'
    WHEN 'apply.errors.fixBeforeApplying' THEN 'Please fix the following errors before applying:'
    WHEN 'apply.actions.completeProfileToApply' THEN 'Complete Profile to Apply'
    WHEN 'apply.actions.submit' THEN 'Submit Application'
    ELSE key
END
FROM translation_keys
WHERE key LIKE 'apply.%'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- Seed translations for Apply page (Somali)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key
    WHEN 'apply.employerPreview' THEN 'Habka Hordhaca Shaqo-bixiyaha'
    WHEN 'apply.previewDescription' THEN 'Kani waa hordhac ku saabsan sida murashixiintu u arki doonaan foomka codsigaaga shaqo. Kama gudbin kartid codsiyo halkan.'
    WHEN 'apply.backToDashboard' THEN 'Ku Noqo Dashboard-ka'
    WHEN 'apply.header' THEN 'Codso {jobTitle}'
    WHEN 'apply.previewBadge' THEN 'Habka Hordhaca'
    WHEN 'apply.requirements.profile' THEN 'Profayl Dhamaystiran'
    WHEN 'apply.requirements.experience' THEN 'Khibrad Shaqo'
    WHEN 'apply.requirements.education' THEN 'Taariikh Waxbarasho'
    WHEN 'apply.errors.missingReqs' THEN 'Ma buuxisid shuruudaha oo dhan'
    WHEN 'apply.errors.unmetListPrefix' THEN 'Shuruudaha soo socda ayaa ka dhiman:'
    WHEN 'apply.errors.updateProfileHint' THEN 'Fadlan cusbooneysii profile-kaaga si aad u codsato.'
    WHEN 'apply.labels.useProfile' THEN 'Isticmaal profile-keyga'
    WHEN 'apply.hints.useProfile' THEN 'Waxaan u isticmaali doonnaa faahfaahinta profile-kaaga codsigan.'
    WHEN 'apply.errors.fixBeforeApplying' THEN 'Fadlan sax khaladaadka soo socda ka hor inta aadan codsan:'
    WHEN 'apply.actions.completeProfileToApply' THEN 'Dhameystir Profile-ka Si Aad U Codsato'
    WHEN 'apply.actions.submit' THEN 'Gudbi Codsiga'
    WHEN 'apply.requirements.nationality' THEN 'Dhalasho'
    WHEN 'apply.requirements.languages' THEN 'Luuqadaha: {languages}'
    WHEN 'apply.requirements.cv' THEN 'CV / Resume'
    WHEN 'apply.requirements.noAdditional' THEN 'Majiraan shuruudo dheeraad ah'
    WHEN 'apply.labels.attachCv' THEN 'Ku lifaaq CV/Resume'
    WHEN 'apply.hints.attachCv' THEN 'PDF, DOC, DOCX ilaa 5MB'
    WHEN 'apply.labels.additionalDocs' THEN 'Dukumeentiyo Dheeraad ah'
    WHEN 'apply.placeholders.coverLetter' THEN 'Noo sheeg sababta aad ugu haboontahay doorkan...'
    WHEN 'apply.labels.coverLetter' THEN 'Warqadda Codsiga (Cover Letter)'
    WHEN 'apply.actions.submitPreview' THEN 'Gudbi Codsiga (Hordhac)'
    WHEN 'apply.auth.signinHeader' THEN 'Soo Gal si aad u Codsato'
    WHEN 'apply.auth.signinHint' THEN 'Waxaad u baahan tahay akoon si aad u codsato shaqadan.'
    WHEN 'apply.requirementsHeader' THEN 'Shuruudaha Codsiga'
    WHEN 'apply.requirements.additionalDocs' THEN 'Dukumeentiyo Dheeraad ah'
    WHEN 'apply.auth.signinBtn' THEN 'Soo Gal'
    WHEN 'apply.auth.registerBtn' THEN 'Is-diiwaangeli'
    WHEN 'apply.requirements.languagesMissing' THEN 'Waxaa dhiman luuqadaha loo baahan yahay: {languages}'
    WHEN 'apply.errors.uploadFailed' THEN 'Faylka oo la soo rogi waayay. Fadlan isku day mar kale.'
    WHEN 'apply.errors.coverLetterLength' THEN 'Warqadda codsigu aad bay u dheer tahay (ugu badnaan 5000 xaraf).'
    WHEN 'apply.errors.profileRequired' THEN 'Profayl ayaa loo baahan yahay'
    WHEN 'apply.errors.experienceRequired' THEN 'Khibrad shaqo ayaa loo baahan yahay'
    WHEN 'apply.errors.educationRequired' THEN 'Waxbarasho ayaa loo baahan yahay'
    WHEN 'apply.errors.languagesMissing' THEN 'Waxaa dhiman luuqadaha loo baahan yahay: {languages}'
    WHEN 'apply.errors.nationalityRequired' THEN 'Dhalasho ayaa loo baahan yahay'
    WHEN 'apply.errors.cvRequired' THEN 'CV ayaa loo baahan yahay'
    WHEN 'apply.errors.customFileRequired' THEN '{fileName} ayaa loo baahan yahay'
    WHEN 'apply.errors.submitFailed' THEN 'Codsiga waa la gudbin waayay. Fadlan isku day mar kale.'
    WHEN 'apply.common.required' THEN 'loo baahan yahay'
    WHEN 'apply.common.optional' THEN 'ikhtiyaari'
    WHEN 'apply.common.types' THEN 'noocyada'
    ELSE key
END
FROM translation_keys
WHERE key LIKE 'apply.%'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
