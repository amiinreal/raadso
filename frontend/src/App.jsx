import { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { EmployerDashboard } from './pages/EmployerDashboard'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminLogin } from './pages/AdminLogin'
import { Jobs } from './pages/Jobs'
import { ApplyJob } from './pages/ApplyJob'
import { Profile } from './pages/Profile'
import { CandidateApplicationsPage } from './pages/CandidateApplicationsPage'
import { JobSelectionList } from './pages/JobSelectionList'
import { ApplicantReviewDashboard } from './pages/ApplicantReviewDashboard'
import { Auth } from './pages/Auth'
import { ProfileEdit } from './pages/ProfileEdit'
import { JobForm } from './pages/JobForm'
import { Companies } from './pages/Companies'
import { CompanyProfile } from './pages/CompanyProfile'
import { CompanyEdit } from './pages/CompanyEdit'
import { TwoFASetup } from './pages/TwoFASetup'
import { TwoFAVerify } from './pages/TwoFAVerify'
import { TenantMembers } from './pages/TenantMembers'
import { Settings } from './pages/Settings'
import { SavedSearch } from './pages/SavedSearch'
import { api } from './api/api'

const SESSION_DURATION = 30 * 60 * 1000
const WARNING_BEFORE_EXPIRY = 5 * 60 * 1000
const INACTIVITY_THRESHOLD = 5 * 60 * 1000

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
  const { id } = useParams()
  const job = selectedJob || jobs?.find(j => String(j.id) === id || j.ad_number === id)

  useEffect(() => {
    if (!job && onLoadJobs) {
      onLoadJobs()
    }
  }, [job, onLoadJobs])

  if (!job) return null
  return (
    <JobForm
      tenant={tenant}
      initialJob={job}
      onSubmit={async (form) => {
        await api.updateJob(job.id, form, token)
        if (onLoadJobs && user) {
          await onLoadJobs()
        }
        if (onNavigate) onNavigate('/jobs')
      }}
      onCancel={() => onNavigate ? onNavigate('/jobs') : null}
      saving={false}
    />
  )
}

