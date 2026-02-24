const personaMeta = {
  candidate: {
    labelKey: 'roles.candidate',
    labelFallback: 'Candidate',
    descriptionKey: 'admin.translations.meta.persona.candidate',
    descriptionFallback: 'Candidate-facing copy',
  },
  employer: {
    labelKey: 'roles.employer',
    labelFallback: 'Employer',
    descriptionKey: 'admin.translations.meta.persona.employer',
    descriptionFallback: 'Employer-facing copy',
  },
  admin: {
    labelKey: 'roles.admin',
    labelFallback: 'Admin',
    descriptionKey: 'admin.translations.meta.persona.admin',
    descriptionFallback: 'Admin-only surfaces',
  },
  shared: {
    labelKey: 'admin.translations.persona.shared',
    labelFallback: 'Shared copy',
    descriptionKey: 'admin.translations.meta.persona.shared',
    descriptionFallback: 'Shared across product roles',
  },
  all: {
    labelKey: 'admin.translations.persona.all',
    labelFallback: 'All',
    descriptionKey: 'admin.translations.meta.persona.all',
    descriptionFallback: 'All personas',
  },
}

const pageMeta = {
  dashboard: {
    labelKey: 'nav.dashboard',
    labelFallback: 'Dashboard',
    descriptionKey: 'admin.translations.meta.page.dashboard',
    descriptionFallback: 'Candidate overview and landing views',
  },
  jobs: {
    labelKey: 'nav.jobs',
    labelFallback: 'Jobs',
    descriptionKey: 'admin.translations.meta.page.jobs',
    descriptionFallback: 'Job lists and detail experiences',
  },
  applications: {
    labelKey: 'nav.applications',
    labelFallback: 'Applications',
    descriptionKey: 'admin.translations.meta.page.applications',
    descriptionFallback: 'Application flows for candidates/employers',
  },
  profile: {
    labelKey: 'nav.profile',
    labelFallback: 'Profile',
    descriptionKey: 'admin.translations.meta.page.profile',
    descriptionFallback: 'Profile and identity surfaces',
  },
  navbar: {
    labelKey: 'admin.translations.page.navbar',
    labelFallback: 'Navigation',
    descriptionKey: 'admin.translations.meta.page.navbar',
    descriptionFallback: 'Global navigation & chrome',
  },
  footer: {
    labelKey: 'admin.translations.page.footer',
    labelFallback: 'Footer',
    descriptionKey: 'admin.translations.meta.page.footer',
    descriptionFallback: 'Footers, language toggle, and legal links',
  },
  landing: {
    labelKey: 'admin.translations.page.landing',
    labelFallback: 'Landing',
    descriptionKey: 'admin.translations.meta.page.landing',
    descriptionFallback: 'Public landing and hero surfaces',
  },
  auth: {
    labelKey: 'admin.translations.page.auth',
    labelFallback: 'Auth',
    descriptionKey: 'admin.translations.meta.page.auth',
    descriptionFallback: 'Login, MFA, reset, and onboarding gates',
  },
  onboarding: {
    labelKey: 'admin.translations.page.onboarding',
    labelFallback: 'Onboarding',
    descriptionKey: 'admin.translations.meta.page.onboarding',
    descriptionFallback: 'Invites and first-time setup flows',
  },
  settings: {
    labelKey: 'admin.translations.page.settings',
    labelFallback: 'Settings',
    descriptionKey: 'admin.translations.meta.page.settings',
    descriptionFallback: 'Account and preferences surfaces',
  },
  tenant: {
    labelKey: 'admin.translations.page.tenant',
    labelFallback: 'Tenant',
    descriptionKey: 'admin.translations.meta.page.tenant',
    descriptionFallback: 'Tenant members, permissions, roles',
  },
  legal: {
    labelKey: 'admin.translations.page.legal',
    labelFallback: 'Legal',
    descriptionKey: 'admin.translations.meta.page.legal',
    descriptionFallback: 'Policies, terms, consent screens',
  },
  'saved-searches': {
    labelKey: 'admin.translations.page.savedSearches',
    labelFallback: 'Saved searches',
    descriptionKey: 'admin.translations.meta.page.savedSearches',
    descriptionFallback: 'Alerts and saved search UX',
  },
  admin: {
    labelKey: 'nav.admin',
    labelFallback: 'Admin',
    descriptionKey: 'admin.translations.meta.page.admin',
    descriptionFallback: 'Administrative tools and settings',
  },
  shared: {
    labelKey: 'admin.translations.page.shared',
    labelFallback: 'Shared',
    descriptionKey: 'admin.translations.meta.page.shared',
    descriptionFallback: 'Visible throughout the product',
  },
}

