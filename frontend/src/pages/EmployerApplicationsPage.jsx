import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export function EmployerApplicationsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState({ jobs: [], selectedJob: null, applications: [], selectedApp: null, notes: '', loading: true })

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('job-platform-token')
        const response = await fetch('http://localhost:4000/jobs', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const jobs = await response.json()
        const jobsList = Array.isArray(jobs) ? jobs : jobs?.jobs || []
        setData(prev => ({ ...prev, jobs: jobsList, loading: false }))

        // Restore state from URL parameters
        const jobIdFromUrl = searchParams.get('jobId')
        const appIdFromUrl = searchParams.get('appId')

        if (jobIdFromUrl && jobsList.length > 0) {
          // Compare as strings since job IDs are UUIDs
          const jobToSelect = jobsList.find(j => String(j.id) === String(jobIdFromUrl))
          if (jobToSelect) {
            handleSelectJob(jobToSelect, appIdFromUrl)
            return
          }
        }

        // Default: select first job if no URL params
        if (jobsList.length > 0) {
          handleSelectJob(jobsList[0])
        }
      } catch (err) {
        console.error(err)
        setData(prev => ({ ...prev, loading: false }))
      }
    }
    fetchJobs()
  }, [])

  const handleSelectJob = async (job, restoreAppId = null) => {
    try {
      const token = localStorage.getItem('job-platform-token')
      const response = await fetch(`http://localhost:4000/jobs/${job.id}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch')
      const apps = await response.json()
      const appsList = Array.isArray(apps) ? apps : apps?.applications || []

      // Update URL with selected job
      navigate(`/applications?jobId=${job.id}`, { replace: true })

      // Restore application if specified
      let appToSelect = null
      if (restoreAppId && appsList.length > 0) {
        // Compare as strings for consistency
        appToSelect = appsList.find(a => String(a.id) === String(restoreAppId))
        if (appToSelect) {
          setData(prev => ({ ...prev, selectedJob: job, applications: appsList, selectedApp: appToSelect, notes: appToSelect.notes || '' }))
          navigate(`/applications?jobId=${job.id}&appId=${appToSelect.id}`, { replace: true })
          return
        }
      }

      setData(prev => ({ ...prev, selectedJob: job, applications: appsList, selectedApp: null, notes: '' }))
    } catch (err) {
      console.error(err)
      setData(prev => ({ ...prev, selectedJob: job, applications: [], selectedApp: null, notes: '' }))
    }
  }

  const handleSelectApp = (app) => {
    setData(prev => ({ ...prev, selectedApp: app, notes: app.notes || '' }))
    // Update URL to include selected application
    if (data.selectedJob) {
      navigate(`/applications?jobId=${data.selectedJob.id}&appId=${app.id}`, { replace: true })
    }
  }

  const handleSaveNotes = async () => {
    if (!data.selectedApp) return
    try {
      const token = localStorage.getItem('job-platform-token')
      const response = await fetch(`http://localhost:4000/applications/${data.selectedApp.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: data.notes })
      })
      if (!response.ok) throw new Error('Failed to save')
      setData(prev => ({ ...prev, selectedApp: { ...prev.selectedApp, notes: prev.notes } }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!data.selectedApp) return
    try {
      const token = localStorage.getItem('job-platform-token')
      const response = await fetch(`http://localhost:4000/applications/${data.selectedApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      })
      if (!response.ok) throw new Error('Failed to update')
      setData(prev => ({ ...prev, selectedApp: { ...prev.selectedApp, status: newStatus } }))
      handleSelectJob(data.selectedJob)
    } catch (err) {
      console.error(err)
    }
  }

  const statusColors = {
    'applied': 'bg-blue-50 text-blue-700 border-blue-200',
    'reviewing': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'accepted': 'bg-green-50 text-green-700 border-green-200',
    'rejected': 'bg-red-50 text-red-700 border-red-200'
  }

  if (data.loading) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Applications Manager
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Manage Applications</h2>
          <p className="text-gray-600 text-sm">Review and manage applications for your job postings</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Your Job Postings</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {data.jobs.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-sm">No jobs posted yet</p>
                  </div>
                ) : (
                  data.jobs.map(job => (
                    <button
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${data.selectedJob?.id === job.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                    >
                      <h4 className="font-semibold text-gray-900 text-sm">{job.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{data.applications.length} applications</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!data.selectedJob ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600">Select a job to view applications</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 text-sm">Applications ({data.applications.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {data.applications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <p className="text-sm">No applications yet</p>
                      </div>
                    ) : (
                      data.applications.map(app => (
                        <button
                          key={app.id}
                          onClick={() => handleSelectApp(app)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${data.selectedApp?.id === app.id ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
                            }`}
                        >
                          <h4 className="font-semibold text-gray-900 text-sm">{app.candidate_name || 'Candidate'}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold border capitalize ${statusColors[app.status] || statusColors.applied}`}>
                              {app.status || 'applied'}
                            </span>
                            {app.ai_reviewed && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">AI Reviewed</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {data.selectedApp ? (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 text-sm">Application Details</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">CANDIDATE</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{data.selectedApp.candidate_name}</p>
                        {data.selectedApp.candidate_email && <p className="text-xs text-gray-600">{data.selectedApp.candidate_email}</p>}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">STATUS</p>
                        <div className="flex flex-wrap gap-2">
                          {['applied', 'reviewing', 'accepted', 'rejected'].map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(status)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${data.selectedApp.status === status
                                ? statusColors[status]
                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">NOTES</p>
                        <textarea
                          value={data.notes}
                          onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add notes for this application..."
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-900 placeholder-gray-500 resize-none"
                          rows="4"
                        />
                      </div>

                      <button
                        onClick={handleSaveNotes}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-600">Select an application to view details</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
