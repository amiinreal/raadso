import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import AcceptTenantInvitation from './pages/AcceptTenantInvitation.jsx'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { EmployerDashboard } from './pages/EmployerDashboard'
import { AdminDashboardNew } from './pages/AdminDashboardNew'
import { TenantsManagementNew } from './pages/TenantsManagementNew'
import { UsersDirectoryNew } from './pages/UsersDirectoryNew'
import { EmployersManagementNew } from './pages/EmployersManagementNew'
import { CandidatesManagementNew } from './pages/CandidatesManagementNew'
import { TranslationPortalNew } from './pages/TranslationPortalNew'
import { AutomationSettingsNew } from './pages/AutomationSettingsNew'
import { AdminLogin } from './pages/AdminLogin'
import { Jobs } from './pages/Jobs'
import { ApplyJob } from './pages/ApplyJob'
import { Profile } from './pages/Profile'
import { CandidateApplicationsPage } from './pages/CandidateApplicationsPage'
import { JobSelectionList } from './pages/JobSelectionList'
import { ApplicantReviewDashboard } from './pages/ApplicantReviewDashboard'
import { EmployerApplications } from './pages/EmployerApplications'
import { Auth } from './pages/Auth'
import { ProfileEdit } from './pages/ProfileEdit'
import { JobForm } from './pages/JobForm'
import { Companies } from './pages/Companies'
import { CompanyProfile } from './pages/CompanyProfile'
import { CompanyEdit } from './pages/CompanyEdit'
import { TwoFASetup } from './pages/TwoFASetup'
import { TwoFAVerify } from './pages/TwoFAVerify'
import { PlatformLegal } from './pages/PlatformLegal'
import { SiteNotice } from './components/SiteNotice'
import { TermsAgreementModal } from './components/TermsAgreementModal'
import { TenantMembers } from './pages/TenantMembers'
import { Settings } from './pages/Settings'
import { SavedSearch } from './pages/SavedSearch'
import { api } from './api/api'
import InvitedUserOnboard from './pages/InvitedUserOnboard'
import TenantPermissions from './pages/TenantPermissions'
import { useTranslation } from './i18n/TranslationProvider'
import { ServerDownPage } from './components/ServerDownPage'
import { useServerStatus } from './hooks/useServerStatus'
import { ServerDownBanner } from './components/ServerDownBanner'

const SESSION_DURATION = 30 * 60 * 1000
const WARNING_BEFORE_EXPIRY = 5 * 60 * 1000
const INACTIVITY_THRESHOLD = 5 * 60 * 1000

// Helper to check if Remember Me is enabled
const isRememberMe = () => localStorage.getItem('job-platform-remember-me') === '1'

const demoJobs = [
  {
    id: 'demo-job-1',
    title: 'Full Stack Engineer',
    location: 'Remote',
    employment_type: 'Full-time',
    workplace_type: 'Remote',
    seniority_level: 'Mid-Level',
    about_role: 'Join the RAADI team to build the future of hiring.',
    about_company: 'RAADI is modernizing hiring experiences.',
    key_responsibilities: ['Ship product features', 'Collaborate with product and design'],
    required_skills: ['JavaScript', 'React', 'Node.js'],
    preferred_skills: ['Tailwind CSS', 'PostgreSQL'],
    tags: ['Engineering', 'Full Stack'],
    company_name: 'RAADI',
    ad_number: 'RD-ENG-001',
    active: true
  }
]

const demoCandidate = {
  id: 'demo-candidate-1',
  name: 'Demo Candidate',
  email: 'demo@candidate.com',
  profile: {
    headline: 'Experienced engineer exploring new roles',
    experience: [],
    education: [],
    skills: ['JavaScript', 'React'],
    location: 'Remote'
  }
}

const EditJobWrapper = ({ tenant, selectedJob, jobs, token, user, onLoadJobs, onNavigate }) => {
  // Call all hooks at the top level before any conditional returns
  const { id } = useParams()
  const { buildPath } = useTranslation()
  const job = selectedJob || jobs?.find(j => String(j.id) === id || j.ad_number === id)

  useEffect(() => {
    if (!job && onLoadJobs) {
      onLoadJobs()
    }
  }, [job, onLoadJobs])

  // Only render content if job exists
  if (!job) return null

  return (
    <JobForm
      tenant={tenant}
      currentUser={user}
      initialJob={job}
      onSubmit={async (form) => {
        await api.updateJob(job.id, form, token)
        if (onLoadJobs && user) {
          await onLoadJobs()
        }
        if (onNavigate) onNavigate(buildPath('jobs'))
      }}
      onCancel={() => onNavigate ? onNavigate(buildPath('jobs')) : null}
      saving={false}
    />
  )
}

