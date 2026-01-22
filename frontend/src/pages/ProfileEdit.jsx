import { useEffect, useState } from 'react'
import { 
  isValidLength, 
  isValidEmail, 
  isValidPhone, 
  isValidUrl, 
  isValidInteger,
  sanitizeInput 
} from '../utils/validation.js'
import { api } from '../api/api.js'

export function ProfileEdit({ profile, onSave, saving }) {
  const [validationErrors, setValidationErrors] = useState({})
  const [masterNationalities, setMasterNationalities] = useState([])
  const [loadingNationalities, setLoadingNationalities] = useState(true)
  
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    headline: '',
    phone: '',
    address: '',
    nationality: '',
    seniorityLevel: '',
    yearsOfExperience: '',
    cvFileUrl: '',
    portfolioUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    summary: '',
    openToWork: true,
  })

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        headline: profile.headline || '',
        phone: profile.phone || '',
        address: profile.address || '',
        nationality: profile.nationality || '',
        seniorityLevel: profile.seniority_level || '',
        yearsOfExperience: profile.years_of_experience || '',
        cvFileUrl: profile.cv_file_url || '',
        portfolioUrl: profile.portfolio_url || '',
        linkedinUrl: profile.linkedin_url || '',
        githubUrl: profile.github_url || '',
        summary: profile.summary || '',
        openToWork: profile.open_to_work ?? true,
      })
    }
  }, [profile])

  useEffect(() => {
    const fetchNationalities = async () => {
      try {
        const data = await api.getMasterNationalities()
        setMasterNationalities(data)
      } catch (err) {
        console.error('Failed to fetch nationalities:', err)
      } finally {
        setLoadingNationalities(false)
      }
    }
    fetchNationalities()
  }, [])

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const validateFields = () => {
    const errors = {}
    
    // Name validations
    if (!isValidLength(form.firstName, 1, 100)) {
      errors.firstName = 'First name must be 1-100 characters'
    }
    if (!isValidLength(form.lastName, 1, 100)) {
      errors.lastName = 'Last name must be 1-100 characters'
    }
    
    // Headline validation
    if (form.headline && form.headline.length > 200) {
      errors.headline = 'Headline must be under 200 characters'
    }
    
    // Phone validation
    if (form.phone && !isValidPhone(form.phone)) {
      errors.phone = 'Invalid phone number format'
    }
    
    // URL validations
    if (form.portfolioUrl && !isValidUrl(form.portfolioUrl)) {
      errors.portfolioUrl = 'Invalid portfolio URL'
    }
    if (form.linkedinUrl && !isValidUrl(form.linkedinUrl)) {
      errors.linkedinUrl = 'Invalid LinkedIn URL'
    }
    if (form.githubUrl && !isValidUrl(form.githubUrl)) {
      errors.githubUrl = 'Invalid GitHub URL'
    }
    if (form.cvFileUrl && !isValidUrl(form.cvFileUrl)) {
      errors.cvFileUrl = 'Invalid CV file URL'
    }
    
    // Years of experience validation
    if (form.yearsOfExperience && !isValidInteger(form.yearsOfExperience, 0, 100)) {
      errors.yearsOfExperience = 'Years of experience must be between 0 and 100'
    }
    
    // Summary length validation
    if (form.summary && form.summary.length > 2000) {
      errors.summary = 'Summary must be under 2000 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateFields()) {
      return
    }
    
    onSave?.({
      firstName: sanitizeInput(form.firstName),
      lastName: sanitizeInput(form.lastName),
      headline: sanitizeInput(form.headline),
      phone: sanitizeInput(form.phone),
      address: sanitizeInput(form.address),
      nationality: sanitizeInput(form.nationality),
      seniorityLevel: sanitizeInput(form.seniorityLevel),
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience, 10) : null,
      cvFileUrl: sanitizeInput(form.cvFileUrl),
      portfolioUrl: sanitizeInput(form.portfolioUrl),
      linkedinUrl: sanitizeInput(form.linkedinUrl),
      githubUrl: sanitizeInput(form.githubUrl),
      summary: sanitizeInput(form.summary),
      openToWork: form.openToWork,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid-card">
      <p className="pill inline-block mb-3">Profile</p>
      <h3 className="text-xl font-semibold text-slate-900">Edit your profile</h3>
      <div className="grid gap-4 mt-4">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            <span className="font-semibold">First name *</span>
            <input
              className={`w-full border ${validationErrors.firstName ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              maxLength={100}
              required
            />
            {validationErrors.firstName && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.firstName}</p>
            )}
          </label>
          <label className="text-sm text-slate-700">
            <span className="font-semibold">Last name *</span>
            <input
              className={`w-full border ${validationErrors.lastName ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              maxLength={100}
              required
            />
            {validationErrors.lastName && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.lastName}</p>
            )}
          </label>
        </div>
        
        <label className="text-sm text-slate-700">
          <span className="font-semibold">Headline</span>
          <input
            className={`w-full border ${validationErrors.headline ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
            value={form.headline}
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Senior Fullstack Engineer"
            maxLength={200}
          />
          {validationErrors.headline && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.headline}</p>
          )}
        </label>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            <span className="font-semibold">Phone</span>
            <input
              className={`w-full border ${validationErrors.phone ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              maxLength={20}
            />
            {validationErrors.phone && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.phone}</p>
            )}
          </label>
          <label className="text-sm text-slate-700">
            <span className="font-semibold">Location</span>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Remote / Austin, TX"
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            <span className="font-semibold">Nationality</span>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.nationality}
              onChange={(e) => handleChange('nationality', e.target.value)}
              disabled={loadingNationalities}
            >
              <option value="">Select Nationality</option>
              {masterNationalities.map((nat) => (
                <option key={nat.id} value={nat.name}>
                  {nat.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            <span className="font-semibold">Years of Experience</span>
            <input
              type="number"
              className={`w-full border ${validationErrors.yearsOfExperience ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
              value={form.yearsOfExperience}
              onChange={(e) => handleChange('yearsOfExperience', e.target.value)}
              placeholder="5"
              min="0"
              max="100"
            />
            {validationErrors.yearsOfExperience && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.yearsOfExperience}</p>
            )}
          </label>
        </div>

        <label className="text-sm text-slate-700">
          <span className="font-semibold">Seniority Level</span>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.seniorityLevel}
            onChange={(e) => handleChange('seniorityLevel', e.target.value)}
          >
            <option value="">Select level</option>
            <option value="entry">Entry Level</option>
            <option value="mid">Mid Level</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
            <option value="principal">Principal</option>
          </select>
        </label>
        
        <label className="text-sm text-slate-700">
          <span className="font-semibold">Summary</span>
          <textarea
            className={`w-full border ${validationErrors.summary ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
            rows={4}
            value={form.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
            placeholder="Brief overview of your background and expertise..."
            maxLength={2000}
          />
          {validationErrors.summary && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.summary}</p>
          )}
        </label>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Links & Attachments</h4>
          
          <div className="grid gap-3">
            <label className="text-sm text-slate-700">
              <span className="font-semibold">CV File URL</span>
              <input
                type="url"
                className={`w-full border ${validationErrors.cvFileUrl ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
                value={form.cvFileUrl}
                onChange={(e) => handleChange('cvFileUrl', e.target.value)}
                placeholder="https://..."
                maxLength={2048}
              />
              {validationErrors.cvFileUrl && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.cvFileUrl}</p>
              )}
            </label>
            <label className="text-sm text-slate-700">
              <span className="font-semibold">Portfolio URL</span>
              <input
                type="url"
                className={`w-full border ${validationErrors.portfolioUrl ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
                value={form.portfolioUrl}
                onChange={(e) => handleChange('portfolioUrl', e.target.value)}
                placeholder="https://..."
                maxLength={2048}
              />
              {validationErrors.portfolioUrl && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.portfolioUrl}</p>
              )}
            </label>
            <label className="text-sm text-slate-700">
              <span className="font-semibold">LinkedIn URL</span>
              <input
                type="url"
                className={`w-full border ${validationErrors.linkedinUrl ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
                value={form.linkedinUrl}
                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                maxLength={2048}
              />
              {validationErrors.linkedinUrl && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.linkedinUrl}</p>
              )}
            </label>
            <label className="text-sm text-slate-700">
              <span className="font-semibold">GitHub URL</span>
              <input
                type="url"
                className={`w-full border ${validationErrors.githubUrl ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
                value={form.githubUrl}
                onChange={(e) => handleChange('githubUrl', e.target.value)}
                placeholder="https://github.com/..."
                maxLength={2048}
              />
              {validationErrors.githubUrl && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.githubUrl}</p>
              )}
            </label>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.openToWork}
            onChange={(e) => handleChange('openToWork', e.target.checked)}
          />
          <span>Open to work</span>
        </label>
      </div>
      <button
        type="submit"
        className="mt-4 px-4 py-3 w-full rounded-lg bg-primary text-white font-semibold shadow-soft hover:opacity-90 disabled:opacity-60"
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  )
}
