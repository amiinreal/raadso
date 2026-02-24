import { useState } from 'react'
import { api } from '../api/api'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function EmployerApps({ jobs = [], token }) {
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

  const storedToken = token || localStorage.getItem('job-platform-token')

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

  const handleSelectJob = (job) => {
    setSelectedJob(job)
    setSelectedApplication(null)
    setNotes('')
    loadJobApplications(job.id)
  }

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
              <LoadingSpinner fullScreen={false} size="md" message="Loading jobs..." />
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

  // Application detail view
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 bg-background-light overflow-hidden">
      <div className="w-full h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-4 max-w-6xl">
          {/* Header */}
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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h1>
              <p className="text-sm text-gray-600">{selectedJob.location}</p>
            </div>
          </div>

          {/* Two column layout */}
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
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredApplications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No applications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredApplications.map(app => (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedApplication(app)
                          setNotes(app.notes || '')
                        }}
                        className={`w-full p-4 text-left hover:bg-gray-50 cursor-pointer transition-colors ${selectedApplication?.id === app.id ? 'bg-blue-50' : ''}`}
                      >
                        <h4 className="font-semibold text-gray-900">{app.candidate_name || 'Unnamed'}</h4>
                        <p className="text-sm text-gray-600">{app.candidate_email}</p>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[app.status] || statusColors.applied}`}>
                          {app.status || 'applied'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Application Detail */}
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

                  {/* Detail Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-4">
                      <h3 className="text-lg font-semibold text-gray-900">{selectedApplication.candidate_name}</h3>
                      {selectedApplication.candidate_email && (
                        <p className="text-sm text-gray-600">{selectedApplication.candidate_email}</p>
                      )}
                      {selectedApplication.years_of_experience && (
                        <p className="text-sm text-gray-600 mt-2">{selectedApplication.years_of_experience}+ years experience</p>
                      )}
                    </div>

                    {/* Notes */}
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">{modal.title}</h3>
            <p className="text-gray-700 mb-6">{modal.message}</p>
            <button
              onClick={() => setModal({ show: false, type: '', title: '', message: '', onConfirm: null })}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
