-- Migration: Add dashboard translations for candidate and employer
-- Date: 2026-02-07

-- 1. Insert Translation Keys
INSERT INTO translation_keys (key, domain, description) VALUES
-- Common
('common.notProvided', 'common', 'Label for missing information'),
('common.saving', 'common', 'Label for saving state'),
('common.back', 'common', 'Back button label'),

-- Employer Dashboard
('dashboard.employer.stats.active', 'employer', 'Active jobs count label'),
('dashboard.employer.stats.activeDesc', 'employer', 'Description for active jobs'),
('dashboard.employer.stats.applications', 'employer', 'Applications count label'),
('dashboard.employer.stats.applicationsDesc', 'employer', 'Description for applications stats'),
('dashboard.employer.stats.drafts', 'employer', 'Drafts count label'),
('dashboard.employer.stats.draftsDesc', 'employer', 'Description for drafts'),
('dashboard.employer.tabs.company', 'employer', 'Company tab label'),
('dashboard.employer.companyInfo', 'employer', 'Company info section header'),
('dashboard.employer.companyInfoApproved', 'employer', 'Badge for approved company'),
('dashboard.employer.companyInfoPending', 'employer', 'Badge for pending company'),
('dashboard.employer.actions.viewProfile', 'employer', 'View profile action'),
('dashboard.employer.actions.editProfile', 'employer', 'Edit profile action'),
('dashboard.employer.actions.managePermissions', 'employer', 'Manage permissions action'),
('dashboard.employer.rejectionTitle', 'employer', 'Rejection alert title'),
('dashboard.employer.rejectionHint', 'employer', 'Rejection alert hint'),
('dashboard.employer.pendingTitle', 'employer', 'Pending alert title'),
('dashboard.employer.pendingDesc', 'employer', 'Pending alert description'),
('dashboard.employer.approvedTitle', 'employer', 'Approved alert title'),
('dashboard.employer.approvedDesc', 'employer', 'Approved alert description'),
('dashboard.employer.labels.companyName', 'employer', 'Company name input label'),
('dashboard.employer.labels.industry', 'employer', 'Industry input label'),
('dashboard.employer.placeholders.industry', 'employer', 'Industry input placeholder'),
('dashboard.employer.noIndustry', 'employer', 'No industry fallback text'),
('dashboard.employer.labels.location', 'employer', 'Location input label'),
('dashboard.employer.labels.website', 'employer', 'Website input label'),
('dashboard.employer.labels.description', 'employer', 'Description input label'),
('dashboard.employer.noDescription', 'employer', 'No description fallback text'),
('dashboard.employer.placeholders.description', 'employer', 'Description input placeholder'),
('dashboard.employer.labels.phone', 'employer', 'Phone input label'),
('dashboard.employer.labels.email', 'employer', 'Email input label'),
('dashboard.employer.labels.orgNumber', 'employer', 'Organization number input label'),
('dashboard.employer.ownerUpdateOnly', 'employer', 'Hint for non-owners'),
('dashboard.employer.updateBtn', 'employer', 'Update button label'),
('dashboard.employer.requestApprovalBtn', 'employer', 'Request approval button label'),
('dashboard.employer.tabs.jobs', 'employer', 'Jobs tab label'),
('dashboard.employer.jobsHeader', 'employer', 'Jobs list header text'),
('dashboard.employer.manageListings', 'employer', 'Manage listings header'),
('dashboard.employer.tenantStatus', 'employer', 'Tenant status label'),
('dashboard.employer.unlockPostingHint', 'employer', 'Hint to unlock posting'),
('dashboard.employer.actions.createJob', 'employer', 'Create job action'),
('dashboard.employer.managerOnlyHint', 'employer', 'Hint for manager only access'),
('dashboard.employer.noJobsYet', 'employer', 'Empty state for jobs'),
('dashboard.employer.actions.postFirstJob', 'employer', 'Call to action to post job'),
('dashboard.employer.completeDetailsHint', 'employer', 'Hint to complete details first'),

