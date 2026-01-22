import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/api'
import { JobDetailContent } from '../components/JobDetailContent'

export function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true)
        const data = await api.getJob(jobId)
        setJob(data)
      } catch (err) {
        console.error('Failed to load job:', err)
        setError('Failed to load job details')
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      loadJob()
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary">Loading job details...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">{error || 'Job not found'}</p>
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

  const handleApply = () => {
    // Use ad_number if available, otherwise fall back to id
    const jobIdentifier = job.ad_number || job.id
    navigate(`/apply/${jobIdentifier}`)
  }

  return (
    <main className="flex-1 max-w-[1200px] mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col">
        {/* Mobile back button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to jobs
          </button>
          <Link
            to={`/apply/${job.id}`}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold shadow-sm flex items-center gap-2 text-sm"
          >
            Apply Now
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Job content using shared component */}
        <JobDetailContent job={job} onApply={handleApply} />
      </div>
    </main>
  )
}
