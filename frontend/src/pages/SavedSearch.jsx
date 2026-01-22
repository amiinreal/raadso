import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/api'

const defaultCategory = { id: 'general', category_name: 'General', color: '#6366f1' }
const normalizeCategory = (name = '') => name.trim().toLowerCase().replace(/\s+/g, '-')
const slugFromCategory = (name = '') => encodeURIComponent(normalizeCategory(name || 'General'))
const jobCategory = (job) =>
  job?.save_category || job?.saved_category || job?.category || job?.category_name || 'General'
const jobLogoUrl = (job) =>
  job?.company_logo_url || job?.logo_url || job?.company_logo || job?.logo || job?.company?.logo_url || job?.company?.logo
const categoryColor = (categories, name) => categories.find((cat) => cat.category_name === name)?.color || defaultCategory.color
const categoryNameFromSlug = (slug, categories) => {
  const normalized = normalizeCategory(decodeURIComponent(slug || ''))
  const match = categories.find((cat) => normalizeCategory(cat.category_name) === normalized)
  if (match) return match.category_name
  if (normalized) return decodeURIComponent(slug || '').replace(/-/g, ' ')
  return defaultCategory.category_name
}

const getDaysUntilDeadline = (deadline) => {
  if (!deadline) return null
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const getDeadlineColor = (daysUntil) => {
  if (daysUntil === null || daysUntil < 0) return 'text-gray-500 dark:text-gray-400'
  if (daysUntil < 2) return 'text-red-600 dark:text-red-400 font-bold'
  if (daysUntil <= 7) return 'text-orange-600 dark:text-orange-400 font-semibold'
  return 'text-gray-600 dark:text-gray-400'
}

const getDeadlineBgColor = (daysUntil) => {
  if (daysUntil === null || daysUntil < 0) return 'bg-gray-100 dark:bg-gray-700'
  if (daysUntil < 2) return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
  if (daysUntil <= 7) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
  return 'bg-gray-100 dark:bg-gray-700'
}

export function SavedSearch({ candidate, candidateId, token, onSelectJob }) {
  const navigate = useNavigate()
  const { categorySlug } = useParams()

  const [categories, setCategories] = useState([defaultCategory])
  const [overviewJobs, setOverviewJobs] = useState([])
  const [categoryJobs, setCategoryJobs] = useState([])
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(defaultCategory.color)
  const [loading, setLoading] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024)

  const isCategoryView = Boolean(categorySlug)
  const activeCategoryName = useMemo(
    () => (isCategoryView ? categoryNameFromSlug(categorySlug, categories) : ''),
    [categorySlug, categories, isCategoryView]
  )

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const savedCandidateId = candidate?.id || candidateId
    if (!savedCandidateId || !token) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const cats = await api.getSaveCategories(savedCandidateId, token)
        const uniqueCats = cats.filter(
          (cat) => normalizeCategory(cat.category_name) !== normalizeCategory(defaultCategory.category_name)
        )
        const categoryList = [defaultCategory, ...uniqueCats]
        setCategories(categoryList)

        if (isCategoryView) {
          const categoryName = categoryNameFromSlug(categorySlug, categoryList)
          const jobs = await api.getSavedJobsByCategory(savedCandidateId, categoryName, token)
          setCategoryJobs(jobs)
        } else {
          const jobs = await api.getSavedJobs(savedCandidateId, token)
          setOverviewJobs(jobs)
        }
      } catch (err) {
        console.error('Failed to fetch saved jobs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [candidate?.id, candidateId, token, categorySlug, isCategoryView])

  const handleCreateCategory = async () => {
    const savedCandidateId = candidate?.id || candidateId
    if (!newCategoryName.trim() || !token || !savedCandidateId) return

    try {
      const newCat = await api.createSaveCategory(savedCandidateId, newCategoryName, newCategoryColor, token)
      setCategories((prev) => [...prev, newCat])
      setNewCategoryName('')
      setNewCategoryColor(defaultCategory.color)
      setShowNewCategoryForm(false)
    } catch (err) {
      console.error('Failed to create category:', err)
    }
  }

  const handleDeleteCategory = async (categoryId, categoryName) => {
    const savedCandidateId = candidate?.id || candidateId
    if (!token || !savedCandidateId || categoryId === defaultCategory.id) return

    try {
      await api.deleteSaveCategory(savedCandidateId, categoryId, token)
      setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      setOverviewJobs((prev) => prev.filter((job) => normalizeCategory(jobCategory(job)) !== normalizeCategory(categoryName)))
      if (isCategoryView && normalizeCategory(activeCategoryName) === normalizeCategory(categoryName)) {
        navigate('/saved-search')
      }
    } catch (err) {
      console.error('Failed to delete category:', err)
    }
  }

  const handleMoveJob = async (jobId, newCategory) => {
    const savedCandidateId = candidate?.id || candidateId
    if (!token || !savedCandidateId || !newCategory || !jobId) return
    try {
      await api.updateJobSaveCategory(savedCandidateId, jobId, newCategory, token)
      setLoading(true)
      // Refresh both overview and current category view
      const [updatedOverview, updatedCategoryJobs] = await Promise.all([
        api.getSavedJobs(savedCandidateId, token),
        isCategoryView ? api.getSavedJobsByCategory(savedCandidateId, activeCategoryName, token) : Promise.resolve([])
      ])
      setOverviewJobs(updatedOverview)
      if (isCategoryView) setCategoryJobs(updatedCategoryJobs)
    } catch (err) {
      console.error('Failed to move job:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewJob = (job) => {
    const jobIdentifier = job.ad_number || job.id || job.job_id
    if (!jobIdentifier) return
    navigate(`/jobs/${jobIdentifier}`)
  }

  const handleUnsaveJob = async (jobId) => {
    const savedCandidateId = candidate?.id || candidateId
    if (!token || !savedCandidateId || !jobId) return
    try {
      await api.unsaveJob(savedCandidateId, jobId, token)
      setLoading(true)
      // Refresh all data after unsaving
      const [updatedOverview, updatedCategoryJobs] = await Promise.all([
        api.getSavedJobs(savedCandidateId, token),
        isCategoryView ? api.getSavedJobsByCategory(savedCandidateId, activeCategoryName, token) : Promise.resolve([])
      ])
      setOverviewJobs(updatedOverview)
      if (isCategoryView) setCategoryJobs(updatedCategoryJobs)
    } catch (err) {
      console.error('Failed to remove saved job:', err)
    } finally {
      setLoading(false)
    }
  }

  const jobsForCategory = (categoryName) =>
    overviewJobs.filter(
      (job) => normalizeCategory(jobCategory(job)) === normalizeCategory(categoryName || defaultCategory.category_name)
    )

  if (!isCategoryView) {
    return (
      <main className="flex-1 max-w-7xl mx-auto px-6 pb-12 overflow-y-auto custom-scrollbar">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">Saved Search</h1>
            <p className="text-text-muted-light dark:text-text-muted-dark">
              Choose a category to review the jobs you have saved inside it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewCategoryForm((prev) => !prev)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition"
            >
              {showNewCategoryForm ? 'Close' : 'New Category'}
            </button>
          </div>
        </div>

        {showNewCategoryForm && (
          <div className="mb-6 grid gap-3 md:grid-cols-[2fr,1fr,auto] bg-card-light dark:bg-card-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted-light dark:text-text-muted-dark">Color</span>
              <div className="flex gap-2">
                {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className="w-7 h-7 rounded-lg border-2"
                    style={{
                      backgroundColor: color,
                      borderColor: newCategoryColor === color ? '#111827' : 'transparent'
                    }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewCategoryForm(false)
                  setNewCategoryName('')
                  setNewCategoryColor(defaultCategory.color)
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-text-muted-light dark:text-text-muted-dark text-sm">Loading categories...</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat) => {
              const savedInCategory = jobsForCategory(cat.category_name)
              const collage = savedInCategory.slice(0, 5)
              const extraCount = Math.max(0, savedInCategory.length - collage.length)

              return (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/saved-search/${slugFromCategory(cat.category_name)}`)}
                  className="relative overflow-hidden bg-card-light dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: `linear-gradient(135deg, ${cat.color}, transparent)` }}
                  />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark">Category</p>
                        <h3 className="text-xl font-bold text-text-light dark:text-text-dark">{cat.category_name}</h3>
                      </div>
                    </div>
                    {cat.id !== defaultCategory.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCategory(cat.id, cat.category_name)
                        }}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-text-muted-light dark:text-text-muted-dark relative z-10">
                    {savedInCategory.length} saved {savedInCategory.length === 1 ? 'item' : 'items'}
                  </p>

                  <div className="mt-4 grid grid-cols-5 gap-2 relative z-10">
                    {collage.length === 0 && (
                      <div className="col-span-5 text-xs text-text-muted-light dark:text-text-muted-dark py-6 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        No saved items yet
                      </div>
                    )}
                    {collage.map((job) => {
                      const logo = jobLogoUrl(job)
                      const name = job.company_name || job.company || '—'
                      return (
                        <div
                          key={job.id || job.title}
                          className="p-2 bg-white/70 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm"
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt={name}
                              className="h-8 w-8 rounded-lg object-cover border border-gray-200 dark:border-gray-700 mb-2"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-text-muted-light dark:text-text-muted-dark mb-2">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <p className="text-[11px] font-semibold text-text-light dark:text-text-dark line-clamp-2">{job.title || 'Untitled job'}</p>
                          <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark line-clamp-1 mt-1">
                            {name}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  {extraCount > 0 && (
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2 relative z-10">+{extraCount} more saved here</p>
                  )}

                  <div className="mt-6 flex items-center justify-between relative z-10">
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark">Tap to open saved items</span>
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg"
                    >
                      View
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto px-6 pb-12 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/saved-search')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Categories
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark">Category</p>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">{activeCategoryName}</h1>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: categoryColor(categories, activeCategoryName) }}
        >
          {categoryJobs.length} saved
        </span>
      </div>

      {loading ? (
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">Loading saved jobs...</p>
        </div>
      ) : categoryJobs.length > 0 ? (
        <div className="space-y-4">
          {categoryJobs.map((job) => (
            <div
              key={job.id}
              className="bg-card-light dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-primary font-semibold text-xs uppercase">{job.job_type || 'Full-time'}</span>
                  <span className="bg-badge-light dark:bg-indigo-900/50 text-primary dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-medium capitalize">
                    {job.work_mode || 'Hybrid'}
                  </span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                    {job.location || 'Location flexible'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    defaultValue={jobCategory(job)}
                    onChange={(e) => handleMoveJob(job.id || job.job_id, e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.category_name}>
                        Move to {cat.category_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleUnsaveJob(job.id)}
                    className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-semibold hover:bg-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-text-light dark:text-text-dark mt-3">{job.title}</h3>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1 mb-3 line-clamp-3">
                {job.description || 'No description available.'}
              </p>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {job.required_skills.slice(0, 5).map((skill, idx) => (
                    <span key={idx} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted-light dark:text-text-muted-dark">
                <span>Saved {job.saved_at ? new Date(job.saved_at).toLocaleDateString() : 'recently'}</span>
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {jobCategory(job)}
                </span>
                {(job.deadline || job.application_deadline) && (() => {
                  const deadline = job.deadline || job.application_deadline
                  const daysUntil = getDaysUntilDeadline(deadline)
                  const deadlineDate = new Date(deadline)
                  return (
                    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${getDeadlineBgColor(daysUntil)}`}>
                      {daysUntil !== null && daysUntil < 2 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                      )}
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${getDeadlineColor(daysUntil)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={getDeadlineColor(daysUntil)}>
                        {daysUntil !== null && daysUntil >= 0 ? (
                          daysUntil === 0 ? 'Today!' :
                          daysUntil === 1 ? 'Tomorrow!' :
                          daysUntil < 2 ? `${daysUntil} days left` :
                          `${daysUntil} days`
                        ) : (
                          'Expired'
                        )} • {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </span>
                  )
                })()}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {onSelectJob && (
                  <button
                    onClick={() => handleViewJob(job)}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition"
                  >
                    View job
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card-light dark:bg-card-dark p-12 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-text-muted-light dark:text-text-muted-dark mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
          </svg>
          <p className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">No saved items here yet</p>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">Save a job or pick another category.</p>
          <button
            onClick={() => navigate('/saved-search')}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition"
          >
            Back to categories
          </button>
        </div>
      )}
    </main>
  )
}
