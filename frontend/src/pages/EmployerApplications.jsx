import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/api'
import { LoadingSpinner } from '../components/LoadingSpinner'

const formatMemberName = (member) => {
  if (!member) return 'Unknown member'
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
  if (fullName) return fullName
  if (member.email) return member.email
  if (member.user_id) return member.user_id.slice(0, 8)
  return 'Unknown member'
}

const formatRelativeTime = (value) => {
  if (!value) return 'Just now'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return 'Just now'
  const diffMs = Date.now() - timestamp.getTime()
  if (diffMs < 60_000) return 'Just now'
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const parseMetadata = (metadata) => {
  if (!metadata) return {}
  if (typeof metadata === 'object') return metadata
  try {
    return JSON.parse(metadata)
  } catch {
    return {}
  }
}

const haveSameMembers = (nextIds = [], previousIds = []) => {
  if (nextIds.length !== previousIds.length) return false
  const sortedNext = [...nextIds].sort()
  const sortedPrev = [...previousIds].sort()
  return sortedNext.every((id, idx) => id === sortedPrev[idx])
}

const collectUniqueReviewers = (applications = []) => {
  if (!applications.length) return []
  const idSet = new Set()
  applications.forEach(app => {
    (app.assigned_members || []).forEach(member => {
      if (member?.user_id) {
        idSet.add(member.user_id)
      }
    })
  })
  return Array.from(idSet)
}

const decodePathSegment = (value) => {
  if (!value) return value
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const encodeSegment = (value) => encodeURIComponent(String(value))

const buildJobPath = (job, candidateId) => {
  if (!job) return '/applications'
  const adSegment = encodeSegment(job.ad_number || job.id)
  const jobIdSegment = encodeSegment(job.id)
  let path = `/applications/${adSegment}/${jobIdSegment}`
  if (candidateId) {
    path += `/${encodeSegment(candidateId)}`
  }
  return path
}

export function EmployerApplications({ token, user, jobs = [] }) {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const [selectedJob, setSelectedJob] = useState(null)
  const [jobApplications, setJobApplications] = useState([])
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reviewingAI, setReviewingAI] = useState({})
  const [aiAnalysesMultilingual, setAiAnalysesMultilingual] = useState({})
  const [savingNotes, setSavingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null })
  const [filters, setFilters] = useState({ status: '', aiReviewed: '' })
  const [sortBy, setSortBy] = useState('applied_date_desc')
  const [editingBy, setEditingBy] = useState({})
  const [tenantMembers, setTenantMembers] = useState([])
  const [tenantMembersLoading, setTenantMembersLoading] = useState(false)
  const [jobAssignmentMenuOpen, setJobAssignmentMenuOpen] = useState(false)
  const [jobAssignmentSearch, setJobAssignmentSearch] = useState('')
  const [jobAssignmentSaving, setJobAssignmentSaving] = useState(false)
  const [jobReviewers, setJobReviewers] = useState([])
  const [jobReviewersBaseline, setJobReviewersBaseline] = useState([])
  const [auditPanelOpen, setAuditPanelOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [lastAuditFetch, setLastAuditFetch] = useState(null)

  const jobAssignmentDropdownRef = useRef(null)
  const autoReviewingRef = useRef(new Set())

  const routeJobId = params?.jobId ? decodePathSegment(params.jobId) : null
  const routeJobAdNumber = params?.jobAdNumber ? decodePathSegment(params.jobAdNumber) : null
  const routeCandidateId = params?.candidateId ? decodePathSegment(params.candidateId) : null

  const storedToken = token || localStorage.getItem('job-platform-token')
  const currentUserId = user?.id || user?.userId || user?.user_id || null
  const tenantContextId = useMemo(() => selectedJob?.tenant_id || jobs[0]?.tenant_id || user?.tenant_id || null, [jobs, selectedJob, user])
  const hasJobAssignmentChanges = !haveSameMembers(jobReviewers, jobReviewersBaseline)

  const extractErrorMessage = (error) => {
    if (!error) return 'Something went wrong'
    if (typeof error.message === 'string') {
      try {
        const parsed = JSON.parse(error.message)
        if (parsed && typeof parsed === 'object' && parsed.error) {
          return parsed.error
        }
      } catch {
        // ignore JSON parse error
      }
      return error.message
    }
    return 'Something went wrong'
  }

  const memberDirectory = useMemo(() => {
    const directory = new Map()
    const trackMember = (member) => {
      if (!member?.user_id) return
      if (directory.has(member.user_id)) return
      directory.set(member.user_id, {
        displayName: formatMemberName(member),
        email: member.email || ''
      })
    }
    tenantMembers.forEach(trackMember)
    jobApplications.forEach(app => {
      ;(app.assigned_members || []).forEach(trackMember)
    })
    return directory
  }, [jobApplications, tenantMembers])

  const currentMemberRecord = tenantMembers.find(member => member.user_id === currentUserId)
  const canViewAuditLogs = Boolean(
    user?.role === 'admin' ||
    currentMemberRecord?.role === 'owner' ||
    currentMemberRecord?.permissions?.can_view_audit_logs
  )
  const canManageAssignments = Boolean(
    currentMemberRecord?.role === 'owner' ||
    currentMemberRecord?.role === 'manager' ||
    currentMemberRecord?.permissions?.can_assign_application ||
    user?.role === 'admin'
  )

  const filteredMemberOptions = useMemo(() => {
    const available = tenantMembers.filter(member => member.user_id && (member.status === 'active' || member.role === 'owner'))
    if (!jobAssignmentSearch) return available
    const query = jobAssignmentSearch.toLowerCase()
    return available.filter(member => {
      const name = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
      const email = (member.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [jobAssignmentSearch, tenantMembers])

  const jobReviewerDetails = useMemo(() => (
    jobReviewers.map(userId => {
      const match = tenantMembers.find(member => member.user_id === userId)
      if (match) return match
      const fallback = jobApplications.flatMap(app => app.assigned_members || []).find(member => member.user_id === userId)
      return fallback || { user_id: userId, email: userId }
    })
  ), [jobReviewers, jobApplications, tenantMembers])

  const updateSelectedApplication = (app, { skipNavigation = false, jobContext = selectedJob } = {}) => {
    setSelectedApplication(app)
    setNotes(app?.notes || '')
    if (!jobContext || skipNavigation) {
      return
    }
    const candidateIdentifier = app?.candidate_id ? String(app.candidate_id) : null
    const nextPath = buildJobPath(jobContext, candidateIdentifier)
    if (location.pathname !== nextPath) {
      navigate(nextPath)
    }
  }

  // Load applications when job changes
  const loadJobApplications = async (
    jobId,
    {
      targetApplicationId = null,
      targetCandidateId = null,
      preserveSelection = false,
      jobContext = selectedJob
    } = {}
  ) => {
    try {
      setLoading(true)
      const apps = await api.getApplications({ jobId }, storedToken)
      const normalized = (apps || []).map(app => ({
        ...app,
        assigned_members: Array.isArray(app.assigned_members) ? app.assigned_members : []
      }))
      setJobApplications(normalized)

      const reviewerSeed = collectUniqueReviewers(normalized)
      setJobReviewersBaseline(reviewerSeed)
      setJobReviewers(reviewerSeed)

      let nextSelection = null
      if (normalized.length) {
        if (targetCandidateId) {
          nextSelection = normalized.find(app => String(app.candidate_id) === String(targetCandidateId)) || null
        }
        if (!nextSelection && targetApplicationId) {
          nextSelection = normalized.find(app => app.id === targetApplicationId) || null
        }
        if (!nextSelection && preserveSelection && selectedApplication?.job_id === jobId) {
          nextSelection = normalized.find(app => app.id === selectedApplication.id) || null
        }
        if (!nextSelection) {
          nextSelection = normalized[0]
        }
      }

      if (nextSelection) {
        const candidateMatched = Boolean(
          targetCandidateId && nextSelection?.candidate_id &&
          String(nextSelection.candidate_id) === String(targetCandidateId)
        )
        updateSelectedApplication(nextSelection, {
          skipNavigation: candidateMatched,
          jobContext
        })
      } else {
        updateSelectedApplication(null, {
          skipNavigation: false,
          jobContext
        })
      }
    } catch (err) {
      console.error('Failed to load job applications:', err)
      setJobApplications([])
      updateSelectedApplication(null, { skipNavigation: true, jobContext })
      setJobReviewers([])
      setJobReviewersBaseline([])
    } finally {
      setLoading(false)
    }
  }

  const loadTenantMembers = async (tenantId) => {
    if (!tenantId) {
      setTenantMembers([])
      return
    }
    try {
      setTenantMembersLoading(true)
      const members = await api.getTenantMembers(tenantId, storedToken)
      setTenantMembers(Array.isArray(members) ? members : [])
    } catch (err) {
      console.error('Failed to load tenant members:', err)
      setTenantMembers([])
    } finally {
      setTenantMembersLoading(false)
    }
  }


  const loadAuditLogs = async (tenantId = tenantContextId) => {
    if (!tenantId) return
    try {
      setAuditLoading(true)
      setAuditError('')
      const logs = await api.getTenantAuditLogs(tenantId, storedToken)
      setAuditLogs(Array.isArray(logs) ? logs : [])
      setLastAuditFetch(new Date())
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setAuditLogs([])
      setAuditError(extractErrorMessage(err))
    } finally {
      setAuditLoading(false)
    }
  }

  // Handle job selection
  const handleSelectJob = (
    job,
    { targetApplicationId = null, targetCandidateId = null, skipRouting = false } = {}
  ) => {
    if (!job) return
    setSelectedJob(job)
    setSelectedApplication(null)
    setJobReviewers([])
    setJobReviewersBaseline([])
    setNotes('')
    setAuditPanelOpen(false)
    setJobAssignmentMenuOpen(false)
    setJobAssignmentSearch('')
    loadJobApplications(job.id, {
      targetApplicationId,
      targetCandidateId,
      jobContext: job
    })
    loadTenantMembers(job.tenant_id || user?.tenant_id)
    if (!skipRouting) {
      const nextPath = buildJobPath(job, targetCandidateId)
      if (location.pathname !== nextPath) {
        navigate(nextPath)
      }
    }
  }
  // Filter and sort applications based on active filters
  const filteredApplications = useMemo(() => {
    let result = jobApplications.filter(app => {
      if (filters.status && app.status !== filters.status) return false
      if (filters.aiReviewed === 'reviewed' && !app.ai_reviewed_at) return false
      if (filters.aiReviewed === 'notreviewed' && app.ai_reviewed_at) return false
      return true
    })

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'ai_score_highest':
          return (b.ai_match_score || 0) - (a.ai_match_score || 0)
        case 'ai_score_lowest':
          return (a.ai_match_score || 0) - (b.ai_match_score || 0)
        case 'applied_date_first':
          return new Date(a.applied_at || a.created_at) - new Date(b.applied_at || b.created_at)
        case 'name_alphabetical': {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
          return nameA.localeCompare(nameB)
        }
        case 'name_reverse': {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
          return nameB.localeCompare(nameA)
        }
        case 'applied_date_desc':
        default:
          return new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at)
      }
    })

    return result
  }, [jobApplications, filters, sortBy])

  useEffect(() => {
    if (!jobAssignmentMenuOpen) return
    const handleClick = (event) => {
      if (jobAssignmentDropdownRef.current && !jobAssignmentDropdownRef.current.contains(event.target)) {
        setJobAssignmentMenuOpen(false)
        setJobAssignmentSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [jobAssignmentMenuOpen])

  useEffect(() => {
    if (selectedJob) return
    setJobApplications([])
    setSelectedApplication(null)
    setNotes('')
    setTenantMembers([])
    setAuditPanelOpen(false)
    setJobReviewers([])
    setJobReviewersBaseline([])
    setJobAssignmentMenuOpen(false)
    setJobAssignmentSearch('')
  }, [selectedJob])

  useEffect(() => {
    const hasRouteSelection = Boolean(routeJobId || routeJobAdNumber)
    if (!hasRouteSelection) {
      if (selectedJob) {
        setSelectedJob(null)
        setSelectedApplication(null)
        setJobApplications([])
        setNotes('')
        setJobReviewers([])
        setJobReviewersBaseline([])
        setAuditPanelOpen(false)
        setJobAssignmentMenuOpen(false)
        setJobAssignmentSearch('')
      }
      return
    }
    const matchedJob = jobs.find(job => {
      const matchesId = routeJobId ? String(job.id) === String(routeJobId) : false
      const matchesAd = routeJobAdNumber ? job.ad_number === routeJobAdNumber : false
      return matchesId || matchesAd
    })
    if (!matchedJob) {
      return
    }
    if (!selectedJob || selectedJob.id !== matchedJob.id) {
      handleSelectJob(matchedJob, {
        targetCandidateId: routeCandidateId,
        skipRouting: true
      })
      return
    }
    if (routeCandidateId) {
      if (!selectedApplication || String(selectedApplication.candidate_id) !== String(routeCandidateId)) {
        const candidateMatch = jobApplications.find(app => String(app.candidate_id) === String(routeCandidateId))
        if (candidateMatch) {
          updateSelectedApplication(candidateMatch, { skipNavigation: true, jobContext: matchedJob })
        }
      }
    } else if (selectedApplication) {
      updateSelectedApplication(selectedApplication)
    }
  }, [jobs, routeJobId, routeJobAdNumber, routeCandidateId, selectedJob, selectedApplication, jobApplications])

  // Note: AI analysis is already included in selectedApplication.ai_analysis
  // No need to fetch separately since it comes from the applications table
  // The application_ai_analysis table is for storing multilingual translations

  useEffect(() => {
    if (!selectedApplication || !selectedJob) return
    if (selectedApplication.status !== 'applied') return
    const appId = selectedApplication.id
    if (!appId || autoReviewingRef.current.has(appId)) return
    autoReviewingRef.current.add(appId)
    handleStatusChange('reviewing', { silent: true, skipReload: true }).catch(() => {
      autoReviewingRef.current.delete(appId)
    })
  }, [selectedApplication?.id, selectedApplication?.status, selectedJob?.id])

  const handleSaveNotes = async () => {
    if (!selectedApplication) return
    try {
      setSavingNotes(true)
      await api.updateApplicationNotes(selectedApplication.id, notes, storedToken)
      setSelectedApplication(prev => ({ ...prev, notes }))
      setModal({ show: true, type: 'success', title: t('common.success'), message: t('applications.employer.messages.notesSaved'), onConfirm: null })
    } catch (err) {
      console.error('Failed to save notes:', err)
      setModal({ show: true, type: 'error', title: t('common.error'), message: t('applications.employer.messages.notesFailed'), onConfirm: null })
    } finally {
      setSavingNotes(false)
    }
  }

  const handleStatusChange = async (newStatus, { silent = false, skipReload = false } = {}) => {
    if (!selectedApplication || !selectedJob) return
    if (!newStatus || selectedApplication.status === newStatus) return
    const currentApplicationId = selectedApplication.id
    try {
      await api.updateApplicationStatus(selectedApplication.id, newStatus, storedToken)
      setSelectedApplication(prev => (prev ? { ...prev, status: newStatus } : prev))
      setJobApplications(prev => prev.map(app => (app.id === currentApplicationId ? { ...app, status: newStatus } : app)))
      if (!skipReload) {
        loadJobApplications(selectedJob.id, { targetApplicationId: currentApplicationId, jobContext: selectedJob })
      }
      if (!silent) {
        setModal({ show: true, type: 'success', title: t('common.success'), message: t('applications.employer.messages.statusUpdated'), onConfirm: null })
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      if (!silent) {
        setModal({ show: true, type: 'error', title: t('common.error'), message: t('applications.employer.messages.statusFailed'), onConfirm: null })
      }
    }
  }

  const syncAssignments = (applicationId, assignedMembers) => {
    const normalizedMembers = Array.isArray(assignedMembers) ? assignedMembers : []
    setJobApplications(prev => prev.map(app => (app.id === applicationId ? { ...app, assigned_members: normalizedMembers } : app)))
    setSelectedApplication(prev => {
      if (!prev || prev.id !== applicationId) {
        return prev
      }
      return { ...prev, assigned_members: normalizedMembers }
    })
  }
  const toggleJobReviewer = (userId) => {
    if (!userId) return
    setJobReviewers(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]))
  }

  const handleJobReviewersSave = async () => {
    if (!selectedJob || jobAssignmentSaving || !hasJobAssignmentChanges || !storedToken) return
    if (!jobApplications.length) {
      setModal({ show: true, type: 'error', title: t('applications.employer.messages.noApplicationsTitle'), message: t('applications.employer.messages.noApplicationsBody'), onConfirm: null })
      return
    }
    try {
      setJobAssignmentSaving(true)
      let finalAssignmentPayload = null
      for (const app of jobApplications) {
        try {
          const result = await api.updateApplicationAssignments(app.id, jobReviewers, storedToken)
          if (result?.assigned) {
            syncAssignments(app.id, result.assigned)
            finalAssignmentPayload = result.assigned
          }
        } catch (innerErr) {
          console.error(`Failed to update assignments for application ${app.id}`, innerErr)
          throw innerErr
        }
      }
      if (finalAssignmentPayload) {
        const finalIds = finalAssignmentPayload.map(member => member.user_id).filter(Boolean)
        setJobReviewers(finalIds)
        setJobReviewersBaseline(finalIds)
      } else {
        setJobReviewersBaseline([...jobReviewers])
      }
      setModal({ show: true, type: 'success', title: t('applications.employer.messages.reviewersUpdatedTitle'), message: t('applications.employer.messages.reviewersUpdatedBody'), onConfirm: null })
      setJobAssignmentMenuOpen(false)
      setJobAssignmentSearch('')
    } catch (err) {
      console.error('Failed to update job reviewers:', err)
      setModal({ show: true, type: 'error', title: t('applications.employer.messages.assignmentError'), message: extractErrorMessage(err), onConfirm: null })
    } finally {
      setJobAssignmentSaving(false)
    }
  }

  const metadataSummaryForLog = (log) => {
    const metadata = parseMetadata(log.metadata)
    if (log.action === 'application_status_change') {
      return `${metadata.from || 'unknown'} → ${metadata.to || 'unknown'}`
    }
    if (log.action === 'application_assignments_updated') {
      const formatMemberChangeLabel = (userId) => {
        if (!userId) return 'unknown'
        const info = memberDirectory.get(userId)
        if (!info) return userId.slice(0, 8)
        if (info.email && info.displayName && info.displayName !== info.email) {
          return `${info.email} (${info.displayName})`
        }
        return info.email || info.displayName || userId.slice(0, 8)
      }
      const addedNames = (metadata.added || []).map(formatMemberChangeLabel)
      const removedNames = (metadata.removed || []).map(formatMemberChangeLabel)
      const parts = []
      if (addedNames.length) parts.push(`added ${addedNames.join(', ')}`)
      if (removedNames.length) parts.push(`removed ${removedNames.join(', ')}`)
      return parts.join(' / ') || 'assignments updated'
    }
    if (log.action === 'application_notes_update') {
      if (typeof metadata.previousLength === 'number' && typeof metadata.newLength === 'number') {
        return `length ${metadata.previousLength} → ${metadata.newLength}`
      }
      return 'notes updated'
    }
    return ''
  }

  const actionLabelForLog = (log) => {
    if (log.action === 'application_status_change') return 'changed status'
    if (log.action === 'application_assignments_updated') return 'updated assignments'
    if (log.action === 'application_notes_update') return 'updated notes'
    return log.action?.replace(/_/g, ' ') || 'performed an action'
  }

  const buildTargetLabel = (log) => {
    const metadata = parseMetadata(log.metadata)
    const applicationName = metadata.applicationName || metadata.candidateName
    const applicationEmail = metadata.candidateEmail || metadata.applicationEmail
    let applicationLabel = null
    if (applicationEmail && applicationName) {
      applicationLabel = `${applicationEmail} • ${applicationName}`
    } else {
      applicationLabel = applicationEmail || applicationName
    }
    let jobLabel = metadata.jobTitle || metadata.jobId || null
    if (metadata.jobAdNumber) {
      const adTag = `#${metadata.jobAdNumber}`
      jobLabel = jobLabel ? `${jobLabel} (${adTag})` : adTag
    }
    if (applicationLabel && jobLabel) {
      return `${applicationLabel} • ${jobLabel}`
    }
    if (applicationLabel) {
      return applicationLabel
    }
    if (jobLabel) {
      return jobLabel
    }
    if (log.target_type && log.target_id) {
      return `${log.target_type}#${log.target_id}`
    }
    return log.target_type || 'record'
  }

  const handleAuditToggle = () => {
    if (!tenantContextId || !canViewAuditLogs) return
    const nextOpen = !auditPanelOpen
    setAuditPanelOpen(nextOpen)
    if (nextOpen) {
      loadAuditLogs(tenantContextId)
    }
  }

  const handleAuditRefresh = () => {
    if (!tenantContextId || !canViewAuditLogs) return
    loadAuditLogs(tenantContextId)
  }

  const statusColors = {
    applied: 'bg-blue-50 text-blue-700 border-blue-200',
    reviewing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    shortlisted: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    hired: 'bg-purple-50 text-purple-700 border-purple-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
  }

  // Job selection view
  if (!selectedJob) {
    return (
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        <div className="w-full max-w-4xl h-full overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('applications.employer.headers.reviewSystem')}</h1>
              <p className="text-gray-600">{t('applications.employer.headers.selectJob')}</p>
              {jobs.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {t('applications.employer.headers.jobCount', { 
                    count: jobs.length,
                    appCount: jobs.reduce((sum, j) => sum + (typeof j.application_count === 'number' ? j.application_count : 0), 0)
                  })}
                </p>
              )}
            </div>

            {loading ? (
              <LoadingSpinner fullScreen={false} size="md" message={t('common.loading')} />
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600">{t('applications.employer.messages.noJobs')}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {jobs.map(job => {
                  const appCount = typeof job.application_count === 'number' ? job.application_count : 0
                  return (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-primary cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{job.location}</p>
                          {job.ad_number && (
                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{t('jobs.jobIdLabel')} #{job.ad_number}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {job.employment_type}
                            </span>
                            {job.active ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">{t('admin.common.enabled')}</span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{t('admin.common.disabled')}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{appCount}</div>
                          <p className="text-xs text-gray-600">{t('applications.employer.labels.applications')}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Application review view
  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="w-full max-w-6xl h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setSelectedJob(null)
                setSelectedApplication(null)
                setAuditPanelOpen(false)
                navigate('/applications')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded font-medium hover:bg-gray-300"
            >
              {t('applications.employer.actions.backToJobs')}
            </button>
            <button
              onClick={() => {
                loadJobApplications(selectedJob.id, { preserveSelection: true, jobContext: selectedJob })
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded font-medium hover:bg-blue-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('applications.employer.actions.refresh')}
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h1>
              <p className="text-sm text-gray-600">{selectedJob.location}</p>
              {selectedJob.ad_number && (
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('jobs.jobIdLabel')} #{selectedJob.ad_number}</p>
              )}
            </div>
          </div>

          {/* Job Reviewers */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-semibold mb-2">{t('applications.employer.reviewers.title')}</p>
                <div className="flex flex-wrap gap-2">
                  {jobReviewerDetails.length ? (
                    jobReviewerDetails.map(member => (
                      <span
                        key={member.user_id || member.email}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full border border-gray-200"
                      >
                        <span className="font-semibold text-sm">{formatMemberName(member)}</span>
                        {canManageAssignments && (
                          <button
                            type="button"
                            onClick={() => toggleJobReviewer(member.user_id)}
                            className="text-gray-500 hover:text-red-600"
                            aria-label={`Remove ${formatMemberName(member)}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">{t('applications.employer.reviewers.noneAssigned')}</span>
                  )}
                </div>
              </div>

              {canManageAssignments ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end w-full md:w-auto" ref={jobAssignmentDropdownRef}>
                  <div className="relative w-full sm:max-w-xs">
                    <button
                      type="button"
                      onClick={() => setJobAssignmentMenuOpen(prev => !prev)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {jobAssignmentMenuOpen ? t('applications.employer.reviewers.closeTeam') : t('applications.employer.reviewers.selectTeam')}
                    </button>
                    {jobAssignmentMenuOpen && (
                      <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-gray-200 bg-white shadow-xl">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={jobAssignmentSearch}
                            onChange={(e) => setJobAssignmentSearch(e.target.value)}
                            placeholder={t('applications.employer.reviewers.searchPlaceholder')}
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {tenantMembersLoading ? (
                            <div className="p-3"><LoadingSpinner fullScreen={false} size="sm" /></div>
                          ) : filteredMemberOptions.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500">{t('applications.employer.reviewers.noMembersFound')}</div>
                          ) : (
                            filteredMemberOptions.map(member => (
                              <label
                                key={`job-option-${member.user_id}`}
                                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={jobReviewers.includes(member.user_id)}
                                  onChange={() => toggleJobReviewer(member.user_id)}
                                  className="rounded"
                                />
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{formatMemberName(member)}</p>
                                  <p className="text-xs text-gray-500 capitalize">{member.role || 'member'} • {member.email}</p>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleJobReviewersSave}
                    disabled={!hasJobAssignmentChanges || jobAssignmentSaving}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                      hasJobAssignmentChanges
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    } disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                  >
                    {jobAssignmentSaving ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('common.saving')}
                      </>
                    ) : hasJobAssignmentChanges ? t('applications.employer.reviewers.applyToAll') : t('applications.employer.reviewers.upToDate')}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">{t('applications.employer.reviewers.noPermission')}</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">{t('applications.employer.reviewers.description')}</p>
            {hasJobAssignmentChanges && canManageAssignments && (
              <p className="text-xs text-amber-600 font-semibold mt-2">{t('applications.employer.reviewers.unsavedChanges')}</p>
            )}
          </div>

          {/* Two column layout: Applications list and detail view */}
          <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
            {/* Applications List */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{t('applications.employer.list.title', { count: filteredApplications.length })}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAuditToggle}
                      disabled={!tenantContextId || !canViewAuditLogs}
                      title={canViewAuditLogs ? 'Tenant audit trail' : 'Requires audit-log permission'}
                      className={`p-2 rounded-full border transition-colors ${
                        auditPanelOpen
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'text-gray-600 border-gray-300 hover:bg-gray-900/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7h14M5 12h14M5 17h8" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  >
                    <option value="">{t('applications.employer.status.all')}</option>
                    <option value="applied">{t('applications.employer.status.applied')}</option>
                    <option value="reviewing">{t('applications.employer.status.reviewing')}</option>
                    <option value="shortlisted">{t('applications.employer.status.shortlisted')}</option>
                    <option value="rejected">{t('applications.employer.status.rejected')}</option>
                    <option value="hired">{t('applications.employer.status.hired')}</option>
                  </select>
                  
                  <select
                    value={filters.aiReviewed}
                    onChange={(e) => setFilters(prev => ({ ...prev, aiReviewed: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  >
                    <option value="">{t('applications.employer.status.filterAll')}</option>
                    <option value="reviewed">{t('applications.employer.status.filterReviewed')}</option>
                    <option value="notreviewed">{t('applications.employer.status.filterNotReviewed')}</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  >
                    <option value="applied_date_desc">Latest Applied First</option>
                    <option value="applied_date_first">Oldest Applied First</option>
                    <option value="ai_score_highest">Highest AI Score</option>
                    <option value="ai_score_lowest">Lowest AI Score</option>
                    <option value="name_alphabetical">Name (A-Z)</option>
                    <option value="name_reverse">Name (Z-A)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredApplications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">{t('applications.employer.list.noMatches')}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredApplications.map(app => {
                      const scoreChip = (
                        app.ai_match_score !== null && app.ai_match_score !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full font-bold text-sm ${
                              app.ai_match_score >= 80 ? 'bg-green-100 text-green-800' :
                              app.ai_match_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              app.ai_match_score >= 40 ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {t('applications.employer.ai.matchPercentage', { score: app.ai_match_score })}
                            </div>
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )
                      )
                      return (
                        <div
                          key={app.id}
                          onClick={() => updateSelectedApplication(app)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              updateSelectedApplication(app)
                            }
                          }}
                          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedApplication?.id === app.id ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{app.candidate_name || t('common.unnamed')}</h4>
                              <p className="text-sm text-gray-600">{app.candidate_email}</p>
                              {app.applied_at && (
                                <p className="text-xs text-gray-500 mt-1">{t('applications.employer.list.appliedDate', { date: new Date(app.applied_at).toLocaleDateString() })}</p>
                              )}
                              {editingBy[app.id] && (
                                <p className="text-xs text-blue-600 font-semibold mt-1">{t('applications.employer.list.beingReviewed')}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">                              {!app.ai_reviewed_at && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setReviewingAI(prev => ({ ...prev, [app.id]: true }))
                                    setEditingBy(prev => ({ ...prev, [app.id]: true }))
                                    api.aiReviewApplication(app.id, storedToken, false)
                                      .then(() => loadJobApplications(selectedJob.id, { preserveSelection: true, jobContext: selectedJob }))
                                      .catch(err => setModal({ show: true, type: 'error', title: t('common.error'), message: t('applications.employer.ai.failure') + (err.message || ''), onConfirm: null }))
                                      .finally(() => {
                                        setReviewingAI(prev => ({ ...prev, [app.id]: false }))
                                        setEditingBy(prev => ({ ...prev, [app.id]: false }))
                                      })
                                  }}
                                  disabled={reviewingAI[app.id]}
                                  className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded border border-purple-200 hover:bg-purple-100 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {reviewingAI[app.id] ? (
                                    <>
                                      <div className="h-3 w-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
                                      {t('applications.employer.actions.analyzing')}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      {t('applications.employer.actions.aiReview')}
                                    </>
                                  )}
                                </button>
                              )}
                              {app.ai_reviewed_at && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setReviewingAI(prev => ({ ...prev, [app.id]: true }))
                                    setEditingBy(prev => ({ ...prev, [app.id]: true }))
                                    api.aiReviewApplication(app.id, storedToken, true)
                                      .then(() => loadJobApplications(selectedJob.id, { preserveSelection: true, jobContext: selectedJob }))
                                      .catch(err => setModal({ show: true, type: 'error', title: t('common.error'), message: t('applications.employer.ai.failure') + (err.message || ''), onConfirm: null }))
                                      .finally(() => {
                                        setReviewingAI(prev => ({ ...prev, [app.id]: false }))
                                        setEditingBy(prev => ({ ...prev, [app.id]: false }))
                                      })
                                  }}
                                  disabled={reviewingAI[app.id]}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded border border-blue-200 hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1"
                                  title="Re-analyze this application"
                                >
                                  {reviewingAI[app.id] ? (
                                    <>
                                      <div className="h-3 w-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                                      {t('applications.employer.ai.reanalyzing')}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1119.414 5.414.999.999 0 10-1.414-1.414A5.002 5.002 0 104.707 5.707H6a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                                      </svg>
                                      {t('applications.employer.ai.rereview')}
                                    </>
                                  )}
                                </button>
                              )}                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[app.status] || statusColors.applied}`}>
                                  {app.status || 'applied'}
                                </span>
                              </div>
                          </div>
                            {scoreChip}
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              {Array.isArray(app.assigned_members) && app.assigned_members.length > 0 ? (
                                <>
                                  {app.assigned_members.slice(0, 3).map(member => (
                                    <span
                                      key={`${app.id}-${member.user_id}`}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200"
                                    >
                                      <span className="font-semibold">{formatMemberName(member)}</span>
                                      {member.role && (
                                        <span className="text-[10px] uppercase tracking-wide text-gray-500">{member.role}</span>
                                      )}
                                    </span>
                                  ))}
                                  {app.assigned_members.length > 3 && (
                                    <span className="text-gray-500">{t('common.moreCount', { count: app.assigned_members.length - 3 })}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-500 italic">{t('applications.employer.reviewers.unassigned')}</span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              {app.used_profile && (
                                <span className="text-green-700 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  {t('applications.employer.list.profileSource')}
                                </span>
                              )}
                              {app.used_cv && (
                                <span className="text-green-700 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  {t('applications.employer.list.cvSource')}
                                </span>
                              )}
                              {Array.isArray(app.custom_files) && app.custom_files.length > 0 && (
                                <span className="text-blue-700 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 012-2h6a1 1 0 00-.707.293L6.293 6.586A1 1 0 006 7.293V4zm2 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" />
                                  </svg>
                                  {t('applications.employer.list.fileCount', { count: app.custom_files.length })}
                                </span>
                              )}
                            </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Application Detail View */}
            <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              {!selectedApplication ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-500">{t('applications.employer.details.selectMessage')}</p>
                </div>
              ) : (
                <>
                  {/* Detail Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedApplication.candidate_name}</h2>
                        <p className="text-sm text-gray-600">{selectedApplication.candidate_email}</p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={selectedApplication.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className={`px-3 py-1 rounded font-semibold text-sm border capitalize ${statusColors[selectedApplication.status] || statusColors.applied}`}
                        >
                          <option value="applied">{t('applications.employer.status.applied')}</option>
                          <option value="reviewing">{t('applications.employer.status.reviewing')}</option>
                          <option value="shortlisted">{t('applications.employer.status.shortlisted')}</option>
                          <option value="rejected">{t('applications.employer.status.rejected')}</option>
                          <option value="hired">{t('applications.employer.status.hired')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Detail Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Saved Profile */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-3">{t('applications.employer.details.savedProfile')}</p>
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{selectedApplication.candidate_name}</h3>
                              {selectedApplication.candidate_title && (
                                <p className="text-sm text-gray-700 mt-1">{selectedApplication.candidate_title}</p>
                              )}
                              {selectedApplication.candidate_location && (
                                <p className="text-sm text-gray-600">{selectedApplication.candidate_location}</p>
                              )}
                            </div>
                            <div className="text-right">
                              {selectedApplication.seniority_level && (
                                <p className="text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded">{selectedApplication.seniority_level}</p>
                              )}
                              {reviewingAI[selectedApplication.id] && (
                                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded">
                                  {t('applications.employer.ai.inReviewLive')}
                                </span>
                              )}
                            </div>
                          </div>

                          {selectedApplication.bio && (
                            <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm text-gray-700">{selectedApplication.bio}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            {selectedApplication.years_of_experience && (
                              <div className="bg-white rounded p-2">
                                <p className="font-semibold text-gray-900">{selectedApplication.years_of_experience}+</p>
                                <p className="text-gray-600">{t('applications.employer.details.yearsExp')}</p>
                              </div>
                            )}
                            {selectedApplication.employment_status && (
                              <div className="bg-white rounded p-2">
                                <p className="font-semibold text-gray-900 capitalize">{selectedApplication.employment_status}</p>
                                <p className="text-gray-600">{t('applications.employer.details.status')}</p>
                              </div>
                            )}
                            {selectedApplication.open_to_work !== undefined && (
                              <div className="bg-white rounded p-2">
                                <p className="font-semibold text-green-700">{selectedApplication.open_to_work ? t('applications.employer.details.openToWork') : t('applications.employer.details.notOpenToWork')}</p>
                                <p className="text-gray-600">{t('applications.employer.details.toWork')}</p>
                              </div>
                            )}
                          </div>

                          {(selectedApplication.linkedin_url || selectedApplication.github_url || selectedApplication.portfolio_url || selectedApplication.phone || selectedApplication.cv_file_url || selectedApplication.candidate_email) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {selectedApplication.phone && (
                                <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded">{selectedApplication.phone}</span>
                              )}
                              {selectedApplication.candidate_email && (
                                <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded">{selectedApplication.candidate_email}</span>
                              )}
                              {selectedApplication.linkedin_url && (
                                <a href={selectedApplication.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">LinkedIn</a>
                              )}
                              {selectedApplication.github_url && (
                                <a href={selectedApplication.github_url} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">GitHub</a>
                              )}
                              {selectedApplication.portfolio_url && (
                                <a href={selectedApplication.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">Portfolio</a>
                              )}
                              {selectedApplication.cv_file_url && (
                                <a href={selectedApplication.cv_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1 rounded">{t('applications.employer.details.downloadCv')}</a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {selectedApplication.ai_match_score !== null && selectedApplication.ai_match_score !== undefined ? (
                      <div className="border-2 border-purple-200 rounded-xl p-5 bg-gradient-to-br from-purple-50 to-indigo-50">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-600 rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">{t('applications.employer.ai.analysisTitle')}</h3>
                            <p className="text-xs text-gray-500 mt-1">{t('applications.employer.ai.disclaimer')} ({locale === 'so' ? 'Somali' : 'English'})</p>
                          </div>
                          <div className={`px-4 py-2 rounded-full font-bold text-lg ${
                            selectedApplication.ai_match_score >= 80 ? 'bg-green-500 text-white' :
                            selectedApplication.ai_match_score >= 60 ? 'bg-yellow-500 text-white' :
                            selectedApplication.ai_match_score >= 40 ? 'bg-orange-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {selectedApplication.ai_match_score}%
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-purple-100">
                          <div className="mb-4 text-sm text-gray-600">
                            <p className="font-semibold text-gray-700 mb-3">Comprehensive AI Analysis:</p>
                            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                              {aiAnalysesMultilingual[selectedApplication.id]?.[locale] || selectedApplication.ai_analysis}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={async () => {
                                setReviewingAI(prev => ({ ...prev, [selectedApplication.id]: true }))
                                setEditingBy(prev => ({ ...prev, [selectedApplication.id]: true }))
                                try {
                                  const result = await api.aiReviewApplication(selectedApplication.id, storedToken, true)
                                  setSelectedApplication(prev => ({
                                    ...prev,
                                    ai_match_score: result.matchScore,
                                    ai_analysis: result.analysis,
                                    ai_reviewed_at: result.reviewedAt
                                  }))
                                  setAiAnalysesMultilingual(prev => ({
                                    ...prev,
                                    [selectedApplication.id]: result.analyses
                                  }))
                                } catch (err) {
                                  setModal({ show: true, type: 'error', title: t('common.error'), message: t('applications.employer.ai.failure') + (err.message || ''), onConfirm: null })
                                } finally {
                                  setReviewingAI(prev => ({ ...prev, [selectedApplication.id]: false }))
                                  setEditingBy(prev => ({ ...prev, [selectedApplication.id]: false }))
                                }
                              }}
                              disabled={reviewingAI[selectedApplication.id]}
                              className="px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 disabled:opacity-50 text-sm"
                            >
                              {reviewingAI[selectedApplication.id] ? t('applications.employer.ai.reanalyzing') : t('applications.employer.ai.reanalyze')}
                            </button>
                          </div>
                          {selectedApplication.ai_reviewed_at && (
                            <p className="text-xs text-gray-500 italic border-t border-gray-200 pt-3 mt-3">{t('applications.employer.ai.reviewedLabel')}{new Date(selectedApplication.ai_reviewed_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={async () => {
                            setReviewingAI(prev => ({ ...prev, [selectedApplication.id]: true }))
                            setEditingBy(prev => ({ ...prev, [selectedApplication.id]: true }))
                            try {
                              const result = await api.aiReviewApplication(selectedApplication.id, storedToken, false)
                              setSelectedApplication(prev => ({
                                ...prev,
                                ai_match_score: result.matchScore,
                                ai_analysis: result.analysis,
                                ai_reviewed_at: result.reviewedAt
                              }))
                              setAiAnalysesMultilingual(prev => ({
                                ...prev,
                                [selectedApplication.id]: result.analyses
                              }))
                            } catch (err) {
                              setModal({ show: true, type: 'error', title: t('common.error'), message: t('applications.employer.ai.failure') + (err.message || ''), onConfirm: null })
                            } finally {
                              setReviewingAI(prev => ({ ...prev, [selectedApplication.id]: false }))
                              setEditingBy(prev => ({ ...prev, [selectedApplication.id]: false }))
                            }
                          }}
                          disabled={reviewingAI[selectedApplication.id]}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 disabled:opacity-50"
                        >
                          {reviewingAI[selectedApplication.id] ? t('applications.employer.ai.analyzing') : t('applications.employer.ai.analyze')}
                        </button>
                      </div>
                    )}

                    {/* Status and Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">{t('applications.employer.details.status').toUpperCase()}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border capitalize ${
                          selectedApplication.status === 'applied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          selectedApplication.status === 'reviewing' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          selectedApplication.status === 'accepted' || selectedApplication.status === 'shortlisted' ? 'bg-green-50 text-green-700 border-green-200' :
                          selectedApplication.status === 'hired' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {t(`applications.employer.status.${selectedApplication.status || 'applied'}`)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">{t('applications.employer.details.appliedDateLabel').toUpperCase()}</p>
                        <p className="text-sm font-medium">{selectedApplication.applied_at ? new Date(selectedApplication.applied_at).toLocaleDateString() : '-'}</p>
                      </div>
                    </div>

                    {/* Additional Profile Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">{t('applications.employer.details.nationality').toUpperCase()}</p>
                        <p className="text-sm font-medium">{selectedApplication.nationality || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">{t('profile.contact.email').toUpperCase()}</p>
                        <p className="text-sm font-medium">{selectedApplication.candidate_email || '-'}</p>
                      </div>
                    </div>

                    {/* Submitted Materials */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-3">{t('applications.employer.details.submittedMaterials')}</p>
                      <div className="space-y-2">
                        {selectedApplication.used_profile && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                            <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-green-900">{t('applications.employer.details.savedProfileLabel')}</span>

                          </div>
                        )}
                        {selectedApplication.used_cv && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                            <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-green-900">{t('applications.employer.details.cvAttachment')}</span>
                          </div>
                        )}
                        {Array.isArray(selectedApplication.custom_files) && selectedApplication.custom_files.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-2">{t('applications.employer.details.additionalDocs')} ({selectedApplication.custom_files.length})</p>
                            <div className="space-y-2">
                              {selectedApplication.custom_files.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                >
                                  <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 012-2h6a1 1 0 00-.707.293L6.293 6.586A1 1 0 006 7.293V4zm2 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" />
                                  </svg>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">{file.requirementName}</p>
                                    <p className="text-xs text-blue-700">{file.fileName}</p>
                                  </div>
                                  <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Highlights */}
                    {(Array.isArray(selectedApplication.skills) && selectedApplication.skills?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{t('applications.employer.sections.skills')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplication.skills.map((s) => (
                            <div key={s.id || s.skill_name} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs">
                              <span className="font-medium text-blue-900">{s.skill_name}</span>
                              {s.proficiency && (
                                <span className="text-blue-700 ml-1">({s.proficiency})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(Array.isArray(selectedApplication.work_experiences) && selectedApplication.work_experiences?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{t('applications.employer.sections.workHistory')}</h3>
                        <ul className="space-y-2 text-sm">
                          {selectedApplication.work_experiences.map((w, idx) => (
                            <li key={idx} className="p-3 bg-white rounded border border-gray-200">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="font-semibold text-gray-900">{w.job_title}</div>
                                  <div className="text-sm text-gray-700">{w.company_name}</div>
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                  {w.start_date} {w.end_date ? `- ${w.end_date}` : '- Present'}
                                </span>
                              </div>
                              {w.employment_type && (
                                <p className="text-xs text-gray-600 mb-2">{w.employment_type}</p>
                              )}
                              {w.description && <div className="text-sm text-gray-700">{w.description}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {(Array.isArray(selectedApplication.educations) && selectedApplication.educations?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{t('applications.employer.sections.education')}</h3>
                        <ul className="space-y-2 text-sm">
                          {selectedApplication.educations.map((e, idx) => (
                            <li key={idx} className="p-3 bg-white rounded border border-gray-200">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="font-semibold text-gray-900">{e.degree}</div>
                                  <div className="text-sm text-gray-700">{e.field_of_study}</div>
                                  <div className="text-sm text-gray-600">{e.institution}</div>
                                </div>
                                {(e.start_year || e.end_year) && (
                                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                    {e.start_year} {e.end_year ? `- ${e.end_year}` : ''}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {(Array.isArray(selectedApplication.languages) && selectedApplication.languages?.length) ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{t('applications.employer.sections.languages')}</h3>
                        <div className="flex flex-wrap gap-2 text-sm">
                          {selectedApplication.languages.map((l, idx) => (
                            <div key={idx} className="px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs">
                              <span className="font-medium text-green-900">{l.language}</span>
                              {l.proficiency && (
                                <span className="text-green-700 ml-1">({l.proficiency})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Cover Letter */}
                    {selectedApplication.cover_letter && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{t('applications.employer.sections.coverLetter')}</h3>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                          {selectedApplication.cover_letter}
                        </p>
                      </div>
                    )}

                    {/* Notes (bottom) */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('applications.employer.sections.notes')}</h3>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t('applications.employer.notes.placeholder')}
                        className="w-full p-3 border border-gray-300 rounded font-medium text-sm resize-none"
                        rows={4}
                      />
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingNotes ? t('common.saving') : t('applications.employer.notes.save')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

        {auditPanelOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setAuditPanelOpen(false)}
          ></div>
        )}

        <aside
          className={`fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ${
            auditPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-hidden={!auditPanelOpen}
        >
          <div className="h-full flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('applications.employer.audit.title')}</p>
                <p className="text-xs text-gray-500">
                  {lastAuditFetch ? `Updated ${new Date(lastAuditFetch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : t('applications.employer.audit.notFetched')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAuditRefresh}
                  disabled={auditLoading || !tenantContextId}
                  className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title={t('applications.employer.actions.refresh')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.58m15.36 2A8 8 0 004.58 9M12 21v-5m0 5l-3-3m3 3l3-3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setAuditPanelOpen(false)}
                  className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                  title={t('common.close')} 
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {auditLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner fullScreen={false} size="md" message={t('applications.employer.audit.loading')} />
                </div>
              ) : auditError ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                  {auditError}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-600">
                   {t('applications.employer.audit.empty')}
                </div>
              ) : (
                auditLogs.map(log => {
                  const actorLabel = formatMemberName({
                    first_name: log.first_name,
                    last_name: log.last_name,
                    email: log.email,
                    user_id: log.actor_user_id
                  })
                  const actionLabel = actionLabelForLog(log)
                  const metadataSummary = metadataSummaryForLog(log)
                  return (
                    <div key={log.id} className="border border-gray-100 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{actorLabel}</p>
                          <p className="text-xs text-gray-500 capitalize">{log.actor_role}</p>
                        </div>
                        <span className="text-xs text-gray-500">{formatRelativeTime(log.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-800">
                        <span className="font-semibold">{actionLabel}</span> on {buildTargetLabel(log)}
                        {metadataSummary ? ` – ${metadataSummary}` : ''}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </aside>

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              {modal.type === 'success' && (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {modal.type === 'error' && (
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {modal.type === 'confirm' && (
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900">{modal.title}</h3>
            </div>

            {/* Modal Message */}
            <p className="text-gray-700 mb-6">{modal.message}</p>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setModal({ show: false, type: '', title: '', message: '', onConfirm: null })}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => modal.onConfirm && modal.onConfirm()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {t('common.confirm') || 'Confirm'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModal({ show: false, type: '', title: '', message: '', onConfirm: null })}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    modal.type === 'success' 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {t('common.ok') || 'OK'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
