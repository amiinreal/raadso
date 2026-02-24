-- Migration to add ENGLISH translations for Candidate and Employer Application pages.
-- These keys already exist (seeded in 20260208_seed_application_translations.sql) but are missing 'en' values.
-- Created: 2026-02-09

INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', CASE key
  -- Common
  WHEN 'common.moreCount' THEN '+{{count}} more'
  WHEN 'common.unnamed' THEN 'Unnamed'
  WHEN 'common.success' THEN 'Success'
  WHEN 'common.error' THEN 'Error'
  WHEN 'common.confirm' THEN 'Confirm'
  WHEN 'common.ok' THEN 'OK'
  WHEN 'common.close' THEN 'Close'
  WHEN 'common.refresh' THEN 'Refresh'

  -- Candidate
  WHEN 'applications.candidate.header' THEN 'Your Job Applications'
  WHEN 'applications.candidate.subHeader' THEN 'Track and manage all your submitted applications'
  WHEN 'applications.candidate.myApplications' THEN 'My Applications'
  WHEN 'applications.candidate.stats.total' THEN 'TOTAL'
  WHEN 'applications.candidate.stats.applied' THEN 'APPLIED'
  WHEN 'applications.candidate.stats.reviewing' THEN 'REVIEWING'
  WHEN 'applications.candidate.stats.accepted' THEN 'ACCEPTED'
  WHEN 'applications.candidate.empty.title' THEN 'No applications yet'
  WHEN 'applications.candidate.empty.desc' THEN 'Start applying to jobs to see them here'
  WHEN 'applications.candidate.messages.button' THEN 'Messages'
  WHEN 'applications.candidate.messages.empty' THEN 'No messages yet.'
  WHEN 'applications.candidate.messages.start' THEN 'Chat with the employer here.'
  WHEN 'applications.candidate.messages.type' THEN 'Type a message...'

  -- Employer
  WHEN 'applications.employer.ai.reanalyze' THEN 'Re-analyze application'
  WHEN 'applications.employer.ai.reanalyzing' THEN 'Re-analyzing...'
  WHEN 'applications.employer.ai.rereview' THEN 'Re-review'
  WHEN 'applications.employer.ai.analysisTitle' THEN 'AI Match Analysis'
  WHEN 'applications.employer.ai.disclaimer' THEN '⚠️ AI can make mistakes – please review analysis carefully before making decisions'
  WHEN 'applications.employer.details.savedProfile' THEN 'SAVED PROFILE'
  WHEN 'applications.employer.details.yearsExp' THEN 'Years Experience'
  WHEN 'applications.employer.details.status' THEN 'Status'
  WHEN 'applications.employer.details.toWork' THEN 'Open to Work'
  WHEN 'applications.employer.details.downloadCv' THEN 'Download CV'
  WHEN 'applications.employer.details.submittedMaterials' THEN 'SUBMITTED MATERIALS'
  WHEN 'applications.employer.details.savedProfileLabel' THEN 'Saved Profile'
  WHEN 'applications.employer.headers.reviewSystem' THEN 'Application Review System'
  WHEN 'applications.employer.headers.selectJob' THEN 'Select a job to review and manage its applications'
  WHEN 'applications.employer.messages.noJobs' THEN 'No jobs posted yet. Create a job to start receiving applications.'
  WHEN 'applications.employer.labels.applications' THEN 'Applications'
  WHEN 'applications.employer.actions.backToJobs' THEN '← Back to Jobs'
  WHEN 'applications.employer.actions.refresh' THEN 'Refresh'
  WHEN 'applications.employer.ai.reviewAllTitle' THEN 'AI Review All Applications'
  WHEN 'applications.employer.ai.reviewAllMessage' THEN 'Review all {{count}} applications with AI? This may take a few minutes.'
  WHEN 'applications.employer.ai.reviewComplete' THEN 'AI Review Complete'
  WHEN 'applications.employer.ai.reviewStats' THEN 'Total: {{total}}\nReviewed: {{reviewed}}'
  WHEN 'applications.employer.ai.reviewAll' THEN 'AI Review All'
  WHEN 'applications.employer.ai.reviewing' THEN 'Reviewing...'
  WHEN 'applications.employer.reviewers.title' THEN 'ASSIGNED REVIEWERS (JOB-WIDE)'
  WHEN 'applications.employer.reviewers.noneAssigned' THEN 'No reviewers assigned for this job'
  WHEN 'applications.employer.reviewers.selectTeam' THEN 'Select team members'
  WHEN 'applications.employer.reviewers.closeTeam' THEN 'Close team picker'
  WHEN 'applications.employer.reviewers.searchPlaceholder' THEN 'Search by name or email'
  WHEN 'applications.employer.reviewers.noMembersFound' THEN 'No team members found'
  WHEN 'applications.employer.reviewers.applyToAll' THEN 'Apply to all applications'
  WHEN 'applications.employer.reviewers.upToDate' THEN 'Up to date'
  WHEN 'applications.employer.reviewers.noPermission' THEN 'You do not have permission to manage reviewers.'
  WHEN 'applications.employer.reviewers.description' THEN 'Reviewers added here can view and act on every application for this job.'
  WHEN 'applications.employer.reviewers.unsavedChanges' THEN 'You have unsaved reviewer changes.'
  WHEN 'applications.employer.list.title' THEN 'Applications ({{count}})'
  WHEN 'applications.employer.status.all' THEN 'All Status'
  WHEN 'applications.employer.status.applied' THEN 'Applied'
  WHEN 'applications.employer.status.reviewing' THEN 'Reviewing'
  WHEN 'applications.employer.status.shortlisted' THEN 'Shortlisted'
  WHEN 'applications.employer.status.rejected' THEN 'Rejected'
  WHEN 'applications.employer.status.hired' THEN 'Hired'
  WHEN 'applications.employer.list.noMatches' THEN 'No applications match filters'
  WHEN 'applications.employer.ai.matchPercentage' THEN '{{score}}% Match'
  WHEN 'applications.employer.list.appliedDate' THEN 'Applied {{date}}'
  WHEN 'applications.employer.list.beingReviewed' THEN '🔵 Currently being reviewed'
  WHEN 'applications.employer.reviewers.unassigned' THEN 'Unassigned'
  WHEN 'applications.employer.details.selectMessage' THEN 'Select an application to review'
  WHEN 'applications.employer.sections.skills' THEN 'Skills'
  WHEN 'applications.employer.sections.workHistory' THEN 'Work Experience'
  WHEN 'applications.employer.sections.education' THEN 'Education'
  WHEN 'applications.employer.sections.languages' THEN 'Languages'
  WHEN 'applications.employer.sections.coverLetter' THEN 'Cover Letter'
  WHEN 'applications.employer.sections.notes' THEN 'Your Notes'
  WHEN 'applications.employer.notes.placeholder' THEN 'Add your personal notes about this candidate...'
  WHEN 'applications.employer.notes.save' THEN 'Save Notes'
  WHEN 'applications.employer.details.cvAttachment' THEN 'CV Attachment'
  WHEN 'applications.employer.details.additionalDocs' THEN 'Additional Documents'
  WHEN 'applications.employer.audit.title' THEN 'Tenant Audit Log'
  WHEN 'applications.employer.audit.notFetched' THEN 'Not fetched yet'
  WHEN 'applications.employer.audit.loading' THEN 'Loading activity...'
  WHEN 'applications.employer.audit.empty' THEN 'No recent activity yet.'
  WHEN 'applications.employer.messages.notesSaved' THEN 'Notes saved successfully!'
  WHEN 'applications.employer.messages.notesFailed' THEN 'Failed to save notes'
  WHEN 'applications.employer.messages.statusUpdated' THEN 'Status updated successfully!'
  WHEN 'applications.employer.messages.statusFailed' THEN 'Failed to update status'
  WHEN 'applications.employer.messages.noApplicationsTitle' THEN 'No applications'
  WHEN 'applications.employer.messages.noApplicationsBody' THEN 'Assign reviewers after receiving at least one application.'
  WHEN 'applications.employer.messages.reviewersUpdatedTitle' THEN 'Reviewers updated'
  WHEN 'applications.employer.messages.reviewersUpdatedBody' THEN 'Assigned reviewers now apply to every application for this job.'
  WHEN 'applications.employer.messages.assignmentError' THEN 'Assignment error'
  WHEN 'applications.employer.ai.reloadHint' THEN 'Reload to see results.'
  WHEN 'applications.employer.ai.failure' THEN 'AI review failed: '
  WHEN 'applications.employer.details.openToWork' THEN 'Open'
  WHEN 'applications.employer.details.notOpenToWork' THEN 'Not Open'
  WHEN 'applications.employer.ai.inReviewLive' THEN 'In review by you (live)'
  WHEN 'applications.employer.ai.reviewedLabel' THEN 'Reviewed: '
  WHEN 'applications.employer.list.profileSource' THEN 'Profile'
  WHEN 'applications.employer.list.cvSource' THEN 'CV'
  WHEN 'applications.employer.list.fileCount' THEN '{{count}} files'
  WHEN 'applications.employer.details.appliedDateLabel' THEN 'Applied Date'
  WHEN 'applications.employer.details.nationality' THEN 'Nationality'
  WHEN 'applications.employer.actions.analyzing' THEN 'Analyzing...'
  WHEN 'applications.employer.actions.aiReview' THEN 'AI Review'
