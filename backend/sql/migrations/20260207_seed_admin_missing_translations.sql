-- Seed missing Admin Dashboard translations
INSERT INTO translation_keys (key, domain) VALUES
('admin.common.all', 'default'),
('admin.common.pending', 'default'),
('admin.common.approved', 'default'),
('admin.common.rejected', 'default'),
('admin.common.companies', 'default'),
('admin.common.applications', 'default'),
('admin.common.submitted', 'default'),
('admin.common.status', 'default'),
('admin.common.enabled', 'default'),
('admin.common.cancel', 'default'),
('admin.common.saving', 'default'),
('admin.common.total', 'default'),
('admin.automation.title', 'default'),
('admin.automation.deadlineNotifications.title', 'default'),
('admin.automation.deadlineNotifications.description', 'default'),
('admin.automation.emailNotifications.title', 'default'),
('admin.automation.emailNotifications.description', 'default'),
('admin.automation.notificationInterval.title', 'default'),
('admin.automation.notificationInterval.description', 'default'),
('admin.automation.notificationInterval.current', 'default'),
('admin.automation.twoFactorAuth.title', 'default'),
('admin.automation.twoFactorAuth.description', 'default'),
('admin.automation.jobRecommendations.title', 'default'),
('admin.automation.jobRecommendations.description', 'default'),
('admin.locale.title', 'default'),
('admin.locale.description', 'default'),
('admin.locale.refresh', 'default'),
('admin.locale.refreshing', 'default'),
('admin.locale.empty', 'default'),
('admin.locale.newLocale', 'default'),
('admin.locale.addLocale', 'default'),
('admin.locale.addDescription', 'default'),
('admin.locale.localeCodePlaceholder', 'default'),
('admin.locale.labelPlaceholder', 'default'),
('admin.locale.enabled', 'default'),
('admin.locale.adminOnly', 'default'),
('admin.locale.comingSoonHint', 'default'),
('admin.locale.updated', 'default'),
('admin.locale.error', 'default'),
('admin.locale.missingFields', 'default'),
('admin.locale.localeCode', 'default'),
('admin.locale.label', 'default'),
('admin.locales.field.comingSoon', 'default'),
('admin.platformSettings.privacyPolicy.title', 'default'),
('admin.platformSettings.privacyPolicy.description', 'default'),
('admin.platformSettings.privacyPolicy.placeholder', 'default'),
('admin.platformSettings.forceReacceptance.title', 'default'),
('admin.platformSettings.forceReacceptance.description', 'default'),
('admin.platformSettings.saveAndPublish', 'default'),
('admin.platformSettings.policyUpdated', 'default'),
('admin.platformSettings.policyUpdateFailed', 'default'),
('admin.platformSettings.loadingSettings', 'default'),
('admin.audit.table.timestamp', 'default'),
('admin.audit.table.actor', 'default'),
('admin.audit.table.action', 'default'),
('admin.audit.table.target', 'default'),
('admin.audit.table.details', 'default'),
('admin.audit.noLogs', 'default'),
('admin.audit.loadingLogs', 'default'),
('admin.translations.meta.persona.shared', 'default'),
('admin.translations.meta.page.shared', 'default'),
('admin.translations.status.saved', 'default'),
('admin.translations.baseLabel', 'default'),
('admin.translations.localeValue', 'default'),
('admin.translations.actions.copyBase', 'default'),
('admin.translations.actions.saveKey', 'default')
ON CONFLICT (key) DO NOTHING;

