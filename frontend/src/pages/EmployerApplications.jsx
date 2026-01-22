import { useState } from 'react'
import { api } from '../api/api'

export function EmployerApplications({ token, user, jobs = [] }) {
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobApplications, setJobApplications] = useState([])
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reviewingAI, setReviewingAI] = useState({})
  const [batchReviewingJob, setBatchReviewingJob] = useState(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null })
  const [filters, setFilters] = useState({ status: '', aiReviewed: '' })
  const [editingBy, setEditingBy] = useState({})

  const storedToken = token || localStorage.getItem('job-platform-token')

  // Load applications when job changes
  const loadJobApplications = async (jobId) => {
    try {
      setLoading(true)
      const apps = await api.getApplications({ jobId }, storedToken)
      setJobApplications(apps || [])
    } catch (err) {
      console.error('Failed to load job applications:', err)
      setJobApplications([])
    } finally {
      setLoading(false)
    }
  }

  // Handle job selection
  const handleSelectJob = (job) => {
    setSelectedJob(job)
    loadJobApplications(job.id)
  }

  // Update notes when selecting a different application
  const updateSelectedApplication = (app) => {
    setSelectedApplication(app)
    setNotes(app.notes || '')
  }

  // Filter applications based on active filters
  const filteredApplications = jobApplications.filter(app => {
    if (filters.status && app.status !== filters.status) return false
    if (filters.aiReviewed === 'reviewed' && !app.ai_reviewed_at) return false
    if (filters.aiReviewed === 'notreviewed' && app.ai_reviewed_at) return false
    return true
  })

  const handleSaveNotes = async () => {
    if (!selectedApplication) return
    try {
      setSavingNotes(true)
      await api.updateApplicationNotes(selectedApplication.id, notes, storedToken)
      setSelectedApplication(prev => ({ ...prev, notes }))
      setModal({ show: true, type: 'success', title: 'Success', message: 'Notes saved successfully!', onConfirm: null })
    } catch (err) {
      console.error('Failed to save notes:', err)
      setModal({ show: true, type: 'error', title: 'Error', message: 'Failed to save notes', onConfirm: null })
    } finally {
      setSavingNotes(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedApplication) return
    try {
      await api.updateApplicationStatus(selectedApplication.id, newStatus, storedToken)
      setSelectedApplication(prev => ({ ...prev, status: newStatus }))
      // Reload applications list
      loadJobApplications(selectedJob.id)
      setModal({ show: true, type: 'success', title: 'Success', message: 'Status updated successfully!', onConfirm: null })
    } catch (err) {
      console.error('Failed to update status:', err)
      setModal({ show: true, type: 'error', title: 'Error', message: 'Failed to update status', onConfirm: null })
    }
  }

  const statusColors = {
    applied: 'bg-blue-50 text-blue-700 border-blue-200',
    reviewing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    shortlisted: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    hired: 'bg-purple-50 text-purple-700 border-purple-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
  }

  // Job selection view
  if (!selectedJob) {
    return (
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        <div className="w-full max-w-4xl h-full overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Review System</h1>
              <p className="text-gray-600">Select a job to review and manage its applications</p>
              {jobs.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {jobs.length} job{jobs.length !== 1 ? 's' : ''} • 
                  {jobs.reduce((sum, j) => sum + (typeof j.application_count === 'number' ? j.application_count : 0), 0)} total applications
                </p>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Loading jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600">No jobs posted yet. Create a job to start receiving applications.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {jobs.map(job => {
                  const appCount = typeof job.application_count === 'number' ? job.application_count : 0
                  return (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-primary cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{job.location}</p>
                          <div className="flex gap-2 mt-3">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {job.employment_type}
                            </span>
                            {job.active ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Inactive</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{appCount}</div>
                          <p className="text-xs text-gray-600">Applications</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Application review view
  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="w-full max-w-6xl h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setSelectedJob(null)
                setSelectedApplication(null)
              }}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded font-medium hover:bg-gray-300"
            >
              ← Back to Jobs
            </button>
            <button
              onClick={() => {
                setSelectedApplication(null)
                loadJobApplications(selectedJob.id)
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded font-medium hover:bg-blue-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h1>
              <p className="text-sm text-gray-600">{selectedJob.location}</p>
            </div>
            <button
              onClick={() => {
                setModal({
                  show: true,
                  type: 'confirm',
                  title: 'AI Review All Applications',
                  message: `Review all ${jobApplications.length} applications with AI? This may take a few minutes.`,
                  onConfirm: async () => {
                    setModal({ show: false, type: '', title: '', message: '', onConfirm: null })
                    setBatchReviewingJob(selectedJob.id)
                    try {
                      const result = await api.aiReviewAllApplications(selectedJob.id, storedToken)
                      setModal({ show: true, type: 'success', title: 'AI Review Complete', message: `Total: ${result.total}\nReviewed: ${result.reviewed}\n\nReload to see results.`, onConfirm: null })
                      loadJobApplications(selectedJob.id)
                    } catch (err) {
                      setModal({ show: true, type: 'error', title: 'Error', message: 'AI review failed: ' + err.message, onConfirm: null })
                    } finally {
                      setBatchReviewingJob(null)
                    }
                  }
                })
              }}
              disabled={batchReviewingJob === selectedJob.id}
              className="px-3 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {batchReviewingJob === selectedJob.id ? (
                <>
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Reviewing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Review All
                </>
              )}
            </button>
          </div>

          {/* Two column layout: Applications list and detail view */}
          <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
            {/* Applications List */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10 space-y-3">
                <h3 className="font-semibold text-gray-900">Applications ({filteredApplications.length})</h3>
                
                {/* Filters */}
                <div className="space-y-2">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  >
                    <option value="">All Status</option>
                    <option value="applied">Applied</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="rejected">Rejected</option>
                    <option value="hired">Hired</option>
                  </select>
                  
                  <select
                    value={filters.aiReviewed}
                    onChange={(e) => setFilters(prev => ({ ...prev, aiReviewed: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  >
                    <option value="">All Applications</option>
                    <option value="reviewed">AI Reviewed</option>
                    <option value="notreviewed">Not AI Reviewed</option>
                  </select>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredApplications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No applications match filters</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredApplications.map(app => {
                      const scoreChip = (
                        app.ai_match_score !== null && app.ai_match_score !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full font-bold text-sm ${
                              app.ai_match_score >= 80 ? 'bg-green-100 text-green-800' :
                              app.ai_match_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              app.ai_match_score >= 40 ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {app.ai_match_score}% Match
                            </div>
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )
                      )
                      return (
                        <div
                          key={app.id}
                          onClick={() => updateSelectedApplication(app)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              updateSelectedApplication(app)
                            }
                          }}
                          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedApplication?.id === app.id ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{app.candidate_name || 'Unnamed'}</h4>
                              <p className="text-sm text-gray-600">{app.candidate_email}</p>
                              {app.applied_at && (
                                <p className="text-xs text-gray-500 mt-1">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                              )}
                              {editingBy[app.id] && (
                                <p className="text-xs text-blue-600 font-semibold mt-1">🔵 Currently being reviewed</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">                              {!app.ai_reviewed_at && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setReviewingAI(prev => ({ ...prev, [app.id]: true }))
                                    setEditingBy(prev => ({ ...prev, [app.id]: true }))
                                    api.aiReviewApplication(app.id, storedToken)
                                      .then(() => loadJobApplications(selectedJob.id))
                                      .catch(err => setModal({ show: true, type: 'error', title: 'AI Review Failed', message: err.message || 'Unknown error', onConfirm: null }))
                                      .finally(() => {
                                        setReviewingAI(prev => ({ ...prev, [app.id]: false }))
                                        setEditingBy(prev => ({ ...prev, [app.id]: false }))
                                      })
                                  }}
                                  disabled={reviewingAI[app.id]}
                                  className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded border border-purple-200 hover:bg-purple-100 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {reviewingAI[app.id] ? (
                                    <>
                                      <div className="h-3 w-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
                                      Analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      AI Review
                                    </>
                                  )}
                                </button>
                              )}
                              {app.ai_reviewed_at && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setReviewingAI(prev => ({ ...prev, [app.id]: true }))
                                    setEditingBy(prev => ({ ...prev, [app.id]: true }))
                                    api.aiReviewApplication(app.id, storedToken)
                                      .then(() => loadJobApplications(selectedJob.id))
                                      .catch(err => setModal({ show: true, type: 'error', title: 'AI Review Failed', message: err.message || 'Unknown error', onConfirm: null }))
                                      .finally(() => {
                                        setReviewingAI(prev => ({ ...prev, [app.id]: false }))
                                        setEditingBy(prev => ({ ...prev, [app.id]: false }))
                                      })
                                  }}
                                  disabled={reviewingAI[app.id]}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded border border-blue-200 hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1"
                                  title="Re-analyze this application"
                                >
                                  {reviewingAI[app.id] ? (
                                    <>
                                      <div className="h-3 w-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                                      Re-analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1119.414 5.414.999.999 0 10-1.414-1.414A5.002 5.002 0 104.707 5.707H6a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                                      </svg>
                                      Re-review
                                    </>
                                  )}
                                </button>
                              )}                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[app.status] || statusColors.applied}`}>
                                  {app.status || 'applied'}
                                </span>
                              </div>
                          </div>
                            {scoreChip}
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              {app.used_profile && (
                                <span className="text-green-700 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Profile
                                </span>
                              )}
                              {app.used_cv && (
                                <span className="text-green-700 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  CV
                                </span>
                              )}
                              {Array.isArray(app.custom_files) && app.custom_files.length > 0 && (
                                <span className="text-blue-700 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 012-2h6a1 1 0 00-.707.293L6.293 6.586A1 1 0 006 7.293V4zm2 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" />
                                  </svg>
                                  {app.custom_files.length} file(s)
                                </span>
                              )}
                            </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Application Detail View */}
            <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              {!selectedApplication ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-500">Select an application to review</p>
                </div>
              ) : (
                <>
                  {/* Detail Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedApplication.candidate_name}</h2>
                        <p className="text-sm text-gray-600">{selectedApplication.candidate_email}</p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={selectedApplication.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className={`px-3 py-1 rounded font-semibold text-sm border capitalize ${statusColors[selectedApplication.status] || statusColors.applied}`}
                        >
                          <option value="applied">Applied</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="rejected">Rejected</option>
                          <option value="hired">Hired</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Detail Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Saved Profile */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-3">SAVED PROFILE</p>
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{selectedApplication.candidate_name}</h3>
                              {selectedApplication.candidate_title && (
                                <p className="text-sm text-gray-700 mt-1">{selectedApplication.candidate_title}</p>
                              )}
                              {selectedApplication.candidate_location && (
                                <p className="text-sm text-gray-600">{selectedApplication.candidate_location}</p>
                              )}
                            </div>
                            <div className="text-right">
                              {selectedApplication.seniority_level && (
                                <p className="text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded">{selectedApplication.seniority_level}</p>
                              )}
                              {reviewingAI[selectedApplication.id] && (
                                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded">
                                  In review by you (live)
                                </span>
                              )}
                            </div>
                          </div>

                          {selectedApplication.bio && (
                            <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm text-gray-700">{selectedApplication.bio}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            {selectedApplication.years_of_experience && (
                              <div className="bg-white rounded p-2">
                                <p className="font-semibold text-gray-900">{selectedApplication.years_of_experience}+</p>
                                <p className="text-gray-600">Years Exp</p>
                              </div>
                            )}
                            {selectedApplication.employment_status && (
                              <div className="bg-white rounded p-2">
                                <p className="font-semibold text-gray-900 capitalize">{selectedApplication.employment_status}</p>
                                <p className="text-gray-600">Status</p>
                              </div>
                            )}
                            {selectedApplication.open_to_work !== undefined && (
                              <div className="bg-white rounded p-2">
                                <p className="font-semibold text-green-700">{selectedApplication.open_to_work ? 'Open' : 'Not Open'}</p>
                                <p className="text-gray-600">To Work</p>
                              </div>
                            )}
                          </div>

                          {(selectedApplication.linkedin_url || selectedApplication.github_url || selectedApplication.portfolio_url || selectedApplication.phone || selectedApplication.cv_file_url || selectedApplication.candidate_email) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {selectedApplication.phone && (
                                <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded">{selectedApplication.phone}</span>
                              )}
                              {selectedApplication.candidate_email && (
                                <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded">{selectedApplication.candidate_email}</span>
                              )}
                              {selectedApplication.linkedin_url && (
                                <a href={selectedApplication.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">LinkedIn</a>
                              )}
                              {selectedApplication.github_url && (
                                <a href={selectedApplication.github_url} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">GitHub</a>
                              )}
                              {selectedApplication.portfolio_url && (
                                <a href={selectedApplication.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">Portfolio</a>
                              )}
                              {selectedApplication.cv_file_url && (
                                <a href={selectedApplication.cv_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">Download CV</a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {selectedApplication.ai_match_score !== null && selectedApplication.ai_match_score !== undefined ? (
                      <div className="border-2 border-purple-200 rounded-xl p-5 bg-gradient-to-br from-purple-50 to-indigo-50">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-600 rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">AI Match Analysis</h3>
                            <p className="text-xs text-gray-500 mt-1">⚠️ AI may make mistakes - please review the analysis carefully before making decisions</p>
                          </div>
                          <div className={`px-4 py-2 rounded-full font-bold text-lg ${
                            selectedApplication.ai_match_score >= 80 ? 'bg-green-500 text-white' :
                            selectedApplication.ai_match_score >= 60 ? 'bg-yellow-500 text-white' :
                            selectedApplication.ai_match_score >= 40 ? 'bg-orange-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {selectedApplication.ai_match_score}%
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-purple-100">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedApplication.ai_analysis}</p>
                          {selectedApplication.ai_reviewed_at && (
                            <p className="text-xs text-gray-500 mt-3 italic">Reviewed: {new Date(selectedApplication.ai_reviewed_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={async () => {
                            setReviewingAI(prev => ({ ...prev, [selectedApplication.id]: true }))
                            setEditingBy(prev => ({ ...prev, [selectedApplication.id]: true }))
                            try {
                              const result = await api.aiReviewApplication(selectedApplication.id, storedToken)
                              setSelectedApplication(prev => ({
                                ...prev,
                                ai_match_score: result.matchScore,
                                ai_analysis: result.analysis,
                                ai_reviewed_at: result.reviewedAt
                              }))
                            } catch (err) {
                              setModal({ show: true, type: 'error', title: 'AI Review Failed', message: err.message || 'Unknown error', onConfirm: null })
                            } finally {
                              setReviewingAI(prev => ({ ...prev, [selectedApplication.id]: false }))
                              setEditingBy(prev => ({ ...prev, [selectedApplication.id]: false }))
                            }
                          }}
                          disabled={reviewingAI[selectedApplication.id]}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 disabled:opacity-50"
                        >
                          {reviewingAI[selectedApplication.id] ? 'Running AI Review...' : 'Run AI Review'}
                        </button>
                      </div>
                    )}

                    {/* Status and Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">STATUS</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border capitalize ${
                          selectedApplication.status === 'applied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          selectedApplication.status === 'reviewing' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          selectedApplication.status === 'accepted' || selectedApplication.status === 'shortlisted' ? 'bg-green-50 text-green-700 border-green-200' :
                          selectedApplication.status === 'hired' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {selectedApplication.status || 'applied'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">APPLIED DATE</p>
                        <p className="text-sm font-medium">{selectedApplication.applied_at ? new Date(selectedApplication.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p>
                      </div>
                    </div>

                    {/* Additional Profile Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">NATIONALITY</p>
                        <p className="text-sm font-medium">{selectedApplication.nationality || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">EMAIL</p>
                        <p className="text-sm font-medium">{selectedApplication.candidate_email || '-'}</p>
                      </div>
                    </div>

                    {/* Submitted Materials */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-3">SUBMITTED MATERIALS</p>
                      <div className="space-y-2">
                        {selectedApplication.used_profile && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                            <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-green-900">Saved Profile</span>
                          </div>
                        )}
                        {selectedApplication.used_cv && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                            <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-green-900">CV Attachment</span>
                          </div>
                        )}
                        {Array.isArray(selectedApplication.custom_files) && selectedApplication.custom_files.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-2">Additional Documents ({selectedApplication.custom_files.length})</p>
                            <div className="space-y-2">
                              {selectedApplication.custom_files.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                >
                                  <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 012-2h6a1 1 0 00-.707.293L6.293 6.586A1 1 0 006 7.293V4zm2 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" />
                                  </svg>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">{file.requirementName}</p>
                                    <p className="text-xs text-blue-700">{file.fileName}</p>
                                  </div>
                                  <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Highlights */}
                    {(Array.isArray(selectedApplication.skills) && selectedApplication.skills?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplication.skills.map((s) => (
                            <div key={s.id || s.skill_name} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs">
                              <span className="font-medium text-blue-900">{s.skill_name}</span>
                              {s.proficiency && (
                                <span className="text-blue-700 ml-1">({s.proficiency})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(Array.isArray(selectedApplication.work_experiences) && selectedApplication.work_experiences?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Work Experience</h3>
                        <ul className="space-y-2 text-sm">
                          {selectedApplication.work_experiences.map((w, idx) => (
                            <li key={idx} className="p-3 bg-white rounded border border-gray-200">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="font-semibold text-gray-900">{w.job_title}</div>
                                  <div className="text-sm text-gray-700">{w.company_name}</div>
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                  {w.start_date} {w.end_date ? `- ${w.end_date}` : '- Present'}
                                </span>
                              </div>
                              {w.employment_type && (
                                <p className="text-xs text-gray-600 mb-2">{w.employment_type}</p>
                              )}
                              {w.description && <div className="text-sm text-gray-700">{w.description}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {(Array.isArray(selectedApplication.educations) && selectedApplication.educations?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Education</h3>
                        <ul className="space-y-2 text-sm">
                          {selectedApplication.educations.map((e, idx) => (
                            <li key={idx} className="p-3 bg-white rounded border border-gray-200">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="font-semibold text-gray-900">{e.degree}</div>
                                  <div className="text-sm text-gray-700">{e.field_of_study}</div>
                                  <div className="text-sm text-gray-600">{e.institution}</div>
                                </div>
                                {(e.start_year || e.end_year) && (
                                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                    {e.start_year} {e.end_year ? `- ${e.end_year}` : ''}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {(Array.isArray(selectedApplication.languages) && selectedApplication.languages?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
                        <div className="flex flex-wrap gap-2 text-sm">
                          {selectedApplication.languages.map((l, idx) => (
                            <div key={idx} className="px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs">
                              <span className="font-medium text-green-900">{l.language}</span>
                              {l.proficiency && (
                                <span className="text-green-700 ml-1">({l.proficiency})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Cover Letter */}
                    {selectedApplication.cover_letter && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Cover Letter</h3>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                          {selectedApplication.cover_letter}
                        </p>
                      </div>
                    )}

                    {/* Notes (bottom) */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Your Notes</h3>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add your personal notes about this candidate..."
                        className="w-full p-3 border border-gray-300 rounded font-medium text-sm resize-none"
                        rows={4}
                      />
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingNotes ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              {modal.type === 'success' && (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {modal.type === 'error' && (
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {modal.type === 'confirm' && (
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900">{modal.title}</h3>
            </div>

            {/* Modal Message */}
            <p className="text-gray-700 mb-6">{modal.message}</p>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setModal({ show: false, type: '', title: '', message: '', onConfirm: null })}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => modal.onConfirm && modal.onConfirm()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModal({ show: false, type: '', title: '', message: '', onConfirm: null })}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    modal.type === 'success' 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