-- Candidate Dashboard
('dashboard.candidate.applications', 'candidate', 'Applications link/header'),
('dashboard.candidate.compatibleHeader', 'candidate', 'Header for compatible jobs'),
('dashboard.candidate.completeProfileHint', 'candidate', 'Hint to complete profile'),
('dashboard.candidate.cv', 'candidate', 'CV label'),
('dashboard.candidate.employment', 'candidate', 'Employment label'),
('dashboard.candidate.highlightedRoles', 'candidate', 'Highlighted roles header'),
('dashboard.candidate.hiringBoard', 'candidate', 'Hiring board header'),
('dashboard.candidate.loadingRecs', 'candidate', 'Loading text for recommendations'),
('dashboard.candidate.matchScore', 'candidate', 'Match score label'),
('dashboard.candidate.moveFastHeader', 'candidate', 'Urgent jobs header'),
('dashboard.candidate.noAppsYet', 'candidate', 'Empty state for applications'),
('dashboard.candidate.openRoles', 'candidate', 'Open roles count label'),
('dashboard.candidate.openToRoles', 'candidate', 'Open to roles status'),
('dashboard.candidate.openToWork', 'candidate', 'Open to work status'),
('dashboard.candidate.perfectMatches', 'candidate', 'Perfect matches header'),
('dashboard.candidate.profile', 'candidate', 'Profile link/header'),
('dashboard.candidate.profileStrength', 'candidate', 'Profile strength label'),
('dashboard.candidate.recentApps', 'candidate', 'Recent applications header'),
('dashboard.candidate.submitted', 'candidate', 'Submitted applications count label'),
('dashboard.candidate.top3Hint', 'candidate', 'Top 3 jobs hint'),
('dashboard.candidate.visibilityHint', 'candidate', 'Visibility hint'),
('jobs.noDescription', 'jobs', 'No description fallback'),
('jobs.saveCategory.save', 'jobs', 'Save category button'),
('jobs.saveCategory.unsave', 'jobs', 'Unsave button')
ON CONFLICT (key) DO NOTHING;

