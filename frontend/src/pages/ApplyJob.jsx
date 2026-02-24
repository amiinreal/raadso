import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/api'
import { Apply } from './Apply'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useTranslation } from '../i18n/TranslationProvider'

export function ApplyJob({ token, candidateId, candidate, user, tenant }) {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [job, setJob] = useState(null)
  const [candidateProfile, setCandidateProfile] = useState(null)
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [isOwnJob, setIsOwnJob] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)

  const authToken = token || localStorage.getItem('job-platform-token')

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
        } else if (candidateId) {
          const profile = await api.getCandidate(candidateId, authToken)
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
  }, [jobId, candidateId, authToken, candidate, userRole, tenantId])

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingData, setPendingData] = useState(null)

  const handlePickJob = (selectedJob) => {
    setJob(selectedJob)
    const jobIdentifier = selectedJob.ad_number || selectedJob.id
    navigate(`/apply/${jobIdentifier}`)
  }

  const handleSubmit = (formData) => {
    if (!job) return
    setPendingData(formData)
    setShowConfirmModal(true)
  }

  const confirmSubmit = async () => {
    if (!pendingData) return
    setShowConfirmModal(false)
    setSubmitting(true)
    try {
      await api.submitApplication(
        pendingData,
        authToken
      )
      setShowSuccessModal(true)
    } catch (err) {
      console.error('Failed to submit application:', err)
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
      setPendingData(null)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    navigate('/applications')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
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
    <>
      <Apply
        job={job}
        jobs={allJobs}
        onPickJob={handlePickJob}
        candidateProfile={candidateProfile}
        onSubmit={handleSubmit}
        submitting={submitting}
        isEmployerPreview={isOwnJob}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <div className="p-8">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">Ready to Apply?</h3>
              <p className="text-gray-600 text-center mb-8">
                You're about to submit your application for <span className="font-semibold text-gray-900">{job?.title}</span> at <span className="font-semibold text-gray-900">{job?.company_name}</span>.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmSubmit}
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  {submitting ? 'Submitting...' : 'Confirm & Submit'}
                  {!submitting && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold transition-all"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-green-500 w-full" />
            <div className="p-8">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">{t('apply.messages.successTitle')}</h3>
              <p className="text-gray-600 text-center mb-8">
                {t('apply.messages.successDescription')}
              </p>

              <button
                onClick={handleSuccessClose}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98]"
              >
                {t('apply.messages.successButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowErrorModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-red-500 w-full" />
            <div className="p-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">{t('apply.messages.errorTitle')}</h3>
              <p className="text-gray-600 text-center mb-8">
                {t('apply.messages.errorDescription')}
              </p>

              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all transform active:scale-[0.98]"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
