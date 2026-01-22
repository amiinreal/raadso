import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function JobSelectionList() {
    const navigate = useNavigate()
    const [data, setData] = useState({ jobs: [], loading: true, error: null })

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const token = localStorage.getItem('job-platform-token')
                const response = await fetch('http://localhost:4000/jobs', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!response.ok) throw new Error('Failed to fetch jobs')
                const jobs = await response.json()
                const jobsList = Array.isArray(jobs) ? jobs : jobs?.jobs || []
                setData({ jobs: jobsList, loading: false, error: null })
            } catch (err) {
                console.error(err)
                setData({ jobs: [], loading: false, error: err.message })
            }
        }
        fetchJobs()
    }, [])

    if (data.loading) {
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
                <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-600">Loading your jobs...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Job Applications
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Job Postings</h2>
                    <p className="text-gray-600">Select a job to review applications</p>
                </div>

                {data.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-800">Error loading jobs: {data.error}</p>
                    </div>
                )}

                {data.jobs.length === 0 && !data.error ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="max-w-sm mx-auto">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No job postings yet</h3>
                            <p className="text-sm text-gray-600 mb-6">Create your first job posting to start receiving applications</p>
                            <button
                                onClick={() => navigate('/create-job')}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                            >
                                Create Job Posting
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {data.jobs.map(job => (
                            <button
                                key={job.id}
                                onClick={() => navigate(`/applications/job/${job.id}`)}
                                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-lg hover:border-primary/30 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                                            {job.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">{job.location || 'Remote'}</p>
                                    </div>
                                    {job.active ? (
                                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded border border-green-200">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-semibold rounded border border-gray-200">
                                            Draft
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                    <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span>{job.application_count || 0} applicants</span>
                                    </div>
                                    {job.application_deadline && (
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{new Date(job.application_deadline).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">
                                        Posted {new Date(job.created_at).toLocaleDateString()}
                                    </span>
                                    <div className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                                        <span>Review applications</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