-- Seed English Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', CASE key
    WHEN 'admin.common.all' THEN 'All'
    WHEN 'admin.common.pending' THEN 'Pending'
    WHEN 'admin.common.approved' THEN 'Approved'
    WHEN 'admin.common.rejected' THEN 'Rejected'
    WHEN 'admin.common.companies' THEN 'Companies'
    WHEN 'admin.common.applications' THEN 'Applications'
    WHEN 'admin.common.submitted' THEN 'Submitted'
    WHEN 'admin.common.status' THEN 'Status'
    WHEN 'admin.common.enabled' THEN 'Enabled'
    WHEN 'admin.common.cancel' THEN 'Cancel'
    WHEN 'admin.common.saving' THEN 'Saving...'
    WHEN 'admin.common.total' THEN 'Total'
    WHEN 'admin.automation.title' THEN 'Automation Settings'
    WHEN 'admin.automation.deadlineNotifications.title' THEN 'Deadline Notifications'
    WHEN 'admin.automation.deadlineNotifications.description' THEN 'Notify candidates and employers when a job deadline is approaching.'
    WHEN 'admin.automation.emailNotifications.title' THEN 'Email Service'
    WHEN 'admin.automation.emailNotifications.description' THEN 'Enable or disable system-wide email notifications.'
    WHEN 'admin.automation.notificationInterval.title' THEN 'Notification Check Interval'
    WHEN 'admin.automation.notificationInterval.description' THEN 'How often the system checks for pending notifications (in minutes).'
    WHEN 'admin.automation.notificationInterval.current' THEN 'Current interval: {minutes} minutes'
    WHEN 'admin.automation.twoFactorAuth.title' THEN 'Two-Factor Authentication (2FA)'
    WHEN 'admin.automation.twoFactorAuth.description' THEN 'Enforce 2FA for all admin and employer accounts.'
    WHEN 'admin.automation.jobRecommendations.title' THEN 'AI Job Recommendations'
    WHEN 'admin.automation.jobRecommendations.description' THEN 'Enable AI-powered job matching for candidates.'
    WHEN 'admin.locale.title' THEN 'Supported Locales'
    WHEN 'admin.locale.description' THEN 'Manage languages available on the platform.'
    WHEN 'admin.locale.refresh' THEN 'Refresh List'
    WHEN 'admin.locale.refreshing' THEN 'Refreshing...'
    WHEN 'admin.locale.empty' THEN 'No locales configured.'
    WHEN 'admin.locale.newLocale' THEN 'Add New Locale'
    WHEN 'admin.locale.addLocale' THEN 'Add Locale'
    WHEN 'admin.locale.addDescription' THEN 'Enable a new language for the platform.'
    WHEN 'admin.locale.localeCodePlaceholder' THEN 'e.g., fr'
    WHEN 'admin.locale.labelPlaceholder' THEN 'French'
    WHEN 'admin.locale.enabled' THEN 'Enabled'
    WHEN 'admin.locale.adminOnly' THEN 'Admin Only'
    WHEN 'admin.locale.comingSoonHint' THEN 'Display "Coming Soon" badge'
    WHEN 'admin.locale.updated' THEN 'Locale settings updated.'
    WHEN 'admin.locale.error' THEN 'Error updating locale.'
    WHEN 'admin.locale.missingFields' THEN 'Please fill in all required fields.'
    WHEN 'admin.locale.localeCode' THEN 'Locale Code'
    WHEN 'admin.locale.label' THEN 'Label'
    WHEN 'admin.locales.field.comingSoon' THEN 'Coming Soon Message'
    WHEN 'admin.platformSettings.privacyPolicy.title' THEN 'Privacy Policy'
    WHEN 'admin.platformSettings.privacyPolicy.description' THEN 'Update the platform privacy policy.'
    WHEN 'admin.platformSettings.privacyPolicy.placeholder' THEN 'Enter privacy policy text...'
    WHEN 'admin.platformSettings.forceReacceptance.title' THEN 'Force Re-acceptance'
    WHEN 'admin.platformSettings.forceReacceptance.description' THEN 'Users will be required to accept the new policy on next login.'
    WHEN 'admin.platformSettings.saveAndPublish' THEN 'Save & Publish'
    WHEN 'admin.platformSettings.policyUpdated' THEN 'Privacy policy updated.'
    WHEN 'admin.platformSettings.policyUpdateFailed' THEN 'Failed to update policy.'
    WHEN 'admin.platformSettings.loadingSettings' THEN 'Loading settings...'
    WHEN 'admin.audit.table.timestamp' THEN 'Timestamp'
    WHEN 'admin.audit.table.actor' THEN 'Actor'
    WHEN 'admin.audit.table.action' THEN 'Action'
    WHEN 'admin.audit.table.target' THEN 'Target'
    WHEN 'admin.audit.table.details' THEN 'Details'
    WHEN 'admin.audit.noLogs' THEN 'No audit logs found.'
    WHEN 'admin.audit.loadingLogs' THEN 'Loading audit logs...'
    WHEN 'admin.translations.meta.persona.shared' THEN 'Shared across product roles'
    WHEN 'admin.translations.meta.page.shared' THEN 'Visible throughout the product'
    WHEN 'admin.translations.status.saved' THEN 'Synced'
    WHEN 'admin.translations.baseLabel' THEN 'English base copy'
    WHEN 'admin.translations.localeValue' THEN 'Selected locale'
    WHEN 'admin.translations.actions.copyBase' THEN 'Copy base'
    WHEN 'admin.translations.actions.saveKey' THEN 'Save key'