-- 2. Insert English Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', CASE
    -- Common
    WHEN key = 'common.notProvided' THEN 'Not provided'
    WHEN key = 'common.saving' THEN 'Saving...'
    WHEN key = 'common.back' THEN 'Back'

    -- Employer
    WHEN key = 'dashboard.employer.stats.active' THEN 'Active Jobs'
    WHEN key = 'dashboard.employer.stats.activeDesc' THEN 'Currently listed'
    WHEN key = 'dashboard.employer.stats.applications' THEN 'Applications'
    WHEN key = 'dashboard.employer.stats.applicationsDesc' THEN 'Total received'
    WHEN key = 'dashboard.employer.stats.drafts' THEN 'Drafts'
    WHEN key = 'dashboard.employer.stats.draftsDesc' THEN 'Unpublished jobs'
    WHEN key = 'dashboard.employer.tabs.company' THEN 'Company'
    WHEN key = 'dashboard.employer.companyInfo' THEN 'Company Info'
    WHEN key = 'dashboard.employer.companyInfoApproved' THEN 'Verified Company'
    WHEN key = 'dashboard.employer.companyInfoPending' THEN 'Verification Pending'
    WHEN key = 'dashboard.employer.actions.viewProfile' THEN 'View Profile'
    WHEN key = 'dashboard.employer.actions.editProfile' THEN 'Edit Profile'
    WHEN key = 'dashboard.employer.actions.managePermissions' THEN 'Manage Permissions'
    WHEN key = 'dashboard.employer.rejectionTitle' THEN 'Application Rejected'
    WHEN key = 'dashboard.employer.rejectionHint' THEN 'Please contact support for more details.'
    WHEN key = 'dashboard.employer.pendingTitle' THEN 'Pending Approval'
    WHEN key = 'dashboard.employer.pendingDesc' THEN 'Your company account is under review.'
    WHEN key = 'dashboard.employer.approvedTitle' THEN 'Account Approved'
    WHEN key = 'dashboard.employer.approvedDesc' THEN 'You can now post unlimited jobs.'
    WHEN key = 'dashboard.employer.labels.companyName' THEN 'Company Name'
    WHEN key = 'dashboard.employer.labels.industry' THEN 'Industry'
    WHEN key = 'dashboard.employer.placeholders.industry' THEN 'Select industry...'
    WHEN key = 'dashboard.employer.noIndustry' THEN 'No industry selected'
    WHEN key = 'dashboard.employer.labels.location' THEN 'Location'
    WHEN key = 'dashboard.employer.labels.website' THEN 'Website'
    WHEN key = 'dashboard.employer.labels.description' THEN 'Description'
    WHEN key = 'dashboard.employer.noDescription' THEN 'No description provided.'
    WHEN key = 'dashboard.employer.placeholders.description' THEN 'Enter company description...'
    WHEN key = 'dashboard.employer.labels.phone' THEN 'Phone'
    WHEN key = 'dashboard.employer.labels.email' THEN 'Email'
    WHEN key = 'dashboard.employer.labels.orgNumber' THEN 'Organization Number'
    WHEN key = 'dashboard.employer.ownerUpdateOnly' THEN 'Only the owner can update these details.'
    WHEN key = 'dashboard.employer.updateBtn' THEN 'Update'
    WHEN key = 'dashboard.employer.requestApprovalBtn' THEN 'Request Approval'
    WHEN key = 'dashboard.employer.tabs.jobs' THEN 'Jobs'
    WHEN key = 'dashboard.employer.jobsHeader' THEN 'Your Job Listings'
    WHEN key = 'dashboard.employer.manageListings' THEN 'Manage Listings'
    WHEN key = 'dashboard.employer.tenantStatus' THEN 'Account Status'
    WHEN key = 'dashboard.employer.unlockPostingHint' THEN 'Complete verification to unlock posting.'
    WHEN key = 'dashboard.employer.actions.createJob' THEN 'Create Job'
    WHEN key = 'dashboard.employer.managerOnlyHint' THEN 'Managers only'
    WHEN key = 'dashboard.employer.noJobsYet' THEN 'No jobs posted yet.'
    WHEN key = 'dashboard.employer.actions.postFirstJob' THEN 'Post your first job'
    WHEN key = 'dashboard.employer.completeDetailsHint' THEN 'But first, complete your company details.'

    -- Candidate
    WHEN key = 'dashboard.candidate.applications' THEN 'Applications'
    WHEN key = 'dashboard.candidate.compatibleHeader' THEN 'Jobs Compatible with You'
    WHEN key = 'dashboard.candidate.completeProfileHint' THEN 'Complete your profile to get personalized job recommendations.'
    WHEN key = 'dashboard.candidate.cv' THEN 'CV'
    WHEN key = 'dashboard.candidate.employment' THEN 'Employment'
    WHEN key = 'dashboard.candidate.highlightedRoles' THEN 'Highlighted Roles'
    WHEN key = 'dashboard.candidate.hiringBoard' THEN 'On the hiring board today'
    WHEN key = 'dashboard.candidate.loadingRecs' THEN 'Loading your recommendations...'
    WHEN key = 'dashboard.candidate.matchScore' THEN '{score}% Match Score'
    WHEN key = 'dashboard.candidate.moveFastHeader' THEN 'Move Fast on These Roles'
    WHEN key = 'dashboard.candidate.noAppsYet' THEN 'No applications submitted yet.'
    WHEN key = 'dashboard.candidate.openRoles' THEN 'Open Roles'
    WHEN key = 'dashboard.candidate.openToRoles' THEN 'Open to new roles'
    WHEN key = 'dashboard.candidate.openToWork' THEN 'Open to work'
    WHEN key = 'dashboard.candidate.perfectMatches' THEN '✨ Perfect Matches'
    WHEN key = 'dashboard.candidate.profile' THEN 'Profile'
    WHEN key = 'dashboard.candidate.profileStrength' THEN 'Profile Strength'
    WHEN key = 'dashboard.candidate.recentApps' THEN 'Recent Applications'
    WHEN key = 'dashboard.candidate.submitted' THEN 'Total submitted'
    WHEN key = 'dashboard.candidate.top3Hint' THEN 'Our top 3 picks for you'
    WHEN key = 'dashboard.candidate.visibilityHint' THEN 'Complete your profile to increase visibility'
    WHEN key = 'jobs.noDescription' THEN 'No description available.'
    WHEN key = 'jobs.saveCategory.save' THEN 'Save'
    WHEN key = 'jobs.saveCategory.unsave' THEN 'Unsave'

    ELSE key
