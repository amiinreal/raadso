import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isValidLength, sanitizeInput, validateDocumentFile } from '../utils/validation.js'
import { api } from '../api/api.js'
import { JobDetailContent } from '../components/JobDetailContent'

export function Apply({ job, jobs = [], onPickJob, candidateProfile, onSubmit, submitting, isEmployerPreview = false }) {
  const navigate = useNavigate()
  const [useProfile, setUseProfile] = useState(true)
  const [useCv, setUseCv] = useState(true)
  const [coverLetter, setCoverLetter] = useState('')
  const [search, setSearch] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [customFiles, setCustomFiles] = useState({}) // Store File objects
  const [uploading, setUploading] = useState({})
  const token = localStorage.getItem('job-platform-token')

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobs.slice(0, 8)
    return jobs
      .filter(j => {
        const title = (j.title || '').toLowerCase()
        const comp = (j.company_name || '').toLowerCase()
        const loc = (j.location || '').toLowerCase()
        return title.includes(q) || comp.includes(q) || loc.includes(q)
      })
      .slice(0, 10)
  }, [jobs, search])

  if (!job) return null
  
  // Employer preview mode - show layout but disable application
  if (isEmployerPreview) {
    return (
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-6xl grid lg:grid-cols-3 gap-6">
          {/* Job Details Sidebar - Same as candidate view */}
          <div className="hidden lg:block lg:col-span-1 max-h-screen overflow-y-auto custom-scrollbar">
            <div className="grid-card sticky top-6">
              {job.logo_url ? (
                <img src={job.logo_url} alt={job.company_name} className="h-12 w-12 rounded-lg object-cover border mb-4" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold mb-4">
                  {(job.company_name || 'JP').substring(0,2).toUpperCase()}
                </div>
              )}
              <h3 className="text-lg font-bold text-slate-900 mb-1">{job.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{job.company_name || 'Company'}</p>
              
              <div className="space-y-2 text-sm mb-4">
                <p className="text-slate-700"><span className="font-semibold">📍</span> {job.location}</p>
                <p className="text-slate-700"><span className="font-semibold">💼</span> {job.employment_type}</p>
                {job.workplace_type && <p className="text-slate-700"><span className="font-semibold">🏢</span> {job.workplace_type}</p>}
                {job.seniority_level && <p className="text-slate-700"><span className="font-semibold">⭐</span> {job.seniority_level}</p>}
              </div>

              {(job.salary_min || job.salary_max) && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <p className="text-xs font-semibold text-green-900">
                    {job.salary_min ? `${job.salary_min.toLocaleString()}` : ''}{job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : ''} {job.currency || 'USD'}
                  </p>
                </div>
              )}

              {job.about_role && (
                <div className="mb-4">
                  <h4 className="font-semibold text-slate-900 mb-2 text-xs">About Role</h4>
                  <p className="text-xs text-slate-700 line-clamp-3">{job.about_role}</p>
                </div>
              )}

              {job.required_skills && job.required_skills.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 text-xs">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {job.required_skills.slice(0, 5).map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                    {job.required_skills.length > 5 && <span className="px-2 py-1 text-xs text-slate-600">+{job.required_skills.length - 5}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Application Form Area - Preview Notice */}
          <div className="lg:col-span-2">
            {/* Employer Preview Notice */}
            <div className="grid-card bg-blue-50 border-blue-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">👁️ Employer Preview Mode</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    This is exactly how your job application page looks to candidates. The layout, form fields, and requirements shown below are what applicants will see.
                  </p>
                  <p className="text-sm text-blue-700 font-medium mb-3">
                    ⚠️ You cannot apply to your own job posting.
                  </p>
                  <button
                    onClick={() => navigate('/employer-dashboard')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    ← Back to Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Show actual application form layout as candidates see it */}
            <div className="grid-card">
              <div className="mb-6">
                <span className="pill inline-block mb-3">Application Preview</span>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Apply for {job.title}</h2>
                <p className="text-sm text-slate-600">Below is what candidates will see when applying for this position</p>
              </div>

              {/* Application Requirements Section */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Application Requirements
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {job.require_profile && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Candidate profile will be shared with employer</span>
                    </li>
                  )}
                  {job.require_profile && job.require_experience && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>At least one work experience entry required</span>
                    </li>
                  )}
                  {job.require_profile && job.require_education && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>At least one education entry required</span>
                    </li>
                  )}
                  {job.require_profile && job.require_nationality && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Nationality information required</span>
                    </li>
                  )}
                  {job.require_profile && Array.isArray(job.require_languages) && job.require_languages.length > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Languages required: {job.require_languages.join(', ')}</span>
                    </li>
                  )}
                  {job.require_cv && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>CV attachment required</span>
                    </li>
                  )}
                  {Array.isArray(job.custom_file_requirements) && job.custom_file_requirements.length > 0 && (
                    <>
                      {job.custom_file_requirements.map(req => (
                        <li key={req.id} className="flex items-start gap-2">
                          <span className={req.required ? "text-green-600 mt-0.5" : "text-blue-600 mt-0.5"}>{req.required ? '✓' : '○'}</span>
                          <span>
                            {req.name} {req.required ? '(required)' : '(optional)'}
                            {req.fileTypes?.length && <span className="text-slate-500"> • {req.fileTypes.join(', ')}</span>}
                          </span>
                        </li>
                      ))}
                    </>
                  )}
                  {!job.require_profile && !job.require_cv && (!job.custom_file_requirements || job.custom_file_requirements.length === 0) && (
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">○</span>
                      <span>No additional application requirements</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Form Fields Preview - Show only what's required for this job */}
              <div className="space-y-4 opacity-60 pointer-events-none">
                {job.require_profile && (
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      <input type="checkbox" checked readOnly className="mr-2" />
                      Share my candidate profile
                    </label>
                    <p className="text-xs text-slate-500 ml-6">Your profile information will be shared with the employer</p>
                  </div>
                )}
                
                {job.require_cv && (
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      <input type="checkbox" checked readOnly className="mr-2" />
                      Attach my CV
                    </label>
                    <p className="text-xs text-slate-500 ml-6">Your CV file will be included with the application</p>
                  </div>
                )}

                {/* Custom file requirements */}
                {Array.isArray(job.custom_file_requirements) && job.custom_file_requirements.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900">Additional Documents</h4>
                    {job.custom_file_requirements.map(req => (
                      <div key={req.id} className="border border-gray-200 rounded-lg p-3">
                        <label className="block text-sm font-medium text-slate-900 mb-1">
                          {req.name} {req.required && <span className="text-red-500">*</span>}
                        </label>
                        {req.description && (
                          <p className="text-xs text-slate-600 mb-2">{req.description}</p>
                        )}
                        {req.fileTypes?.length > 0 && (
                          <p className="text-xs text-slate-500 mb-2">Accepted: {req.fileTypes.join(', ')}</p>
                        )}
                        {req.maxSize && (
                          <p className="text-xs text-slate-500 mb-2">Max size: {req.maxSize}MB</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1.5 border border-gray-300 rounded text-xs bg-white">
                            Choose File
                          </button>
                          <span className="text-xs text-slate-500">No file chosen</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Cover Letter {job.require_cover_letter && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows="4"
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                    placeholder="Tell us why you're a great fit for this role..."
                    disabled
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {job.require_cover_letter ? 'Required' : 'Optional'}
                  </p>
                </div>

                <button className="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-semibold cursor-not-allowed">
                  Submit Application (Preview Only)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (job && !candidateProfile) {
    return (
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        <div className="grid lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {/* Job Summary */}
          <div className="lg:col-span-1">
            <div className="grid-card">
              {job.logo_url ? (
                <img src={job.logo_url} alt={job.company_name} className="h-12 w-12 rounded-lg object-cover border mb-4" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold mb-4">
                  {(job.company_name || 'JP').substring(0,2).toUpperCase()}
                </div>
              )}
              <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
              <p className="text-sm text-slate-600 mb-3">{job.company_name || 'Company'} • {job.location} • {job.employment_type}</p>
              {job.about_role && (
                <div className="mt-2">
                  <h4 className="font-semibold text-slate-900 mb-1 text-xs">About Role</h4>
                  <p className="text-xs text-slate-700 line-clamp-4">{job.about_role}</p>
                </div>
              )}
              {job.required_skills && job.required_skills.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-semibold text-slate-900 mb-1 text-xs">Key Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {job.required_skills.slice(0, 6).map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Requirements + CTA */}
          <div className="lg:col-span-2">
            <div className="grid-card">
              <p className="pill inline-block mb-3">Apply</p>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Sign in to apply</h2>
              <p className="text-sm text-slate-600 mb-4">Create an account or sign in to apply for this job. You'll need to meet the employer's requirements listed below.</p>

              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 mb-2">Employer requirements</h3>
                <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
                  {job.require_profile && (
                    <li>Your candidate profile will be shared with the employer</li>
                  )}
                  {job.require_profile && job.require_experience && (
                    <li>At least one work experience entry is required</li>
                  )}
                  {job.require_profile && job.require_education && (
                    <li>At least one education entry is required</li>
                  )}
                  {job.require_profile && Array.isArray(job.require_languages) && job.require_languages.length > 0 && (
                    <li>Languages required: {job.require_languages.join(', ')}</li>
                  )}
                  {job.require_profile && job.require_nationality && (
                    <li>Nationality information is required</li>
                  )}
                  {job.require_cv && (
                    <li>CV attachment is required</li>
                  )}
                  {Array.isArray(job.custom_file_requirements) && job.custom_file_requirements.length > 0 && (
                    <li>Additional documents:
                      <ul className="list-disc ml-5 mt-1 space-y-1">
                        {job.custom_file_requirements.map(req => (
                          <li key={req.id} className="text-slate-700">
                            {req.name} {req.required ? '(required)' : '(optional)'}{req.fileTypes?.length ? ` • types: ${req.fileTypes.join(', ')}` : ''}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  {!job.require_profile && !job.require_cv && (!job.custom_file_requirements || job.custom_file_requirements.length === 0) && (
                    <li>No additional application requirements</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90"
                >
                  Sign in to apply
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Create account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check if candidate meets all job requirements
  const checkRequirementsMet = () => {
    const unmetRequirements = []

    if (job.require_profile) {
      if (job.require_experience && (!candidateProfile?.workExperiences || candidateProfile.workExperiences.length === 0)) {
        unmetRequirements.push('at least one work experience')
      }
      if (job.require_education && (!candidateProfile?.educations || candidateProfile.educations.length === 0)) {
        unmetRequirements.push('at least one education entry')
      }
      // Check if candidate has ALL required languages
      if (job.require_languages && job.require_languages.length > 0) {
        const candidateLanguages = (candidateProfile?.languages || []).map(l => l.language || l)
        const missingLanguages = job.require_languages.filter(required => 
          !candidateLanguages.some(candidate => 
            candidate.toLowerCase() === required.toLowerCase()
          )
        )
        if (missingLanguages.length > 0) {
          unmetRequirements.push(`languages (missing: ${missingLanguages.join(', ')})`)
        }
      }
      if (job.require_nationality && !candidateProfile?.profile?.nationality) {
        unmetRequirements.push('nationality information')
      }
    }

    return unmetRequirements
  }

  const unmetRequirements = checkRequirementsMet()
  const canApply = unmetRequirements.length === 0

  // Store selected file locally (not uploaded yet)
  const handleFileSelect = (requirementId, file) => {
    if (!file) return

    // Validate file
    const validation = validateDocumentFile(file)
    if (!validation.valid) {
      setValidationErrors(prev => ({ ...prev, [requirementId]: validation.error }))
      return
    }

    // Store file in state (will be uploaded on form submit)
    setCustomFiles(prev => ({
      ...prev,
      [requirementId]: file
    }))
    setValidationErrors(prev => ({ ...prev, [requirementId]: undefined }))
  }

  // Upload files to Bunny CDN when form is submitted
  const uploadFilesToBunny = async (filesToUpload) => {
    const uploadedFiles = {}
    
    for (const [requirementId, file] of Object.entries(filesToUpload)) {
      if (!file) continue
      
      try {
        setUploading(prev => ({ ...prev, [requirementId]: true }))
        
        const formDataObj = new FormData()
        formDataObj.append('file', file)

        const response = await fetch(`${api.baseURL}/upload/document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataObj
        })

        if (!response.ok) {
          throw new Error('Failed to upload file')
        }

        const data = await response.json()
        uploadedFiles[requirementId] = {
          fileName: file.name,
          fileUrl: data.url
        }
      } catch (err) {
        console.error('Upload failed:', err)
        setValidationErrors(prev => ({ ...prev, [requirementId]: 'Failed to upload file' }))
        throw err
      } finally {
        setUploading(prev => ({ ...prev, [requirementId]: false }))
      }
    }
    
    return uploadedFiles
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate cover letter length
    if (coverLetter && coverLetter.length > 5000) {
      setValidationErrors({ coverLetter: 'Cover letter must be under 5000 characters' })
      return
    }

    // Check required fields
    const errors = {}
    
    // Profile requirement checks
    if (job.require_profile && !useProfile) {
      errors.profile = 'Profile is required for this job'
    }
    if (job.require_profile && useProfile) {
      // Check experience requirement
      if (job.require_experience && (!candidateProfile?.workExperiences || candidateProfile.workExperiences.length === 0)) {
        errors.experience = 'You must add at least one work experience to apply to this job'
      }
      // Check education requirement
      if (job.require_education && (!candidateProfile?.educations || candidateProfile.educations.length === 0)) {
        errors.education = 'You must add at least one education entry to apply to this job'
      }
      // Check languages requirement - must have ALL required languages
      if (job.require_languages && job.require_languages.length > 0) {
        const candidateLanguages = (candidateProfile?.languages || []).map(l => l.language || l)
        const missingLanguages = job.require_languages.filter(required => 
          !candidateLanguages.some(candidate => 
            candidate.toLowerCase() === required.toLowerCase()
          )
        )
        if (missingLanguages.length > 0) {
          errors.languages = `You must add the following languages to apply: ${missingLanguages.join(', ')}`
        }
      }
      // Check nationality requirement
      if (job.require_nationality && !candidateProfile?.profile?.nationality) {
        errors.nationality = 'You must specify your nationality to apply to this job'
      }
    }
    
    // CV requirement check
    if (job.require_cv && !job.require_profile && !useCv) {
      errors.cv = 'CV is required for this job'
    }
    
    // Custom file requirements
    if (job.custom_file_requirements) {
      for (const req of job.custom_file_requirements) {
        if (req.required && !customFiles[req.id]) {
          errors[req.id] = `${req.name} is required`
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors({})

    try {
      // Upload all files to Bunny CDN
      const uploadedFiles = await uploadFilesToBunny(customFiles)

      // Build customFiles array with URLs
      const customFilesArray = job.custom_file_requirements?.map(req => ({
        requirementId: req.id,
        requirementName: req.name,
        ...(uploadedFiles[req.id] || { fileName: '', fileUrl: '' })
      })) || []

      // Submit application with file URLs
      onSubmit?.({
        jobId: job.id,
        candidateId: candidateProfile.id,
        usedProfile: useProfile,
        usedCv: useCv,
        coverLetter: sanitizeInput(coverLetter),
        customFiles: customFilesArray
      })
    } catch (err) {
      console.error('Failed to submit application:', err)
      setValidationErrors({ submit: 'Failed to upload files. Please try again.' })
    }
  }

  if (!job) return null

  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-6xl grid lg:grid-cols-3 gap-6">
        {/* Job Details - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:block lg:col-span-1 max-h-screen overflow-y-auto custom-scrollbar">
          <div className="grid-card sticky top-6">
            {job.logo_url ? (
              <img src={job.logo_url} alt={job.company_name} className="h-12 w-12 rounded-lg object-cover border mb-4" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold mb-4">
                {(job.company_name || 'JP').substring(0,2).toUpperCase()}
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-900 mb-1">{job.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{job.company_name || 'Company'}</p>
            
            <div className="space-y-2 text-sm mb-4">
              <p className="text-slate-700"><span className="font-semibold">📍</span> {job.location}</p>
              <p className="text-slate-700"><span className="font-semibold">💼</span> {job.employment_type}</p>
              {job.workplace_type && <p className="text-slate-700"><span className="font-semibold">🏢</span> {job.workplace_type}</p>}
              {job.seniority_level && <p className="text-slate-700"><span className="font-semibold">⭐</span> {job.seniority_level}</p>}
            </div>

            {(job.salary_min || job.salary_max) && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-xs font-semibold text-green-900">
                  {job.salary_min ? `${job.salary_min.toLocaleString()}` : ''}{job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : ''} {job.currency || 'USD'}
                </p>
              </div>
            )}

            {job.about_role && (
              <div className="mb-4">
                <h4 className="font-semibold text-slate-900 mb-2 text-xs">About Role</h4>
                <p className="text-xs text-slate-700 line-clamp-3">{job.about_role}</p>
              </div>
            )}

            {job.required_skills && job.required_skills.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2 text-xs">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {job.required_skills.slice(0, 5).map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {skill}
                    </span>
                  ))}
                  {job.required_skills.length > 5 && <span className="px-2 py-1 text-xs text-slate-600">+{job.required_skills.length - 5}</span>}
                </div>
              </div>
            )}

            <a
              href={`/jobs/${job.ad_number || job.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full text-sm text-primary hover:text-primary/80 font-medium py-2 px-3 hover:bg-primary/5 rounded-lg transition-colors text-center"
            >
              View Details in New Tab →
            </a>
          </div>
        </div>

        {/* Mobile Job Navigation - Only visible on mobile */}
        <div className="lg:hidden mb-4">
          <a
            href={`/jobs/${job.ad_number || job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">{job.title}</h3>
              <p className="text-sm text-slate-600">{job.company_name || 'Company'} • {job.location}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Application Form - Full width on mobile, col-span-2 on desktop */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="grid-card">
          <p className="pill inline-block mb-3">Apply</p>
      
      {/* Warning if requirements not met */}
      {!canApply && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-10a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-900">Cannot apply - Missing requirements</h3>
              <p className="text-sm text-red-800 mt-1">To apply for this job, you must complete your profile with:</p>
              <ul className="text-sm text-red-800 mt-2 ml-4 space-y-1">
                {unmetRequirements.map((req, idx) => (
                  <li key={idx} className="list-disc">{req}</li>
                ))}
              </ul>
              <p className="text-sm text-red-700 mt-3 font-medium">Please update your profile and try again.</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{job.title}</h2>
          <p className="text-sm text-slate-500 mb-2">{job.company_name || 'Company'} · {job.location} · {job.employment_type}</p>
        </div>
        {/* Removed secondary job search box per UX: applying to a chosen job shouldn't prompt another search */}
      </div>

      <div className="grid gap-3">
        {job.require_profile && (
          <label className={`flex items-start gap-3 text-sm ${validationErrors.profile ? 'text-red-600' : 'text-slate-700'}`}>
            <input 
              type="checkbox" 
              checked={useProfile} 
              onChange={(e) => {
                setUseProfile(e.target.checked)
                if (validationErrors.profile && e.target.checked) {
                  setValidationErrors(prev => ({ ...prev, profile: undefined }))
                }
              }}
              className="mt-1" 
            />
            <span>
              <span className="font-semibold">Use my saved profile *</span>
              <br />
              <span className={validationErrors.profile ? 'text-red-600' : 'text-slate-500'}>
                {validationErrors.profile ? validationErrors.profile : 'Share experience, education, and skills from your candidate profile.'}
              </span>
            </span>
          </label>
        )}

        {!job.require_profile && (
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={useProfile} onChange={(e) => setUseProfile(e.target.checked)} className="mt-1" />
            <span>
              <span className="font-semibold">Use my saved profile</span>
              <br />
              <span className="text-slate-500">Share experience, education, and skills from your candidate profile.</span>
            </span>
          </label>
        )}

        {/* CV Attachment - Only show if employer has enabled it */}
        {job.require_cv && (
          <label className={`flex items-start gap-3 text-sm ${validationErrors.cv ? 'text-red-600' : 'text-slate-700'}`}>
            <input 
              type="checkbox" 
              checked={useCv}
              onChange={(e) => {
                setUseCv(e.target.checked)
                if (validationErrors.cv && e.target.checked) {
                  setValidationErrors(prev => ({ ...prev, cv: undefined }))
                }
              }}
              className="mt-1" 
            />
            <span>
              <span className="font-semibold">Attach CV {job.require_profile ? '' : '*'}</span>
              <br />
              <span className={validationErrors.cv ? 'text-red-600' : 'text-slate-500'}>
                {validationErrors.cv ? validationErrors.cv : 'Flag that a CV is attached or will be provided.'}
              </span>
            </span>
          </label>
        )}

        <label className="text-sm text-slate-700">
          <span className="font-semibold">Cover letter (optional)</span>
          <textarea
            value={coverLetter}
            onChange={(e) => {
              setCoverLetter(e.target.value)
              if (validationErrors.coverLetter) {
                setValidationErrors(prev => ({ ...prev, coverLetter: undefined }))
              }
            }}
            placeholder="Keep it concise. Focus on impact and alignment."
            className={`mt-2 w-full border ${validationErrors.coverLetter ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
            rows={4}
            maxLength={5000}
          />
          {validationErrors.coverLetter && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.coverLetter}</p>
          )}
        </label>

        {job.custom_file_requirements && job.custom_file_requirements.length > 0 && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="font-semibold text-slate-900 mb-4 text-sm">Required Documents</h4>
            {job.custom_file_requirements.map(req => (
              <div key={req.id} className="mb-4">
                <label className={`text-sm ${validationErrors[req.id] ? 'text-red-600' : 'text-slate-700'}`}>
                  <span className="font-semibold">{req.name} {req.required ? '*' : '(optional)'}</span>
                  {req.description && (
                    <div className="text-xs text-slate-500 mt-1">{req.description}</div>
                  )}
                  <div className="mt-2 relative">
                    <input
                      type="file"
                      onChange={(e) => handleFileSelect(req.id, e.target.files?.[0])}
                      disabled={uploading[req.id]}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:opacity-90"
                      accept={req.fileTypes?.map(t => `.${t}`).join(',')}
                    />
                    {uploading[req.id] && <p className="mt-2 text-xs text-slate-500">Uploading...</p>}
                    {customFiles[req.id] && !uploading[req.id] && (
                      <p className="mt-2 text-xs text-green-600">✓ {customFiles[req.id].name}</p>
                    )}
                    {validationErrors[req.id] && (
                      <p className="mt-2 text-xs text-red-600">{validationErrors[req.id]}</p>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Error Messages */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-900 mb-2">Please fix the following before applying:</h4>
          <ul className="space-y-1 text-sm text-red-800">
            {validationErrors.profile && <li>• {validationErrors.profile}</li>}
            {validationErrors.experience && <li>• {validationErrors.experience}</li>}
            {validationErrors.education && <li>• {validationErrors.education}</li>}
            {validationErrors.languages && <li>• {validationErrors.languages}</li>}
            {validationErrors.nationality && <li>• {validationErrors.nationality}</li>}
            {validationErrors.cv && <li>• {validationErrors.cv}</li>}
            {validationErrors.coverLetter && <li>• {validationErrors.coverLetter}</li>}
            {validationErrors.submit && <li>• {validationErrors.submit}</li>}
            {Object.entries(validationErrors).map(([key, error]) => {
              if (!['profile', 'experience', 'education', 'languages', 'nationality', 'cv', 'coverLetter', 'submit'].includes(key) && error) {
                return <li key={key}>• {error}</li>
              }
              return null
            })}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !canApply}
        title={!canApply ? 'Complete missing profile requirements to apply' : ''}
        className={`mt-4 px-4 py-3 w-full rounded-lg font-semibold shadow-soft transition-all ${
          !canApply 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-primary text-white hover:opacity-90 disabled:opacity-50'
        }`}
      >
        {submitting ? 'Submitting...' : canApply ? 'Submit application' : 'Complete profile to apply'}
      </button>
      </form>
        </div>
      </div>
    </div>
  )
}