END
FROM translation_keys
WHERE key IN (
    'admin.common.all', 'admin.common.pending', 'admin.common.approved', 'admin.common.rejected',
    'admin.common.companies', 'admin.common.applications', 'admin.common.submitted', 'admin.common.status',
    'admin.common.enabled', 'admin.common.cancel', 'admin.common.saving', 'admin.common.total',
    'admin.automation.title', 'admin.automation.deadlineNotifications.title', 'admin.automation.deadlineNotifications.description',
    'admin.automation.emailNotifications.title', 'admin.automation.emailNotifications.description',
    'admin.automation.notificationInterval.title', 'admin.automation.notificationInterval.description',
    'admin.automation.notificationInterval.current', 'admin.automation.twoFactorAuth.title',
    'admin.automation.twoFactorAuth.description', 'admin.automation.jobRecommendations.title',
    'admin.automation.jobRecommendations.description', 'admin.locale.title', 'admin.locale.description',
    'admin.locale.refresh', 'admin.locale.refreshing', 'admin.locale.empty', 'admin.locale.newLocale',
    'admin.locale.addLocale', 'admin.locale.addDescription', 'admin.locale.localeCodePlaceholder',
    'admin.locale.labelPlaceholder', 'admin.locale.enabled', 'admin.locale.adminOnly', 'admin.locale.comingSoonHint',
    'admin.locale.updated', 'admin.locale.error', 'admin.locale.missingFields', 'admin.locale.localeCode',
    'admin.locale.label', 'admin.locales.field.comingSoon', 'admin.platformSettings.privacyPolicy.title',
    'admin.platformSettings.privacyPolicy.description', 'admin.platformSettings.privacyPolicy.placeholder',
    'admin.platformSettings.forceReacceptance.title', 'admin.platformSettings.forceReacceptance.description',
    'admin.platformSettings.saveAndPublish', 'admin.platformSettings.policyUpdated',
    'admin.platformSettings.policyUpdateFailed', 'admin.platformSettings.loadingSettings',
    'admin.audit.table.timestamp', 'admin.audit.table.actor', 'admin.audit.table.action',
    'admin.audit.table.target', 'admin.audit.table.details', 'admin.audit.noLogs', 'admin.audit.loadingLogs',
    'admin.translations.meta.persona.shared', 'admin.translations.meta.page.shared',
    'admin.translations.status.saved', 'admin.translations.baseLabel',
    'admin.translations.localeValue', 'admin.translations.actions.copyBase', 'admin.translations.actions.saveKey'
)
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- Seed Somali Translations
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key
    WHEN 'admin.common.all' THEN 'Dhammaan'
    WHEN 'admin.common.pending' THEN 'Sugaya'
    WHEN 'admin.common.approved' THEN 'La Ogolaaday'
    WHEN 'admin.common.rejected' THEN 'La Diiday'
    WHEN 'admin.common.companies' THEN 'Shirkadaha'
    WHEN 'admin.common.applications' THEN 'Codsiyada'
    WHEN 'admin.common.submitted' THEN 'La Gudbiyay'
    WHEN 'admin.common.status' THEN 'Xaaladda'
    WHEN 'admin.common.enabled' THEN 'Daaran'
    WHEN 'admin.common.cancel' THEN 'Jooji'
    WHEN 'admin.common.saving' THEN 'Keydinaya...'
    WHEN 'admin.common.total' THEN 'Wadarta'
    WHEN 'admin.automation.title' THEN 'Dejinta Otomaatiga'
    WHEN 'admin.automation.deadlineNotifications.title' THEN 'Ogeysiisyada Waqtiga Kama Dambaysta'
    WHEN 'admin.automation.deadlineNotifications.description' THEN 'Ogeysii murashixiinta iyo shaqo-bixiyayaasha marka waqtiga shaqada dhamaanayo.'
    WHEN 'admin.automation.emailNotifications.title' THEN 'Adeegga Email-ka'
    WHEN 'admin.automation.emailNotifications.description' THEN 'Daar ama dami ogeysiisyada email-ka ee nidaamka.'
    WHEN 'admin.automation.notificationInterval.title' THEN 'Xilliga Hubinta Ogeysiisyada'
    WHEN 'admin.automation.notificationInterval.description' THEN 'Intee jeer ayuu nidaamku hubiyaa ogeysiisyada sugaya (daqiiqado).'
    WHEN 'admin.automation.notificationInterval.current' THEN 'Xilliga hadda: {minutes} daqiiqo'
    WHEN 'admin.automation.twoFactorAuth.title' THEN 'Xaqiijinta Labada Tallaabo (2FA)'
    WHEN 'admin.automation.twoFactorAuth.description' THEN 'Ku qasab 2FA dhammaan xisaabaadka maamulka iyo shaqo-bixiyaha.'
    WHEN 'admin.automation.jobRecommendations.title' THEN 'Tallooyinka Shaqo ee AI'
    WHEN 'admin.automation.jobRecommendations.description' THEN 'Daar isku-aadinta shaqo ee AI-ku shaqeeyo ee murashixiinta.'
    WHEN 'admin.locale.title' THEN 'Luuqadaha La Taageero'
    WHEN 'admin.locale.description' THEN 'Maamul luuqadaha laga heli karo madal.'
    WHEN 'admin.locale.refresh' THEN 'Cusbooneysii Liiska'
    WHEN 'admin.locale.refreshing' THEN 'Cusbooneysiinaya...'
    WHEN 'admin.locale.empty' THEN 'Majiraan luuqado la habeeyey.'
    WHEN 'admin.locale.newLocale' THEN 'Ku dar Luuqad Cusub'
    WHEN 'admin.locale.addLocale' THEN 'Ku dar Luuqad'
    WHEN 'admin.locale.addDescription' THEN 'U ogolow luuqad cusub madal.'
    WHEN 'admin.locale.localeCodePlaceholder' THEN 'tusaale, so'
    WHEN 'admin.locale.labelPlaceholder' THEN 'Soomaali'
    WHEN 'admin.locale.enabled' THEN 'Daaran'
    WHEN 'admin.locale.adminOnly' THEN 'Maamule Kaliya'
    WHEN 'admin.locale.comingSoonHint' THEN 'Muuji calaamadda "Dhawaan Filo"'
    WHEN 'admin.locale.updated' THEN 'Dejinta luuqadda waa la cusbooneysiiyay.'
    WHEN 'admin.locale.error' THEN 'Cillad ayaa ku timid cusbooneysiinta luuqadda.'
    WHEN 'admin.locale.missingFields' THEN 'Fadlan buuxi dhammaan meelaha loo baahan yahay.'
    WHEN 'admin.locale.localeCode' THEN 'Koodhka Luuqadda'
    WHEN 'admin.locale.label' THEN 'Magaca'
    WHEN 'admin.locales.field.comingSoon' THEN 'Farriinta Dhawaan Filo'
    WHEN 'admin.platformSettings.privacyPolicy.title' THEN 'Siyaasadda Asturnaanta'
    WHEN 'admin.platformSettings.privacyPolicy.description' THEN 'Cusbooneysii siyaasadda asturnaanta madal.'
    WHEN 'admin.platformSettings.privacyPolicy.placeholder' THEN 'Geli qoraalka siyaasadda asturnaanta...'
    WHEN 'admin.platformSettings.forceReacceptance.title' THEN 'Ku Qasab Dib-u-aqbalid'
    WHEN 'admin.platformSettings.forceReacceptance.description' THEN 'Isticmaalayaasha waxaa laga doonayaa inay aqbalaan siyaasadda cusub marka ay soo galaan marka xigta.'
    WHEN 'admin.platformSettings.saveAndPublish' THEN 'Keydi & Daabac'
    WHEN 'admin.platformSettings.policyUpdated' THEN 'Siyaasadda asturnaanta waa la cusbooneysiiyay.'
    WHEN 'admin.platformSettings.policyUpdateFailed' THEN 'Waa la awoodi waayay in la cusbooneysiiyo siyaasadda.'
    WHEN 'admin.platformSettings.loadingSettings' THEN 'Dejinta soo dejinaya...'
    WHEN 'admin.audit.table.timestamp' THEN 'Waqtiga'
    WHEN 'admin.audit.table.actor' THEN 'Fuliye'
    WHEN 'admin.audit.table.action' THEN 'Ficil'
    WHEN 'admin.audit.table.target' THEN 'Bartilmaameed'
    WHEN 'admin.audit.table.details' THEN 'Faahfaahin'
    WHEN 'admin.audit.noLogs' THEN 'Majiraan diiwaannada baaritaanka.'
    WHEN 'admin.audit.loadingLogs' THEN 'Soo dejinaya diiwaannada baaritaanka...'
    WHEN 'admin.translations.meta.persona.shared' THEN 'La wadaago dhammaan doorka'
    WHEN 'admin.translations.meta.page.shared' THEN 'Laga arki karo dhammaan alaabta'
    WHEN 'admin.translations.status.saved' THEN 'La Mideeyay'
    WHEN 'admin.translations.baseLabel' THEN 'Nuqulka Ingiriisiga'
    WHEN 'admin.translations.localeValue' THEN 'Luuqadda la doortay'
    WHEN 'admin.translations.actions.copyBase' THEN 'Nuqul ka samee base'
    WHEN 'admin.translations.actions.saveKey' THEN 'Keydi fure'
