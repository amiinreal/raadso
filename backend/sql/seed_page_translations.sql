-- Revised seed script to map translations via translation_key_id
-- We use a CTE or many subqueries to handle this correctly

DO $$ 
DECLARE 
    v_key_id UUID;
    v_ts TIMESTAMP := NOW();
BEGIN
    -- Helper to upsert a translation
    -- Usage: PERFORM upsert_trans('key.name', 'locale', 'value');
END $$;

-- Actually, it's easier to just use a multi-row INSERT with subqueries
INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Back', 'seed' FROM translation_keys WHERE key = 'common.back'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Cancel', 'seed' FROM translation_keys WHERE key = 'common.cancel'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Save', 'seed' FROM translation_keys WHERE key = 'common.save'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Saving...', 'seed' FROM translation_keys WHERE key = 'common.saving'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Edit', 'seed' FROM translation_keys WHERE key = 'common.edit'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Delete', 'seed' FROM translation_keys WHERE key = 'common.delete'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Upload', 'seed' FROM translation_keys WHERE key = 'common.upload'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Choose File', 'seed' FROM translation_keys WHERE key = 'common.chooseFile'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Loading...', 'seed' FROM translation_keys WHERE key = 'common.loading'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Not provided', 'seed' FROM translation_keys WHERE key = 'common.noInfo'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- DASHBOARD CANDIDATE
INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Open Roles', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.openRoles'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'From your hiring board', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.hiringBoard'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Applications', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.applications'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Submitted with profile / CV', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.submitted'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Profile Strength', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.profileStrength'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Higher visibility when complete', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.visibilityHint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Your Perfect Matches', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.perfectMatches'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Highlighted roles', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.highlightedRoles'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Top 3 compatible jobs for you', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.top3Hint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Highly compatible roles', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.compatibleHeader'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Move fast on these', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.moveFastHeader'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Loading recommendations...', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.loadingRecs'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', '{score}% match', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.matchScore'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Complete your profile to get personalized job recommendations.', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.completeProfileHint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Open to work', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.openToWork'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Employment', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.employment'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Open to roles', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.openToRoles'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Recent applications', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.recentApps'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'No applications yet. Apply with your profile or CV.', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.noAppsYet'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- EMPLOYER DASHBOARD
INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'ACTIVE', 'seed' FROM translation_keys WHERE key = 'dashboard.employer.stats.active'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Currently accepting applications', 'seed' FROM translation_keys WHERE key = 'dashboard.employer.stats.activeHint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'APPLICATIONS', 'seed' FROM translation_keys WHERE key = 'dashboard.employer.stats.apps'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Across all your listings', 'seed' FROM translation_keys WHERE key = 'dashboard.employer.stats.appsHint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'DRAFTS', 'seed' FROM translation_keys WHERE key = 'dashboard.employer.stats.drafts'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Not yet published', 'seed' FROM translation_keys WHERE key = 'dashboard.employer.stats.draftsHint'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'en-US', 'Company Details', 'seed' FROM translation_keys WHERE key = 'dashboard.employer.companyDetails'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- SOMALI BASICS
INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'so-SO', 'Dib u noqo', 'seed' FROM translation_keys WHERE key = 'common.back'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'so-SO', 'Iska daa', 'seed' FROM translation_keys WHERE key = 'common.cancel'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'so-SO', 'Keydi', 'seed' FROM translation_keys WHERE key = 'common.save'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'so-SO', 'Boosaska Bannaan', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.openRoles'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO translations (translation_key_id, language, value, source)
SELECT id, 'so-SO', 'Codsiyada', 'seed' FROM translation_keys WHERE key = 'dashboard.candidate.applications'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
