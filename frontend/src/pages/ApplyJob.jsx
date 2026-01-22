import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/api'
import { Apply } from './Apply'

export function ApplyJob({ token, candidateId, candidate, user, tenant }) {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [candidateProfile, setCandidateProfile] = useState(null)
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [isOwnJob, setIsOwnJob] = useState(false)

  const authToken = token || localStorage.getItem('job-platform-token')
  const authCandidateId = candidateId || localStorage.getItem('job-platform-candidate-id')
  
  // Extract stable values to avoid dependency issues
  const userRole = user?.role
  const tenantId = tenant?.id

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Use passed candidate or load from API
        if (candidate?.profile) {
          setCandidateProfile(candidate)
        } else if (authCandidateId) {
          const profile = await api.getCandidate(authCandidateId, authToken)
          setCandidateProfile(profile)
        }

        // Load all jobs for the job picker
        const jobsList = await api.getJobs()
        setAllJobs(jobsList)

        // Load specific job if jobId is provided
        if (jobId) {
          const jobData = await api.getJob(jobId, authToken)
          setJob(jobData)
          
          // Check if user is employer viewing their own job
          if (userRole === 'employer' && tenantId && jobData.tenant_id === tenantId) {
            setIsOwnJob(true)
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load application data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [jobId, authCandidateId, authToken, candidate, userRole, tenantId])

  const handlePickJob = (selectedJob) => {
    setJob(selectedJob)
    const jobIdentifier = selectedJob.ad_number || selectedJob.id
    navigate(`/apply/${jobIdentifier}`)
  }

  const handleSubmit = async (formData) => {
    if (!job) return

    setSubmitting(true)
    try {
      const result = await api.submitApplication(
        job.id,
        authCandidateId,
        formData,
        authToken
      )
      alert('Application submitted successfully!')
      navigate('/applications')
    } catch (err) {
      console.error('Failed to submit application:', err)
      alert('Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={() => navigate('/jobs')}
            className="text-primary hover:text-primary-hover font-semibold"
          >
            Back to jobs
          </button>
        </div>
      </div>
    )
  }

  return (
    <Apply
      job={job}
      jobs={allJobs}
      onPickJob={handlePickJob}
      candidateProfile={candidateProfile}
      onSubmit={handleSubmit}
      submitting={submitting}
      isEmployerPreview={isOwnJob}
    />
  )
}