END
FROM translation_keys
WHERE key IN (
    'admin.common.all', 'admin.common.pending', 'admin.common.approved', 'admin.common.rejected',
    'admin.common.companies', 'admin.common.applications', 'admin.common.submitted', 'admin.common.status',
    'admin.common.enabled', 'admin.common.cancel', 'admin.common.saving', 'admin.common.total',
    'admin.automation.title', 'admin.automation.deadlineNotifications.title', 'admin.automation.deadlineNotifications.description',
    'admin.automation.emailNotifications.title', 'admin.automation.emailNotifications.description',
    'admin.automation.notificationInterval.title', 'admin.automation.notificationInterval.description',
    'admin.automation.notificationInterval.current', 'admin.automation.twoFactorAuth.title',
    'admin.automation.twoFactorAuth.description', 'admin.automation.jobRecommendations.title',
    'admin.automation.jobRecommendations.description', 'admin.locale.title', 'admin.locale.description',
    'admin.locale.refresh', 'admin.locale.refreshing', 'admin.locale.empty', 'admin.locale.newLocale',
    'admin.locale.addLocale', 'admin.locale.addDescription', 'admin.locale.localeCodePlaceholder',
    'admin.locale.labelPlaceholder', 'admin.locale.enabled', 'admin.locale.adminOnly', 'admin.locale.comingSoonHint',
    'admin.locale.updated', 'admin.locale.error', 'admin.locale.missingFields', 'admin.locale.localeCode',
    'admin.locale.label', 'admin.locales.field.comingSoon', 'admin.platformSettings.privacyPolicy.title',
    'admin.platformSettings.privacyPolicy.description', 'admin.platformSettings.privacyPolicy.placeholder',
    'admin.platformSettings.forceReacceptance.title', 'admin.platformSettings.forceReacceptance.description',
    'admin.platformSettings.saveAndPublish', 'admin.platformSettings.policyUpdated',
    'admin.platformSettings.policyUpdateFailed', 'admin.platformSettings.loadingSettings',
    'admin.audit.table.timestamp', 'admin.audit.table.actor', 'admin.audit.table.action',
    'admin.audit.table.target', 'admin.audit.table.details', 'admin.audit.noLogs', 'admin.audit.loadingLogs',
    'admin.translations.meta.persona.shared', 'admin.translations.meta.page.shared',
    'admin.translations.status.saved', 'admin.translations.baseLabel',
    'admin.translations.localeValue', 'admin.translations.actions.copyBase', 'admin.translations.actions.saveKey'
)
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
