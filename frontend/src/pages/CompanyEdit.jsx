import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { rankIndustriesByQuery } from '../utils/industrySearch'
import { 
  isValidLength, 
  isValidEmail, 
  isValidPhone, 
  isValidUrl, 
  isValidInteger,
  sanitizeInput 
} from '../utils/validation.js'

export function CompanyEdit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState(null)
  const [jobs, setJobs] = useState([])
  const [industries, setIndustries] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const token = localStorage.getItem('job-platform-token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    industry_id: null,
    location: '',
    description: '',
    about: '',
    mission: '',
    culture: '',
    website: '',
    logo_url: '',
    phone: '',
    company_email: '',
    company_size: '',
    founded_year: '',
    social_links: { linkedin: '', twitter: '', facebook: '', instagram: '' },
    youtube_videos: []
  })

  const [newVideo, setNewVideo] = useState({ title: '', url: '' })
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [industrySearch, setIndustrySearch] = useState('')
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)

  useEffect(() => {
    loadTenant()
    loadJobs()
    loadIndustries()
  }, [])

  useEffect(() => {
    if (formData.logo_url) {
      setLogoPreview(formData.logo_url)
    }
  }, [formData.logo_url])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showIndustryDropdown && !e.target.closest('.industry-dropdown-container')) {
        setShowIndustryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showIndustryDropdown])

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async () => {
    if (!logoFile) return formData.logo_url

    setUploading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('logo', logoFile)
      
      // Send old logo URL so backend can delete it
      if (formData.logo_url) {
        formDataObj.append('oldLogoUrl', formData.logo_url)
      }

      const response = await fetch(`${api.baseURL}/upload/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataObj
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo')
      return formData.logo_url
    } finally {
      setUploading(false)
    }
  }

  const loadTenant = async () => {
    try {
      const tenants = await api.getTenants({ userId: user.userId }, token)
      if (tenants.length > 0) {
        const t = tenants[0]
        setTenant(t)
        setFormData({
          company_name: t.company_name || '',
          industry: t.industry || '',
          industry_id: t.industry_id || null,
          location: t.location || '',
          description: t.description || '',
          about: t.about || '',
          mission: t.mission || '',
          culture: t.culture || '',
          website: t.website || '',
          logo_url: t.logo_url || '',
          phone: t.phone || '',
          company_email: t.company_email || '',
          company_size: t.company_size || '',
          founded_year: t.founded_year || '',
          social_links: t.social_links || { linkedin: '', twitter: '', facebook: '', instagram: '' },
          youtube_videos: t.youtube_videos || []
        })
        // Set industry search to show the current industry name
        if (t.industry) {
          setIndustrySearch(t.industry)
        }
      }
    } catch (error) {
      console.error('Error loading tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadIndustries = async () => {
    try {
      const response = await fetch(`${api.baseURL}/industries`)
      const data = await response.json()
      setIndustries(data)
    } catch (error) {
      console.error('Error loading industries:', error)
    }
  }

  const loadJobs = async () => {
    try {
      const allJobs = await api.getJobs({}, token)
      const tenants = await api.getTenants({ userId: user.userId }, token)
      if (tenants.length > 0) {
        const myJobs = allJobs.filter(job => job.tenant_id === tenants[0].id)
        setJobs(myJobs.filter(j => j.active))
      }
    } catch (error) {
      console.error('Error loading jobs:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSocialChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value }
    }))
    // Clear validation error for social links
    if (validationErrors[`social_${platform}`]) {
      setValidationErrors(prev => ({ ...prev, [`social_${platform}`]: undefined }))
    }
  }

  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  const addVideo = () => {
    if (newVideo.title && newVideo.url) {
      const embedId = extractYouTubeId(newVideo.url)
      if (!embedId) {
        alert('Please enter a valid YouTube URL')
        return
      }
      setFormData(prev => ({
        ...prev,
        youtube_videos: [...prev.youtube_videos, { ...newVideo, embed_id: embedId }]
      }))
      setNewVideo({ title: '', url: '' })
    }
  }

  const removeVideo = (index) => {
    setFormData(prev => ({
      ...prev,
      youtube_videos: prev.youtube_videos.filter((_, i) => i !== index)
    }))
  }

  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const videos = [...formData.youtube_videos]
    const draggedVideo = videos[draggedIndex]
    videos.splice(draggedIndex, 1)
    videos.splice(index, 0, draggedVideo)
    
    setFormData(prev => ({ ...prev, youtube_videos: videos }))
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const validateFields = () => {
    const errors = {}
    
    // Company name validation
    if (!isValidLength(formData.company_name, 2, 200)) {
      errors.company_name = 'Company name must be 2-200 characters'
    }
    
    // Email validation
    if (formData.company_email && !isValidEmail(formData.company_email)) {
      errors.company_email = 'Invalid email address'
    }
    
    // Phone validation
    if (formData.phone && !isValidPhone(formData.phone)) {
      errors.phone = 'Invalid phone number'
    }
    
    // URL validations
    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = 'Invalid website URL'
    }
    if (formData.social_links.linkedin && !isValidUrl(formData.social_links.linkedin)) {
      errors.social_linkedin = 'Invalid LinkedIn URL'
    }
    if (formData.social_links.twitter && !isValidUrl(formData.social_links.twitter)) {
      errors.social_twitter = 'Invalid Twitter URL'
    }
    if (formData.social_links.facebook && !isValidUrl(formData.social_links.facebook)) {
      errors.social_facebook = 'Invalid Facebook URL'
    }
    if (formData.social_links.instagram && !isValidUrl(formData.social_links.instagram)) {
      errors.social_instagram = 'Invalid Instagram URL'
    }
    
    // Founded year validation
    if (formData.founded_year && !isValidInteger(formData.founded_year, 1800, new Date().getFullYear())) {
      errors.founded_year = `Founded year must be between 1800 and ${new Date().getFullYear()}`
    }
    
    // Text length validations
    if (formData.description && formData.description.length > 5000) {
      errors.description = 'Description must be under 5000 characters'
    }
    if (formData.about && formData.about.length > 5000) {
      errors.about = 'About must be under 5000 characters'
    }
    if (formData.mission && formData.mission.length > 2000) {
      errors.mission = 'Mission must be under 2000 characters'
    }
    if (formData.culture && formData.culture.length > 2000) {
      errors.culture = 'Culture must be under 2000 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tenant?.slug) {
      alert('No company profile found')
      return
    }

    if (!validateFields()) {
      return
    }

    setSaving(true)
    try {
      // Upload logo if there's a new file
      let logoUrl = formData.logo_url
      if (logoFile) {
        logoUrl = await uploadLogo()
      }

      const updatedData = {
        ...formData,
        logo_url: logoUrl,
        company_name: sanitizeInput(formData.company_name),
        industry: sanitizeInput(formData.industry),
        location: sanitizeInput(formData.location),
        description: sanitizeInput(formData.description),
        about: sanitizeInput(formData.about),
        mission: sanitizeInput(formData.mission),
        culture: sanitizeInput(formData.culture),
        website: sanitizeInput(formData.website),
        phone: sanitizeInput(formData.phone),
        company_email: sanitizeInput(formData.company_email),
        company_size: sanitizeInput(formData.company_size),
        social_links: {
          linkedin: sanitizeInput(formData.social_links.linkedin),
          twitter: sanitizeInput(formData.social_links.twitter),
          facebook: sanitizeInput(formData.social_links.facebook),
          instagram: sanitizeInput(formData.social_links.instagram)
        }
      }
      
      const result = await api.updateCompany(tenant.slug, updatedData, token)
      alert('Company profile updated successfully!')
      navigate(`/companies/${result.slug}`)
    } catch (error) {
      console.error('Error updating company:', error)
      alert('Failed to update company profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">No company profile found</p>
          <button onClick={() => navigate('/')} className="text-primary hover:underline">Go to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 w-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-32">
      <div className="mb-8">
        <button onClick={() => navigate(`/companies/${tenant.slug}`)} className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Edit Company Profile</h1>
            <p className="text-text-secondary mt-2">Manage your company's public profile and branding</p>
          </div>
          <button type="button" onClick={() => navigate(`/companies/${tenant.slug}`)} className="px-4 py-2 border border-gray-300 text-text-main rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo & Branding */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Company Logo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Upload Logo</label>
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/jpg,image/webp,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
                  />
                  <p className="text-xs text-text-secondary mt-1">Square image, max 5MB (JPG, PNG, WebP, SVG)</p>
                  {uploading && <p className="text-xs text-primary mt-1">Uploading to CDN...</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Preview</label>
                  <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-24 w-24 object-contain rounded-lg" />
                    ) : (
                      <div className="text-center text-text-secondary">
                        <svg className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">No logo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-main mb-6">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    className={`w-full px-4 py-2 border ${validationErrors.company_name ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                    maxLength={200}
                    required
                  />
                  {validationErrors.company_name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.company_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Industry</label>
                  <div className="relative industry-dropdown-container">
                    <input
                      type="text"
                      value={industrySearch || formData.industry}
                      onChange={(e) => {
                        setIndustrySearch(e.target.value)
                        setShowIndustryDropdown(true)
                      }}
                      onFocus={() => setShowIndustryDropdown(true)}
                      placeholder="Search industries..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {showIndustryDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            handleChange('industry_id', null)
                            handleChange('industry', '')
                            setIndustrySearch('')
                            setShowIndustryDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm border-b"
                        >
                          No Industry
                        </button>
                        {rankIndustriesByQuery(industries, industrySearch).map(({ category, items }) => (
                          <div key={category}>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                              {category}
                            </div>
                            {items.map((ind) => (
                              <button
                                key={ind.id}
                                type="button"
                                onClick={() => {
                                  handleChange('industry_id', ind.id)
                                  handleChange('industry', ind.name)
                                  setIndustrySearch(ind.name)
                                  setShowIndustryDropdown(false)
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                              >
                                {ind.name}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="e.g., Oslo, Norway" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Company Size</label>
                  <select value={formData.company_size} onChange={(e) => handleChange('company_size', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Founded Year</label>
                  <input type="number" value={formData.founded_year} onChange={(e) => handleChange('founded_year', e.target.value)} placeholder="2020" min="1800" max={new Date().getFullYear()} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">Website</label>
                  <input type="url" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="https://example.com" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* Company Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-main mb-6">Company Description</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Short Description</label>
                  <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows="3" placeholder="Brief overview for listings..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                  <p className="text-xs text-text-secondary mt-1">Max 250 characters - shown in company listings</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">About Company</label>
                  <textarea value={formData.about} onChange={(e) => handleChange('about', e.target.value)} rows="6" placeholder="Detailed company overview, history, what you do..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Mission Statement</label>
                  <textarea value={formData.mission} onChange={(e) => handleChange('mission', e.target.value)} rows="4" placeholder="Your company's mission and goals..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Culture & Values</label>
                  <textarea value={formData.culture} onChange={(e) => handleChange('culture', e.target.value)} rows="4" placeholder="Company culture, values, work environment..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* YouTube Videos with Drag & Drop */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Company Videos
              </h2>

              {/* Add Video */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-text-main mb-4">Add Video</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" value={newVideo.title} onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))} placeholder="Video Title" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                  <input type="url" value={newVideo.url} onChange={(e) => setNewVideo(prev => ({ ...prev, url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                  <button type="button" onClick={addVideo} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
                    Add Video
                  </button>
                </div>
              </div>

              {/* Video List with Drag & Drop */}
              {formData.youtube_videos.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary mb-3">💡 Drag to reorder - first video appears at top of profile</p>
                  {formData.youtube_videos.map((video, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-all cursor-move ${
                        draggedIndex === index ? 'border-primary bg-primary/5 shadow-lg' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-gray-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="text-sm font-semibold">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-text-main">{video.title}</h4>
                        <p className="text-sm text-text-secondary truncate">{video.url}</p>
                      </div>
                      <button type="button" onClick={() => removeVideo(index)} className="text-red-600 hover:text-red-700 p-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">No videos added yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-main mb-6">Contact Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Email *</label>
                  <input type="email" value={formData.company_email} onChange={(e) => handleChange('company_email', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Phone *</label>
                  <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" required />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-main mb-6">Social Media</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    LinkedIn
                  </label>
                  <input type="url" value={formData.social_links.linkedin} onChange={(e) => handleSocialChange('linkedin', e.target.value)} placeholder="https://linkedin.com/company/..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path></svg>
                    Twitter
                  </label>
                  <input type="url" value={formData.social_links.twitter} onChange={(e) => handleSocialChange('twitter', e.target.value)} placeholder="https://twitter.com/..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </label>
                  <input type="url" value={formData.social_links.facebook} onChange={(e) => handleSocialChange('facebook', e.target.value)} placeholder="https://facebook.com/..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Instagram
                  </label>
                  <input type="url" value={formData.social_links.instagram} onChange={(e) => handleSocialChange('instagram', e.target.value)} placeholder="https://instagram.com/..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* Open Positions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-main">Open Positions</h2>
                <span className="px-2 py-1 bg-primary text-white text-xs font-semibold rounded-full">{jobs.length}</span>
              </div>
              {jobs.length > 0 ? (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-3 border border-gray-200 rounded-lg hover:border-primary transition-colors">
                      <h4 className="font-semibold text-text-main text-sm">{job.title}</h4>
                      <p className="text-xs text-text-secondary mt-1">{job.location}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">{job.employment_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-sm text-center py-4">No active positions</p>
              )}
              <button type="button" onClick={() => navigate('/create-job')} className="w-full mt-4 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-indigo-50 transition-colors text-sm font-semibold">
                + Create New Job
              </button>
            </div>
          </div>
        </div>

        {/* Save Button (Sticky Bottom) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-10">
          <div className="max-w-7xl mx-auto flex gap-4 justify-end">
            <button type="button" onClick={() => navigate(`/companies/${tenant.slug}`)} className="px-6 py-3 border border-gray-300 text-text-main rounded-lg hover:bg-gray-50 transition-colors font-semibold" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" disabled={saving}>
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      </div>
    </main>
  )
}
