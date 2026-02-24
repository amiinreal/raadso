import { useState, useEffect } from 'react'
import { api } from '../api/api.js'
import { jwtDecode } from 'jwt-decode'
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

export function JobForm({ tenant, onSubmit, onCancel, saving = false, initialJob = null, currentUser = null }) {
  const isEdit = !!initialJob
  const [tenantData, setTenantData] = useState(tenant)

  // If tenant not provided or missing members, fetch it
  useEffect(() => {
    if (!tenant?.members && tenant?.id) {
      // Tenant was passed but doesn't have members yet - refresh it
      const token = localStorage.getItem('job-platform-token')
      if (token) {
        api.getTenant(tenant.id, token)
          .then(freshTenant => setTenantData(freshTenant))
          .catch(err => console.error('Failed to refresh tenant:', err))
      }
    } else if (tenant?.members) {
      // Tenant has members - use it
      setTenantData(tenant)
    }
  }, [tenant])

  // Get userId from token or currentUser
  let myUserId = currentUser?.id
  if (!myUserId) {
    const token = localStorage.getItem('job-platform-token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        myUserId = decoded.userId
      } catch (err) {
        console.error('Failed to decode token', err)
      }
    }
  }

  // Check if user is owner via members array OR tenant creator
  const myMember = tenantData?.members?.find(m => m.user_id === myUserId) || null
  const isOwner = (myMember?.role === 'owner') || (tenantData?.user_id === myUserId)
  const isManager = myMember?.role === 'manager' || isOwner
  
  // Check if member has explicit can_post_job permission
  const memberPermissions = myMember?.permissions
  const parsedPermissions = typeof memberPermissions === 'string' ? 
    (() => { try { return JSON.parse(memberPermissions) } catch { return {} } })() : 
    (memberPermissions || {})
  const hasPostJobPermission = parsedPermissions.can_post_job || isManager
  
  // Debug logging
  useEffect(() => {
    console.log('JobForm Debug - Full Members List:', tenantData?.members)
    console.log('JobForm Debug - Looking for myUserId:', myUserId)
    console.log('JobForm Debug - Members user_ids:', tenantData?.members?.map(m => ({ id: m.user_id, role: m.role, email: m.email })))
    console.log('JobForm Debug:', {
      currentUser,
      myUserId,
      tenantId: tenantData?.id,
      tenantUserId: tenantData?.user_id,
      tenantUserIdMatches: tenantData?.user_id === myUserId,
      membersArray: tenantData?.members,
      myMember,
      isOwner,
      isManager,
      memberPermissions,
      parsedPermissions,
      hasPostJobPermission
    })
  }, [tenantData, myUserId, currentUser])
  
  const myRole = isOwner ? 'owner' : (myMember?.role || currentUser?.role || 'member')

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
    autoReplyEnabled: false,
    autoReplySubject: '',
    autoReplyMessage: '',
    hiringContactName: '',
    hiringContactEmail: '',
    rejectionSubject: '',
    rejectionMessage: '',
    active: false,
    allowMessaging: true,
    allowReplies: true
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
        requireLanguages: Array.isArray(initialJob.require_languages) 
          ? initialJob.require_languages 
          : (typeof initialJob.require_languages === 'string' 
            ? (() => { try { return JSON.parse(initialJob.require_languages) } catch { return [] } })() 
            : []),
        requireNationality: initialJob.require_nationality || '',
        customFileRequirements: initialJob.custom_file_requirements || [],
        autoReplyEnabled: initialJob.auto_reply_enabled || false,
        autoReplySubject: initialJob.auto_reply_subject || '',
        autoReplyMessage: initialJob.auto_reply_message || '',
        hiringContactName: initialJob.hiring_contact_name || '',
        hiringContactEmail: initialJob.hiring_contact_email || '',
        rejectionSubject: initialJob.rejection_subject || '',
        rejectionMessage: initialJob.rejection_message || '',
        active: initialJob.active || false,
        allowMessaging: initialJob.allow_messaging !== false,
        allowReplies: initialJob.allow_replies !== false
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
      const wordBoundaryRegex = new RegExp(`(^|\\s |&)${word} `, 'i')
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
        errors[`contact_${index} `] = `Contact ${index + 1}: Invalid email address`
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Check if user has permission to post jobs
    if (!hasPostJobPermission) {
      alert('Only managers or users with posting permissions can post jobs.')
      return
    }
    // The backend will validate tenant membership and permissions
    if (!validateFields()) {
      return
    }
    // Confirm if publishing a new job OR publishing a draft
    const isPublishing = form.active && (!initialJob || !initialJob.active)

    if (isPublishing) {
      setShowConfirmDialog(true)
    } else {
      submitForm()
    }
  }

  const submitForm = () => {
    const payload = {
      tenantId: (tenantData || tenant)?.id,
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
      requireLanguages: Array.isArray(form.requireLanguages) ? form.requireLanguages : [],
      requireNationality: form.requireNationality,
      customFileRequirements: form.customFileRequirements,
      autoReplyEnabled: form.autoReplyEnabled,
      autoReplySubject: sanitizeInput(form.autoReplySubject),
      autoReplyMessage: sanitizeInput(form.autoReplyMessage),
      hiringContactName: sanitizeInput(form.hiringContactName),
      hiringContactEmail: sanitizeInput(form.hiringContactEmail),
      rejectionSubject: sanitizeInput(form.rejectionSubject),
      rejectionMessage: sanitizeInput(form.rejectionMessage),
      allowMessaging: form.allowMessaging,
      allowReplies: form.allowReplies
    }
    setShowConfirmDialog(false)
    onSubmit(payload)
  }

  if (!hasPostJobPermission) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-700 mb-2">Only managers can post jobs.</p>
          <p className="text-gray-500">Contact your team manager or owner to request posting access.</p>
        </div>
      </div>
    )
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Job Title <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        name="title"
                        value={form.title}
                        onChange={(e) => {
                          handleChange(e)
                          if (validationErrors.title) {
                            setValidationErrors(prev => ({ ...prev, title: undefined }))
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${validationErrors.title ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} bg-white text-gray-900 shadow-sm outline-none transition-all placeholder-gray-400 sm:text-sm font-medium`}
                        placeholder="e.g. Senior Frontend Developer"
                        maxLength={200}
                        required
                      />
                    </div>
                    {validationErrors.title && (
                      <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-2">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {validationErrors.title}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <input
                        name="location"
                        value={form.location}
                        onChange={(e) => {
                          handleChange(e)
                          if (validationErrors.location) {
                            setValidationErrors(prev => ({ ...prev, location: undefined }))
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${validationErrors.location ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} bg-white text-gray-900 shadow-sm outline-none transition-all placeholder-gray-400 sm:text-sm font-medium`}
                        placeholder="e.g. New York, NY or Remote"
                        maxLength={200}
                      />
                    </div>
                    {validationErrors.location && (
                      <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded-lg">{validationErrors.location}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Application Deadline</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
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
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${validationErrors.applicationDeadline ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} bg-white text-gray-900 shadow-sm outline-none transition-all placeholder-gray-400 sm:text-sm font-medium`}
                      />
                    </div>
                    {validationErrors.applicationDeadline && (
                      <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded-lg">{validationErrors.applicationDeadline}</p>
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
                <div className="space-y-6">
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-sm font-semibold text-gray-900 mb-3 flex justify-between">
                      About the Role
                      <span className="text-xs font-normal text-gray-500">{form.aboutRole.length}/5000</span>
                    </label>
                    <textarea
                      name="aboutRole"
                      value={form.aboutRole}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.aboutRole) {
                          setValidationErrors(prev => ({ ...prev, aboutRole: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.aboutRole ? 'border-red-500' : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} bg-white text-gray-900 shadow-sm outline-none transition-all placeholder-gray-400 sm:text-sm leading-relaxed`}
                      placeholder="Describe the role responsibilities, team culture, and what a typical day looks like..."
                      rows={6}
                      maxLength={5000}
                    />
                    {validationErrors.aboutRole && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.aboutRole}</p>
                    )}
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-sm font-semibold text-gray-900 mb-3 flex justify-between">
                      About the Company
                      <span className="text-xs font-normal text-gray-500">{form.aboutCompany.length}/5000</span>
                    </label>
                    <textarea
                      name="aboutCompany"
                      value={form.aboutCompany}
                      onChange={(e) => {
                        handleChange(e)
                        if (validationErrors.aboutCompany) {
                          setValidationErrors(prev => ({ ...prev, aboutCompany: undefined }))
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.aboutCompany ? 'border-red-500' : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} bg-white text-gray-900 shadow-sm outline-none transition-all placeholder-gray-400 sm:text-sm leading-relaxed`}
                      placeholder="Share your company mission, values, and why it's a great place to work..."
                      rows={4}
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
                <div className="grid md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                  <div className="md:col-span-1 relative">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Minimum Salary</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium">$</span>
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
                        className={`w-full pl-8 pr-4 py-3 rounded-xl border ${validationErrors.salaryMin ? 'border-red-500' : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} bg-white text-gray-900 shadow-sm outline-none transition-all placeholder-gray-400 sm:text-sm font-medium`}
                        placeholder="e.g. 50000"
                        min="0"
                      />
                    </div>
                    {validationErrors.salaryMin && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.salaryMin}</p>
                    )}
                  </div>
                  <div className="md:col-span-1 relative">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Maximum Salary</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium">$</span>
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
                        className={`w-full pl-8 pr-4 py-3 rounded-xl border ${validationErrors.salaryMax ? 'border-red-500' : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} bg-white text-gray-900 shadow-sm outline-none transition-all placeholder-gray-400 sm:text-sm font-medium`}
                        placeholder="e.g. 80000"
                        min="0"
                      />
                    </div>
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
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm outline-none transition-all sm:text-sm font-medium cursor-pointer"
                    >
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>CAD</option>
                      <option>AUD</option>
                    </select>
                  </div>
                  <p className="md:col-span-3 text-xs text-slate-500 italic">
                    Leave blank to display as "Competitive Salary"
                  </p>
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

              {/* Auto-Reply Settings */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  Auto-Reply Settings
                </h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-gray-900">Enable Auto-Reply</h4>
                      <p className="text-sm text-gray-600">Automatically send a confirmation email to candidates when they apply.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.autoReplyEnabled}
                        onChange={(e) => setForm(prev => ({ ...prev, autoReplyEnabled: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {form.autoReplyEnabled && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Auto-Reply Subject</label>
                          <input
                            value={form.autoReplySubject}
                            onChange={(e) => setForm(prev => ({ ...prev, autoReplySubject: e.target.value }))}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all sm:text-sm"
                            placeholder="e.g. Application Received: {job_title}"
                          />
                          <p className="text-xs text-gray-500">Default: Application Received: {form.title}</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Hiring Contact Name (Variable)</label>
                          <input
                            value={form.hiringContactName}
                            onChange={(e) => setForm(prev => ({ ...prev, hiringContactName: e.target.value }))}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all sm:text-sm"
                            placeholder="e.g. Jane Doe"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Hiring Contact Email (Variable)</label>
                          <input
                            type="email"
                            value={form.hiringContactEmail}
                            onChange={(e) => setForm(prev => ({ ...prev, hiringContactEmail: e.target.value }))}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all sm:text-sm"
                            placeholder="e.g. jane@company.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Confirmation Message</label>
                        <textarea
                          rows={6}
                          value={form.autoReplyMessage}
                          onChange={(e) => setForm(prev => ({ ...prev, autoReplyMessage: e.target.value }))}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all sm:text-sm resize-none"
                          placeholder="Write your confirmation message here..."
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">Available variables:</span>
                          {['{first_name}', '{last_name}', '{full_name}', '{job_title}', '{company_name}', '{hiring_contact_name}', '{hiring_contact_email}'].map(v => (
                            <code key={v} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded cursor-pointer hover:bg-indigo-100" onClick={() => setForm(prev => ({ ...prev, autoReplyMessage: prev.autoReplyMessage + v }))}>
                              {v}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Messaging Settings */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  Messaging Settings
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-gray-900">Enable Messaging</h4>
                      <p className="text-sm text-gray-600">Allow candidates and employers to exchange messages about this position.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.allowMessaging}
                        onChange={(e) => setForm(prev => ({ ...prev, allowMessaging: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {form.allowMessaging && (
                    <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
                      <div>
                        <h4 className="font-semibold text-gray-900">Allow Candidate Replies</h4>
                        <p className="text-sm text-gray-600">When disabled, candidates can receive but not send messages. You can always send messages.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={form.allowReplies}
                          onChange={(e) => setForm(prev => ({ ...prev, allowReplies: e.target.checked }))}
                          disabled={!form.allowMessaging}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Notification Settings */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Rejection Notification Settings
                </h3>

                <div className="space-y-6">
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <h4 className="font-semibold text-gray-900 text-sm">Automated Rejection Email</h4>
                    <p className="text-xs text-gray-600 mt-1">This email will be sent automatically to candidates when their application is marked as "Rejected". Leave blank if you don't want to send an automatic email.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Rejection Subject</label>
                      <input
                        value={form.rejectionSubject}
                        onChange={(e) => setForm(prev => ({ ...prev, rejectionSubject: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all sm:text-sm"
                        placeholder="e.g. Update on your application for {job_title}"
                      />
                      <p className="text-[10px] text-gray-500">Default: Update on your application: {form.title || 'Job Title'}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Rejection Message</label>
                      <textarea
                        rows={6}
                        value={form.rejectionMessage}
                        onChange={(e) => setForm(prev => ({ ...prev, rejectionMessage: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all sm:text-sm resize-none"
                        placeholder="Write your rejection message here..."
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">Available variables:</span>
                        {['{first_name}', '{last_name}', '{full_name}', '{job_title}', '{company_name}'].map(v => (
                          <code key={v} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded cursor-pointer hover:bg-orange-100" onClick={() => setForm(prev => ({ ...prev, rejectionMessage: prev.rejectionMessage + v }))}>
                            {v}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
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
                  Check to publish
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-8 border-t border-gray-100 mt-8">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-3 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-8 py-4 rounded-xl font-bold shadow-lg text-lg transition-all transform active:scale-95 flex items-center gap-3 ${saving ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5'}`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      {isEdit ? 'Update Job Listing' : 'Post Job Now'}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
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
