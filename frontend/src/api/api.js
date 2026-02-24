// ...existing code...
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const handle = async (response) => {
  if (!response.ok) {
    // Auto-logout on 401 (expired/revoked session)
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({ error: 'Session expired' }))
      // Only clear and redirect if not Remember Me
      if (localStorage.getItem('job-platform-remember-me') !== '1') {
        localStorage.removeItem('job-platform-token')
        localStorage.removeItem('job-platform-login-time')
        localStorage.removeItem('job-platform-remember-me')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true'
        }
      }
      throw new Error(errorData.error || 'Session expired or revoked')
    }
    const text = await response.text()
    throw new Error(text || 'Request failed')
  }
  return response.json()
}

const buildUrl = (path, params = {}) => {
  const url = new URL(path, API_URL)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Convert to string, but skip if it's an object
      if (typeof value === 'object') {
        return
      }
      url.searchParams.append(key, String(value))
    }
  })
  return url.toString()
}

const authHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export const api = {
  // Onboard invited user (set name, password, OTP)
  onboardInvitedUser: async ({ tenantId, email, firstName, lastName, password, otp }) => {
    const url = buildUrl('/tenant-members/onboard-invitee')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ tenantId, email, firstName, lastName, password, otp })
    }))
  },

  // Resend OTP for invited user
  resendInviteOtp: async ({ tenantId, email }) => {
    const url = buildUrl('/tenant-members/resend-invite-otp')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ tenantId, email })
    }))
  },

  // Pending Invitations
  getPendingInvitations: async (token) => {
    const url = buildUrl('/tenant-members/invitations/pending')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },

  acceptInvitation: async (invitationId, token) => {
    const url = buildUrl(`/tenant-members/invitations/${invitationId}/accept`)
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token)
    }))
  },

  declineInvitation: async (invitationId, token) => {
    const url = buildUrl(`/tenant-members/invitations/${invitationId}/decline`)
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token)
    }))
  },

  // User Roles
  getUserRoles: async (token) => {
    // This endpoint aggregates roles from different sources
    // We can assume we have an endpoint for this, or construct it.
    // Let's assume /auth/me returns roles or creates a new endpoint.
    // Actually, usually /auth/me returns enough info, but for switching we might want /auth/roles
    // Use /auth/roles if it exists, otherwise fallback to /auth/me and constructing
    // For now, let's use a new endpoint /auth/roles if we haven't implemented it, OR
    // check if it's already there. RoleSwitcher uses it.
    const url = buildUrl('/auth/roles')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },

  getTenantMembers: async (tenantId, token) => {
    const url = buildUrl(`/tenant-members/${tenantId}`)
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  register: async ({ email, password, role, firstName, lastName }) => {
    const url = buildUrl('/auth/register')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email, password, role, firstName, lastName }),
      }),
    )
  },
  // Update application status
  updateApplicationStatus: async (applicationId, status, token) => {
    const url = buildUrl(`/applications/${applicationId}`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ status }),
      }),
    )
  },
  /**
   * Login user
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.password
   * @param {boolean} [params.rememberMe]
   * @returns {Promise<Object>} Login response
   */
  login: async ({ email, password, rememberMe = false, deviceId }) => {
    const url = buildUrl('/auth/login')
    const payload = { email, password, rememberMe, deviceId }
    const headers = authHeaders()
    if (deviceId) {
      headers['x-device-id'] = deviceId
    }
    return handle(
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
    )
  },
  me: async (token) => handle(await fetch(buildUrl('/auth/me'), { headers: authHeaders(token) })),

  agreeToTerms: async (token) => {
    const url = buildUrl('/auth/agree-terms')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
      })
    )
  },

  updateLastActiveRole: async (role, token) => {
    const url = buildUrl('/auth/switch-role')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ role }),
      })
    )
  },

  // Platform Config & Audit Logs
  getPrivacyPolicy: async () => {
    const url = buildUrl('/config/privacy-policy')
    return handle(await fetch(url))
  },

  getTermsVersion: async () => {
    const url = buildUrl('/config/terms-version')
    return handle(await fetch(url))
  },

  updatePrivacyPolicy: async (content, forceReaccept, token) => {
    const url = buildUrl('/config/privacy-policy')
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ content, forceReaccept }),
      })
    )
  },

  getAuditLogs: async (token) => {
    const url = buildUrl('/config/audit-logs')
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      })
    )
  },

  getSystemSettings: async (token) => {
    const url = buildUrl('/config/settings')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },

  updateSystemSetting: async (key, value, token) => {
    const url = buildUrl('/config/settings')
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ key, value }),
      })
    )
  },

  refreshToken: async (token) => {
    const url = buildUrl('/auth/refresh')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
      }),
    )
  },

  forgotPassword: async (email) => {
    const url = buildUrl('/auth/forgot-password')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email }),
      })
    )
  },

  resetPassword: async (email, otp, newPassword) => {
    const url = buildUrl('/auth/reset-password')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email, otp, newPassword }),
      })
    )
  },

  sendOtp: async (token) => {
    const url = buildUrl('/auth/send-otp')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
      })
    )
  },

  changePassword: async (otp, newPassword, token) => {
    const url = buildUrl('/auth/change-password')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ otp, newPassword }),
      })
    )
  },

  getJobs: async (params = {}, token) => {
    const url = buildUrl('/jobs', params)
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      }),
    )
  },
  getJob: async (id) => {
    const url = buildUrl(`/jobs/${id}`)
    return handle(await fetch(url))
  },
  createJob: async (payload, token) => {
    const url = buildUrl('/jobs')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  updateJob: async (id, payload, token) => {
    const url = buildUrl(`/jobs/${id}`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  toggleJobPublish: async (id, active, token) => {
    const url = buildUrl(`/jobs/${id}/publish`)
    return handle(
      await fetch(url, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ active }),
      }),
    )
  },
  getJobCategories: async (search = '') => {
    const url = buildUrl('/job-categories', search ? { search } : {})
    return handle(await fetch(url))
  },
  createJobCategory: async (payload, token) => {
    const url = buildUrl('/job-categories')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  getCandidates: async () => handle(await fetch(buildUrl('/candidates'))),
  getCandidate: async (id) => handle(await fetch(buildUrl(`/candidates/${id}`))),
  updateCandidate: async (id, payload, token) => {
    const url = buildUrl(`/candidates/${id}`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  getTenants: async (params = {}, token) => {
    const url = buildUrl('/tenants', params)
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getTenant: async (id, token) => {
    const url = buildUrl(`/tenants/${id}`)
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  createTenant: async (payload, token) => {
    const url = buildUrl('/tenants')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  updateTenant: async (id, payload, token) => {
    const url = buildUrl(`/tenants/${id}`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  updateTenantStatus: async (id, status, token, rejectionReason) => {
    const url = buildUrl(`/tenants/${id}/status`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ status, rejectionReason }),
      }),
    )
  },
  // Users endpoints (Admin only)
  getAllUsers: async (token) => {
    const url = buildUrl('/users')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getAllEmployers: async (token) => {
    const url = buildUrl('/users/employers')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getAllCandidates: async (token) => {
    const url = buildUrl('/users/candidates')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getAdminMetrics: async (params = {}, token) => {
    const url = buildUrl('/admin/metrics', params)
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getAdminActivity: async (token) => {
    const url = buildUrl('/admin/activity')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getApplications: async (idOrFilters = {}, token) => {
    // Handle both old-style (id string/number) and new-style (filters object)
    let filters = {}
    if (typeof idOrFilters === 'string' || typeof idOrFilters === 'number') {
      filters = { candidateId: idOrFilters }
    } else if (typeof idOrFilters === 'object') {
      filters = idOrFilters
    }
    const url = buildUrl('/applications', filters)
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  submitApplication: async (payload, token) => {
    const url = buildUrl('/applications')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },

  // Work Experience
  addWorkExperience: async (payload, token) => {
    const url = buildUrl('/profile/work-experiences')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  updateWorkExperience: async (id, payload, token) => {
    const url = buildUrl(`/profile/work-experiences/${id}`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  deleteWorkExperience: async (id, token) => {
    const url = buildUrl(`/profile/work-experiences/${id}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  // Education
  addEducation: async (payload, token) => {
    const url = buildUrl('/profile/educations')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  updateEducation: async (id, payload, token) => {
    const url = buildUrl(`/profile/educations/${id}`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  deleteEducation: async (id, token) => {
    const url = buildUrl(`/profile/educations/${id}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  // Skills
  addSkill: async (payload, token) => {
    const url = buildUrl('/profile/skills')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  deleteSkill: async (id, token) => {
    const url = buildUrl(`/profile/skills/${id}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  // Languages
  addLanguage: async (payload, token) => {
    const url = buildUrl('/profile/languages')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  deleteLanguage: async (id, token) => {
    const url = buildUrl(`/profile/languages/${id}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  // Attachments
  addAttachment: async (payload, token) => {
    const url = buildUrl('/profile/attachments')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  deleteAttachment: async (id, token) => {
    const url = buildUrl(`/profile/attachments/${id}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  // Companies
  getCompanies: async (params = {}) => {
    const url = buildUrl('/companies', params)
    return handle(await fetch(url))
  },
  getCompany: async (id) => {
    const url = buildUrl(`/companies/${id}`)
    return handle(await fetch(url))
  },
  updateCompany: async (id, payload, token) => {
    const url = buildUrl(`/companies/${id}`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }),
    )
  },
  followCompany: async (id, token) => {
    const url = buildUrl(`/companies/${id}/follow`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
      }),
    )
  },
  unfollowCompany: async (id, token) => {
    const url = buildUrl(`/companies/${id}/follow`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },
  isFollowingCompany: async (id, token) => {
    const url = buildUrl(`/companies/${id}/is-following`)
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },

  // Expose helper methods
  baseURL: API_URL,
  getAuthHeaders: () => {
    const token = localStorage.getItem('token')
    return authHeaders(token)
  },

  // File Uploads
  uploadDocument: async (file, token) => {
    const formData = new FormData()
    formData.append('file', file)

    const url = buildUrl('/upload/document')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Failed to upload file')
    }

    return response.json()
  },

  uploadProfileImage: async (file, token, oldImageUrl = null) => {
    const formData = new FormData()
    formData.append('image', file)
    if (oldImageUrl) {
      formData.append('oldImageUrl', oldImageUrl)
    }

    const url = buildUrl('/upload/profile-image')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Failed to upload profile image')
    }

    return response.json()
  },

  uploadCV: async (file, token) => {
    const formData = new FormData()
    formData.append('cv', file)

    const url = buildUrl('/upload/cv')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Failed to upload CV')
    }

    return response.json()
  },

  // AI Application Review
  aiReviewApplication: async (applicationId, token, forceReanalyze = false) => {
    const url = buildUrl(`/applications/${applicationId}/ai-review`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ forceReanalyze }),
      }),
    )
  },

  recordSearch: async (query, filters, userId, token) => {
    const url = buildUrl('/recommendations/search')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ query, filters, userId }),
      })
    )
  },

  // Update application notes
  updateApplicationNotes: async (applicationId, notes, token) => {
    const url = buildUrl(`/applications/${applicationId}/notes`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ notes }),
      }),
    )
  },

  updateApplicationAssignments: async (applicationId, userIds, token) => {
    const url = buildUrl('/application-assignments')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ applicationId, userIds }),
      }),
    )
  },

  getApplicationAssignments: async (applicationId, token) => {
    const url = buildUrl(`/application-assignments/${applicationId}`)
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      }),
    )
  },

  // Get AI review for application
  getApplicationAIReview: async (applicationId, token) => {
    const url = buildUrl(`/applications/${applicationId}/ai-review`)
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      }),
    )
  },

  // Get AI analysis for specific language
  getApplicationAIAnalysis: async (applicationId, languageCode, token) => {
    const url = buildUrl(`/applications/${applicationId}/ai-analysis/${languageCode}`)
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      }),
    )
  },

  // Get all AI analyses for an application
  getApplicationAIAnalyses: async (applicationId, token) => {
    const url = buildUrl(`/applications/${applicationId}/ai-analyses`)
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      }),
    )
  },

  // Get job applications with AI scores and sorting
  getJobApplicationsWithAIScores: async (jobId, sort = 'applied_date_desc', searchTerm = '', token) => {
    const params = new URLSearchParams({
      sort,
      ...(searchTerm && { searchTerm })
    })
    const url = buildUrl(`/applications/job/${jobId}/with-ai-scores?${params.toString()}`)
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      }),
    )
  },

  // Get master languages
  getMasterLanguages: async () => {
    const url = buildUrl('/master-languages')
    return handle(await fetch(url))
  },

  // Get master nationalities
  getMasterNationalities: async () => {
    const url = buildUrl('/master-nationalities')
    return handle(await fetch(url))
  },

  // Interested Positions
  getInterestedPositions: async (candidateId) => {
    const url = buildUrl(`/candidates/${candidateId}/interested-positions`)
    return handle(await fetch(url))
  },

  addInterestedPosition: async (candidateId, positionTitle, token) => {
    const url = buildUrl(`/candidates/${candidateId}/interested-positions`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ candidateId, positionTitle }),
      }),
    )
  },

  deleteInterestedPosition: async (candidateId, positionId, token) => {
    const url = buildUrl(`/candidates/${candidateId}/interested-positions/${positionId}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  // Get trusted devices (30-day trust window)
  getTrustedDevices: async (token) => {
    const url = buildUrl('/auth/2fa/trusted-devices')
    return handle(
      await fetch(url, {
        headers: authHeaders(token),
      }),
    )
  },

  // Revoke a trusted device
  revokeTrustedDevice: async (deviceId, token) => {
    const url = buildUrl('/auth/2fa/trusted-devices/revoke')
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ deviceId }),
      }),
    )
  },

  // Recommendations & Personalization
  getTopJobsForCandidate: async (candidateId, limit = 3, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/top-jobs`, { limit })
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  recordJobInteraction: async (candidateId, jobId, interactionType, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/job/${jobId}/interact`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ interactionType }),
      }),
    )
  },

  getTenantAuditLogs: async (tenantId, token) => {
    const url = buildUrl(`/tenants/${tenantId}/audit-logs`)
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  getCandidatePreferences: async (candidateId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/preferences`)
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  addCandidatePreference: async (candidateId, tag, category, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/preferences`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ tag, category }),
      }),
    )
  },

  getFilteredJobsByPreferences: async (candidateId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/filtered-jobs`)
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  // Save/Unsave Jobs
  saveJob: async (candidateId, jobId, category, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/job/${jobId}/save`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ category }),
      }),
    )
  },

  unsaveJob: async (candidateId, jobId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/job/${jobId}/save`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  getSavedJobs: async (candidateId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/saved-jobs`)
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  checkIfJobSaved: async (candidateId, jobId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/job/${jobId}/is-saved`)
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  getInterestsAnalysis: async (candidateId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/interests-analysis`)
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  // Category management
  getSaveCategories: async (candidateId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/save-categories`)
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  createSaveCategory: async (candidateId, categoryName, color, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/save-categories`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ categoryName, color }),
      }),
    )
  },

  deleteSaveCategory: async (candidateId, categoryId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/save-categories/${categoryId}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  getSavedJobsByCategory: async (candidateId, category, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/saved-jobs`, { category })
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  updateJobSaveCategory: async (candidateId, jobId, category, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/job/${jobId}/save-category`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ category }),
      }),
    )
  },

  // Notifications API
  getNotifications: async (candidateId, unreadOnly = false, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/notifications`, { unreadOnly })
    return handle(
      await fetch(url, {
        method: 'GET',
        headers: authHeaders(token),
      }),
    )
  },

  markNotificationAsRead: async (candidateId, notificationId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/notifications/${notificationId}/read`)
    return handle(
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
      }),
    )
  },

  deleteNotification: async (candidateId, notificationId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/notifications/${notificationId}`)
    return handle(
      await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    )
  },

  checkDeadlineNotifications: async (candidateId, token) => {
    const url = buildUrl(`/recommendations/candidate/${candidateId}/check-deadline-notifications`)
    return handle(
      await fetch(url, {
        method: 'POST',
        headers: authHeaders(token),
      }),
    )
  },

  // Localization
  getLocaleSettings: async () => handle(await fetch(buildUrl('/translations/locales'))),
  saveLocaleSettings: async (payload, token) => {
    const url = buildUrl('/translations/locales')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    }))
  },
  updateLocaleSettings: async (locale, payload, token) => {
    const url = buildUrl(`/translations/locales/${locale}`)
    return handle(await fetch(url, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    }))
  },
  updatePreferredLocale: async (locale, token) => {
    const url = buildUrl('/users/me/locale')
    return handle(await fetch(url, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ locale })
    }))
  },
  getUserPreferences: async (token) => {
    const url = buildUrl('/users/me/preferences')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  updateUserPreferences: async (payload, token) => {
    const url = buildUrl('/users/me/preferences')
    return handle(await fetch(url, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    }))
  },

  getTranslationScan: async ({ sourceLanguage = 'en', targetLanguage }, token) => {
    if (!targetLanguage) throw new Error('targetLanguage is required')
    const url = buildUrl('/translations/v2/scan', { sourceLanguage, targetLanguage })
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getTranslationKeysV2: async (token) => {
    const url = buildUrl('/translations/v2/keys')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  getI18nMap: async (language = 'en') => {
    const url = buildUrl('/i18n', { lang: language })
    // Ensure no caching for translations
    return handle(await fetch(url, { cache: 'no-store' }))
  },
  translateSuggestionV2: async ({ key, targetLanguage, sourceLanguage = 'en' }, token) => {
    const url = buildUrl('/translations/v2/translate')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ key, targetLanguage, sourceLanguage })
    }))
  },
  aiTranslateV2: async ({ key, targetLanguage, sourceLanguage = 'en', uiContext = '' }, token) => {
    if (!key || !targetLanguage) throw new Error('key and targetLanguage are required')
    const url = buildUrl('/translations/v2/ai-translate')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ key, targetLanguage, sourceLanguage, uiContext })
    }))
  },
  aiTranslateTextV2: async ({ text, targetLanguage, sourceLanguage = 'en', domain = 'common', persona = 'shared', page = 'shared' }, token) => {
    if (!text || !targetLanguage) throw new Error('text and targetLanguage are required')
    const url = buildUrl('/translations/v2/ai-translate-text')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ text, targetLanguage, sourceLanguage, domain, persona, page })
    }))
  },
  extractTranslations: async ({ persona = 'candidate' }, token) => {
    const url = buildUrl('/translations/v2/extract')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ persona })
    }))
  },


  upsertTranslationV2: async ({ key, domain, description = null, language, value, variant = null, source = 'manual' }, token) => {
    if (!key || !domain || !language || typeof value !== 'string') {
      throw new Error('key, domain, language, and value are required')
    }
    const url = buildUrl('/translations/v2')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ key, domain, description, language, value, variant, source })
    }))
  },
  bulkUpsertTranslationsV2: async ({ items }, token) => {
    if (!Array.isArray(items) || !items.length) throw new Error('items array is required')
    const url = buildUrl('/translations/v2/bulk-upsert')
    return handle(await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ items })
    }))
  },

  // Get all roles for the current user
  getUserRoles: async (token) => {
    const url = buildUrl('/auth/me/roles')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },

  // Config / Settings
  getSystemSettings: async (token) => {
    const url = buildUrl('/config/settings')
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
  updateSystemSetting: async (key, value, token) => {
    const url = buildUrl('/config/settings')
    return handle(await fetch(url, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ key, value })
    }))
  },

  // Page Translations - Fetch from database
  getPageTranslations: async (pageName, lang = 'en') => {
    const url = buildUrl(`/i18n/page/${pageName}?lang=${lang}`)
    return handle(await fetch(url))
  },
  getTranslationsV2: async (targetLanguage = 'so', token) => {
    const url = buildUrl(`/translations/v2/scan?targetLanguage=${targetLanguage}`)
    return handle(await fetch(url, { headers: authHeaders(token) }))
  },
}
