import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/api'
import { JobDetailContent } from '../components/JobDetailContent'
import { useTranslation } from '../i18n/TranslationProvider'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ServerDownBanner } from '../components/ServerDownBanner'

const defaultCategory = { id: 'general', category_name: 'General', color: '#6366f1' }

const normalizeCategory = (name = '') => name.trim().toLowerCase().replace(/\s+/g, '-')

export function Jobs({ jobs = [], onSelectJob, onApply, selectedJobId = null, initialSearch = '', initialLocation = '', candidateId, token }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { jobId } = useParams()
  const [search, setSearch] = useState(initialSearch)
  const [location, setLocation] = useState(initialLocation)
  const [selectedJob, setSelectedJob] = useState(null)
  const [loadingSelectedJob, setLoadingSelectedJob] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [companies, setCompanies] = useState([])
  const [savedJobIds, setSavedJobIds] = useState(new Set())
  const [saveCategories, setSaveCategories] = useState([defaultCategory])
  const [showSaveCategoryPicker, setShowSaveCategoryPicker] = useState(false)
  const [pendingSaveJob, setPendingSaveJob] = useState(null)
  const [selectedSaveCategory, setSelectedSaveCategory] = useState(defaultCategory.category_name)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)
  const jobCardRefs = useRef({})
  const jobListRef = useRef(null)

  // Ensure viewport starts at top when arriving on this page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await api.getCompanies()
        setCompanies(data)
      } catch (err) {
        console.error('Failed to fetch companies:', err)
      }
    }
    fetchCompanies()
  }, [])

  useEffect(() => {
    const loadSaved = async () => {
      if (!candidateId || !token) return
      try {
        const saved = await api.getSavedJobs(candidateId, token)
        const ids = new Set(saved.map((s) => s.job_id || s.id))
        setSavedJobIds(ids)
      } catch (err) {
        console.error('Failed to load saved jobs', err)
      }
    }
    loadSaved()
  }, [candidateId, token])

  useEffect(() => {
    const loadCategories = async () => {
      if (!candidateId || !token) return
      try {
        const cats = await api.getSaveCategories(candidateId, token)
        const uniqueCats = cats.filter(
          (cat) => cat.category_name && cat.category_name.toLowerCase() !== defaultCategory.category_name.toLowerCase()
        )
        setSaveCategories([defaultCategory, ...uniqueCats])
      } catch (err) {
        console.error('Failed to load save categories', err)
      }
    }
    loadCategories()
  }, [candidateId, token])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchDropdown(false)
      }
    }

    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }

    return undefined
  }, [showSearchDropdown])

  useEffect(() => {
    setSearch(initialSearch)
    setLocation(initialLocation)
  }, [initialSearch, initialLocation])

  useEffect(() => {
    if (!token) return
    const timeout = setTimeout(() => {
      api.updateUserPreferences({
        lastJobsSearch: search || null,
        lastJobsLocation: location || null,
      }, token).catch((err) => {
        console.warn('Failed to persist job search preferences', err)
      })
    }, 1500)
    return () => clearTimeout(timeout)
  }, [search, location, token])

  // Keep URL query params in sync with search/location when on /jobs
  useEffect(() => {
    if (jobId) return
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (location) params.set('location', location)
    const qs = params.toString()
    navigate(`/jobs${qs ? `?${qs}` : ''}`, { replace: true })
  }, [search, location, jobId, navigate])

  // Track screen size
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load specific job when accessed via /jobs/:jobId
  useEffect(() => {
    if (jobId) {
      // First try to find in the jobs array
      const foundJob = jobs.find(j => j.ad_number === jobId || j.id === jobId)
      if (foundJob) {
        setSelectedJob(foundJob)
        setLoadingSelectedJob(false)
      } else if (!loadingSelectedJob) {
        // If not found in array, fetch from API
        setLoadingSelectedJob(true)
        api.getJob(jobId)
          .then(job => setSelectedJob(job))
          .catch(err => console.error('Failed to load job:', err))
          .finally(() => setLoadingSelectedJob(false))
      }
    } else if (selectedJobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === selectedJobId)
      if (job) setSelectedJob(job)
    } else if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0])
    }
  }, [jobId, selectedJobId, jobs])

  // Scroll selected job into view when changed
  useEffect(() => {
    if (selectedJob && jobCardRefs.current[selectedJob.id] && jobListRef.current) {
      const el = jobCardRefs.current[selectedJob.id]
      const container = jobListRef.current
      const offsetTop = el.offsetTop - container.offsetTop
      const targetTop = offsetTop - container.clientHeight / 2 + el.clientHeight / 2
      container.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' })
    }

    // On mobile, ensure detail view starts at top when selection changes
    if (selectedJob && isSmallScreen) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [selectedJob])

  // Filter jobs by search term for live dropdown
  const filteredJobs = useMemo(() => {
    if (!search) return []
    const searchLower = search?.toLowerCase() || ''
    const exactAdMatch = jobs.find(job => job.ad_number?.toString().toLowerCase() === searchLower)
    if (exactAdMatch) return [exactAdMatch]
    return jobs
      .filter((job) => {
        return search
          ? job.title?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower) ||
          job.about_role?.toLowerCase().includes(searchLower) ||
          job.about_company?.toLowerCase().includes(searchLower) ||
          job.key_responsibilities?.some(resp => resp?.toLowerCase().includes(searchLower)) ||
          job.required_skills?.some(skill => skill?.toLowerCase().includes(searchLower)) ||
          job.preferred_skills?.some(skill => skill?.toLowerCase().includes(searchLower)) ||
          job.tags?.some(tag => tag?.toLowerCase().includes(searchLower)) ||
          job.company_name?.toLowerCase().includes(searchLower) ||
          job.ad_number?.toString().includes(search)
          : false
      })
      .slice(0, 8)
  }, [jobs, search])

  // Track search with debounce
  useEffect(() => {
    const trackSearch = setTimeout(() => {
      // Only track if specific length and user is logged in
      if (search && search.length > 2 && candidateId && token) {
        api.recordSearch(search, { location }, candidateId, token)
          .catch(err => console.error('Failed to track search', err))
      }
    }, 2000) // Debounce 2s to catch "real" queries

    return () => clearTimeout(trackSearch)
  }, [search, candidateId, token])

  // Filter companies by search term for live dropdown
  const filteredCompanies = useMemo(() => {
    if (!search) return []
    const searchLower = search?.toLowerCase() || ''
    return companies
      .filter((company) => {
        return search
          ? company.name?.toLowerCase().includes(searchLower) ||
          company.description?.toLowerCase().includes(searchLower) ||
          company.industry?.toLowerCase().includes(searchLower)
          : false
      })
      .slice(0, 8)
  }, [companies, search])

  // Full filtered list for normal display (with location filter)
  const filtered = useMemo(() => {
    const searchLower = search?.toLowerCase() || ''
    const exactAdMatch = search ? jobs.find(job => job.ad_number?.toString().toLowerCase() === searchLower) : null
    const baseList = exactAdMatch ? [exactAdMatch] : jobs
    return baseList.filter((job) => {
      const searchLower = search?.toLowerCase() || ''
      const matchesSearch = search
        ? job.title?.toLowerCase().includes(searchLower) ||
        job.description?.toLowerCase().includes(searchLower) ||
        job.about_role?.toLowerCase().includes(searchLower) ||
        job.about_company?.toLowerCase().includes(searchLower) ||
        job.key_responsibilities?.some(resp => resp?.toLowerCase().includes(searchLower)) ||
        job.required_skills?.some(skill => skill?.toLowerCase().includes(searchLower)) ||
        job.preferred_skills?.some(skill => skill?.toLowerCase().includes(searchLower)) ||
        job.tags?.some(tag => tag?.toLowerCase().includes(searchLower)) ||
        job.company_name?.toLowerCase().includes(searchLower) ||
        job.ad_number?.toString().includes(search)
        : true
      const matchesLocation = location ? job.location?.toLowerCase().includes(location.toLowerCase()) : true
      return matchesSearch && matchesLocation
    })
  }, [jobs, search, location])

  const handleJobClick = (job) => {
    setSelectedJob(job)
    if (onSelectJob) onSelectJob(job)
    // Navigate to /jobs/:jobId which will show detail on the side for desktop or full page for mobile
    navigate(`/jobs/${job.ad_number || job.id}`)
  }

  const isJobSaved = (job) => {
    const jobKey = job?.id || job?.job_id
    return jobKey ? savedJobIds.has(jobKey) : false
  }

  const handleToggleSave = async (job) => {
    if (!candidateId || !token || !job) return
    const jobKey = job.id || job.job_id
    if (!jobKey) return

    const alreadySaved = isJobSaved(job)
    if (alreadySaved) {
      try {
        await api.unsaveJob(candidateId, jobKey, token)
        setSavedJobIds((prev) => {
          const next = new Set(prev)
          next.delete(jobKey)
          return next
        })
      } catch (err) {
        console.error('Failed to toggle save', err)
      }
      return
    }

    setPendingSaveJob(job)
    setSelectedSaveCategory(saveCategories[0]?.category_name || defaultCategory.category_name)
    setShowSaveCategoryPicker(true)
  }

  const handleConfirmSave = async () => {
    if (!candidateId || !token || !pendingSaveJob) return
    const jobKey = pendingSaveJob.id || pendingSaveJob.job_id
    if (!jobKey || !selectedSaveCategory) return
    try {
      await api.saveJob(candidateId, jobKey, selectedSaveCategory, token)
      setSavedJobIds((prev) => new Set(prev).add(jobKey))
      // Keep saved category on the currently selected job if it matches
      setSelectedJob((prev) =>
        prev && (prev.id === jobKey || prev.job_id === jobKey)
          ? {
            ...prev,
            save_category: selectedSaveCategory,
            saved_category: selectedSaveCategory,
            category: selectedSaveCategory,
            category_name: selectedSaveCategory,
          }
          : prev
      )
    } catch (err) {
      console.error('Failed to save job', err)
    } finally {
      setShowSaveCategoryPicker(false)
      setPendingSaveJob(null)
    }
  }

  const handleCloseSavePicker = () => {
    setShowSaveCategoryPicker(false)
    setPendingSaveJob(null)
    setIsCreatingCategory(false)
    setNewCategoryName('')
  }

  const handleCreateCategory = async () => {
    if (!candidateId || !token || !newCategoryName.trim()) return
    try {
      const created = await api.createSaveCategory(candidateId, { category_name: newCategoryName.trim() }, token)
      setSaveCategories((prev) => [...prev, created])
      setSelectedSaveCategory(created.category_name)
      setIsCreatingCategory(false)
      setNewCategoryName('')
    } catch (err) {
      console.error('Failed to create category', err)
      alert('Failed to create category. It may already exist.')
    }
  }

  const saveCategoryModal = showSaveCategoryPicker ? (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-text-main">{t('jobs.saveCategory.title')}</h3>
          <p className="text-sm text-text-secondary mt-1">
            {t('jobs.saveCategory.subtitle').replace('{job}', pendingSaveJob?.title ? `"${pendingSaveJob.title}"` : t('jobs.saveCategory.thisJob'))}
          </p>
        </div>
        <div className="p-4 max-h-72 overflow-y-auto space-y-2">
          {!isCreatingCategory ? (
            <>
              {saveCategories.map((cat) => (
                <label
                  key={cat.id || cat.category_name}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition"
                >
                  <input
                    type="radio"
                    name="save-category"
                    value={cat.category_name}
                    checked={selectedSaveCategory === cat.category_name}
                    onChange={() => setSelectedSaveCategory(cat.category_name)}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-text-main">{cat.category_name}</span>
                    <span className="text-xs text-text-secondary">{t('jobs.saveCategory.saveToCategory')}</span>
                  </div>
                </label>
              ))}
              <button
                onClick={() => setIsCreatingCategory(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-gray-50 transition text-sm font-semibold text-text-secondary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('jobs.saveCategory.createNew')}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">{t('jobs.saveCategory.newLabel')}</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                  placeholder={t('jobs.saveCategory.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreatingCategory(false)
                    setNewCategoryName('')
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-100 transition"
                >
                  {t('jobs.saveCategory.cancel')}
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('jobs.saveCategory.add')}
                </button>
              </div>
            </div>
          )}
        </div>
        {!isCreatingCategory && (
          <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
            <button
              onClick={handleCloseSavePicker}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSave}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition"
            >
              {t('jobs.saveCategory.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null

  const getWorkModeColor = (mode) => {
    const m = mode?.toLowerCase()
    if (m === 'hybrid') return 'bg-blue-50 text-blue-700 border-blue-100'
    if (m === 'remote') return 'bg-purple-50 text-purple-700 border-purple-100'
    if (m === 'on-site' || m === 'onsite') return 'bg-green-50 text-green-700 border-green-100'
    return 'bg-gray-50 text-gray-700 border-gray-100'
  }

  // On small screens with a specific jobId, show full-page detail instead of split view
  if (isSmallScreen && jobId && selectedJob) {
    return (
      <>
        {saveCategoryModal}
        <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t('jobs.back')}
              </button>
            </div>
            {loadingSelectedJob ? (
              <LoadingSpinner fullScreen={false} message={t('jobs.loadingDetails')} />
            ) : (
              <JobDetailContent
                job={selectedJob}
                onApply={() => navigate(`/apply/${selectedJob.ad_number || selectedJob.id}`)}
                onViewFull={() => navigate(`/jobs/${selectedJob.ad_number || selectedJob.id}`)}
                onSave={candidateId && token ? handleToggleSave : null}
                isSaved={isJobSaved(selectedJob)}
                showViewFullButton={false}
              />
            )}
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <ServerDownBanner isVisible={jobs.length === 0 && filtered.length === 0} />
      {saveCategoryModal}
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8 ">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full lg:h-[calc(100vh-180px)] lg:min-h-0">
          {/* Left sidebar - Job list */}
          <div className="lg:col-span-5 flex flex-col h-full gap-4 min-h-0 lg:h-full lg:min-h-0">
            {/* Search bar */}
            <div className="bg-card-white p-4 rounded-xl border border-border-color shadow-soft flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setShowSearchDropdown(e.target.value.length > 0)
                  }}
                  onFocus={() => setShowSearchDropdown(search.length > 0)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-text-main transition duration-150 ease-in-out"
                  placeholder={t('jobs.searchPlaceholder')}
                  type="text"
                />

                {/* Live search dropdown */}
                {showSearchDropdown && (filteredJobs.length > 0 || filteredCompanies.length > 0) && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto"
                  >
                    {/* Jobs Category */}
                    {filteredJobs.length > 0 && (
                      <div>
                        <div className="sticky top-0 px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('nav.jobs')}</p>
                        </div>
                        {filteredJobs.map((job) => (
                          <div
                            key={`job-${job.id}`}
                            onClick={() => {
                              handleJobClick(job)
                              setShowSearchDropdown(false)
                            }}
                            className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                          >
                            <div className="flex items-start gap-2">
                              {job.company_logo_url && (
                                <img
                                  src={job.company_logo_url}
                                  alt={job.company_name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-main truncate">{job.title}</p>
                                <p className="text-xs text-text-secondary truncate">{job.company_name}</p>
                                {job.ad_number && (
                                  <p className="text-xs text-gray-400">ID: {job.ad_number}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Companies Category */}
                    {filteredCompanies.length > 0 && (
                      <div>
                        <div className="sticky top-0 px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('nav.companies')}</p>
                        </div>
                        {filteredCompanies.map((company) => (
                          <div
                            key={`company-${company.id}`}
                            onClick={() => {
                              navigate(`/companies/${company.slug || company.id}`)
                              setShowSearchDropdown(false)
                            }}
                            className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                          >
                            <div className="flex items-start gap-2">
                              {company.logo_url && (
                                <img
                                  src={company.logo_url}
                                  alt={company.name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-main truncate">{company.name}</p>
                                {company.industry && (
                                  <p className="text-xs text-text-secondary truncate">{company.industry}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="relative w-full sm:w-44">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-text-main transition duration-150 ease-in-out"
                  placeholder={t('jobs.locationPlaceholder')}
                  type="text"
                />
              </div>
            </div>

            {/* Job cards list */}
            <div ref={jobListRef} className="flex-1 lg:overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-2">
              {filtered.length === 0 && jobs.length === 0 && (
                <div className="bg-red-50 rounded-xl p-8 border border-red-200 text-center">
                  <div className="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-6v-2M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">{t('jobs.serverDown')}</h3>
                  <p className="text-red-700 mb-4">{t('jobs.serverDownMessage')}</p>
                  <p className="text-sm text-red-600">{t('jobs.serverDownSorry')}</p>
                </div>
              )}
              {filtered.length === 0 && jobs.length > 0 && (
                <div className="bg-card-white rounded-xl p-6 border border-border-color text-center text-text-secondary">
                  {t('jobs.noResults')}
                </div>
              )}
              {filtered.map((job) => {
                const isSelected = selectedJob?.id === job.id
                return (
                  <div
                    key={job.id}
                    ref={(el) => {
                      if (el) {
                        jobCardRefs.current[job.id] = el
                      } else {
                        delete jobCardRefs.current[job.id]
                      }
                    }}
                    onClick={() => handleJobClick(job)}
                    className={`bg-card-white rounded-xl p-5 ${isSelected ? 'border-2 border-primary' : 'border border-border-color hover:border-gray-300'
                      } shadow-soft cursor-pointer relative group transition-all ${!isSelected && 'hover:shadow-md'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        {job.company_logo_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={job.company_logo_url}
                              alt={job.company_name}
                              className="w-10 h-10 rounded object-cover border border-gray-200"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <h3 className={`text-lg font-bold ${isSelected ? 'text-text-main' : 'text-text-main group-hover:text-primary'
                            } transition-colors`}>
                            {job.title}
                          </h3>
                          <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-text-secondary group-hover:text-text-main'
                            }`}>
                            {job.company_name || 'Company'}
                          </p>
                          {job.ad_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              ID: {job.ad_number}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getWorkModeColor(job.work_mode)}`}>
                          {job.work_mode || 'Hybrid'}
                        </span>
                        {job.has_applied && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                            {t('jobs.appliedBadge')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-secondary mb-3 mt-1">
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.job_type || 'Full-time'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                      {job.description || job.about_role || 'No description available.'}
                    </p>
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right panel - Job details on desktop */}
          <div className="hidden lg:flex lg:col-span-7 lg:h-full lg:min-h-0 lg:overflow-hidden">
            {loadingSelectedJob ? (
              <div className="bg-card-white rounded-xl border border-border-color shadow-soft h-full w-full flex items-center justify-center">
                <LoadingSpinner fullScreen={false} size="md" />
              </div>
            ) : selectedJob ? (
              <JobDetailContent
                job={selectedJob}
                onApply={() => navigate(`/apply/${selectedJob.ad_number || selectedJob.id}`)}
                onViewFull={() => navigate(`/jobs/${selectedJob.ad_number || selectedJob.id}`)}
                onSave={candidateId && token ? handleToggleSave : null}
                isSaved={isJobSaved(selectedJob)}
                showViewFullButton={false}
              />
            ) : (
              <div className="bg-card-white rounded-xl border border-border-color shadow-soft h-full w-full flex items-center justify-center">
                <p className="text-text-secondary text-center">{t('jobs.listHint')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