END
FROM translation_keys
WHERE key IN (
    'common.notProvided', 'common.saving', 'common.back',
    'dashboard.employer.stats.active', 'dashboard.employer.stats.activeDesc', 'dashboard.employer.stats.applications', 'dashboard.employer.stats.applicationsDesc',
    'dashboard.employer.stats.drafts', 'dashboard.employer.stats.draftsDesc', 'dashboard.employer.tabs.company', 'dashboard.employer.companyInfo',
    'dashboard.employer.companyInfoApproved', 'dashboard.employer.companyInfoPending', 'dashboard.employer.actions.viewProfile', 'dashboard.employer.actions.editProfile',
    'dashboard.employer.actions.managePermissions', 'dashboard.employer.rejectionTitle', 'dashboard.employer.rejectionHint', 'dashboard.employer.pendingTitle',
    'dashboard.employer.pendingDesc', 'dashboard.employer.approvedTitle', 'dashboard.employer.approvedDesc', 'dashboard.employer.labels.companyName',
    'dashboard.employer.labels.industry', 'dashboard.employer.placeholders.industry', 'dashboard.employer.noIndustry', 'dashboard.employer.labels.location',
    'dashboard.employer.labels.website', 'dashboard.employer.labels.description', 'dashboard.employer.noDescription', 'dashboard.employer.placeholders.description',
    'dashboard.employer.labels.phone', 'dashboard.employer.labels.email', 'dashboard.employer.labels.orgNumber', 'dashboard.employer.ownerUpdateOnly',
    'dashboard.employer.updateBtn', 'dashboard.employer.requestApprovalBtn', 'dashboard.employer.tabs.jobs', 'dashboard.employer.jobsHeader', 'dashboard.employer.manageListings',
    'dashboard.employer.tenantStatus', 'dashboard.employer.unlockPostingHint', 'dashboard.employer.actions.createJob', 'dashboard.employer.managerOnlyHint',
    'dashboard.employer.noJobsYet', 'dashboard.employer.actions.postFirstJob', 'dashboard.employer.completeDetailsHint',
    'dashboard.candidate.applications', 'dashboard.candidate.compatibleHeader', 'dashboard.candidate.completeProfileHint', 'dashboard.candidate.cv',
    'dashboard.candidate.employment', 'dashboard.candidate.highlightedRoles', 'dashboard.candidate.hiringBoard', 'dashboard.candidate.loadingRecs',
    'dashboard.candidate.matchScore', 'dashboard.candidate.moveFastHeader', 'dashboard.candidate.noAppsYet', 'dashboard.candidate.openRoles',
    'dashboard.candidate.openToRoles', 'dashboard.candidate.openToWork', 'dashboard.candidate.perfectMatches', 'dashboard.candidate.profile',
    'dashboard.candidate.profileStrength', 'dashboard.candidate.recentApps', 'dashboard.candidate.submitted', 'dashboard.candidate.top3Hint',
    'dashboard.candidate.visibilityHint', 'jobs.noDescription', 'jobs.saveCategory.save', 'jobs.saveCategory.unsave'
)
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- 3. Insert Somali Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE
    -- Common
    WHEN key = 'common.notProvided' THEN 'Lama bixin'
    WHEN key = 'common.saving' THEN 'Waa la keydinayaa...'
    WHEN key = 'common.back' THEN 'Dib u noqo'

    -- Employer
    WHEN key = 'dashboard.employer.stats.active' THEN 'Shaqooyinka Firfircoon'
    WHEN key = 'dashboard.employer.stats.activeDesc' THEN 'Hadda liis garaysan'
    WHEN key = 'dashboard.employer.stats.applications' THEN 'Codsiyada'
    WHEN key = 'dashboard.employer.stats.applicationsDesc' THEN 'Wadarta la helay'
    WHEN key = 'dashboard.employer.stats.drafts' THEN 'Qabyo'
    WHEN key = 'dashboard.employer.stats.draftsDesc' THEN 'Shaqooyinka aan la daabicin'
    WHEN key = 'dashboard.employer.tabs.company' THEN 'Shirkadda'
    WHEN key = 'dashboard.employer.companyInfo' THEN 'Macluumaadka Shirkadda'
    WHEN key = 'dashboard.employer.companyInfoApproved' THEN 'Shirkad La Xaqiijiyay'
    WHEN key = 'dashboard.employer.companyInfoPending' THEN 'Xaqiijin Ayaa La Sugayaa'
    WHEN key = 'dashboard.employer.actions.viewProfile' THEN 'Arag Profile-ka'
    WHEN key = 'dashboard.employer.actions.editProfile' THEN 'Wax ka bedel Profile-ka'
    WHEN key = 'dashboard.employer.actions.managePermissions' THEN 'Maamul Oggolaanshaha'
    WHEN key = 'dashboard.employer.rejectionTitle' THEN 'Codsiga Waa La Diiday'
    WHEN key = 'dashboard.employer.rejectionHint' THEN 'Fadlan la xiriir taageerada wixii faahfaahin dheeraad ah.'
    WHEN key = 'dashboard.employer.pendingTitle' THEN 'Oggolaansho Ayaa La Sugayaa'
    WHEN key = 'dashboard.employer.pendingDesc' THEN 'Koontada shirkaddaada dib ayaa loo eegayaa.'
    WHEN key = 'dashboard.employer.approvedTitle' THEN 'Koontada Waa La Oggolaaday'
    WHEN key = 'dashboard.employer.approvedDesc' THEN 'Hadda waxaad soo dhejin kartaa shaqooyin aan xadidnayn.'
    WHEN key = 'dashboard.employer.labels.companyName' THEN 'Magaca Shirkadda'
    WHEN key = 'dashboard.employer.labels.industry' THEN 'Warshadaha'
    WHEN key = 'dashboard.employer.placeholders.industry' THEN 'Dooro warshadaha...'
    WHEN key = 'dashboard.employer.noIndustry' THEN 'Warshad lama dooran'
    WHEN key = 'dashboard.employer.labels.location' THEN 'Goobta'
    WHEN key = 'dashboard.employer.labels.website' THEN 'Shabakadda'
    WHEN key = 'dashboard.employer.labels.description' THEN 'Faahfaahin'
    WHEN key = 'dashboard.employer.noDescription' THEN 'Faahfaahin lama bixin.'
    WHEN key = 'dashboard.employer.placeholders.description' THEN 'Geli faahfaahinta shirkadda...'
    WHEN key = 'dashboard.employer.labels.phone' THEN 'Telefoon'
    WHEN key = 'dashboard.employer.labels.email' THEN 'Iimayl'
    WHEN key = 'dashboard.employer.labels.orgNumber' THEN 'Lambarka Ururka'
    WHEN key = 'dashboard.employer.ownerUpdateOnly' THEN 'Kaliya mulkiilaha ayaa cusbooneysiin kara faahfaahintaan.'
    WHEN key = 'dashboard.employer.updateBtn' THEN 'Cusbooneysii'
    WHEN key = 'dashboard.employer.requestApprovalBtn' THEN 'Dalbo Oggolaansho'
    WHEN key = 'dashboard.employer.tabs.jobs' THEN 'Shaqooyinka'
    WHEN key = 'dashboard.employer.jobsHeader' THEN 'Liiska Shaqooyinkaaga'
    WHEN key = 'dashboard.employer.manageListings' THEN 'Maamul Liiska'
    WHEN key = 'dashboard.employer.tenantStatus' THEN 'Xaaladda Koontada'
    WHEN key = 'dashboard.employer.unlockPostingHint' THEN 'Buuxi xaqiijinta si aad u furto soo dhejinta.'
    WHEN key = 'dashboard.employer.actions.createJob' THEN 'Abuur Shaqo'
    WHEN key = 'dashboard.employer.managerOnlyHint' THEN 'Maamulayaasha kaliya'
    WHEN key = 'dashboard.employer.noJobsYet' THEN 'Wali shaqo lama soo dhejin.'
    WHEN key = 'dashboard.employer.actions.postFirstJob' THEN 'Soo dheji shaqadaada ugu horeysa'
    WHEN key = 'dashboard.employer.completeDetailsHint' THEN 'Laakiin marka hore, buuxi faahfaahinta shirkaddaada.'

    -- Candidate
    WHEN key = 'dashboard.candidate.applications' THEN 'Codsiyada'
    WHEN key = 'dashboard.candidate.compatibleHeader' THEN 'Shaqooyinka Kula Habboon'
    WHEN key = 'dashboard.candidate.completeProfileHint' THEN 'Buuxi profile-kaaga si aad u hesho talooyin shaqo oo gaar ah.'
    WHEN key = 'dashboard.candidate.cv' THEN 'CV'
    WHEN key = 'dashboard.candidate.employment' THEN 'Shaqo'
    WHEN key = 'dashboard.candidate.highlightedRoles' THEN 'Shaqooyinka la iftiimiyay'
    WHEN key = 'dashboard.candidate.hiringBoard' THEN 'Guddiga shaqaaleysiinta maanta'
    WHEN key = 'dashboard.candidate.loadingRecs' THEN 'Soo shubaya talooyinkaaga...'
    WHEN key = 'dashboard.candidate.matchScore' THEN '{score}% Dhibcaha u dhigma'
    WHEN key = 'dashboard.candidate.moveFastHeader' THEN 'Ku dhaqaaq shaqooyinkan'
    WHEN key = 'dashboard.candidate.noAppsYet' THEN 'Wali wax codsi ah lama gudbin.'
    WHEN key = 'dashboard.candidate.openRoles' THEN 'Boosaska Furan'
    WHEN key = 'dashboard.candidate.openToRoles' THEN 'Diyaar u ah boosas cusub'
    WHEN key = 'dashboard.candidate.openToWork' THEN 'Diyaar u ah shaqo'
    WHEN key = 'dashboard.candidate.perfectMatches' THEN '✨ U dhigma sax ah'
    WHEN key = 'dashboard.candidate.profile' THEN 'Profile'
    WHEN key = 'dashboard.candidate.profileStrength' THEN 'Awooda Profile-ka'
    WHEN key = 'dashboard.candidate.recentApps' THEN 'Codsiyadii ugu dambeeyay'
    WHEN key = 'dashboard.candidate.submitted' THEN 'Wadarta la gudbiyay'
    WHEN key = 'dashboard.candidate.top3Hint' THEN '3-da aan kuu xulnay'
    WHEN key = 'dashboard.candidate.visibilityHint' THEN 'Buuxi profile-kaaga si aad u kordhiso muuqaalka'
    WHEN key = 'jobs.noDescription' THEN 'Faahfaahin lagama hayo.'
    WHEN key = 'jobs.saveCategory.save' THEN 'Keydi'
    WHEN key = 'jobs.saveCategory.unsave' THEN 'Ha keydin'

    ELSE key
