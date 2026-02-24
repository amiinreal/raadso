-- Migration to add translation keys and values for Candidate and Employer Application pages
-- Created: 2026-02-08

-- COMMON KEYS
WITH keys AS (
  INSERT INTO translation_keys (key, domain, page, is_common, description) VALUES
    ('common.moreCount', 'common', 'common', TRUE, 'Label for showing more items (e.g., +3 more)'),
    ('common.unnamed', 'common', 'common', TRUE, 'Fallback for missing names'),
    ('common.success', 'common', 'common', TRUE, 'Success label'),
    ('common.error', 'common', 'common', TRUE, 'Error label'),
    ('common.confirm', 'common', 'common', TRUE, 'Confirm button text'),
    ('common.ok', 'common', 'common', TRUE, 'OK button text'),
    ('common.close', 'common', 'common', TRUE, 'Close button text'),
    ('common.refresh', 'common', 'common', TRUE, 'Refresh action text')
  ON CONFLICT (key) DO UPDATE SET is_common = TRUE
  RETURNING id, key
)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key
  WHEN 'common.moreCount' THEN '+{{count}} kale'
  WHEN 'common.unnamed' THEN 'Magac la''aan'
  WHEN 'common.success' THEN 'Guul'
  WHEN 'common.error' THEN 'Khalad'
  WHEN 'common.confirm' THEN 'Xaqiiji'
  WHEN 'common.ok' THEN 'Haye'
  WHEN 'common.close' THEN 'Xir'
  WHEN 'common.refresh' THEN 'Cusbooneysii'
END
FROM keys
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- CANDIDATE APPLICATION KEYS
WITH keys AS (
  INSERT INTO translation_keys (key, domain, page, description) VALUES
    ('applications.candidate.header', 'candidate', 'applications', 'Main header for candidate applications page'),
    ('applications.candidate.subHeader', 'candidate', 'applications', 'Subtitle for candidate applications page'),
    ('applications.candidate.myApplications', 'candidate', 'applications', 'Tab/Section title: My Applications'),
    ('applications.candidate.stats.total', 'candidate', 'applications', 'Stat label: Total applications'),
    ('applications.candidate.stats.applied', 'candidate', 'applications', 'Stat label: Applied status'),
    ('applications.candidate.stats.reviewing', 'candidate', 'applications', 'Stat label: Reviewing status'),
    ('applications.candidate.stats.accepted', 'candidate', 'applications', 'Stat label: Accepted status'),
    ('applications.candidate.empty.title', 'candidate', 'applications', 'Empty state title'),
    ('applications.candidate.empty.desc', 'candidate', 'applications', 'Empty state description'),
    ('applications.candidate.messages.button', 'candidate', 'applications', 'Button to open messages'),
    ('applications.candidate.messages.empty', 'candidate', 'applications', 'Empty message state'),
    ('applications.candidate.messages.start', 'candidate', 'applications', 'Prompt to start messaging'),
    ('applications.candidate.messages.type', 'candidate', 'applications', 'Placeholder for message input')
  ON CONFLICT (key) DO UPDATE SET page = 'applications'
  RETURNING id, key
)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key
  WHEN 'applications.candidate.header' THEN 'Codsiyadaada Shaqo'
  WHEN 'applications.candidate.subHeader' THEN 'La soco oo maamul dhammaan codsiyada aad gudbisay'
  WHEN 'applications.candidate.myApplications' THEN 'Codsiyadayda'
  WHEN 'applications.candidate.stats.total' THEN 'WADARTA'
  WHEN 'applications.candidate.stats.applied' THEN 'CODSADAY'
  WHEN 'applications.candidate.stats.reviewing' THEN 'DIB U EEGIS'
  WHEN 'applications.candidate.stats.accepted' THEN 'LA AQBALAY'
  WHEN 'applications.candidate.empty.title' THEN 'Wali codsiyo ma jiraan'
  WHEN 'applications.candidate.empty.desc' THEN 'Bilow codsigaga shaqo si aad halkan ugu aragto'
  WHEN 'applications.candidate.messages.button' THEN 'Farriimaha'
  WHEN 'applications.candidate.messages.empty' THEN 'Wali farriimo ma jiraan.'
  WHEN 'applications.candidate.messages.start' THEN 'Kula hadal shaqo-bixiyaha halkan.'
  WHEN 'applications.candidate.messages.type' THEN 'Qor farriin...'