const AppContent = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const fetchCache = useRef(new Map())

  // Get admin route path from environment (default to 'portal-secret123')
  // MUST be defined before deriveTabFromPath uses it
  const adminRoutePath = import.meta.env.VITE_ADMIN_ROUTE_PATH || 'portal-secret123'
  const adminRoute = `/admin-${adminRoutePath}`

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
  const deriveTabFromPath = (path) => {
    if (path.startsWith('/jobs')) return 'jobs'
    if (path.startsWith('/companies') && path !== '/companies') return 'company-profile'
    if (path === '/companies') return 'companies'
    if (path === '/profile') return 'profile'
    if (path.startsWith('/applications')) return 'applications'
    if (path === '/create-job') return 'create-job'
    if (path === adminRoute || path.startsWith(adminRoute)) return 'admin'
    if (path === '/settings') return 'settings'
    if (path === '/login' || path === '/register') return 'auth'
    if (path.startsWith('/apply')) return 'apply'
    if (path.startsWith('/saved-search')) return 'saved-search'
    return 'dashboard'
  }
  const [activeTab, setActiveTab] = useState(deriveTabFromPath(location.pathname))
  const [savingProfile, setSavingProfile] = useState(false)
  const [showSessionWarning, setShowSessionWarning] = useState(false)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [authMode, setAuthMode] = useState('login')
  const [pending2FAUserId, setPending2FAUserId] = useState(() => localStorage.getItem('pending-2fa-user-id'))

  const isAdminRoute = location.pathname.startsWith(adminRoute)

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
    if (token && (location.pathname === '/login' || location.pathname === '/register')) {
      navigate('/', { replace: true })
    }
  }, [token, location.pathname])

  const persistAuth = async (res) => {
    setToken(res.token)
    setUser(res.user)
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
    localStorage.removeItem('job-platform-token')
    localStorage.removeItem('job-platform-login-time')
    localStorage.removeItem('job-platform-remember-me')
  }

  const extendSession = () => setLastActivity(Date.now())

  const trackActivity = () => {
    if (token) setLastActivity(Date.now())
  }

  const loadJobs = async ({ role, token: authToken } = {}) => {
    try {
      const data = await api.getJobs({}, role === 'employer' ? authToken : undefined)
      setJobs(data)
      setSelectedJob(data[0] || null)
    } catch (err) {
      console.warn('Falling back to demo jobs', err)
      setJobs(demoJobs)
      setSelectedJob(demoJobs[0])
    }
  }

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
        await loadApplications(primary.id)
      } else {
        setCandidate(demoCandidate)
      }
    } catch (err) {
      console.warn('Falling back to demo candidate', err)
      setCandidate(demoCandidate)
      setApplications([])
    }
  }

  const loadApplications = async (id) => {
    try {
      const data = await api.getApplications(id)
      setApplications(data)
    } catch (err) {
      console.warn('Falling back to empty applications', err)
      setApplications([])
    }
  }

  const loadEmployerTenant = async (userId, authToken) => {
    try {
      const list = await api.getTenants({ userId }, authToken)
      setTenant(list[0] || null)
    } catch (err) {
      console.warn('Failed to load tenant', err)
      setTenant(null)
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
        await loadApplications(me.candidateId)
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
        await loadJobs({ role: authed?.user?.role, token })
        if (authed?.user?.role === 'employer') {
          await loadEmployerTenant(authed.user.id, token)
        }
        if (authed?.user?.role === 'admin') {
          await loadAllTenants(token)
        }
      } else {
        await loadJobs()
        await loadPublicCandidate()
      }
      setLoading(false)
    }
    bootstrap()
  }, [token])

  useEffect(() => {
    if (!token) return
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => window.addEventListener(event, trackActivity))
    return () => events.forEach(event => window.removeEventListener(event, trackActivity))
  }, [token])

  useEffect(() => {
    if (!token) return
    // Session check disabled - users stay logged in indefinitely
    setSessionTimeRemaining(null)
    if (showSessionWarning) setShowSessionWarning(false)
  }, [token, showSessionWarning])

  // Sync activeTab from URL on every pathname change. This is read-only; 
  // the URL is the source of truth, not the tab state.
  useEffect(() => {
    const path = location.pathname
    let newTab = 'dashboard'
    if (path.startsWith('/jobs')) newTab = 'jobs'
    else if (path.startsWith('/companies') && path !== '/companies') newTab = 'company-profile'
    else if (path === '/companies') newTab = 'companies'
    else if (path === '/profile') newTab = 'profile'
    else if (path.startsWith('/applications')) newTab = 'applications'
    else if (path === '/create-job') newTab = 'create-job'
    else if (path === adminRoute || path.startsWith(adminRoute)) newTab = 'admin'
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
  }, [location.pathname])

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
    navigate('/jobs')
  }

  const handleEditJob = (job) => {
    setSelectedJob(job)
    navigate(`/edit-job/${job.id}`)
  }

  const handleTogglePublish = async (job) => {
    try {
      await api.toggleJobPublish(job.id, !job.active, token)
      await loadJobs({ role: user.role, token })
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
      await loadJobs({ role: user.role, token })
      navigate('/jobs')
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
      navigate('/login')
      return
    }
    setSubmitting(true)
    try {
      await api.createApplication(payload, token)
      await loadApplications(payload.candidateId)
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
      const res = await api.login(creds)
      if (res.requires2FA) {
        // Persist pending 2FA user so we can show the verify screen even if the app reloads
        localStorage.setItem('pending-2fa-user-id', res.userId)
        // Store the intended redirect so we can navigate there after 2FA verification
        if (redirectAfterLogin) {
          localStorage.setItem('pending-2fa-redirect', redirectAfterLogin)
        }
        setPending2FAUserId(res.userId)
        setAuthLoading(false)
        navigate(`/2fa/verify?userId=${res.userId}`)
        return
      }
      if (res.user.role === 'admin') {
        setAuthError(`Admin users must login at ${adminRoute}`)
        setAuthLoading(false)
        return
      }
      await persistAuth({ ...res, rememberMe: !!creds.rememberMe })
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

  // If pending 2FA verification, show verify form regardless of token state
  if (pending2FAUserId) {
    return (
      <div className="app-shell">
        <Navbar activeTab="auth" onChange={(tab) => {
          if (tab !== 'auth') {
            const routeMap = {
              'jobs': '/jobs',
              'companies': '/companies',
              'dashboard': '/'
            }
            if (routeMap[tab]) navigate(routeMap[tab])
          }
        }} user={user} onLogout={() => {
          setPending2FAUserId(null)
          localStorage.removeItem('pending-2fa-user-id')
          logout()
          navigate('/login')
        }} onAuth={() => navigate('/login')} isAuthenticated={false} />
        <div className="app-content">
          <TwoFAVerify onSuccess={() => {
            setPending2FAUserId(null)
            localStorage.removeItem('pending-2fa-user-id')
            navigate('/', { replace: true })
          }} />
        </div>
        <Footer />
      </div>
    )
  }

  if (isAdminRoute) {
    if (!token || !user) {
      return <AdminLogin onLogin={handleAdminLogin} loading={adminAuthLoading} error={adminAuthError} />
    }
    if (user.role !== 'admin') {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background-light">
          <div className="bg-white rounded-xl border border-red-200 shadow-lg p-8 max-w-md">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">You don't have permission to access the admin area.</p>
              <button
                onClick={() => {
                  window.history.back()
                  setActiveTab('dashboard')
                }}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold"
              >
                Go Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="app-shell">
        <Navbar activeTab={activeTab} onChange={setActiveTab} user={user} onLogout={logout} onAuth={() => { }} isAuthenticated={true} token={token} />
        <div className="app-content">
          {loading && <div className="grid-card">Loading data...</div>}
          {!loading && (
            <AdminDashboard
              tenants={tenants}
              token={token}
              onRefresh={() => loadAllTenants(token)}
              onSetStatus={async (id, status, rejectionReason) => {
                await api.updateTenantStatus(id, status, token, rejectionReason)
                await loadAllTenants(token)
              }}
            />
          )}
        </div>
        <Footer />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="app-shell">
        <Navbar activeTab={activeTab} onChange={(tab) => {
          setActiveTab(tab)
          const routeMap = {
            'auth': '/login',
            'jobs': '/jobs',
            'companies': '/companies',
            'dashboard': '/'
          }
          if (routeMap[tab]) navigate(routeMap[tab])
        }} user={user} onLogout={logout} onAuth={() => navigate('/login')} isAuthenticated={false} />
        <div className="app-content">
          <Routes>
            <Route path="/" element={
              <Landing
                jobs={jobs}
                onLogin={() => navigate('/login')}
                onSearch={({ search, location }) => {
                  setSearchParams({ search, location })
                  const params = new URLSearchParams()
                  if (search) params.set('search', search)
                  if (location) params.set('location', location)
                  navigate(`/jobs${params.toString() ? `?${params.toString()}` : ''}`)
                }}
              />
            } />
            <Route path="/login" element={
              <Auth
                mode="login"
                onToggleMode={() => navigate('/register')}
                onLogin={handleLogin}
                onRegister={handleRegister}
                loading={authLoading}
                error={authError}
              />
            } />
            <Route path="/register" element={
              <Auth
                mode="register"
                onToggleMode={() => navigate('/login')}
                onLogin={handleLogin}
                onRegister={handleRegister}
                loading={authLoading}
                error={authError}
              />
            } />
            <Route path="/2fa/verify" element={<TwoFAVerify />} />
            <Route path="/apply" element={<ApplyJob />} />
            <Route path="/apply/:jobId" element={<ApplyJob />} />
            <Route path="/jobs/:jobId" element={
              <Jobs
                jobs={jobs}
                selectedJobId={null}
                candidateId={candidateId}
                token={token}
                onSelectJob={handleSelectJob}
                onApply={(jobId) => {
                  const applyPath = `/apply/${jobId}`
                  setRedirectAfterLogin(applyPath)
                  navigate('/login')
                }}
                initialSearch={searchParams.search}
                initialLocation={searchParams.location}
              />
            } />
            <Route path="/jobs" element={
              <Jobs
                jobs={jobs}
                selectedJobId={selectedJob?.id}
                candidateId={candidateId}
                token={token}
                onSelectJob={handleSelectJob}
                onApply={(jobId) => {
                  const applyPath = `/apply/${jobId}`
                  setRedirectAfterLogin(applyPath)
                  navigate('/login')
                }}
                initialSearch={searchParams.search}
                initialLocation={searchParams.location}
              />
            } />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:slug" element={<CompanyProfile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    )
  }

  const isEmployer = user?.role === 'employer'
  const isCandidate = user?.role === 'candidate'
  const isAdmin = user?.role === 'admin'
  const canViewSavedSearch = isCandidate || (user == null && !!token)

  return (
    <div className="app-shell">
      <Navbar activeTab={activeTab} onChange={(tab) => {
        setActiveTab(tab)
        const routeMap = {
          'dashboard': '/',
          'jobs': '/jobs',
          'companies': '/companies',
          'profile': '/profile',
          'applications': '/applications',
          'create-job': '/create-job',
          'admin': adminRoute,
          'settings': '/settings',
          'saved-search': '/saved-search'
        }
        if (routeMap[tab]) navigate(routeMap[tab])
      }} user={user} onLogout={logout} onAuth={() => navigate('/login')} isAuthenticated={true} token={token} />
      <div className="app-content">
        {loading && <div className="grid-card">Loading data...</div>}
        {!loading && (
          <Routes>
            <Route path="/2fa/verify" element={<TwoFAVerify />} />
            <Route path="/" element={
              isCandidate ? (
                <Dashboard jobs={jobs} applications={applications} candidate={candidateProfile} token={token} onSelectJob={handleSelectJob} />
              ) : isEmployer ? (
                <EmployerDashboard
                  jobs={jobs}
                  tenant={tenant}
                  onSelectJob={handleSelectJob}
                  onCreateJob={() => navigate('/create-job')}
                  onEditJob={handleEditJob}
                  onTogglePublish={handleTogglePublish}
                  onSaveTenant={async (form) => {
                    setSavingProfile(true)
                    try {
                      if (tenant?.id) {
                        await api.updateTenant(tenant.id, form, token)
                      } else {
                        await api.createTenant(form, token)
                      }
                      await loadEmployerTenant(user.id, token)
                    } catch (err) {
                      console.error('Failed to save tenant', err)
                      alert('Failed to save tenant')
                    } finally {
                      setSavingProfile(false)
                    }
                  }}
                  savingTenant={savingProfile}
                />
              ) : <Navigate to="/" replace />
            } />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:slug" element={<CompanyProfile />} />
            <Route path="/jobs/:jobId" element={
              <Jobs
                jobs={jobs}
                selectedJobId={null}
                candidateId={candidateId}
                token={token}
                onSelectJob={handleSelectJob}
                onApply={(job) => {
                  const jobIdentifier = job.ad_number || job.id
                  navigate(`/apply/${jobIdentifier}`)
                }}
              />
            } />
            <Route path="/jobs" element={
              <Jobs
                jobs={jobs}
                selectedJobId={selectedJob?.id}
                candidateId={candidateId}
                token={token}
                onSelectJob={handleSelectJob}
                onApply={(job) => {
                  const jobIdentifier = job.ad_number || job.id
                  navigate(`/apply/${jobIdentifier}`)
                }}
              />
            } />
            <Route path="/apply" element={<ApplyJob token={token} candidateId={candidateId} candidate={candidate} user={user} tenant={tenant} />} />
            <Route path="/apply/:jobId" element={<ApplyJob token={token} candidateId={candidateId} candidate={candidate} user={user} tenant={tenant} />} />
            <Route path="/profile" element={
              <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-4xl">
                  <div className="grid gap-4">
                    <Profile candidate={candidate} candidateId={candidateId} token={token} onUpdate={loadCandidate} />
                    <ProfileEdit profile={candidateProfile} onSave={handleProfileSave} saving={savingProfile} />
                  </div>
                </div>
              </div>
            } />
            <Route path="/2fa/setup" element={<TwoFASetup token={token} user={user} onComplete={() => navigate('/profile')} />} />
            <Route path="/applications" element={user?.role === 'candidate' ? <CandidateApplicationsPage /> : <JobSelectionList />} />
            <Route path="/applications/job/:jobId/:applicantId?" element={<ApplicantReviewDashboard />} />
            <Route path="/saved-search" element={
              canViewSavedSearch ? (
                <SavedSearch candidate={candidateProfile} candidateId={candidateId} token={token} onSelectJob={handleSelectJob} />
              ) : <Navigate to="/" replace />
            } />
            <Route path="/saved-search/:categorySlug" element={
              canViewSavedSearch ? (
                <SavedSearch candidate={candidateProfile} candidateId={candidateId} token={token} onSelectJob={handleSelectJob} />
              ) : <Navigate to="/" replace />
            } />
            <Route path="/create-job" element={
              <JobForm
                tenant={tenant}
                onSubmit={handleCreateJob}
                onCancel={() => navigate('/')}
                saving={submitting}
              />
            } />
            <Route path="/edit-job/:id" element={
              <EditJobWrapper
                tenant={tenant}
                selectedJob={selectedJob}
                jobs={jobs}
                token={token}
                user={user}
                onLoadJobs={() => loadJobs({ role: user.role, token })}
                onNavigate={navigate}
              />
            } />
            <Route path="/tenant-members" element={<TenantMembers tenant={tenant} token={token} />} />
            <Route path="/company/edit" element={<CompanyEdit />} />
            <Route path="/settings" element={<Settings token={token} user={user} />} />
            <Route path={adminRoute} element={
              <AdminDashboard
                tenants={tenants}
                onRefresh={() => loadAllTenants(token)}
                onSetStatus={async (id, status, rejectionReason) => {
                  await api.updateTenantStatus(id, status, token, rejectionReason)
                  await loadAllTenants(token)
                }}
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
      <Footer />
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

const App = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
)

export default App