END
FROM translation_keys
WHERE key IN (
    'common.notProvided', 'common.saving', 'common.back',
    'dashboard.employer.stats.active', 'dashboard.employer.stats.activeDesc', 'dashboard.employer.stats.applications', 'dashboard.employer.stats.applicationsDesc',
    'dashboard.employer.stats.drafts', 'dashboard.employer.stats.draftsDesc', 'dashboard.employer.tabs.company', 'dashboard.employer.companyInfo',
    'dashboard.employer.companyInfoApproved', 'dashboard.employer.companyInfoPending', 'dashboard.employer.actions.viewProfile', 'dashboard.employer.actions.editProfile',
    'dashboard.employer.actions.managePermissions', 'dashboard.employer.rejectionTitle', 'dashboard.employer.rejectionHint', 'dashboard.employer.pendingTitle',
    'dashboard.employer.pendingDesc', 'dashboard.employer.approvedTitle', 'dashboard.employer.approvedDesc', 'dashboard.employer.labels.companyName',
    'dashboard.employer.labels.industry', 'dashboard.employer.placeholders.industry', 'dashboard.employer.noIndustry', 'dashboard.employer.labels.location',
    'dashboard.employer.labels.website', 'dashboard.employer.labels.description', 'dashboard.employer.noDescription', 'dashboard.employer.placeholders.description',
    'dashboard.employer.labels.phone', 'dashboard.employer.labels.email', 'dashboard.employer.labels.orgNumber', 'dashboard.employer.ownerUpdateOnly',
    'dashboard.employer.updateBtn', 'dashboard.employer.requestApprovalBtn', 'dashboard.employer.tabs.jobs', 'dashboard.employer.jobsHeader', 'dashboard.employer.manageListings',
    'dashboard.employer.tenantStatus', 'dashboard.employer.unlockPostingHint', 'dashboard.employer.actions.createJob', 'dashboard.employer.managerOnlyHint',
    'dashboard.employer.noJobsYet', 'dashboard.employer.actions.postFirstJob', 'dashboard.employer.completeDetailsHint',
    'dashboard.candidate.applications', 'dashboard.candidate.compatibleHeader', 'dashboard.candidate.completeProfileHint', 'dashboard.candidate.cv',
    'dashboard.candidate.employment', 'dashboard.candidate.highlightedRoles', 'dashboard.candidate.hiringBoard', 'dashboard.candidate.loadingRecs',
    'dashboard.candidate.matchScore', 'dashboard.candidate.moveFastHeader', 'dashboard.candidate.noAppsYet', 'dashboard.candidate.openRoles',
    'dashboard.candidate.openToRoles', 'dashboard.candidate.openToWork', 'dashboard.candidate.perfectMatches', 'dashboard.candidate.profile',
    'dashboard.candidate.profileStrength', 'dashboard.candidate.recentApps', 'dashboard.candidate.submitted', 'dashboard.candidate.top3Hint',
    'dashboard.candidate.visibilityHint', 'jobs.noDescription', 'jobs.saveCategory.save', 'jobs.saveCategory.unsave'
)
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