export const getPersonaDetails = (persona) => personaMeta[persona] || personaMeta.shared
export const getPageDetails = (page) => pageMeta[page] || pageMeta.shared

export const personaFilters = [
  { value: 'candidate', labelKey: personaMeta.candidate.labelKey, fallback: personaMeta.candidate.labelFallback },
  { value: 'employer', labelKey: personaMeta.employer.labelKey, fallback: personaMeta.employer.labelFallback },
  { value: 'admin', labelKey: personaMeta.admin.labelKey, fallback: personaMeta.admin.labelFallback },
  { value: 'shared', labelKey: personaMeta.shared.labelKey, fallback: personaMeta.shared.labelFallback },
  { value: 'all', labelKey: personaMeta.all.labelKey, fallback: personaMeta.all.labelFallback },
]

export const pageFilters = [
  { value: 'dashboard', labelKey: pageMeta.dashboard.labelKey, fallback: pageMeta.dashboard.labelFallback },
  { value: 'jobs', labelKey: pageMeta.jobs.labelKey, fallback: pageMeta.jobs.labelFallback },
  { value: 'applications', labelKey: pageMeta.applications.labelKey, fallback: pageMeta.applications.labelFallback },
  { value: 'profile', labelKey: pageMeta.profile.labelKey, fallback: pageMeta.profile.labelFallback },
  { value: 'navbar', labelKey: pageMeta.navbar.labelKey, fallback: pageMeta.navbar.labelFallback },
  { value: 'footer', labelKey: pageMeta.footer.labelKey, fallback: pageMeta.footer.labelFallback },
  { value: 'landing', labelKey: pageMeta.landing.labelKey, fallback: pageMeta.landing.labelFallback },
  { value: 'auth', labelKey: pageMeta.auth.labelKey, fallback: pageMeta.auth.labelFallback },
  { value: 'onboarding', labelKey: pageMeta.onboarding.labelKey, fallback: pageMeta.onboarding.labelFallback },
  { value: 'settings', labelKey: pageMeta.settings.labelKey, fallback: pageMeta.settings.labelFallback },
  { value: 'tenant', labelKey: pageMeta.tenant.labelKey, fallback: pageMeta.tenant.labelFallback },
  { value: 'legal', labelKey: pageMeta.legal.labelKey, fallback: pageMeta.legal.labelFallback },
  { value: 'saved-searches', labelKey: pageMeta['saved-searches'].labelKey, fallback: pageMeta['saved-searches'].labelFallback },
  { value: 'admin', labelKey: pageMeta.admin.labelKey, fallback: pageMeta.admin.labelFallback },
  { value: 'shared', labelKey: pageMeta.shared.labelKey, fallback: pageMeta.shared.labelFallback },
]

const prefixMeta = {
  nav: { persona: 'shared', page: 'navbar' },
  navbar: { persona: 'shared', page: 'navbar' },
  landing: { persona: 'candidate', page: 'landing' },
  hero: { persona: 'candidate', page: 'landing' },
  auth: { persona: 'shared', page: 'auth' },
  onboarding: { persona: 'employer', page: 'onboarding' },
  language: { persona: 'shared', page: 'shared' },
  roles: { persona: 'shared', page: 'shared' },
  jobs: { persona: 'candidate', page: 'jobs' },
  jobDetail: { persona: 'candidate', page: 'jobs' },
  profile: { persona: 'candidate', page: 'profile' },
  applications: { persona: 'candidate', page: 'applications' },
  employerApplications: { persona: 'employer', page: 'applications' },
  tenant: { persona: 'employer', page: 'tenant' },
  settings: { persona: 'candidate', page: 'settings' },
  legal: { persona: 'shared', page: 'legal' },
  savedSearches: { persona: 'candidate', page: 'saved-searches' },
  messages: { persona: 'candidate', page: 'applications' },
  admin: { persona: 'admin', page: 'admin' },
  dashboard: { persona: 'candidate', page: 'dashboard' },
  footer: { persona: 'shared', page: 'footer' },
}

export const resolveKeyMeta = (translationKey) => {
  if (!translationKey) {
    return { persona: 'shared', page: 'shared', prefix: 'shared' }
  }
  const prefix = translationKey.split('.')[0]
  const meta = prefixMeta[prefix] || { persona: 'shared', page: 'shared' }
  return { ...meta, prefix }
}
