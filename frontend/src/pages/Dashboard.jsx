import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { JobDetailContent } from '../components/JobDetailContent'

export function Dashboard({ jobs = [], applications = [], candidate, token, onSelectJob }) {
  const navigate = useNavigate()
  const [topJobs, setTopJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [likedJobs, setLikedJobs] = useState(new Set())
  const [savedJobs, setSavedJobs] = useState(new Set())
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024)
  const [loading, setLoading] = useState(false)
  const [savedJobsCount, setSavedJobsCount] = useState(0)

  // Track screen size
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch top compatible jobs
  useEffect(() => {
    if (!candidate?.id || !token) return

    const fetchTopJobs = async () => {
      try {
        setLoading(true)
        const compatible = await api.getTopJobsForCandidate(candidate.id, 3, token)
        setTopJobs(compatible)
        
        // Load liked jobs
        const prefs = await api.getCandidatePreferences(candidate.id, token)
        const liked = new Set(prefs.map(p => p.tag))
        setLikedJobs(liked)

        // Load saved jobs
        const saved = await api.getSavedJobs(candidate.id, token)
        const savedIds = new Set(saved.map(s => s.job_id))
        setSavedJobs(savedIds)
        setSavedJobsCount(saved.length)
      } catch (err) {
        console.error('Failed to fetch top jobs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopJobs()
  }, [candidate?.id, token])

  const handleJobClick = async (job) => {
    setSelectedJob(job)
    
    // Record view interaction
    if (token && candidate?.id) {
      try {
        await api.recordJobInteraction(candidate.id, job.id, 'view', token)
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
    if (!token || !candidate?.id) return

    try {
      await api.recordJobInteraction(candidate.id, job.id, 'like', token)
      
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

  const handleSaveJob = async (e, job) => {
    e.stopPropagation()
    if (!token || !candidate?.id) return

    try {
      if (savedJobs.has(job.id)) {
        // Unsave
        await api.unsaveJob(candidate.id, job.id, token)
        const newSaved = new Set(savedJobs)
        newSaved.delete(job.id)
        setSavedJobs(newSaved)
        setSavedJobsCount(Math.max(0, savedJobsCount - 1))
      } else {
        // Save
        await api.saveJob(candidate.id, job.id, '', token)
        const newSaved = new Set(savedJobs)
        newSaved.add(job.id)
        setSavedJobs(newSaved)
        setSavedJobsCount(savedJobsCount + 1)
      }
    } catch (err) {
      console.error('Failed to save/unsave job:', err)
    }
  }

  const activeJobs = jobs.filter((job) => job.active)
  const applied = applications.length
  const profileComplete = candidate ? Math.min(100, 60 + (candidate.bio ? 20 : 0) + (candidate.headline ? 10 : 0) + (candidate.phone ? 10 : 0)) : 60

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
            Back
          </button>
          <JobDetailContent 
            job={selectedJob} 
            onApply={() => navigate(`/apply/${selectedJob.ad_number || selectedJob.id}`)}
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
          <h3 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">Open Roles</h3>
          <div className="text-4xl font-bold text-text-light dark:text-text-dark mb-1">{activeJobs.length}</div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">From your hiring board</p>
        </div>
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">Applications</h3>
          <div className="text-4xl font-bold text-text-light dark:text-text-dark mb-1">{applied}</div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Submitted with profile / CV</p>
        </div>
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">Profile Strength</h3>
          <div className="text-4xl font-bold text-text-light dark:text-text-dark mb-1">{profileComplete}%</div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Higher visibility when complete</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-badge-light dark:bg-gray-700 dark:text-white px-4 py-1.5 rounded-full text-primary dark:text-indigo-300 text-sm font-semibold shadow-sm inline-block">
              {topJobs.length > 0 ? 'Your Perfect Matches' : 'Highlighted roles'}
            </div>
            <span className="text-sm text-text-muted-light dark:text-text-muted-dark hidden sm:block">Top 3 compatible jobs for you</span>
          </div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark tracking-tight">
              {topJobs.length > 0 ? 'Highly compatible roles' : 'Move fast on these'}
            </h2>
          </div>
          {loading ? (
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm text-center">Loading recommendations...</p>
            </div>
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
                      {job.score}% match
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
                      className={`p-2 rounded-lg transition ${
                        savedJobs.has(job.id)
                          ? 'text-blue-500'
                          : 'text-gray-400 hover:text-blue-500'
                      }`}
                      title={savedJobs.has(job.id) ? 'Unsave job' : 'Save job'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={savedJobs.has(job.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLikeJob(job)
                      }}
                      className={`p-2 rounded-lg transition ${
                        likedJobs.has(job.id)
                          ? 'text-red-500'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={likedJobs.has(job.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-1 group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mb-4">{job.location}</p>
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mb-5 leading-relaxed">
                  {job.description || 'No description available.'}
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
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm text-center">Complete your profile to get personalized job recommendations.</p>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-fit">
            <div className="flex justify-between items-start mb-6">
              <span className="bg-badge-light dark:bg-indigo-900/50 text-primary dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold">Open to work</span>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest mb-1">Employment</span>
                <span className="text-primary text-sm font-medium">Open to roles</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm">{candidate?.email || 'ama.amiiin@gmail.com'} ·</p>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm">{candidate?.phone || '+25261748004'}</p>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 min-h-[200px]">
            <div className="mb-4">
              <span className="bg-badge-light dark:bg-indigo-900/50 text-primary dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold inline-block">Recent applications</span>
            </div>
            {applications.length === 0 ? (
              <div className="flex flex-col justify-center items-start h-32">
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm">No applications yet. Apply with your profile or CV.</p>
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
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {app.status}
                      </span>
                      {app.used_profile && <span>Profile</span>}
                      {app.used_cv && <span>· CV</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