END
FROM keys
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- EMPLOYER APPLICATION KEYS
WITH keys AS (
  INSERT INTO translation_keys (key, domain, page, description) VALUES
    ('applications.employer.ai.reanalyze', 'employer', 'applications', 'Action: Re-analyze application with AI'),
    ('applications.employer.ai.reanalyzing', 'employer', 'applications', 'State: Re-analyzing...'),
    ('applications.employer.ai.rereview', 'employer', 'applications', 'Action: Re-review'),
    ('applications.employer.ai.analysisTitle', 'employer', 'applications', 'Title: AI Match Analysis'),
    ('applications.employer.ai.disclaimer', 'employer', 'applications', 'Disclaimer about AI accuracy'),
    ('applications.employer.ai.reviewAllTitle', 'employer', 'applications', 'Title for bulk AI review modal'),
    ('applications.employer.ai.reviewAllMessage', 'employer', 'applications', 'Message for bulk AI review modal'),
    ('applications.employer.ai.reviewComplete', 'employer', 'applications', 'Success title for AI review'),
    ('applications.employer.ai.reviewStats', 'employer', 'applications', 'Stats showing total reviewed'),
    ('applications.employer.ai.reviewAll', 'employer', 'applications', 'Button: AI Review All'),
    ('applications.employer.ai.reviewing', 'employer', 'applications', 'State: Reviewing...'),
    ('applications.employer.ai.matchPercentage', 'employer', 'applications', 'Label: Match Percentage'),
    ('applications.employer.ai.reloadHint', 'employer', 'applications', 'Hint to reload page after AI review'),
    ('applications.employer.ai.failure', 'employer', 'applications', 'Error prefix for AI failure'),
    ('applications.employer.ai.inReviewLive', 'employer', 'applications', 'Status: Being reviewed by you now'),
    ('applications.employer.ai.reviewedLabel', 'employer', 'applications', 'Label for reviewed timestamp'),

    ('applications.employer.details.savedProfile', 'employer', 'applications', 'Badge: Saved Profile'),
    ('applications.employer.details.yearsExp', 'employer', 'applications', 'Label: Years Experience'),
    ('applications.employer.details.status', 'employer', 'applications', 'Label: Status'),
    ('applications.employer.details.toWork', 'employer', 'applications', 'Label: Open to Work'),
    ('applications.employer.details.downloadCv', 'employer', 'applications', 'Link: Download CV'),
    ('applications.employer.details.appliedDateLabel', 'employer', 'applications', 'Label: Applied Date'),
    ('applications.employer.details.nationality', 'employer', 'applications', 'Label: Nationality'),
    ('applications.employer.details.submittedMaterials', 'employer', 'applications', 'Header: Submitted Materials'),
    ('applications.employer.details.savedProfileLabel', 'employer', 'applications', 'Label for saved profile source'),
    ('applications.employer.details.selectMessage', 'employer', 'applications', 'Empty state: Select an application'),
    ('applications.employer.details.cvAttachment', 'employer', 'applications', 'Label: CV Attachment'),
    ('applications.employer.details.additionalDocs', 'employer', 'applications', 'Label: Additional Documents'),
    ('applications.employer.details.openToWork', 'employer', 'applications', 'Value: Open'),
    ('applications.employer.details.notOpenToWork', 'employer', 'applications', 'Value: Not Open'),

    ('applications.employer.headers.reviewSystem', 'employer', 'applications', 'Main header: Application Review System'),
    ('applications.employer.headers.selectJob', 'employer', 'applications', 'Subheader: Select a job'),
    
    ('applications.employer.messages.noJobs', 'employer', 'applications', 'Empty state: No jobs posted'),
    ('applications.employer.messages.notesSaved', 'employer', 'applications', 'Toast: Notes saved'),
    ('applications.employer.messages.notesFailed', 'employer', 'applications', 'Toast: Notes save failed'),
    ('applications.employer.messages.statusUpdated', 'employer', 'applications', 'Toast: Status updated'),
    ('applications.employer.messages.statusFailed', 'employer', 'applications', 'Toast: Status update failed'),
    ('applications.employer.messages.noApplicationsTitle', 'employer', 'applications', 'Alert title: No applications'),
    ('applications.employer.messages.noApplicationsBody', 'employer', 'applications', 'Alert body: No applications'),
    ('applications.employer.messages.reviewersUpdatedTitle', 'employer', 'applications', 'Alert title: Reviewers updated'),
    ('applications.employer.messages.reviewersUpdatedBody', 'employer', 'applications', 'Alert body: Reviewers updated'),
    ('applications.employer.messages.assignmentError', 'employer', 'applications', 'Error title: Assignment failed'),

    ('applications.employer.labels.applications', 'employer', 'applications', 'Label: Applications'),

    ('applications.employer.actions.backToJobs', 'employer', 'applications', 'Button: Back to Jobs'),
    ('applications.employer.actions.refresh', 'employer', 'applications', 'Button: Refresh'),
    ('applications.employer.actions.analyzing', 'employer', 'applications', 'Button State: Analyzing...'),
    ('applications.employer.actions.aiReview', 'employer', 'applications', 'Button: AI Review'),

    ('applications.employer.reviewers.title', 'employer', 'applications', 'Header: Assigned Reviewers'),
    ('applications.employer.reviewers.noneAssigned', 'employer', 'applications', 'State: No reviewers assigned'),
    ('applications.employer.reviewers.selectTeam', 'employer', 'applications', 'Action: Select team members'),
    ('applications.employer.reviewers.closeTeam', 'employer', 'applications', 'Action: Close team picker'),
    ('applications.employer.reviewers.searchPlaceholder', 'employer', 'applications', 'Placeholder: Search team'),
    ('applications.employer.reviewers.noMembersFound', 'employer', 'applications', 'State: No members found'),
    ('applications.employer.reviewers.applyToAll', 'employer', 'applications', 'Action: Apply to all'),
    ('applications.employer.reviewers.upToDate', 'employer', 'applications', 'Status: Up to date'),
    ('applications.employer.reviewers.noPermission', 'employer', 'applications', 'Error: No permission'),
    ('applications.employer.reviewers.description', 'employer', 'applications', 'Description of reviewers functionality'),
    ('applications.employer.reviewers.unsavedChanges', 'employer', 'applications', 'Warning: Unsaved changes'),
    ('applications.employer.reviewers.unassigned', 'employer', 'applications', 'Label: Unassigned'),

    ('applications.employer.list.title', 'employer', 'applications', 'Header: Application List'),
    ('applications.employer.list.noMatches', 'employer', 'applications', 'State: No matches'),
    ('applications.employer.list.appliedDate', 'employer', 'applications', 'Label: Applied date in list'),
    ('applications.employer.list.beingReviewed', 'employer', 'applications', 'Status: Being reviewed'),
    ('applications.employer.list.profileSource', 'employer', 'applications', 'Source: Profile'),
    ('applications.employer.list.cvSource', 'employer', 'applications', 'Source: CV'),
    ('applications.employer.list.fileCount', 'employer', 'applications', 'Label: File count'),

    ('applications.employer.status.all', 'employer', 'applications', 'Filter: All Status'),
    ('applications.employer.status.applied', 'employer', 'applications', 'Status: Applied'),
    ('applications.employer.status.reviewing', 'employer', 'applications', 'Status: Reviewing'),
    ('applications.employer.status.shortlisted', 'employer', 'applications', 'Status: Shortlisted'),
    ('applications.employer.status.rejected', 'employer', 'applications', 'Status: Rejected'),
    ('applications.employer.status.hired', 'employer', 'applications', 'Status: Hired'),

    ('applications.employer.sections.skills', 'employer', 'applications', 'Section: Skills'),
    ('applications.employer.sections.workHistory', 'employer', 'applications', 'Section: Work Experience'),
    ('applications.employer.sections.education', 'employer', 'applications', 'Section: Education'),
    ('applications.employer.sections.languages', 'employer', 'applications', 'Section: Languages'),
    ('applications.employer.sections.coverLetter', 'employer', 'applications', 'Section: Cover Letter'),
    ('applications.employer.sections.notes', 'employer', 'applications', 'Section: Notes'),

    ('applications.employer.notes.placeholder', 'employer', 'applications', 'Placeholder: Notes'),
    ('applications.employer.notes.save', 'employer', 'applications', 'Button: Save Notes'),

    ('applications.employer.audit.title', 'employer', 'applications', 'Title: Tenant Audit Log'),
    ('applications.employer.audit.notFetched', 'employer', 'applications', 'State: Not fetched'),
    ('applications.employer.audit.loading', 'employer', 'applications', 'State: Loading activity'),
    ('applications.employer.audit.empty', 'employer', 'applications', 'State: No activity')
  ON CONFLICT (key) DO UPDATE SET page = 'applications'
  RETURNING id, key
)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key
  WHEN 'applications.employer.ai.reanalyze' THEN 'Dib u falanqee codsigan'
  WHEN 'applications.employer.ai.reanalyzing' THEN 'Dib u falanqeynaya...'
  WHEN 'applications.employer.ai.rereview' THEN 'Dib u eegid'
  WHEN 'applications.employer.ai.analysisTitle' THEN 'Falanqaynta Isku-aadinta AI'
  WHEN 'applications.employer.ai.disclaimer' THEN '⚠️ AI ayaa khalad samayn karta - fadlan si taxadar leh u eeg falanqaynta ka hor go''aan qaadashada'
  WHEN 'applications.employer.details.savedProfile' THEN 'XOGTA LA KAYDIYAY'
  WHEN 'applications.employer.details.yearsExp' THEN 'Sano Khibrad'
  WHEN 'applications.employer.details.status' THEN 'Xaaladda'
  WHEN 'applications.employer.details.toWork' THEN 'U Furan Shaqo'
  WHEN 'applications.employer.details.downloadCv' THEN 'Soo dejiso CV'
  WHEN 'applications.employer.details.submittedMaterials' THEN 'DUKUMEENTIYADA LA GUDBIYAY'
  WHEN 'applications.employer.details.savedProfileLabel' THEN 'Xogta La Kaydiyay'
  WHEN 'applications.employer.headers.reviewSystem' THEN 'Nidaamka Dib-u-eegista Codsiyada'
  WHEN 'applications.employer.headers.selectJob' THEN 'Dooro shaqo si aad u eegto oo aad u maamusho codsiyada'
  WHEN 'applications.employer.messages.noJobs' THEN 'Wali shaqo laguma dhajin. Abuur shaqo si aad u bilowdo helitaanka codsiyada.'
  WHEN 'applications.employer.labels.applications' THEN 'Codsiyada'
  WHEN 'applications.employer.actions.backToJobs' THEN '← Ku noqo Shaqooyinka'
  WHEN 'applications.employer.actions.refresh' THEN 'Cusbooneysii'
  WHEN 'applications.employer.ai.reviewAllTitle' THEN 'AI Dib-u-eegista Dhammaan Codsiyada'
  WHEN 'applications.employer.ai.reviewAllMessage' THEN 'Ma rabtaa in AI ay dib u eegto dhammaan {{count}} codsiyada? Tani waxay qaadan kartaa daqiiqado.'
  WHEN 'applications.employer.ai.reviewComplete' THEN 'Dib-u-eegista AI waa la dhammaystiray'
  WHEN 'applications.employer.ai.reviewStats' THEN 'Wadarta: {{total}}\nLa eegay: {{reviewed}}'
  WHEN 'applications.employer.ai.reviewAll' THEN 'AI Dib-u-eegista Dhammaan'
  WHEN 'applications.employer.ai.reviewing' THEN 'Eegaya...'
  WHEN 'applications.employer.reviewers.title' THEN 'DIB-U-EEGAYAASHA LOO XILSAARAY (SHAQADA OO DHAN)'
  WHEN 'applications.employer.reviewers.noneAssigned' THEN 'Lama xilsaarin dib-u-eegayaal shaqadan'
  WHEN 'applications.employer.reviewers.selectTeam' THEN 'Dooro xubnaha kooxda'
  WHEN 'applications.employer.reviewers.closeTeam' THEN 'Xir xulashada kooxda'
  WHEN 'applications.employer.reviewers.searchPlaceholder' THEN 'Ku raadi magac ama iimayl'
  WHEN 'applications.employer.reviewers.noMembersFound' THEN 'Xubno kooxda ah lama helin'
  WHEN 'applications.employer.reviewers.applyToAll' THEN 'Ku dabaq dhammaan codsiyada'
  WHEN 'applications.employer.reviewers.upToDate' THEN 'Waa la cusbooneysiiyay'
  WHEN 'applications.employer.reviewers.noPermission' THEN 'Uma haysatid ogolaansho inaad maamusho dib-u-eegayaasha.'
  WHEN 'applications.employer.reviewers.description' THEN 'Dib-u-eegayaasha halkan lagu daray waxay arki karaan oo ay wax ka qaban karaan codsi kasta oo shaqadan ah.'
  WHEN 'applications.employer.reviewers.unsavedChanges' THEN 'Waxaad haysataa isbedelo aan la keydin.'
  WHEN 'applications.employer.list.title' THEN 'Codsiyada ({{count}})'
  WHEN 'applications.employer.status.all' THEN 'Dhammaan Heerarka'
  WHEN 'applications.employer.status.applied' THEN 'La Codsaday'
  WHEN 'applications.employer.status.reviewing' THEN 'Dib-u-eegis'
  WHEN 'applications.employer.status.shortlisted' THEN 'Liiska Gaaban'
  WHEN 'applications.employer.status.rejected' THEN 'La Diiday'
  WHEN 'applications.employer.status.hired' THEN 'La Shaqaaleysiiyay'
  WHEN 'applications.employer.list.noMatches' THEN 'Codsiyo lama helin'
  WHEN 'applications.employer.ai.matchPercentage' THEN '{{score}}% Iswaafaqid'
  WHEN 'applications.employer.list.appliedDate' THEN 'La codsaday {{date}}'
  WHEN 'applications.employer.list.beingReviewed' THEN '🔵 Hadda la eegayo'
  WHEN 'applications.employer.reviewers.unassigned' THEN 'Aan la xilsaarin'
  WHEN 'applications.employer.details.selectMessage' THEN 'Dooro codsi si aad u eegto'
  WHEN 'applications.employer.sections.skills' THEN 'Xirfadaha'
  WHEN 'applications.employer.sections.workHistory' THEN 'Khibrada Shaqo'
  WHEN 'applications.employer.sections.education' THEN 'Waxbarasho'
  WHEN 'applications.employer.sections.languages' THEN 'Luuqadaha'
  WHEN 'applications.employer.sections.coverLetter' THEN 'Warqadda Codsiga (Cover Letter)'
  WHEN 'applications.employer.sections.notes' THEN 'Qoraalladaada'
  WHEN 'applications.employer.notes.placeholder' THEN 'Ku dar qoraallo shakhsi ah oo ku saabsan musharraxan...'
  WHEN 'applications.employer.notes.save' THEN 'Kaydi Qoraalka'
  WHEN 'applications.employer.details.cvAttachment' THEN 'Lifaaqa CV-ga'
  WHEN 'applications.employer.details.additionalDocs' THEN 'Dukumeentiyo Dheeraad ah'
  WHEN 'applications.employer.audit.title' THEN 'Diiwaanka Baaritaanka Kiraystaha'
  WHEN 'applications.employer.audit.notFetched' THEN 'Wali lama soo qaadin'
  WHEN 'applications.employer.audit.loading' THEN 'Soo dejinaya dhaqdhaqaaqa...'
  WHEN 'applications.employer.audit.empty' THEN 'Majirto dhaqdhaqaaq dhow.'
  WHEN 'applications.employer.messages.notesSaved' THEN 'Qoraallada si guul leh ayaa loo kaydiyay!'
  WHEN 'applications.employer.messages.notesFailed' THEN 'Waa lagu guuldareystay in qoraallada la kaydiyo'
  WHEN 'applications.employer.messages.statusUpdated' THEN 'Heerka si guul leh ayaa loo cusbooneysiiyay!'
  WHEN 'applications.employer.messages.statusFailed' THEN 'Waa lagu guuldareystay in heerka la cusbooneysiiyo'
  WHEN 'applications.employer.messages.noApplicationsTitle' THEN 'Codsiyo ma jiraan'
  WHEN 'applications.employer.messages.noApplicationsBody' THEN 'Xilsaaro dib-u-eegayaal kadib markaad hesho ugu yaraan hal codsi.'
  WHEN 'applications.employer.messages.reviewersUpdatedTitle' THEN 'Dib-u-eegayaasha cusbooneysiiyay'
  WHEN 'applications.employer.messages.reviewersUpdatedBody' THEN 'Dib-u-eegayaasha la xilsaaray hadda waxay khuseeyaan dhammaan codsiyada shaqadan.'
  WHEN 'applications.employer.messages.assignmentError' THEN 'Khalad xilsaarid'
  WHEN 'applications.employer.ai.reloadHint' THEN 'Dib u soo rogo si aad u aragto natiijada.'
  WHEN 'applications.employer.ai.failure' THEN 'Dib-u-eegista AI waa fashilantay: '
  WHEN 'applications.employer.details.openToWork' THEN 'Furan'
  WHEN 'applications.employer.details.notOpenToWork' THEN 'Xiran'
  WHEN 'applications.employer.ai.inReviewLive' THEN 'Waad eegaysaa hadda (toos)'
  WHEN 'applications.employer.ai.reviewedLabel' THEN 'La eegay: '
  WHEN 'applications.employer.list.profileSource' THEN 'Astaanta'
  WHEN 'applications.employer.list.cvSource' THEN 'CV'
  WHEN 'applications.employer.list.fileCount' THEN '{{count}} fayl'
  WHEN 'applications.employer.details.appliedDateLabel' THEN 'Taariikhda la codsaday'
  WHEN 'applications.employer.details.nationality' THEN 'Dhalashada'
  WHEN 'applications.employer.actions.analyzing' THEN 'Falanqeynaya...'
  WHEN 'applications.employer.actions.aiReview' THEN 'AI Dib-u-eegis'
END
FROM keys
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