const AppContent = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const fetchCache = useRef(new Map())
  const { locale, buildPath, supportedLocales } = useTranslation()
  const { status: serverStatus, isDown } = useServerStatus()

  // Show server down page if server is offline or in maintenance mode
  if (isDown && serverStatus?.maintenanceMode) {
    return <ServerDownPage />
  }

  const pathSegments = location.pathname.split('/').filter(Boolean)
  const pathWithoutLocale = pathSegments.length && supportedLocales.includes(pathSegments[0])
    ? `/${pathSegments.slice(1).join('/')}`
    : location.pathname
  const normalizedPath = pathWithoutLocale || '/'
  const localizedLocation = useMemo(() => ({
    ...location,
    pathname: normalizedPath,
  }), [location, normalizedPath])

  // Get admin route path from environment (default to 'portal-secret123')
  // MUST be defined before deriveTabFromPath uses it
  // Get admin route path from environment (default to 'portal-secret123')
  // MUST be defined before deriveTabFromPath uses it
  const adminRoutePath = import.meta.env.VITE_ADMIN_ROUTE_PATH || 'portal-secret123'
  const adminRouteSlug = `admin-${adminRoutePath}`
  const adminRouteWithSlash = `/${adminRouteSlug}`

  const [token, setToken] = useState(localStorage.getItem('job-platform-token'))
  const [user, setUser] = useState(null)
  const [candidateId, setCandidateId] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [applications, setApplications] = useState([])
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [adminAuthLoading, setAdminAuthLoading] = useState(false)
  const [adminAuthError, setAdminAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tenant, setTenant] = useState(null)
  const [tenants, setTenants] = useState([])
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null)
  const [searchParams, setSearchParams] = useState({ search: '', location: '' })
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  // Derive initial tab from current path to avoid redirecting on reload
  const deriveTabFromPath = useCallback((path) => {
    if (path.startsWith('/jobs')) return 'jobs'
    if (path.startsWith('/companies') && path !== '/companies') return 'company-profile'
    if (path === '/companies') return 'companies'
    if (path === '/profile') return 'profile'
    if (path.startsWith('/applications')) return 'applications'
    if (path === '/create-job') return 'create-job'
    if (path === adminRouteWithSlash || path.startsWith(`${adminRouteWithSlash}/`)) return 'admin'
    if (path === '/settings') return 'settings'
    if (path === '/login' || path === '/register') return 'auth'
    if (path.startsWith('/apply')) return 'apply'
    if (path.startsWith('/saved-search')) return 'saved-search'
    if (path.startsWith('/tenant-members') || (path.startsWith('/tenants/') && path.includes('/permissions')))
      return 'team-members'
    return 'dashboard'
  }, [adminRouteWithSlash])
  const [activeTab, setActiveTab] = useState(() => deriveTabFromPath(normalizedPath))
  const [termsVersion, setTermsVersion] = useState('1.0.0')

  // Load current terms version
  useEffect(() => {
    api.getTermsVersion()
      .then(res => setTermsVersion(res.version))
      .catch(err => console.error('Failed to load terms version', err))
  }, [])
  const [savingProfile, setSavingProfile] = useState(false)
  const [showSessionWarning, setShowSessionWarning] = useState(false)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [authMode, setAuthMode] = useState('login')
  const [pending2FAUserId, setPending2FAUserId] = useState(() => localStorage.getItem('pending-2fa-user-id'))
  // Role switching state, persisted across reloads
  const [activeRole, setActiveRole] = useState(null)
  const fetchUserPreferences = useCallback(async () => {
    if (!token) return null
    try {
      return await api.getUserPreferences(token)
    } catch (err) {
      console.warn('Failed to load user preferences', err)
      return null
    }
  }, [token])

  const persistUserPreferences = useCallback(async (payload = {}) => {
    if (!token) return
    if (!payload || !Object.keys(payload).length) return
    try {
      await api.updateUserPreferences(payload, token)
    } catch (err) {
      console.warn('Failed to persist user preferences', err)
    }
  }, [token])

  const isAdminRoute = normalizedPath === adminRouteWithSlash || normalizedPath.startsWith(`${adminRouteWithSlash}/`)

  // Check for expired session redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('expired') === 'true') {
      setAuthError('Your session has expired or been revoked. Please login again.')
      // Clean up URL
      navigate(location.pathname, { replace: true })
    }

    // Sync search params from URL (for landing/jobs deep links)
    const search = params.get('search') || ''
    const loc = params.get('location') || ''
    setSearchParams({ search, location: loc })
  }, [location.search])

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (token && (normalizedPath === '/login' || normalizedPath === '/register')) {
      navigate(buildPath(''), { replace: true })
    }
  }, [token, normalizedPath, buildPath, navigate])

  const persistAuth = async (res) => {
    setToken(res.token)
    setUser(res.user)
    if (res.user?.last_active_role) {
      setActiveRole(res.user.last_active_role)
    }
    setCandidateId(res.candidateId || null)
    localStorage.setItem('job-platform-token', res.token)
    localStorage.setItem('job-platform-login-time', Date.now().toString())
    if (typeof res.rememberMe !== 'undefined') {
      localStorage.setItem('job-platform-remember-me', res.rememberMe ? '1' : '0')
    }
    setLastActivity(Date.now())
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setCandidateId(null)
    setTenant(null)
    // Clear all 2FA and session state
    localStorage.removeItem('job-platform-token')
    localStorage.removeItem('job-platform-login-time')
    localStorage.removeItem('job-platform-remember-me')
    localStorage.removeItem('pending-2fa-user-id')
    localStorage.removeItem('pending-2fa-redirect')
    localStorage.removeItem('pending-remember-me')
    setActiveRole(null)
  }

  const extendSession = () => setLastActivity(Date.now())



  const loadJobs = async ({ role, token: authToken, tenantId } = {}) => {
    try {
      if (role) {
        setJobs([])
        setSelectedJob(null)
      }
      const effectiveRole = role || user?.role
      const queryParams = {}
      let tokenToUse = undefined

      if (effectiveRole === 'employer') {
        const resolvedTenantId = tenantId || activeRole?.tenantId || tenant?.id || user?.tenant_id
        if (!resolvedTenantId) {
          console.warn('No tenant context available for employer job load')
          setJobs([])
          setSelectedJob(null)
          return
        }
        queryParams.tenantId = resolvedTenantId
        tokenToUse = authToken || token || localStorage.getItem('job-platform-token')
      }

      const data = await api.getJobs(queryParams, tokenToUse)
      setJobs(data)
      setSelectedJob((prev) => {
        if (!prev) return data[0] || null
        return data.find((job) => job.id === prev.id) || data[0] || null
      })
    } catch (err) {
      console.warn('Failed to load jobs:', err)
      // Don't show demo jobs - show server error instead
      setJobs([])
      setSelectedJob(null)
    }
  }

  // Memoize the callback to prevent infinite loops in EditJobWrapper's useEffect
  const onLoadJobsCallback = useCallback(
    () => loadJobs({ role: user?.role, token, tenantId: tenant?.id || activeRole?.tenantId }),
    [user?.role, token, tenant?.id, activeRole?.tenantId]
  )

  const loadCandidate = async (id) => {
    try {
      const detail = await api.getCandidate(id)
      setCandidate(detail)
    } catch (err) {
      console.warn('Failed to load candidate, using demo', err)
      setCandidate(demoCandidate)
    }
  }

  const loadPublicCandidate = async () => {
    try {
      const candidates = await api.getCandidates()
      if (candidates.length) {
        const primary = candidates[0]
        await loadCandidate(primary.id)
        await loadApplications({ id: primary.id, authToken: token, scope: 'candidate' })
      } else {
        setCandidate(demoCandidate)
      }
    } catch (err) {
      console.warn('Falling back to demo candidate', err)
      setCandidate(demoCandidate)
      setApplications([])
    }
  }

  const loadApplications = async ({ id, tenantId, authToken, scope } = {}) => {
    try {
      const effectiveToken = typeof authToken !== 'undefined'
        ? authToken
        : (token || localStorage.getItem('job-platform-token'))

      if (!effectiveToken) {
        setApplications([])
        return
      }

      let data = []
      if (scope === 'employer') {
        const resolvedTenantId = tenantId || activeRole?.tenantId || tenant?.id || user?.tenant_id
        if (!resolvedTenantId) {
          console.warn('Missing tenant context for employer applications')
          setApplications([])
          return
        }
        data = await api.getApplications({ tenantId: resolvedTenantId }, effectiveToken)
      } else {
        const candidateIdToUse = id || candidateId
        if (!candidateIdToUse) {
          setApplications([])
          return
        }
        data = await api.getApplications(candidateIdToUse, effectiveToken)
      }
      setApplications(data)
    } catch (err) {
      console.warn('Falling back to empty applications', err)
      setApplications([])
    }
  }

  const loadEmployerTenant = async (userId, authToken, preferredTenantId) => {
    try {
      const list = await api.getTenants({ userId }, authToken)
      if (!list.length) {
        setTenant(null)
        return null
      }

      const activeTenantId = activeRole?.type === 'employer' ? activeRole?.tenantId : null
      let selected = null

      if (preferredTenantId) {
        selected = list.find(t => t.id === preferredTenantId) || null
      }
      if (!selected && activeTenantId) {
        selected = list.find(t => t.id === activeTenantId) || null
      }
      if (!selected) {
        selected = list[0]
      }

      setTenant(selected)
      setUser(prev => (prev ? { ...prev, tenant_id: selected?.id || prev.tenant_id } : prev))

      if (selected && user?.role === 'employer' && activeRole?.type !== 'candidate') {
        const alreadyMatching = activeRole?.type === 'employer' && activeRole?.tenantId === selected.id
        if (!alreadyMatching) {
          const nextRole = { type: 'employer', tenantId: selected.id, role: 'employer' }
          setActiveRole(nextRole)
          persistUserPreferences({ activeRole: nextRole })
        }
      }

      return selected
    } catch (err) {
      console.warn('Failed to load tenant', err)
      setTenant(null)
      return null
    }
  }

  const loadAllTenants = async (authToken) => {
    try {
      const list = await api.getTenants({}, authToken)
      setTenants(list)
    } catch (err) {
      console.warn('Failed to load tenants', err)
      setTenants([])
    }
  }

  const fetchAuthedUser = async () => {
    if (!token) return
    const cacheKey = 'fetchAuthedUser'
    if (fetchCache.current.has(cacheKey)) {
      return await fetchCache.current.get(cacheKey)
    }
    try {
      const promise = api.me(token)
      fetchCache.current.set(cacheKey, promise)
      const me = await promise
      setUser(me.user)
      setCandidateId(me.candidateId || null)
      if (me.candidateId) {
        await loadCandidate(me.candidateId)
        await loadApplications({ id: me.candidateId, authToken: token, scope: 'candidate' })
      }
      setTimeout(() => fetchCache.current.delete(cacheKey), 2000)
      return { user: me.user, candidateId: me.candidateId }
    } catch (err) {
      console.error('Failed to fetch authed user', err)
      fetchCache.current.delete(cacheKey)
      // Token is invalid or expired - clear it so user sees landing page
      localStorage.removeItem('job-platform-token')
      setToken(null)
      setUser(null)
      setCandidateId(null)
      setAuthError('')
      return null
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true)
      if (token) {
        const authed = await fetchAuthedUser()
        const prefs = await fetchUserPreferences()
        let resolvedActiveRole = activeRole

        // Priority: 1. State (activeRole), 2. User DB Column (last_active_role), 3. User Preferences Table
        if (!resolvedActiveRole) {
          if (authed?.user?.last_active_role) {
            resolvedActiveRole = authed.user.last_active_role
            setActiveRole(resolvedActiveRole)
          } else if (prefs?.activeRole) {
            resolvedActiveRole = prefs.activeRole
            setActiveRole(prefs.activeRole)
          }
        }

        const hasQueryParams = !!location.search
        if (!hasQueryParams && !searchParams.search && !searchParams.location && (prefs?.lastJobsSearch || prefs?.lastJobsLocation)) {
          setSearchParams({
            search: prefs.lastJobsSearch || '',
            location: prefs.lastJobsLocation || '',
          })
        }

        const desiredRole = resolvedActiveRole?.type || authed?.user?.role
        const preferredTenantId = resolvedActiveRole?.tenantId
        let employerTenant = null

        if (desiredRole === 'employer') {
          employerTenant = await loadEmployerTenant(authed?.user?.id, token, preferredTenantId)
          if (employerTenant?.id) {
            await loadApplications({ tenantId: employerTenant.id, authToken: token, scope: 'employer' })
          }
        } else if (authed?.user?.role === 'employer') {
          employerTenant = await loadEmployerTenant(authed.user.id, token)
          if (employerTenant?.id) {
            await loadApplications({ tenantId: employerTenant.id, authToken: token, scope: 'employer' })
          }
        }

        await loadJobs({
          role: desiredRole || authed?.user?.role,
          token,
          tenantId: employerTenant?.id || preferredTenantId,
        })

        if (!employerTenant && desiredRole !== 'employer' && authed?.user?.role !== 'employer' && authed?.candidateId) {
          await loadApplications({ id: authed.candidateId, authToken: token, scope: 'candidate' })
        }

        if (desiredRole === 'admin' || authed?.user?.role === 'admin') {
          await loadAllTenants(token)
        }
      } else {
        await loadJobs()
        await loadPublicCandidate()
      }
      setLoading(false)
    }
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Apply persisted active role once user + token are available
  useEffect(() => {
    if (!user || !token) return
    const applyRole = async () => {
      let roleToUse = activeRole
      if (!roleToUse) {
        // Default to backend role if nothing persisted yet
        roleToUse = {
          type: user.role,
          tenantId: user.tenant_id,
          role: user.role,
        }
        setActiveRole(roleToUse)
        persistUserPreferences({ activeRole: roleToUse })
      }

      if (roleToUse.type === 'employer' && roleToUse.tenantId) {
        try {
          // Fetch full tenant details (including status, members, etc.)
          console.log('Fetching full tenant with token:', { roleToUse, tenantId: roleToUse.tenantId, hasToken: !!token })
          const fullTenant = await api.getTenant(roleToUse.tenantId, token)
          console.log('Got full tenant:', { id: fullTenant.id, membersCount: fullTenant.members?.length, members: fullTenant.members })
          setTenant(fullTenant)
        } catch (err) {
          console.error('Failed to load tenant for active role', err)
        }
      } else if (roleToUse.type === 'candidate') {
        // Candidate context should not keep a tenant selected
        setTenant(null)
      }
    }
    applyRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token])

  // Track activity to reset session timer
  // Use useCallback to ensure the function reference is stable but updates when token changes
  const trackActivity = useCallback(() => {
    if (token) {
      setLastActivity(Date.now())
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    // Use a throttled wrapper or just the raw function? 
    // Raw function is fine for now, React state updates are batched/efficient enough.
    // Ensure we remove the specific listener we added
    events.forEach(event => window.addEventListener(event, trackActivity))
    return () => events.forEach(event => window.removeEventListener(event, trackActivity))
  }, [token, trackActivity]) // Depending on trackActivity ensures listeners update if function changes

  useEffect(() => {
    if (!token) return

    // If Remember Me is enabled, we don't enforce the short session timer
    if (isRememberMe()) {
      setSessionTimeRemaining(null)
      if (showSessionWarning) setShowSessionWarning(false)
      return
    }

    // Interval to check session expiry
    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLast = now - lastActivity
      const timeLeft = SESSION_DURATION - timeSinceLast

      setSessionTimeRemaining(Math.max(0, Math.floor(timeLeft / 1000)))

      if (timeLeft <= WARNING_BEFORE_EXPIRY && timeLeft > 0) {
        setShowSessionWarning(true)
      } else if (timeLeft <= 0) {
        setShowSessionWarning(false)
        logout()
        setAuthError('Your session has expired due to inactivity. Please login again.')
      } else {
        // If active and plenty of time left, ensure warning is hidden
        if (showSessionWarning) setShowSessionWarning(false)

        // OPTIONAL: Active Session Sliding
        // If the user is active (timeSinceLast < 1 min) but we are 
        // approaching a backend token expiry (not tracked here yet), we could refresh.
        // For now, determining backend expiry requires decoding the token.
        // Let's assume the 30m frontend timer is the primary concern for "Session Expired".
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [token, lastActivity, showSessionWarning])

  // Sync activeTab from URL on every pathname change. This is read-only; 
  // the URL is the source of truth, not the tab state.
  useEffect(() => {
    const path = normalizedPath
    let newTab = 'dashboard'
    if (path.startsWith('/jobs')) newTab = 'jobs'
    else if (path.startsWith('/companies') && path !== '/companies') newTab = 'company-profile'
    else if (path === '/companies') newTab = 'companies'
    else if (path === '/profile') newTab = 'profile'
    else if (path.startsWith('/applications')) newTab = 'applications'
    else if (path === '/create-job') newTab = 'create-job'
    else if (path === adminRouteWithSlash || path.startsWith(`${adminRouteWithSlash}/`)) newTab = 'admin'
    else if (path === '/settings') newTab = 'settings'
    else if (path.startsWith('/saved-search')) newTab = 'saved-search'
    else if (path === '/login' || path === '/register') newTab = 'auth'
    else if (path.startsWith('/apply')) newTab = 'apply'
    else if (path === '/') newTab = 'dashboard'
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
    if (path.startsWith('/companies/')) {
      const id = path.split('/')[2]
      if (id && id !== selectedCompanyId) setSelectedCompanyId(id)
    }
  }, [normalizedPath, activeTab, adminRouteWithSlash, selectedCompanyId])

  useEffect(() => {
    if (activeTab === 'jobs' && selectedJob) {
      setTimeout(() => {
        const jobElement = document.getElementById(`job-${selectedJob.id}`)
        if (jobElement) jobElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 0)
    }
  }, [activeTab, selectedJob])

  const handleSelectJob = (job) => {
    setSelectedJob(job)
    navigate(buildPath('jobs'))
  }

  const handleEditJob = (job) => {
    setSelectedJob(job)
    navigate(buildPath(`edit-job/${job.id}`))
  }

  const handleTogglePublish = async (job) => {
    try {
      await api.toggleJobPublish(job.id, !job.active, token)
      await loadJobs({ role: user.role, token, tenantId: tenant?.id || activeRole?.tenantId })
      alert(job.active ? 'Job unpublished successfully' : 'Job published successfully')
    } catch (err) {
      console.error('Failed to toggle job status', err)
      alert('Failed to update job status')
    }
  }

  const handleCreateJob = async (form) => {
    setSubmitting(true)
    try {
      await api.createJob(form, token)
      await loadJobs({ role: user.role, token, tenantId: tenant?.id || activeRole?.tenantId })
      navigate(buildPath('jobs'))
    } catch (err) {
      console.error('Failed to create job', err)
      alert('Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApply = async (payload) => {
    if (!token && payload.candidateId?.startsWith('demo')) {
      alert('Login and complete your profile before applying.')
      navigate(buildPath('login'))
      return
    }
    setSubmitting(true)
    try {
      await api.submitApplication(payload, token)
      await loadApplications({ id: payload.candidateId, authToken: token, scope: 'candidate' })
      setActiveTab('dashboard')
    } catch (err) {
      console.error('Failed to submit application', err)
      alert('Application failed to submit. Check API server and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePickJobForApply = (job) => {
    setSelectedJob(job)
  }

  const handleLogin = async (creds) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      // Always use async getDeviceId
      const { getDeviceId } = await import('./utils/device')
      const deviceId = await getDeviceId()
      const res = await api.login({ ...creds, deviceId })
      // 2FA required
      if (res.requires2FA) {
        localStorage.setItem('pending-2fa-user-id', res.userId)
        if (typeof res.rememberMe !== 'undefined') {
          localStorage.setItem('pending-remember-me', res.rememberMe ? '1' : '0')
        } else {
          localStorage.removeItem('pending-remember-me')
        }
        if (redirectAfterLogin) {
          localStorage.setItem('pending-2fa-redirect', redirectAfterLogin)
        }
        setPending2FAUserId(res.userId)
        setAuthLoading(false)
        navigate(`/2fa/verify?userId=${res.userId}`)
        return
      }
      // Admin login must use admin route
      if (res.user && res.user.role === 'admin') {
        setAuthError(`Admin users must login at ${buildPath(adminRouteSlug)}`)
        setAuthLoading(false)
        return
      }
      // Persist auth info
      await persistAuth(res)
      localStorage.removeItem('pending-remember-me')
      if (redirectAfterLogin) {
        navigate(redirectAfterLogin, { replace: true })
        setRedirectAfterLogin(null)
      } else {
        setActiveTab('dashboard')
      }
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleAdminLogin = async (creds) => {
    setAdminAuthLoading(true)
    setAdminAuthError('')
    try {
      const res = await api.login(creds)
      if (res.requires2FA) {
        localStorage.setItem('pending-2fa-user-id', res.userId)
        // Store the intended redirect for post-2FA navigation
        localStorage.setItem('pending-2fa-redirect', '/admin/dashboard')
        setPending2FAUserId(res.userId)
        setAdminAuthLoading(false)
        navigate(`/2fa/verify?userId=${res.userId}`)
        return
      }
      if (res.user.role !== 'admin') {
        setAdminAuthError('Access denied. Admin credentials required.')
        setAdminAuthLoading(false)
        return
      }
      await persistAuth(res)
      setActiveTab('dashboard')
    } catch (err) {
      setAdminAuthError(err.message || 'Login failed')
    } finally {
      setAdminAuthLoading(false)
    }
  }

  const handleRegister = async (payload) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await api.register(payload)
      await persistAuth(res)
      setActiveTab(payload.role === 'candidate' ? 'profile' : 'dashboard')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleProfileSave = async (updates) => {
    if (!candidateId && !candidate?.profile?.id) {
      alert('Login and create a profile first')
      return
    }
    const idToUpdate = candidateId || candidate.profile.id
    setSavingProfile(true)
    try {
      const updated = await api.updateCandidate(idToUpdate, updates, token)
      setCandidate((prev) => ({ ...prev, profile: updated.profile }))
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`)
    } finally {
      setSavingProfile(false)
    }
  }

  const candidateProfile = candidate?.profile

  // Derive effective role context from activeRole (if set) and backend user
  const effectiveRole = activeRole?.type || user?.role
  const effectiveTenantId = activeRole?.type === 'employer' && activeRole?.tenantId
    ? activeRole.tenantId
    : user?.tenant_id
  const effectiveUser = user
    ? { ...user, role: effectiveRole, tenant_id: effectiveTenantId }
    : null

  const handleRoleSwitch = async (selected) => {
    setActiveRole(selected)
    persistUserPreferences({ activeRole: selected })

    // Persist to users table for cross-device memory
    if (token) {
      try {
        await api.updateLastActiveRole(selected, token)
      } catch (e) {
        console.warn('Failed to sync active role to user profile', e)
      }
    }

    try {
      if (selected.type === 'candidate') {
        setUser((u) => (u ? { ...u, role: 'candidate', tenant_id: undefined } : u))
        setTenant(null)
        await loadJobs({ role: 'candidate' })
        const candidateToLoad = selected.candidateId || candidateId
        if (candidateToLoad) {
          await loadApplications({ id: candidateToLoad, authToken: token, scope: 'candidate' })
        }
      } else if (selected.type === 'employer') {
        const currentUserId = user?.id || selected.userId
        setUser((u) => (u ? { ...u, role: 'employer', tenant_id: selected.tenantId || u.tenant_id } : u))
        const tenantContext = currentUserId
          ? await loadEmployerTenant(currentUserId, token, selected.tenantId)
          : await loadEmployerTenant(selected.userId, token, selected.tenantId)
        const tenantIdForJobs = tenantContext?.id || selected.tenantId || tenant?.id || user?.tenant_id
        if (tenantIdForJobs) {
          await loadJobs({ role: 'employer', token, tenantId: tenantIdForJobs })
          await loadApplications({ tenantId: tenantIdForJobs, authToken: token, scope: 'employer' })
        } else {
          setJobs([])
          setApplications([])
        }
      } else if (selected.type === 'admin') {
        setUser((u) => (u ? { ...u, role: 'admin', tenant_id: undefined } : u))
        setTenant(null)
        await loadJobs({ role: 'admin', token })
      }
    } catch (err) {
      console.error('Role switch handling failed', err)
    }
  }

  // If pending 2FA verification, show verify form ONLY if not already authenticated and only if pending2FAUserId is set
  if (pending2FAUserId && !token) {
    // If user logs out or clears state, do not show 2FA verify page
    if (!localStorage.getItem('pending-2fa-user-id')) {
      // Defensive: clear any stray state
      setPending2FAUserId(null)
      return (
        <Navigate to={buildPath('login')} replace />
      )
    }
    return (
      <div className="app-shell">
        <Navbar activeTab="auth" onChange={(tab) => {
          if (tab !== 'auth') {
            const routeMap = {
              'jobs': 'jobs',
              'companies': 'companies',
              'dashboard': ''
            }
            if (routeMap[tab] !== undefined) navigate(buildPath(routeMap[tab]))
          }
        }} user={user} onLogout={() => {
          setPending2FAUserId(null)
          localStorage.removeItem('pending-2fa-user-id')
          localStorage.removeItem('pending-2fa-redirect')
          logout()
          navigate(buildPath('login'))
        }} onAuth={() => navigate(buildPath('login'))} isAuthenticated={false} />
        <div className="app-content">
          <TwoFAVerify onSuccess={() => {
            setPending2FAUserId(null)
            localStorage.removeItem('pending-2fa-user-id')
            localStorage.removeItem('pending-2fa-redirect')
            navigate(buildPath(''), { replace: true })
          }} />
        </div>
        <Footer />
      </div>
    )
  }

  // Admin Auth Guards
  if (isAdminRoute) {
    if (!token || !user) {
      return <AdminLogin onLogin={handleAdminLogin} loading={adminAuthLoading} error={adminAuthError} />
    }
    if (user.role !== 'admin') {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
          <div className="bg-white rounded-2xl border border-red-200 shadow-xl p-8 max-w-md w-full text-center">
            <div className="size-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl font-bold">lock</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Access Denied</h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              This area is restricted to system administrators.
            </p>
            <button
              onClick={() => navigate(buildPath(''))}
              className="w-full bg-[#1337ec] text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Return to Platform
            </button>
          </div>
        </div>
      )
    }
  }

  const isEmployer = effectiveUser?.role === 'employer'
  const isCandidate = effectiveUser?.role === 'candidate'
  const canViewSavedSearch = isCandidate || (effectiveUser == null && !!token)

  const renderApplicationsElement = () => (
    isCandidate
      ? <CandidateApplicationsPage />
      : isEmployer
        ? <EmployerApplications token={token} user={effectiveUser} jobs={jobs} />
        : <JobSelectionList />
  )

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {!isAdminRoute && (
        <Navbar
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab)
            const routeMap = {
              'dashboard': '',
              'jobs': 'jobs',
              'companies': 'companies',
              'profile': 'profile',
              'applications': 'applications',
              'create-job': 'create-job',
              'admin': adminRouteSlug,
              'settings': 'settings',
              'saved-search': 'saved-search',
              'team-members': 'tenant-members'
            }
            if (routeMap[tab] !== undefined) navigate(buildPath(routeMap[tab]))
          }}
          user={effectiveUser}
          onLogout={logout}
          onAuth={() => navigate(buildPath('login'))}
          isAuthenticated={!!token}
          token={token}
          currentRole={activeRole || (effectiveUser && { type: effectiveUser.role, tenantId: effectiveUser.tenant_id, role: effectiveUser.role })}
          onRoleSwitch={handleRoleSwitch}
        />
      )}

      <div className={`flex-1 flex flex-col ${isAdminRoute ? 'overflow-hidden h-screen' : 'app-content'}`}>
        {loading && !isAdminRoute && <div className="grid-card">Loading data...</div>}
        <Routes location={localizedLocation}>
          <Route path="/2fa/verify" element={<TwoFAVerify />} />
          <Route path="/invited-user-onboard" element={<InvitedUserOnboard />} />

          <Route path="/" element={
            !token ? (
              <Landing
                jobs={jobs}
                onLogin={() => navigate(buildPath('login'))}
                onSearch={({ search, location }) => {
                  setSearchParams({ search, location })
                  const params = new URLSearchParams()
                  if (search) params.set('search', search)
                  if (location) params.set('location', location)
                  navigate(`/jobs${params.toString() ? `?${params.toString()}` : ''}`)
                }}
              />
            ) : isCandidate ? (
              <Dashboard jobs={jobs} applications={applications} candidate={candidate} token={token} onSelectJob={handleSelectJob} />
            ) : isEmployer ? (
              <EmployerDashboard
                jobs={jobs}
                token={token}
                tenant={tenant}
                onSelectJob={handleSelectJob}
                onCreateJob={() => navigate(buildPath('create-job'))}
                onEditJob={handleEditJob}
                onTogglePublish={handleTogglePublish}
                currentUser={effectiveUser}
                onSaveTenant={async (form) => {
                  setSavingProfile(true)
                  try {
                    if (tenant?.id) {
                      await api.updateTenant(tenant.id, form, token)
                    } else {
                      await api.createTenant(form, token)
                    }
                    await loadEmployerTenant(user.id, token, tenant?.id || activeRole?.tenantId)
                  } catch (err) {
                    console.error('Failed to save tenant', err)
                    alert('Failed to save tenant')
                  } finally {
                    setSavingProfile(false)
                  }
                }}
                savingTenant={savingProfile}
              />
            ) : <Navigate to={buildPath(adminRouteSlug)} replace />
          } />

          {/* Auth Routes */}
          <Route path="/login" element={
            <Auth mode="login" onToggleMode={() => navigate(buildPath('register'))} onLogin={handleLogin} onRegister={handleRegister} loading={authLoading} error={authError} />
          } />
          <Route path="/register" element={
            <Auth mode="register" onToggleMode={() => navigate(buildPath('login'))} onLogin={handleLogin} onRegister={handleRegister} loading={authLoading} error={authError} />
          } />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public/Candidate Routes */}
          <Route path="/jobs" element={
            <Jobs
              jobs={jobs}
              selectedJobId={selectedJob?.id}
              candidateId={candidateId}
              token={token}
              onSelectJob={handleSelectJob}
              onApply={(jobId) => {
                if (!token) {
                  setRedirectAfterLogin(`/apply/${jobId}`)
                  navigate(buildPath('login'))
                } else {
                  navigate(`/apply/${jobId}`)
                }
              }}
              initialSearch={searchParams.search}
              initialLocation={searchParams.location}
            />
          } />
          <Route path="/jobs/:jobId" element={
            <Jobs
              jobs={jobs}
              selectedJobId={null}
              candidateId={candidateId}
              token={token}
              onSelectJob={handleSelectJob}
              onApply={(jobId) => {
                if (!token) {
                  setRedirectAfterLogin(`/apply/${jobId}`)
                  navigate(buildPath('login'))
                } else {
                  navigate(`/apply/${jobId}`)
                }
              }}
            />
          } />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:slug" element={<CompanyProfile />} />
          <Route path="/apply" element={<ApplyJob token={token} candidateId={candidateId} candidate={candidate} user={user} tenant={tenant} />} />
          <Route path="/apply/:jobId" element={<ApplyJob token={token} candidateId={candidateId} candidate={candidate} user={user} tenant={tenant} />} />

          {/* Authenticated Candidate/Employer Private Routes */}
          <Route path="/profile" element={
            token ? (
              <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-4xl">
                  <div className="grid gap-4">
                    <Profile candidate={candidate} candidateId={candidateId} token={token} onUpdate={loadCandidate} />
                    <ProfileEdit profile={candidateProfile} onSave={handleProfileSave} saving={savingProfile} />
                  </div>
                </div>
              </div>
            ) : <Navigate to={buildPath('login')} />
          } />
          <Route path="/applications" element={token ? renderApplicationsElement() : <Navigate to={buildPath('login')} />} />
          <Route path="/applications/job/:jobId/:applicantId?" element={<ApplicantReviewDashboard />} />
          <Route path="/saved-search" element={canViewSavedSearch ? <SavedSearch candidate={candidateProfile} candidateId={candidateId} token={token} onSelectJob={handleSelectJob} /> : <Navigate to={buildPath('')} />} />
          <Route path="/create-job" element={<JobForm tenant={tenant} currentUser={effectiveUser} onSubmit={handleCreateJob} onCancel={() => navigate(buildPath(''))} saving={submitting} />} />
          <Route path="/edit-job/:id" element={<EditJobWrapper tenant={tenant} selectedJob={selectedJob} jobs={jobs} token={token} user={user} onLoadJobs={onLoadJobsCallback} onNavigate={navigate} />} />
          <Route path="/tenant-members" element={<TenantMembers tenant={tenant} token={token} />} />
          <Route path="/tenants/:id/permissions" element={<TenantPermissions />} />
          <Route path="/settings" element={<Settings token={token} user={user} tenant={tenant} />} />

          {/* Admin Routes */}
          <Route path={`/${adminRouteSlug}`} element={
            <AdminDashboardNew
              tenants={tenants}
              token={token}
              onRefresh={() => loadAllTenants(token)}
            />
          } />
          <Route path={`/${adminRouteSlug}/dashboard`} element={
            <AdminDashboardNew
              tenants={tenants}
              token={token}
              onRefresh={() => loadAllTenants(token)}
            />
          } />
          <Route path={`/${adminRouteSlug}/tenants`} element={<TenantsManagementNew token={token} />} />
          <Route path={`/${adminRouteSlug}/users`} element={<UsersDirectoryNew token={token} />} />
          <Route path={`/${adminRouteSlug}/employers`} element={<EmployersManagementNew token={token} />} />
          <Route path={`/${adminRouteSlug}/candidates`} element={<CandidatesManagementNew token={token} />} />
          <Route path={`/${adminRouteSlug}/translations`} element={<TranslationPortalNew token={token} />} />
          <Route path={`/${adminRouteSlug}/automation`} element={<AutomationSettingsNew token={token} />} />

          <Route path="/privacy-policy" element={<PlatformLegal />} />
          <Route path="*" element={<Navigate to={buildPath('')} replace />} />
        </Routes>
      </div>

      {!isAdminRoute && <Footer />}

      {/* Blocking Terms Agreement Modal */}
      {token && user && !user.agreed_to_terms && (user.terms_version_accepted !== termsVersion) && normalizedPath !== '/privacy-policy' && (
        <TermsAgreementModal
          onAgree={async () => {
            const res = await api.agreeToTerms(token)
            // Update local user state
            setUser(prev => ({
              ...prev,
              agreed_to_terms: true,
              terms_version_accepted: res.version || termsVersion
            }))
          }}
        />
      )}

      <SiteNotice />
      {showSessionWarning && token && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Session Expiring Soon
            </h3>
            <p className="text-gray-600 text-center mb-6">
              You've been inactive for a while. Your session will expire due to inactivity.
            </p>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Time remaining:</p>
                <div className="text-4xl font-bold text-yellow-700">
                  {Math.floor(sessionTimeRemaining / 60)}:{String(sessionTimeRemaining % 60).padStart(2, '0')}
                </div>
                <p className="text-xs text-gray-500 mt-1">minutes:seconds</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={extendSession}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Continue Session
              </button>
              <button
                onClick={logout}
                className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
              >
                Logout
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              Click "Continue Session" to extend your session and keep working
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const App = () => <AppContent />

export default App
