import { JobCard } from '../components/JobCard'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/api'
import { rankIndustriesByQuery } from '../utils/industrySearch'

export function EmployerDashboard({ jobs = [], onSelectJob, onCreateJob, tenant, onSaveTenant, savingTenant, onEditJob, onTogglePublish, activeTab: initialActiveTab = null }) {
  const navigate = useNavigate()
  const activeJobs = jobs.filter((job) => job.active)
  const totalApplications = jobs.reduce((sum, job) => sum + (job.application_count || 0), 0)
  const missingContact = !tenant?.phone || !tenant?.company_email || !tenant?.org_number
  const notApproved = tenant?.status !== 'approved'
  const createDisabled = notApproved || missingContact

  const [activeTab, setActiveTab] = useState(initialActiveTab || 'jobs')
  const [applications, setApplications] = useState([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [reviewingAI, setReviewingAI] = useState({})
  const [batchReviewingJob, setBatchReviewingJob] = useState(null)
  const [approvalDismissed, setApprovalDismissed] = useState(() => {
    return localStorage.getItem('tenantApprovalDismissed') === 'true'
  })

  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    industry_id: null,
    location: '',
    description: '',
    website: '',
    phone: '',
    company_email: '',
    org_number: '',
  })

  const [industries, setIndustries] = useState([])
  const [industrySearch, setIndustrySearch] = useState('')
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)

  // Permissions logic
  const [memberPermissions, setMemberPermissions] = useState({})
  useEffect(() => {
    if (tenant?.id) {
      api.getTenantMembers(tenant.id, localStorage.getItem('token'))
        .then(res => {
          const me = res.find(m => m.user_id === (tenant.user_id || localStorage.getItem('userId')))
          setMemberPermissions(me?.permissions || {})
        })
        .catch(() => setMemberPermissions({}))
    }
  }, [tenant?.id])

  useEffect(() => {
    if (tenant) {
      setForm((prev) => ({
        ...prev,
        company_name: tenant.company_name || '',
        industry: tenant.industry || '',
        industry_id: tenant.industry_id || null,
        location: tenant.location || '',
        description: tenant.description || '',
        website: tenant.website || '',
        phone: tenant.phone || '',
        company_email: tenant.company_email || '',
        org_number: tenant.org_number || '',
      }))
      if (tenant.industry) setIndustrySearch(tenant.industry)
    }
  }, [tenant])

  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const res = await fetch(`${api.baseURL}/industries`)
        const data = await res.json()
        setIndustries(data)
      } catch (err) {
        console.error('Failed to load industries', err)
      }
    }
    loadIndustries()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showIndustryDropdown && !e.target.closest('.industry-dropdown-container')) {
        setShowIndustryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showIndustryDropdown])

  // Load applications when tab switches to applications
  useEffect(() => {
    if (activeTab === 'applications' && tenant?.id) {
      loadApplications()
    }
  }, [activeTab, tenant?.id])

  const loadApplications = async () => {
    setLoadingApplications(true)
    try {
      const response = await fetch(`${api.baseURL}/applications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      // Filter applications to only show those for jobs owned by this employer
      const jobIds = jobs.map(j => j.id)
      const employerApplications = data.filter(app => jobIds.includes(app.job_id))
      setApplications(employerApplications)
    } catch (err) {
      console.error('Failed to load applications', err)
    } finally {
      setLoadingApplications(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSaveTenant) onSaveTenant(form)
  }

  const handleDismissApproval = () => {
    localStorage.setItem('tenantApprovalDismissed', 'true')
    setApprovalDismissed(true)
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
      <div className="max-w-7xl mx-auto">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">ACTIVE</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{activeJobs.length}</p>
            <p className="text-sm text-gray-600">Currently accepting applications</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">APPLICATIONS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{totalApplications}</p>
            <p className="text-sm text-gray-600">Across all your listings</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">DRAFTS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{jobs.filter(j => !j.active).length}</p>
            <p className="text-sm text-gray-600">Not yet published</p>
          </div>
        </div>

        {/* Company Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Company Details
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Tenant Information</h2>
              <p className="text-gray-600 text-sm">
                {tenant?.status === 'approved' 
                  ? 'Your company is approved. You can update details anytime without losing approval.' 
                  : 'Fill in company details to request approval and unlock job posting.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {tenant?.slug && (
                <>
                  <button
                    onClick={() => navigate(`/companies/${tenant.slug}`)}
                    className="px-4 py-2 border border-gray-300 text-text-main rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Profile
                  </button>
                  <button
                    onClick={() => navigate('/company/edit')}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                </>
              )}
              {/* Permissions management link for owner/admins */}
              {tenant && (tenant.user_id === localStorage.getItem('userId') || memberPermissions.can_manage_permissions) && (
                <button
                  onClick={() => navigate(`/tenant/${tenant.id}/permissions`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Manage Permissions
                </button>
              )}
              {tenant && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2 ${
                    tenant.status === 'approved'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : tenant.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tenant.status === 'approved' ? '#16a34a' : tenant.status === 'rejected' ? '#dc2626' : '#d97706' }}
                  />
                  {tenant.status}
                </span>
              )}
            </div>
          </div>

          {tenant?.status === 'rejected' && tenant?.rejection_reason && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Application Rejected
              </p>
              <p className="text-red-700 text-sm">{tenant.rejection_reason}</p>
              <p className="text-red-600 text-xs mt-2">Please update your information and resubmit for review.</p>
            </div>
          )}

          {tenant?.status === 'pending' && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-semibold mb-1 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Pending Admin Review
              </p>
              <p className="text-amber-700 text-sm">Your application is being reviewed by our admin team. You'll be notified once approved.</p>
            </div>
          )}

          {tenant?.status === 'approved' && !approvalDismissed && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg relative">
              <button
                onClick={handleDismissApproval}
                className="absolute top-3 right-3 text-green-600 hover:text-green-800 transition-colors"
                aria-label="Dismiss"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-green-800 font-semibold mb-1 flex items-center gap-2 pr-8">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Tenant Approved ✓
              </p>
              <p className="text-green-700 text-sm">Your company is verified and approved. You can now post jobs and update your details anytime.</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Company Name</label>
                <input name="company_name" value={form.company_name} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" placeholder="Your Company Inc." required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Industry</label>
                <div className="relative industry-dropdown-container">
                  <input
                    name="industry"
                    value={industrySearch || form.industry}
                    onChange={(e) => {
                      setIndustrySearch(e.target.value)
                      setShowIndustryDropdown(true)
                    }}
                    onFocus={() => setShowIndustryDropdown(true)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm"
                    placeholder="Search industries..."
                  />
                  {showIndustryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, industry_id: null, industry: '' }))
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
                                setForm((prev) => ({ ...prev, industry_id: ind.id, industry: ind.name }))
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
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                <input name="location" value={form.location} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" placeholder="San Francisco, CA" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Website</label>
                <input name="website" value={form.website} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" placeholder="https://example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Company Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" placeholder="Tell us about your company..." rows={3} />
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" placeholder="+1 (555) 000-0000" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Company Email</label>
                <input name="company_email" value={form.company_email} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" placeholder="contact@company.com" type="email" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Org. Number</label>
                <input name="org_number" value={form.org_number} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm" placeholder="123-456-789" required />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={savingTenant}
                className={`px-6 py-3 rounded-lg font-semibold shadow-sm transition-all ${savingTenant ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
              >
                {savingTenant ? 'Saving...' : (tenant?.status === 'approved' ? 'Update Details' : 'Save & Request Approval')}
              </button>
            </div>
          </form>
        </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 shadow-sm">
          <div className="p-0">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'jobs'
                    ? 'text-primary border-b-2 border-primary bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Job Postings ({jobs.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm">
          <div className="p-8">
            {/* JOBS TAB */}
            {activeTab === 'jobs' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-3 border border-purple-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Your Job Postings
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Manage Listings</h2>
                    {tenant && (
                      <div className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold">Tenant status:</span>
                        <span
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2 ${
                            tenant.status === 'approved'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : tenant.status === 'rejected'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tenant.status === 'approved' ? '#16a34a' : tenant.status === 'rejected' ? '#dc2626' : '#d97706' }}
                          />
                          {tenant.status}
                        </span>
                        {missingContact && (
                          <span className="ml-3 text-red-600 font-semibold">Add company phone, email, and org. nr to unlock posting.</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onCreateJob}
                    disabled={createDisabled}
                    className={`px-6 py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 ${createDisabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Job
                  </button>
                </div>

                {jobs.length === 0 && (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-4 text-lg font-medium">You haven't posted any jobs yet</p>
                    <button
                      onClick={onCreateJob}
                      disabled={createDisabled}
                      className={`px-6 py-3 rounded-lg font-semibold shadow-sm mx-auto ${createDisabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
                    >
                      Post your first job
                    </button>
                    {createDisabled && (
                      <p className="text-sm text-gray-500 mt-2">Complete company details and wait for admin approval.</p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {jobs.map((job) => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      onSelect={onSelectJob}
                      onEdit={onEditJob ? () => onEditJob(job) : null}
                      onTogglePublish={onTogglePublish ? () => onTogglePublish(job) : null}
                      isEmployer={true}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
