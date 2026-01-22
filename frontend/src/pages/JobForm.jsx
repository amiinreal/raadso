import { useState, useEffect } from 'react'
import { api } from '../api/api.js'
import { 
  isValidLength, 
  isValidInteger, 
  isValidDate, 
  isValidEmail, 
  sanitizeInput,
  EMPLOYMENT_TYPES,
  WORKPLACE_TYPES,
  CURRENCIES 
} from '../utils/validation.js'

export function JobForm({ tenant, onSubmit, onCancel, saving = false, initialJob = null }) {
  const isEdit = !!initialJob
  
  const [validationErrors, setValidationErrors] = useState({})
  
  const [form, setForm] = useState({
    title: '',
    location: '',
    employmentType: 'Full-time',
    workplaceType: 'On-site',
    seniorityLevel: 'Mid-Level',
    aboutRole: '',
    aboutCompany: '',
    keyResponsibilities: [],
    requiredSkills: [],
    preferredSkills: [],
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    applicationDeadline: '',
    hiringContacts: [],
    tags: [],
    categoryId: '',
    categoryIds: [],
    techStack: [],
    requireProfile: false,
    requireCv: false,
    requireExperience: false,
    requireEducation: false,
    requireLanguages: [],
    requireNationality: '',
    customFileRequirements: [],
    active: true
  })

  const [categories, setCategories] = useState([])
  const [parentCategories, setParentCategories] = useState([])
  const [categorySearch, setCategorySearch] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParent, setNewCategoryParent] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [responsibilityInput, setResponsibilityInput] = useState('')
  const [requiredSkillInput, setRequiredSkillInput] = useState('')
  const [preferredSkillInput, setPreferredSkillInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactTitle, setContactTitle] = useState('')
  const [techStackInput, setTechStackInput] = useState('')
  const [customFileInput, setCustomFileInput] = useState({ name: '', description: '', required: false, fileTypes: [] })
  const [fileTypeInput, setFileTypeInput] = useState('')
  const [masterLanguages, setMasterLanguages] = useState([])
  const [masterNationalities, setMasterNationalities] = useState([])
  const [languageInput, setLanguageInput] = useState('')
  const [nationalityInput, setNationalityInput] = useState('')

  useEffect(() => {
    if (initialJob) {
      setForm({
        title: initialJob.title || '',
        location: initialJob.location || '',
        employmentType: initialJob.employment_type || 'Full-time',
        workplaceType: initialJob.workplace_type || 'On-site',
        seniorityLevel: initialJob.seniority_level || 'Mid-Level',
        aboutRole: initialJob.about_role || '',
        aboutCompany: initialJob.about_company || '',
        keyResponsibilities: initialJob.key_responsibilities || [],
        requiredSkills: initialJob.required_skills || [],
        preferredSkills: initialJob.preferred_skills || [],
        salaryMin: initialJob.salary_min || '',
        salaryMax: initialJob.salary_max || '',
        currency: initialJob.currency || 'USD',
        applicationDeadline: initialJob.application_deadline?.split('T')[0] || '',
        hiringContacts: initialJob.hiring_contacts || [],
        tags: initialJob.tags || [],
        categoryId: initialJob.category_id || '',
        categoryIds: initialJob.categories ? initialJob.categories.map(c => c.id) : [],
        techStack: initialJob.tech_stack || [],
        requireProfile: initialJob.require_profile || false,
        requireCv: initialJob.require_cv || false,
        requireExperience: initialJob.require_experience || false,
        requireEducation: initialJob.require_education || false,
        requireLanguages: initialJob.require_languages || [],
        requireNationality: initialJob.require_nationality || '',
        customFileRequirements: initialJob.custom_file_requirements || [],
        active: initialJob.active !== false
      })
    } else if (tenant?.description) {
      // Pre-fill aboutCompany with tenant description for new jobs
      setForm(prev => ({ ...prev, aboutCompany: tenant.description }))
    }
  }, [initialJob, tenant])

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const allCats = await api.getJobCategories()
        setCategories(allCats)
        const parents = allCats.filter(c => !c.parent_id)
        setParentCategories(parents)
      } catch (err) {
        console.error('Failed to load categories', err)
      }
    }
    loadCategories()
  }, [])

  // Fetch master languages and nationalities
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [langs, nats] = await Promise.all([
          api.getMasterLanguages(),
          api.getMasterNationalities()
        ])
        setMasterLanguages(langs)
        setMasterNationalities(nats)
      } catch (err) {
        console.error('Failed to load master languages/nationalities', err)
      }
    }
    loadMasterData()
  }, [])

  // Filter categories by search with word boundary matching
  const matchesSearch = (text, search) => {
    if (!search) return true
    const searchLower = search.toLowerCase().trim()
    const textLower = text.toLowerCase()
    
    // Split search into words and check if all words are found as separate words or at boundaries
    const searchWords = searchLower.split(/\s+/)
    return searchWords.every(word => {
      // Match whole words or at word boundaries (start of string, after space, after &)
      const wordBoundaryRegex = new RegExp(`(^|\\s|&)${word}`, 'i')
      return wordBoundaryRegex.test(text)
    })
  }

  const filteredParentCategories = categorySearch
    ? parentCategories.filter(p => {
        const matchesParent = matchesSearch(p.name, categorySearch)
        const hasMatchingChild = categories.some(c => 
          c.parent_id === p.id && matchesSearch(c.name, categorySearch)
        )
        return matchesParent || hasMatchingChild
      })
    : parentCategories

  const getFilteredChildren = (parentId) => {
    const children = categories.filter(c => c.parent_id === parentId)
    if (!categorySearch) return children
    return children.filter(c => matchesSearch(c.name, categorySearch))
  }

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) return
    
    try {
      const response = await api.createJobCategory({
        name: newCategoryName,
        parentId: newCategoryParent || null
      })
      
      // Add to local state
      const newCat = response
      setCategories(prev => [...prev, newCat])
      if (!newCat.parent_id) {
        setParentCategories(prev => [...prev, newCat])
      }
      
      // Auto-select the new category
      setForm(prev => ({ ...prev, categoryIds: [...prev.categoryIds, newCat.id] }))
      
      // Reset form
      setNewCategoryName('')
      setNewCategoryParent('')
      setShowAddCategory(false)
    } catch (err) {
      console.error('Failed to create category', err)
      alert('Failed to create category. Please try again.')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      // Handle special cases for arrays
      if (name === 'requireLanguages') {
        setForm(prev => ({ ...prev, requireLanguages: checked ? ['English'] : [] }))
      } else if (name === 'requireNationality') {
        setForm(prev => ({ ...prev, requireNationality: checked ? '' : '' }))
      } else {
        setForm(prev => ({ ...prev, [name]: checked }))
      }
    } else if (type === 'array-remove') {
      // Handle array removal (for languages)
      if (name === 'requireLanguages') {
        setForm(prev => ({
          ...prev,
          requireLanguages: prev.requireLanguages.filter((_, i) => i !== value)
        }))
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const addItem = (input, setInput, field) => {
    if (input.trim()) {
      setForm(prev => ({ ...prev, [field]: [...prev[field], input.trim()] }))
      setInput('')
    }
  }

  const removeItem = (field, index) => {
    setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))
  }

  const addContact = () => {
    if (contactName.trim() && contactEmail.trim()) {
      setForm(prev => ({
        ...prev,
        hiringContacts: [...prev.hiringContacts, {
          name: contactName.trim(),
          email: contactEmail.trim(),
          title: contactTitle.trim()
        }]
      }))
      setContactName('')
      setContactEmail('')
      setContactTitle('')
    }
  }

  const removeContact = (index) => {
    setForm(prev => ({ ...prev, hiringContacts: prev.hiringContacts.filter((_, i) => i !== index) }))
  }

  const validateFields = () => {
    const errors = {}
    
    // Title validation
    if (!isValidLength(form.title, 3, 200)) {
      errors.title = 'Title must be 3-200 characters'
    }
    
    // Location validation
    if (!isValidLength(form.location, 2, 200)) {
      errors.location = 'Location must be 2-200 characters'
    }
    
    // Description validations
    if (form.aboutRole && form.aboutRole.length > 5000) {
      errors.aboutRole = 'About role must be under 5000 characters'
    }
    if (form.aboutCompany && form.aboutCompany.length > 5000) {
      errors.aboutCompany = 'About company must be under 5000 characters'
    }
    
    // Salary validations
    if (form.salaryMin && !isValidInteger(form.salaryMin, 0)) {
      errors.salaryMin = 'Minimum salary must be a positive number'
    }
    if (form.salaryMax && !isValidInteger(form.salaryMax, 0)) {
      errors.salaryMax = 'Maximum salary must be a positive number'
    }
    if (form.salaryMin && form.salaryMax && parseInt(form.salaryMin) > parseInt(form.salaryMax)) {
      errors.salaryMax = 'Maximum salary must be greater than minimum'
    }
    
    // Deadline validation
    if (form.applicationDeadline && !isValidDate(form.applicationDeadline)) {
      errors.applicationDeadline = 'Invalid deadline date'
    }
    
    // Array length validations
    if (form.keyResponsibilities.length > 50) {
      errors.keyResponsibilities = 'Maximum 50 responsibilities allowed'
    }
    if (form.requiredSkills.length > 50) {
      errors.requiredSkills = 'Maximum 50 required skills allowed'
    }
    if (form.preferredSkills.length > 50) {
      errors.preferredSkills = 'Maximum 50 preferred skills allowed'
    }
    if (form.techStack.length > 50) {
      errors.techStack = 'Maximum 50 tech stack items allowed'
    }
    if (form.tags.length > 50) {
      errors.tags = 'Maximum 50 tags allowed'
    }
    
    // Contact email validation
    form.hiringContacts.forEach((contact, index) => {
      if (!isValidEmail(contact.email)) {
        errors[`contact_${index}`] = `Contact ${index + 1}: Invalid email address`
      }
    })
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateFields()) {
      return
    }
    
    if (form.active && !isEdit) {
      setShowConfirmDialog(true)
    } else {
      submitForm()
    }
  }

  const submitForm = () => {
    const payload = {
      tenantId: tenant?.id,
      title: sanitizeInput(form.title),
      location: sanitizeInput(form.location),
      employmentType: form.employmentType,
      workplaceType: form.workplaceType,
      seniorityLevel: sanitizeInput(form.seniorityLevel),
      aboutRole: sanitizeInput(form.aboutRole),
      aboutCompany: sanitizeInput(form.aboutCompany),
      keyResponsibilities: form.keyResponsibilities.map(r => sanitizeInput(r)),
      requiredSkills: form.requiredSkills.map(s => sanitizeInput(s)),
      preferredSkills: form.preferredSkills.map(s => sanitizeInput(s)),
      salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
      salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
      currency: form.currency,
      applicationDeadline: form.applicationDeadline || null,
      hiringContacts: form.hiringContacts.map(c => ({
        name: sanitizeInput(c.name),
        email: sanitizeInput(c.email),
        title: sanitizeInput(c.title)
      })),
      categoryId: form.categoryId,
      categoryIds: form.categoryIds,
      techStack: form.techStack.map(t => sanitizeInput(t)),
      tags: form.tags.map(t => sanitizeInput(t)),
      active: form.active,
      requireProfile: form.requireProfile,
      requireCv: form.requireCv,
      requireExperience: form.requireExperience,
      requireEducation: form.requireEducation,
      requireLanguages: form.requireLanguages,
      requireNationality: form.requireNationality,
      customFileRequirements: form.customFileRequirements
    }
    setShowConfirmDialog(false)
    onSubmit(payload)
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-3 border border-purple-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEdit ? 'Edit Job' : 'Create New Job'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{isEdit ? 'Update Job Posting' : 'Post a New Job'}</h2>
              <p className="text-gray-600 text-sm">Fill in the details below to {isEdit ? 'update your' : 'create a new'} job listing</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Job Title *</label>
                    <input 
                      name="title" 
                      value={form.title} 
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.title) {
                          setValidationErrors(prev => ({ ...prev, title: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border ${validationErrors.title ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      placeholder="e.g. Senior Frontend Developer" 
                      maxLength={200}
                      required 
                    />
                    {validationErrors.title && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                    <input 
                      name="location" 
                      value={form.location}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.location) {
                          setValidationErrors(prev => ({ ...prev, location: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border ${validationErrors.location ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      placeholder="e.g. New York, NY or Remote"
                      maxLength={200}
                    />
                    {validationErrors.location && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.location}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Application Deadline</label>
                    <input 
                      type="date" 
                      name="applicationDeadline"
                      value={form.applicationDeadline}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.applicationDeadline) {
                          setValidationErrors(prev => ({ ...prev, applicationDeadline: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border ${validationErrors.applicationDeadline ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                    />
                    {validationErrors.applicationDeadline && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.applicationDeadline}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Job Category
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Select Categories (Multiple) *</label>
                    <p className="text-xs text-gray-600 mb-3">Select one or more categories that best describe this job</p>
                    
                    {/* Search and Add Category */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddCategory(!showAddCategory)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-semibold flex items-center gap-1"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New
                      </button>
                    </div>

                    {/* Add Custom Category Form */}
                    {showAddCategory && (
                      <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Add Custom Category</h4>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                          />
                          <select
                            value={newCategoryParent}
                            onChange={(e) => setNewCategoryParent(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                          >
                            <option value="">-- Select parent category (optional) --</option>
                            {parentCategories.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleAddCustomCategory}
                              className="px-3 py-1.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary-hover"
                            >
                              Create & Select
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddCategory(false)
                                setNewCategoryName('')
                                setNewCategoryParent('')
                              }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto custom-scrollbar p-4 border border-gray-200 rounded-lg bg-gray-50">
                      {filteredParentCategories.length === 0 && categorySearch && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No categories found for "{categorySearch}". Try adding a custom category.
                        </div>
                      )}
                      {filteredParentCategories.map(parent => {
                        const children = getFilteredChildren(parent.id)
                        if (children.length === 0 && categorySearch) return null
                        return (
                          <div key={parent.id} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="font-semibold text-gray-700 mb-2 text-sm">{parent.name}</div>
                            <div className="space-y-1 ml-2">
                              {children.map(cat => (
                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={form.categoryIds.includes(cat.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setForm(prev => ({ ...prev, categoryIds: [...prev.categoryIds, cat.id] }))
                                      } else {
                                        setForm(prev => ({ ...prev, categoryIds: prev.categoryIds.filter(id => id !== cat.id) }))
                                      }
                                    }}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-gray-700">{cat.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {form.categoryIds.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {form.categoryIds.map(catId => {
                          const cat = categories.find(c => c.id === catId)
                          return cat ? (
                            <span key={catId} className="px-3 py-1 bg-primary text-white rounded-full text-xs font-semibold flex items-center gap-1">
                              {cat.name}
                              <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, categoryIds: prev.categoryIds.filter(id => id !== catId) }))}
                                className="hover:bg-primary-hover rounded-full"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Job Classification
                </h3>
                <div className="grid md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Employment Type</label>
                    <select 
                      name="employmentType" 
                      value={form.employmentType} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all sm:text-sm"
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Freelance</option>
                      <option>Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Workplace Type</label>
                    <select 
                      name="workplaceType" 
                      value={form.workplaceType} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all sm:text-sm"
                    >
                      <option>On-site</option>
                      <option>Remote</option>
                      <option>Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Seniority Level</label>
                    <select 
                      name="seniorityLevel" 
                      value={form.seniorityLevel} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all sm:text-sm"
                    >
                      <option>Internship</option>
                      <option>Entry Level</option>
                      <option>Mid-Level</option>
                      <option>Senior</option>
                      <option>Lead</option>
                      <option>Executive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Job Description
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">About the Role</label>
                    <textarea 
                      name="aboutRole" 
                      value={form.aboutRole}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.aboutRole) {
                          setValidationErrors(prev => ({ ...prev, aboutRole: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border ${validationErrors.aboutRole ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      placeholder="Describe the role and what the candidate will be doing..." 
                      rows={4}
                      maxLength={5000}
                    />
                    {validationErrors.aboutRole && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.aboutRole}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">About the Company</label>
                    <textarea 
                      name="aboutCompany" 
                      value={form.aboutCompany}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.aboutCompany) {
                          setValidationErrors(prev => ({ ...prev, aboutCompany: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border ${validationErrors.aboutCompany ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      placeholder="Tell candidates about your company..." 
                      rows={3}
                      maxLength={5000}
                    />
                    {validationErrors.aboutCompany && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.aboutCompany}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Key Responsibilities
                </h3>
                <div>
                  <div className="flex gap-2 mb-3">
                    <input 
                      value={responsibilityInput} 
                      onChange={(e) => setResponsibilityInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(responsibilityInput, setResponsibilityInput, 'keyResponsibilities'))}
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                      placeholder="Add a responsibility (press Enter)" 
                    />
                    <button 
                      type="button" 
                      onClick={() => addItem(responsibilityInput, setResponsibilityInput, 'keyResponsibilities')}
                      className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.keyResponsibilities.map((item, i) => (
                      <span key={i} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2 border border-blue-100">
                        {item}
                        <button type="button" onClick={() => removeItem('keyResponsibilities', i)} className="text-blue-600 hover:text-blue-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Skills & Requirements
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Required Skills</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        value={requiredSkillInput} 
                        onChange={(e) => setRequiredSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(requiredSkillInput, setRequiredSkillInput, 'requiredSkills'))}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                        placeholder="Add a required skill" 
                      />
                      <button 
                        type="button" 
                        onClick={() => addItem(requiredSkillInput, setRequiredSkillInput, 'requiredSkills')}
                        className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-all"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.requiredSkills.map((item, i) => (
                        <span key={i} className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                          {item}
                          <button type="button" onClick={() => removeItem('requiredSkills', i)} className="text-red-600 hover:text-red-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Preferred Skills (Optional)</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        value={preferredSkillInput} 
                        onChange={(e) => setPreferredSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(preferredSkillInput, setPreferredSkillInput, 'preferredSkills'))}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                        placeholder="Add a preferred skill" 
                      />
                      <button 
                        type="button" 
                        onClick={() => addItem(preferredSkillInput, setPreferredSkillInput, 'preferredSkills')}
                        className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-all"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.preferredSkills.map((item, i) => (
                        <span key={i} className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2 border border-green-100">
                          {item}
                          <button type="button" onClick={() => removeItem('preferredSkills', i)} className="text-green-600 hover:text-green-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tech Stack - Only for IT-related jobs */}
              {form.categoryIds.some(catId => {
                const cat = categories.find(c => c.id === catId)
                return cat?.parent_id === (parentCategories.find(p => p.name === 'Technology & IT')?.id || '')
              }) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Tech Stack
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Technologies & Tools</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        value={techStackInput} 
                        onChange={(e) => setTechStackInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(techStackInput, setTechStackInput, 'techStack'))}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                        placeholder="e.g. React, Node.js, PostgreSQL" 
                      />
                      <button 
                        type="button" 
                        onClick={() => addItem(techStackInput, setTechStackInput, 'techStack')}
                        className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-all"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.techStack.map((item, i) => (
                        <span key={i} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm flex items-center gap-2 border border-purple-100">
                          {item}
                          <button type="button" onClick={() => removeItem('techStack', i)} className="text-purple-600 hover:text-purple-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Compensation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Compensation (Optional)
                </h3>
                <div className="grid md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Minimum Salary (Optional)</label>
                    <input 
                      type="number" 
                      name="salaryMin" 
                      value={form.salaryMin}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.salaryMin) {
                          setValidationErrors(prev => ({ ...prev, salaryMin: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border ${validationErrors.salaryMin ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      placeholder="50000"
                      min="0"
                    />
                    {validationErrors.salaryMin && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.salaryMin}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Maximum Salary (Optional)</label>
                    <input 
                      type="number" 
                      name="salaryMax" 
                      value={form.salaryMax}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.salaryMax) {
                          setValidationErrors(prev => ({ ...prev, salaryMax: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border ${validationErrors.salaryMax ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      placeholder="80000"
                      min="0"
                    />
                    {validationErrors.salaryMax && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.salaryMax}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Currency</label>
                    <select 
                      name="currency" 
                      value={form.currency} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all sm:text-sm"
                    >
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>CAD</option>
                      <option>AUD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Tags
                </h3>
                <div>
                  <div className="flex gap-2 mb-3">
                    <input 
                      value={tagInput} 
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(tagInput, setTagInput, 'tags'))}
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                      placeholder="Add tags like React, TypeScript, etc." 
                    />
                    <button 
                      type="button" 
                      onClick={() => addItem(tagInput, setTagInput, 'tags')}
                      className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((item, i) => (
                      <span key={i} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm flex items-center gap-2 border border-purple-100">
                        {item}
                        <button type="button" onClick={() => removeItem('tags', i)} className="text-purple-600 hover:text-purple-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hiring Contacts */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Hiring Contacts (Optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">Add contact information for hiring managers or recruiters candidates can reach out to.</p>
                <div className="space-y-3">
                  <div className="grid md:grid-cols-3 gap-3">
                    <input 
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addContact())}
                      className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                      placeholder="Contact name" 
                    />
                    <input 
                      type="email"
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addContact())}
                      className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                      placeholder="Email address" 
                    />
                    <input 
                      value={contactTitle} 
                      onChange={(e) => setContactTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addContact())}
                      className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" 
                      placeholder="Job title (optional)" 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={addContact}
                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-all"
                  >
                    Add Contact
                  </button>
                  {form.hiringContacts.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {form.hiringContacts.map((contact, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-900">{contact.name}</p>
                            <p className="text-sm text-gray-600">{contact.email}</p>
                            {contact.title && <p className="text-xs text-gray-500">{contact.title}</p>}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeContact(i)} 
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Application Requirements */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Application Requirements (Optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">Choose what applicants must provide. Select profile only, CV only, or both.</p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <input 
                      type="checkbox" 
                      id="requireProfile"
                      checked={form.requireProfile}
                      onChange={(e) => handleChange({ target: { name: 'requireProfile', type: 'checkbox', checked: e.target.checked } })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="requireProfile" className="text-sm">
                      <span className="font-medium text-gray-900">Require saved profile CV</span>
                      <p className="text-xs text-gray-600 mt-1">Applicants must share their complete profile with work experience, education, skills, and languages.</p>
                    </label>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <input 
                      type="checkbox" 
                      id="requireCv"
                      checked={form.requireCv}
                      onChange={(e) => handleChange({ target: { name: 'requireCv', type: 'checkbox', checked: e.target.checked } })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="requireCv" className="text-sm">
                      <span className="font-medium text-gray-900">Require CV attachment</span>
                      <p className="text-xs text-gray-600 mt-1">Applicants must indicate they will attach or provide a CV/resume document.</p>
                    </label>
                  </div>

                  {/* Profile-Related Requirements */}
                  {form.requireProfile && (
                    <div className="border-t border-gray-200 pt-4 space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900">Profile Requirements</h4>
                      
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <input 
                          type="checkbox" 
                          id="requireExperience"
                          checked={form.requireExperience}
                          onChange={(e) => handleChange({ target: { name: 'requireExperience', type: 'checkbox', checked: e.target.checked } })}
                          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="requireExperience" className="text-sm">
                          <span className="font-medium text-gray-900">Require at least 1 work experience</span>
                          <p className="text-xs text-gray-600 mt-1">Applicants must have at least one work experience entry in their profile.</p>
                        </label>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <input 
                          type="checkbox" 
                          id="requireEducation"
                          checked={form.requireEducation}
                          onChange={(e) => handleChange({ target: { name: 'requireEducation', type: 'checkbox', checked: e.target.checked } })}
                          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="requireEducation" className="text-sm">
                          <span className="font-medium text-gray-900">Require at least 1 education entry</span>
                          <p className="text-xs text-gray-600 mt-1">Applicants must have at least one education entry in their profile.</p>
                        </label>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-900">Require specific languages</label>
                            <p className="text-xs text-gray-600 mt-1 mb-2">Select which languages applicants must speak.</p>
                            <div className="flex gap-2">
                              <select
                                value={languageInput}
                                onChange={(e) => setLanguageInput(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                              >
                                <option value="">Select a language...</option>
                                {masterLanguages.map(lang => (
                                  <option key={lang.id} value={lang.name}>{lang.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  if (languageInput && !form.requireLanguages.includes(languageInput)) {
                                    setForm(prev => ({
                                      ...prev,
                                      requireLanguages: [...prev.requireLanguages, languageInput]
                                    }))
                                    setLanguageInput('')
                                  }
                                }}
                                disabled={!languageInput}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                          {form.requireLanguages.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {form.requireLanguages.map((lang, idx) => (
                                <span key={idx} className="text-xs bg-white px-3 py-1 rounded border border-gray-300 flex items-center gap-2">
                                  {lang}
                                  <button 
                                    type="button"
                                    onClick={() => handleChange({ target: { name: 'requireLanguages', type: 'array-remove', value: idx } })}
                                    className="text-red-600 hover:text-red-800 font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-900">Require specific nationality</label>
                            <p className="text-xs text-gray-600 mt-1 mb-2">Select which nationality applicants must have.</p>
                            <select
                              value={form.requireNationality || ''}
                              onChange={(e) => setForm(prev => ({ ...prev, requireNationality: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                            >
                              <option value="">No specific requirement</option>
                              {masterNationalities.map(nat => (
                                <option key={nat.id} value={nat.name}>{nat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!form.requireProfile && !form.requireCv && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> If you don't select any requirements, applicants can choose what to submit.
                      </p>
                    </div>
                  )}

                  {/* Custom File Requirements */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Request Custom Documents</h4>
                    <p className="text-xs text-gray-600 mb-3">E.g., certificates, portfolios, license copies, etc.</p>

                    <div className="space-y-3 mb-4">
                      {form.customFileRequirements.map((req, idx) => (
                        <div key={req.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{req.name}</div>
                            {req.description && <div className="text-xs text-gray-600 mt-1">{req.description}</div>}
                            <div className="text-xs text-gray-500 mt-1">
                              {req.fileTypes?.join(', ') || 'Any file'} • {req.required ? 'Required' : 'Optional'}
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, customFileRequirements: prev.customFileRequirements.filter((_, i) => i !== idx) }))}
                            className="text-red-600 hover:text-red-800 ml-3"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        value={customFileInput.name}
                        onChange={(e) => setCustomFileInput(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="E.g., Certificate, Portfolio"
                        className="px-3 py-2 rounded border border-gray-300 text-sm"
                        maxLength={100}
                      />
                      <input
                        type="text"
                        value={customFileInput.description}
                        onChange={(e) => setCustomFileInput(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description (optional)"
                        className="px-3 py-2 rounded border border-gray-300 text-sm"
                        maxLength={200}
                      />
                      <input
                        type="text"
                        value={fileTypeInput}
                        onChange={(e) => setFileTypeInput(e.target.value)}
                        placeholder="File types: pdf, doc, docx (comma-separated)"
                        className="px-3 py-2 rounded border border-gray-300 text-sm col-span-1"
                      />
                      <label className="flex items-center gap-2 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={customFileInput.required}
                          onChange={(e) => setCustomFileInput(prev => ({ ...prev, required: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>Make required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (customFileInput.name) {
                            const fileTypes = fileTypeInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t)
                            setForm(prev => ({
                              ...prev,
                              customFileRequirements: [...prev.customFileRequirements, {
                                id: `req-${Date.now()}`,
                                name: customFileInput.name,
                                description: customFileInput.description,
                                required: customFileInput.required,
                                fileTypes: fileTypes.length > 0 ? fileTypes : []
                              }]
                            }))
                            setCustomFileInput({ name: '', description: '', required: false, fileTypes: [] })
                            setFileTypeInput('')
                          }
                        }}
                        className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover col-span-1"
                      >
                        Add Document
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input 
                  type="checkbox" 
                  id="active" 
                  name="active" 
                  checked={form.active} 
                  onChange={handleChange} 
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="active" className="text-sm font-semibold text-gray-900">
                  Publish this job immediately (uncheck to save as draft)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={onCancel}
                  className="px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className={`px-6 py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 ${saving ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
                >
                  {saving ? 'Saving...' : isEdit ? 'Update Job' : 'Post Job'}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Job Posting</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to publish this job? Once posted, candidates will be able to see and apply to this position.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={submitForm}
                  disabled={saving}
                  className={`px-6 py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 ${saving ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
                >
                  {saving ? 'Posting...' : 'Confirm & Post'}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
