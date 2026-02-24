import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { JobDetailContent } from '../components/JobDetailContent'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useTranslation } from '../i18n/TranslationProvider'

const defaultCategory = { id: 'general', category_name: 'General', color: '#6366f1' }

export function Dashboard({ jobs = [], applications = [], candidate, token, onSelectJob }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [topJobs, setTopJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [likedJobs, setLikedJobs] = useState(new Set())
  const [savedJobs, setSavedJobs] = useState(new Set())
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024)
  const [loading, setLoading] = useState(false)
  const [savedJobsCount, setSavedJobsCount] = useState(0)

  // Save Modal State
  const [saveCategories, setSaveCategories] = useState([defaultCategory])
  const [showSaveCategoryPicker, setShowSaveCategoryPicker] = useState(false)
  const [pendingSaveJob, setPendingSaveJob] = useState(null)
  const [selectedSaveCategory, setSelectedSaveCategory] = useState(defaultCategory.category_name)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Track screen size
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load save categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!candidate?.profile?.id || !token) return
      try {
        const cats = await api.getSaveCategories(candidate.profile.id, token)
        const uniqueCats = cats.filter(
          (cat) => cat.category_name && cat.category_name.toLowerCase() !== defaultCategory.category_name.toLowerCase()
        )
        setSaveCategories([defaultCategory, ...uniqueCats])
      } catch (err) {
        console.error('Failed to load save categories', err)
      }
    }
    loadCategories()
  }, [candidate?.profile?.id, token])

  // Fetch top compatible jobs
  useEffect(() => {
    if (!candidate?.profile?.id || !token) return

    const fetchTopJobs = async () => {
      try {
        setLoading(true)
        const compatible = await api.getTopJobsForCandidate(candidate.profile.id, 3, token)
        setTopJobs(compatible)

        // Load liked jobs
        const prefs = await api.getCandidatePreferences(candidate.profile.id, token)
        const liked = new Set(prefs.map(p => p.tag))
        setLikedJobs(liked)

        // Load saved jobs
        const saved = await api.getSavedJobs(candidate.profile.id, token)
        const savedIds = new Set(saved.map(s => s.job_id || s.id))
        setSavedJobs(savedIds)
        setSavedJobsCount(saved.length)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopJobs()
  }, [candidate?.profile?.id, token])

  const handleJobClick = async (job) => {
    setSelectedJob(job)

    // Record view interaction
    if (token && candidate?.profile?.id) {
      try {
        await api.recordJobInteraction(candidate.profile.id, job.id, 'view', token)
      } catch (err) {
        console.error('Failed to record interaction:', err)
      }
    }

    // On mobile, navigate to detail view
    if (isSmallScreen) {
      navigate(`/jobs/${job.ad_number || job.id}`)
    }

    if (onSelectJob) onSelectJob(job)
  }

  const handleLikeJob = async (job) => {
    if (!token || !candidate?.profile?.id) return

    try {
      await api.recordJobInteraction(candidate.profile.id, job.id, 'like', token)

      // Update UI
      const newLiked = new Set(likedJobs)
      if (newLiked.has(job.id)) {
        newLiked.delete(job.id)
      } else {
        newLiked.add(job.id)
      }
      setLikedJobs(newLiked)
    } catch (err) {
      console.error('Failed to like job:', err)
    }
  }

  const isJobSaved = (job) => {
    const jobKey = job?.id || job?.job_id
    return jobKey ? savedJobs.has(jobKey) : false
  }

  const handleSaveJob = async (e, job) => {
    if (e) e.stopPropagation()
    if (!token || !candidate?.profile?.id) return

    const jobKey = job.id || job.job_id
    if (!jobKey) return

    if (savedJobs.has(jobKey)) {
      // Unsave directly
      try {
        await api.unsaveJob(candidate.profile.id, jobKey, token)
        const newSaved = new Set(savedJobs)
        newSaved.delete(jobKey)
        setSavedJobs(newSaved)
        setSavedJobsCount(Math.max(0, savedJobsCount - 1))
      } catch (err) {
        console.error('Failed to unsave job:', err)
      }
      return
    }

    // Open Modal for Saving
    setPendingSaveJob(job)
    setSelectedSaveCategory(saveCategories[0]?.category_name || defaultCategory.category_name)
    setShowSaveCategoryPicker(true)
  }

  const handleConfirmSave = async () => {
    if (!candidate?.profile?.id || !token || !pendingSaveJob) return
    const jobKey = pendingSaveJob.id || pendingSaveJob.job_id
    if (!jobKey) return

    try {
      await api.saveJob(candidate.profile.id, jobKey, selectedSaveCategory, token)
      const newSaved = new Set(savedJobs)
      newSaved.add(jobKey)
      setSavedJobs(newSaved)
      setSavedJobsCount(savedJobsCount + 1)
    } catch (err) {
      console.error('Failed to save job', err)
    } finally {
      handleCloseSavePicker()
    }
  }

  const handleCloseSavePicker = () => {
    setShowSaveCategoryPicker(false)
    setPendingSaveJob(null)
    setIsCreatingCategory(false)
    setNewCategoryName('')
  }

  const handleCreateCategory = async () => {
    if (!candidate?.profile?.id || !token || !newCategoryName.trim()) return
    try {
      const created = await api.createSaveCategory(candidate.profile.id, { category_name: newCategoryName.trim() }, token)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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

  const activeJobs = jobs.filter((job) => job.active)
  const applied = applications.length

  // Granular profile strength calculation
  const getProfileStrength = () => {
    if (!candidate || !candidate.profile) return 0
    let score = 0
    const p = candidate.profile

    // Base (Name & Email - given on registration)
    if (p.first_name && p.email) score += 20

    // Basic Details (Phone, Location, Nationality) - 3.33% each
    if (p.phone) score += 3.33
    if (p.location) score += 3.33
    if (p.nationality) score += 3.34

    // Intro (Headline, Summary/Bio) - 5% each
    if (p.headline) score += 5
    if (p.summary || p.bio) score += 5

    // Professional Links (LinkedIn, Portfolio, GitHub) - 3.33% each
    if (p.linkedin_url) score += 3.33
    if (p.portfolio_url) score += 3.33
    if (p.github_url) score += 3.34

    // Experience/Education/Skills - 15%, 10%, 10%
    if (candidate.workExperiences?.length > 0) score += 15
    if (candidate.educations?.length > 0) score += 10
    if (candidate.skills?.length > 0) score += 10

    // CV Upload - 15%
    if (p.cv_file_url) score += 15

    return Math.round(score)
  }

  const profileComplete = getProfileStrength()

  // Mobile job detail view
  if (isSmallScreen && selectedJob) {
    return (
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8 overflow-auto">
        <div className="space-y-4">
          <button
            onClick={() => setSelectedJob(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('common.back')}
          </button>
          <JobDetailContent
            job={selectedJob}
            onApply={() => navigate(`/apply/${selectedJob.ad_number || selectedJob.id}`)}
            onSave={(job) => handleSaveJob(null, job)}
            isSaved={isJobSaved(selectedJob)}
            onViewFull={() => navigate(`/jobs/${selectedJob.ad_number || selectedJob.id}`)}
            showViewFullButton={false}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto px-6 pb-12 overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">{t('dashboard.candidate.openRoles')}</h3>
          <div className="text-4xl font-bold text-text-light dark:text-text-dark mb-1">{activeJobs.length}</div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('dashboard.candidate.hiringBoard')}</p>
        </div>
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">{t('dashboard.candidate.applications')}</h3>
          <div className="text-4xl font-bold text-text-light dark:text-text-dark mb-1">{applied}</div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('dashboard.candidate.submitted')}</p>
        </div>
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">{t('dashboard.candidate.profileStrength')}</h3>
          <div className="text-4xl font-bold text-text-light dark:text-text-dark mb-1">{profileComplete}%</div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('dashboard.candidate.visibilityHint')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-badge-light dark:bg-gray-700 dark:text-white px-4 py-1.5 rounded-full text-primary dark:text-indigo-300 text-sm font-semibold shadow-sm inline-block">
              {topJobs.length > 0 ? t('dashboard.candidate.perfectMatches') : t('dashboard.candidate.highlightedRoles')}
            </div>
            <span className="text-sm text-text-muted-light dark:text-text-muted-dark hidden sm:block">{t('dashboard.candidate.top3Hint')}</span>
          </div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark tracking-tight">
              {topJobs.length > 0 ? t('dashboard.candidate.compatibleHeader') : t('dashboard.candidate.moveFastHeader')}
            </h2>
          </div>
          {loading ? (
            <LoadingSpinner fullScreen={false} size="md" message={t('dashboard.candidate.loadingRecs')} />
          ) : topJobs.length > 0 ? (
            topJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleJobClick(job)}
                className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer relative group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-semibold text-sm capitalize">{job.job_type || 'Full-time'}</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                      {t('dashboard.candidate.matchScore', { score: job.score })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-badge-light dark:bg-indigo-900/50 text-primary dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-medium capitalize">
                      {job.work_mode || 'Hybrid'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveJob(e, job)
                      }}
                      className={`p-2 rounded-lg transition ${isJobSaved(job)
                        ? 'text-blue-500'
                        : 'text-gray-400 hover:text-blue-500'
                        }`}
                      title={isJobSaved(job) ? t('jobs.saveCategory.unsave', 'Unsave job') : t('jobs.saveCategory.save', 'Save job')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={isJobSaved(job) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-1 group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mb-4">{job.location}</p>
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mb-5 leading-relaxed">
                  {job.description || t('jobs.noDescription', 'No description available.')}
                </p>
                {job.required_skills && job.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {job.required_skills.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {job.tags && job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm text-center">{t('dashboard.candidate.completeProfileHint')}</p>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-fit">
            <div className="flex justify-between items-start mb-6">
              <span className="bg-badge-light dark:bg-indigo-900/50 text-primary dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold">{t('dashboard.candidate.openToWork')}</span>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">{t('dashboard.candidate.employment')}</span>
                <span className="text-primary text-sm font-medium">{t('dashboard.candidate.openToRoles')}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm">{candidate?.profile?.email || 'ama.amiiin@gmail.com'} ·</p>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm">{candidate?.profile?.phone || '+25261748004'}</p>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 min-h-[200px]">
            <div className="mb-4">
              <span className="bg-badge-light dark:bg-indigo-900/50 text-primary dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold inline-block">{t('dashboard.candidate.recentApps')}</span>
            </div>
            {applications.length === 0 ? (
              <div className="flex flex-col justify-center items-start h-32">
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm">{t('dashboard.candidate.noAppsYet')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 4).map((app) => (
                  <div key={app.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark line-clamp-1">
                        {app.job_title || 'Role'}
                      </p>
                      <span className="text-xs text-text-muted-light dark:text-text-muted-dark whitespace-nowrap ml-2">
                        {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {app.status}
                      </span>
                      {app.used_profile && <span>{t('dashboard.candidate.profile')}</span>}
                      {app.used_cv && <span>· {t('dashboard.candidate.cv')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {saveCategoryModal}
    </main>
  )
}