END
FROM translation_keys
WHERE key IN (
  'common.moreCount',
  'common.unnamed',
  'common.success',
  'common.error',
  'common.confirm',
  'common.ok',
  'common.close',
  'common.refresh',
  'applications.candidate.header',
  'applications.candidate.subHeader',
  'applications.candidate.myApplications',
  'applications.candidate.stats.total',
  'applications.candidate.stats.applied',
  'applications.candidate.stats.reviewing',
  'applications.candidate.stats.accepted',
  'applications.candidate.empty.title',
  'applications.candidate.empty.desc',
  'applications.candidate.messages.button',
  'applications.candidate.messages.empty',
  'applications.candidate.messages.start',
  'applications.candidate.messages.type',
  'applications.employer.ai.reanalyze',
  'applications.employer.ai.reanalyzing',
  'applications.employer.ai.rereview',
  'applications.employer.ai.analysisTitle',
  'applications.employer.ai.disclaimer',
  'applications.employer.details.savedProfile',
  'applications.employer.details.yearsExp',
  'applications.employer.details.status',
  'applications.employer.details.toWork',
  'applications.employer.details.downloadCv',
  'applications.employer.details.submittedMaterials',
  'applications.employer.details.savedProfileLabel',
  'applications.employer.headers.reviewSystem',
  'applications.employer.headers.selectJob',
  'applications.employer.messages.noJobs',
  'applications.employer.labels.applications',
  'applications.employer.actions.backToJobs',
  'applications.employer.actions.refresh',
  'applications.employer.ai.reviewAllTitle',
  'applications.employer.ai.reviewAllMessage',
  'applications.employer.ai.reviewComplete',
  'applications.employer.ai.reviewStats',
  'applications.employer.ai.reviewAll',
  'applications.employer.ai.reviewing',
  'applications.employer.reviewers.title',
  'applications.employer.reviewers.noneAssigned',
  'applications.employer.reviewers.selectTeam',
  'applications.employer.reviewers.closeTeam',
  'applications.employer.reviewers.searchPlaceholder',
  'applications.employer.reviewers.noMembersFound',
  'applications.employer.reviewers.applyToAll',
  'applications.employer.reviewers.upToDate',
  'applications.employer.reviewers.noPermission',
  'applications.employer.reviewers.description',
  'applications.employer.reviewers.unsavedChanges',
  'applications.employer.list.title',
  'applications.employer.status.all',
  'applications.employer.status.applied',
  'applications.employer.status.reviewing',
  'applications.employer.status.shortlisted',
  'applications.employer.status.rejected',
  'applications.employer.status.hired',
  'applications.employer.list.noMatches',
  'applications.employer.ai.matchPercentage',
  'applications.employer.list.appliedDate',
  'applications.employer.list.beingReviewed',
  'applications.employer.reviewers.unassigned',
  'applications.employer.details.selectMessage',
  'applications.employer.sections.skills',
  'applications.employer.sections.workHistory',
  'applications.employer.sections.education',
  'applications.employer.sections.languages',
  'applications.employer.sections.coverLetter',
  'applications.employer.sections.notes',
  'applications.employer.notes.placeholder',
  'applications.employer.notes.save',
  'applications.employer.details.cvAttachment',
  'applications.employer.details.additionalDocs',
  'applications.employer.audit.title',
  'applications.employer.audit.notFetched',
  'applications.employer.audit.loading',
  'applications.employer.audit.empty',
  'applications.employer.messages.notesSaved',
  'applications.employer.messages.notesFailed',
  'applications.employer.messages.statusUpdated',
  'applications.employer.messages.statusFailed',
  'applications.employer.messages.noApplicationsTitle',
  'applications.employer.messages.noApplicationsBody',
  'applications.employer.messages.reviewersUpdatedTitle',
  'applications.employer.messages.reviewersUpdatedBody',
  'applications.employer.messages.assignmentError',
  'applications.employer.ai.reloadHint',
  'applications.employer.ai.failure',
  'applications.employer.details.openToWork',
  'applications.employer.details.notOpenToWork',
  'applications.employer.ai.inReviewLive',
  'applications.employer.ai.reviewedLabel',
  'applications.employer.list.profileSource',
  'applications.employer.list.cvSource',
  'applications.employer.list.fileCount',
  'applications.employer.details.appliedDateLabel',
  'applications.employer.details.nationality',
  'applications.employer.actions.analyzing',
  'applications.employer.actions.aiReview'
)
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
