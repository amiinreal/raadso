import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'

// Helper to construct full CDN URL for files
const getCDNUrl = (fileUrl) => {
    if (!fileUrl) return null
    // If already a full URL, return as is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        return fileUrl
    }
    // Otherwise, prepend Bunny CDN base URL
    const CDN_BASE = 'https://amiinstudiocdn.b-cdn.net'
    // Remove leading slash if present to avoid double slashes
    const cleanPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl
    return `${CDN_BASE}/${cleanPath}`
}

export function ApplicantReviewDashboard() {
    const { jobId, applicantId } = useParams()
    const navigate = useNavigate()
    const leftPanelRef = useRef(null)
    const selectedAppRef = useRef(null)
    const [data, setData] = useState({
        job: null,
        applications: [],
        selectedApp: null,
        notes: '',
        messages: [],
        loading: true,
        error: null
    })
    const [activeTab, setActiveTab] = useState('profile')
    const [messageInput, setMessageInput] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)
    const [unreadByApp, setUnreadByApp] = useState({})
    const [aiBulkRunning, setAiBulkRunning] = useState(false)

    // Bulk Action State
    const [selectedAppIds, setSelectedAppIds] = useState(new Set())
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkSubject, setBulkSubject] = useState('')
    const [bulkMessage, setBulkMessage] = useState('')
    const [sendingBulk, setSendingBulk] = useState(false)

    useEffect(() => {
        const fetchJobAndApplications = async () => {
            try {
                const token = localStorage.getItem('job-platform-token')

                // Fetch job details
                const jobResponse = await fetch(`http://localhost:4000/jobs/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!jobResponse.ok) throw new Error('Failed to fetch job')
                const job = await jobResponse.json()

                // Fetch applications with FULL candidate profiles
                const appsResponse = await fetch(`http://localhost:4000/jobs/${jobId}/applications`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!appsResponse.ok) throw new Error('Failed to fetch applications')
                const applications = await appsResponse.json()

                // Prioritize applicantId from URL, then fallback to localStorage
                const savedSelectedAppId = applicantId || localStorage.getItem(`applicant-review-selected-${jobId}`)
                let selectedApp = null
                if (savedSelectedAppId) {
                    selectedApp = applications.find(app => String(app.id) === String(savedSelectedAppId))
                }

                setData({
                    job,
                    applications,
                    selectedApp,
                    notes: selectedApp?.notes || '',
                    messages: [],
                    loading: false,
                    error: null
                })

                // Fetch unread counts
                try {
                    const response = await fetch('http://localhost:4000/messages/unread/by-application', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    if (response.ok) {
                        const data = await response.json()
                        const unreadMap = {}
                        data.unreadByApplication.forEach(item => {
                            unreadMap[item.application_id] = parseInt(item.unread_count)
                        })
                        setUnreadByApp(unreadMap)
                    }
                } catch (err) {
                    console.error('Failed to fetch unread counts', err)
                }
            } catch (err) {
                console.error(err)
                setData(prev => ({ ...prev, loading: false, error: err.message }))
            }
        }
        fetchJobAndApplications()
    }, [jobId, applicantId])

    // Fetch messages every time selectedApp changes or when switching to the 'messages' tab
    useEffect(() => {
        if (data.selectedApp && data.selectedApp.id && activeTab === 'messages') {
            fetchMessages(data.selectedApp.id)
        }
    }, [data.selectedApp?.id, activeTab])

    // Scroll to selected app in left panel when it's selected or restored
    useEffect(() => {
        if (data.selectedApp && selectedAppRef.current) {
            setTimeout(() => {
                selectedAppRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }, 100)
        }
    }, [data.selectedApp?.id])


    const handleSelectApp = async (app) => {
        setData(prev => ({ ...prev, selectedApp: app, notes: app.notes || '' }))
        // Persist selected app ID to localStorage for restoration on refresh
        localStorage.setItem(`applicant-review-selected-${jobId}`, app.id.toString())

        // Update URL to include applicantId
        navigate(`/applications/job/${jobId}/${app.id}`, { replace: true })

        setActiveTab('profile') // Reset to profile view
        // Fetch messages for the selected applicant
        await fetchMessages(app.id)

        // Mark messages as read
        try {
            const token = localStorage.getItem('job-platform-token')
            await fetch(`http://localhost:4000/messages/${app.id}/mark-read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            })
            // Update unread count
            setUnreadByApp(prev => ({ ...prev, [app.id]: 0 }))
        } catch (err) {
            console.error('Failed to mark messages as read', err)
        }
    }

    const fetchMessages = async (appId) => {
        try {
            const token = localStorage.getItem('job-platform-token')
            const response = await fetch(`http://localhost:4000/messages/${appId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.ok) {
                const msgs = await response.json()
                setData(prev => ({ ...prev, messages: msgs }))
            }
        } catch (err) {
            console.error('Failed to fetch messages', err)
        }
    }

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !data.selectedApp) return
        setSendingMessage(true)
        try {
            const token = localStorage.getItem('job-platform-token')

            // Find the first message in this conversation to use as parent
            const parentMessage = data.messages.find(m => !m.parent_message_id) || data.messages[0]

            const response = await fetch(`http://localhost:4000/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    applicationId: data.selectedApp.id,
                    content: messageInput,
                    parentMessageId: parentMessage?.id || null // Send as reply if there's an existing conversation
                })
            })

            if (!response.ok) throw new Error('Failed to send message')

            // Instead of just appending, re-fetch all messages for this application
            await fetchMessages(data.selectedApp.id)
            setMessageInput('')
        } catch (err) {
            console.error(err)
            alert('Failed to send message')
        } finally {
            setSendingMessage(false)
        }
    }

    const handleStatusChange = async (newStatus) => {
        if (!data.selectedApp) return
        try {
            const token = localStorage.getItem('job-platform-token')
            const response = await fetch(`http://localhost:4000/applications/${data.selectedApp.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            })
            if (!response.ok) throw new Error('Failed to update status')

            setData(prev => ({
                ...prev,
                selectedApp: { ...prev.selectedApp, status: newStatus },
                applications: prev.applications.map(app =>
                    app.id === prev.selectedApp.id ? { ...app, status: newStatus } : app
                )
            }))
        } catch (err) {
            console.error(err)
            alert('Failed to update status')
        }
    }

    const handleSaveNotes = async () => {
        if (!data.selectedApp) return
        try {
            const token = localStorage.getItem('job-platform-token')
            const response = await fetch(`http://localhost:4000/applications/${data.selectedApp.id}/notes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ notes: data.notes })
            })
            if (!response.ok) throw new Error('Failed to save notes')

            setData(prev => ({
                ...prev,
                selectedApp: { ...prev.selectedApp, notes: prev.notes },
                applications: prev.applications.map(app =>
                    app.id === prev.selectedApp.id ? { ...app, notes: prev.notes } : app
                )
            }))
            alert('Notes saved successfully')
        } catch (err) {
            console.error(err)
            alert('Failed to save notes')
        }
    }

    const handleAIReview = async () => {
        if (!data.selectedApp) return
        const confirmMsg = 'Run deep AI analysis on this application? This may take a few seconds.'

        if (window.confirm(confirmMsg)) {
            try {
                const token = localStorage.getItem('job-platform-token')
                const response = await fetch(`http://localhost:4000/applications/${data.selectedApp.id}/ai-review`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ type: 'general' })
                })
                if (!response.ok) throw new Error('AI review failed')

                const result = await response.json()
                setData(prev => ({
                    ...prev,
                    selectedApp: {
                        ...prev.selectedApp,
                        ai_match_score: result.matchScore,
                        ai_analysis: result.analysis,
                        ai_reviewed_at: result.reviewedAt
                    },
                    applications: prev.applications.map(app =>
                        app.id === prev.selectedApp.id
                            ? { ...app, ai_match_score: result.matchScore, ai_reviewed_at: result.reviewedAt }
                            : app
                    )
                }))
                alert('AI review completed!')
            } catch (err) {
                console.error(err)
                alert('AI review failed: ' + err.message)
            }
        }
    }

    const handleAIReviewAll = async () => {
        if (!data.applications || data.applications.length === 0) return
        const confirmMsg = 'Run deep AI analysis for all current applicants? This may take a while.'
        if (!window.confirm(confirmMsg)) return

        try {
            setAiBulkRunning(true)
            const token = localStorage.getItem('job-platform-token')

            for (const app of data.applications) {
                const response = await fetch(`http://localhost:4000/applications/${app.id}/ai-review`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ type: 'general' })
                })
                if (!response.ok) throw new Error(`AI review failed for application ${app.id}`)

                const result = await response.json()
                setData(prev => ({
                    ...prev,
                    applications: prev.applications.map(a =>
                        a.id === app.id
                            ? { ...a, ai_match_score: result.matchScore, ai_reviewed_at: result.reviewedAt }
                            : a
                    ),
                    selectedApp: prev.selectedApp && prev.selectedApp.id === app.id
                        ? { ...prev.selectedApp, ai_match_score: result.matchScore, ai_reviewed_at: result.reviewedAt, ai_analysis: result.analysis }
                        : prev.selectedApp
                }))
            }
            alert('AI review completed for all applicants!')
        } catch (err) {
            console.error(err)
            alert('Bulk AI review failed: ' + err.message)
        } finally {
            setAiBulkRunning(false)
        }
    }

    const toggleAppSelection = (appId, e) => {
        e.stopPropagation()
        setSelectedAppIds(prev => {
            const next = new Set(prev)
            if (next.has(appId)) {
                next.delete(appId)
            } else {
                next.add(appId)
            }
            return next
        })
    }

    const handleSelectAll = () => {
        if (selectedAppIds.size === data.applications.length) {
            setSelectedAppIds(new Set())
        } else {
            setSelectedAppIds(new Set(data.applications.map(app => app.id)))
        }
    }

    const handleSendBulkMessage = async () => {
        if (selectedAppIds.size === 0 || !bulkSubject.trim() || !bulkMessage.trim()) return

        setSendingBulk(true)
        try {
            const token = localStorage.getItem('job-platform-token')
            const response = await fetch(`http://localhost:4000/jobs/${jobId}/bulk-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    applicationIds: Array.from(selectedAppIds),
                    subject: bulkSubject,
                    message: bulkMessage
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to send bulk messages')

            alert(result.message)
            setShowBulkModal(false)
            setBulkSubject('')
            setBulkMessage('')
            setSelectedAppIds(new Set())
        } catch (err) {
            console.error(err)
            alert('Error: ' + err.message)
        } finally {
            setSendingBulk(false)
        }
    }

    const statusColors = {
        'applied': 'bg-blue-50 text-blue-700 border-blue-200',
        'reviewing': 'bg-yellow-50 text-yellow-700 border-yellow-200',
        'accepted': 'bg-green-50 text-green-700 border-green-200',
        'rejected': 'bg-red-50 text-red-700 border-red-200'
    }

    if (data.loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-light">
                <LoadingSpinner message="Loading applications..." />
            </div>
        )
    }

    if (data.error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-light">
                <div className="text-center max-w-md">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <p className="text-red-800 mb-4">Error: {data.error}</p>
                        <button
                            onClick={() => navigate('/applications')}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90"
                        >
                            Back to Jobs
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 shadow-sm z-10">
                <button
                    onClick={() => navigate('/applications')}
                    className="text-sm text-gray-600 hover:text-primary mb-2 flex items-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to all jobs
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{data.job?.title}</h1>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-600">
                        {data.applications.length} {data.applications.length === 1 ? 'applicant' : 'applicants'}
                    </p>
                    {data.applications.length > 0 && (
                        <div className="flex items-center gap-3">
                            {selectedAppIds.size > 0 && (
                                <span className="text-sm font-medium text-primary">
                                    {selectedAppIds.size} selected
                                </span>
                            )}
                            <button
                                onClick={handleAIReviewAll}
                                disabled={aiBulkRunning}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center gap-2 transition-opacity ${aiBulkRunning ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                {aiBulkRunning ? 'AI Running...' : 'AI All Applicants'}
                            </button>
                            <button
                                onClick={() => setShowBulkModal(true)}
                                disabled={selectedAppIds.size === 0}
                                className="px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Bulk Message
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8">
                {/* Left: Applicant List */}
                <div ref={leftPanelRef} className="w-full lg:w-2/5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[600px] lg:h-[calc(100vh-200px)]">
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                        {data.applications.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications yet</h3>
                                <p className="text-sm text-gray-600">Applications will appear here once candidates apply</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedAppIds.size === data.applications.length && data.applications.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                        />
                                        Select All
                                    </label>
                                </div>
                                {data.applications.map(app => (
                                    <div key={app.id} ref={data.selectedApp?.id === app.id ? selectedAppRef : null} className="relative group">
                                        <div className="absolute left-3 top-5 z-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedAppIds.has(app.id)}
                                                onChange={(e) => toggleAppSelection(app.id, e)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleSelectApp(app)}
                                            className={`w-full text-left p-4 pl-10 rounded-lg border-2 transition-all ${data.selectedApp?.id === app.id
                                                ? 'bg-blue-50 border-primary shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900">{app.candidate_name || 'Candidate'}</h3>
                                                    {unreadByApp[app.id] > 0 && (
                                                        <span className="relative flex h-3 w-3">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                        </span>
                                                    )}
                                                </div>
                                                {app.ai_match_score !== null && app.ai_match_score !== undefined && (
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${app.ai_match_score >= 80 ? 'bg-green-50 text-green-700' :
                                                        app.ai_match_score >= 60 ? 'bg-yellow-50 text-yellow-700' :
                                                            'bg-red-50 text-red-700'
                                                        }`}>
                                                        {app.ai_match_score}% match
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold border capitalize ${statusColors[app.status] || statusColors.applied
                                                    }`}>
                                                    {app.status || 'applied'}
                                                </span>
                                                {app.ai_reviewed_at && (
                                                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                                                        AI Reviewed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                Applied {new Date(app.applied_at).toLocaleDateString()}
                                            </p>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Applicant Details */}
                <div className="flex-1 min-w-0 flex flex-col h-[600px] lg:h-[calc(100vh-200px)]">
                    {!data.selectedApp ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
                                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Select an applicant to review</h3>
                            <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">
                                Choose a candidate from the list on the left to view their full profile, messages, and run AI analysis.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                            <div className="p-4 sm:p-6 lg:p-8 pb-12 max-w-5xl mx-auto space-y-6">
                                {/* Profile Header */}
                                <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                                            {data.selectedApp.first_name?.[0]}{data.selectedApp.last_name?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-2xl font-bold text-gray-900">{data.selectedApp.candidate_name}</h2>
                                            {data.selectedApp.candidate_title && (
                                                <p className="text-gray-600 mt-1">{data.selectedApp.candidate_title}</p>
                                            )}
                                            <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
                                                {data.selectedApp.candidate_email && (
                                                    <a href={`mailto:${data.selectedApp.candidate_email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="truncate">{data.selectedApp.candidate_email}</span>
                                                    </a>
                                                )}
                                                {data.selectedApp.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        {data.selectedApp.phone}
                                                    </div>
                                                )}
                                                {data.selectedApp.candidate_location && (
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {data.selectedApp.candidate_location}
                                                    </div>
                                                )}
                                                {data.selectedApp.years_of_experience && (
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        {data.selectedApp.years_of_experience} years exp.
                                                    </div>
                                                )}
                                            </div>
                                            {/* URLs */}
                                            {(data.selectedApp.linkedin_url || data.selectedApp.github_url || data.selectedApp.portfolio_url) && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {data.selectedApp.linkedin_url && (
                                                        <a href={data.selectedApp.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                                            LinkedIn
                                                        </a>
                                                    )}
                                                    {data.selectedApp.github_url && (
                                                        <a href={data.selectedApp.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.430.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                                            GitHub
                                                        </a>
                                                    )}
                                                    {data.selectedApp.portfolio_url && (
                                                        <a href={data.selectedApp.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                            Portfolio
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {data.selectedApp.bio && (
                                        <p className="mt-4 text-sm text-gray-700 border-t border-gray-100 pt-4">{data.selectedApp.bio}</p>
                                    )}

                                    {/* Tabs */}
                                    <div className="flex items-center gap-6 mt-6 border-t border-gray-100 pt-4 -mb-2">
                                        <button
                                            onClick={() => setActiveTab('profile')}
                                            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Profile & Review
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('messages')}
                                            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'messages' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Messages
                                        </button>
                                    </div>
                                </div>

                                {activeTab === 'messages' && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                        <div className="p-4 space-y-4 bg-gray-50">
                                            {data.messages.length === 0 ? (
                                                <div className="text-center py-10 text-gray-500">
                                                    <p>No messages yet.</p>
                                                    <p className="text-sm">Start a conversation with the candidate.</p>
                                                </div>
                                            ) : (
                                                data.messages.map(msg => {
                                                    // better check: compare sender_id with current user id, but we don't have current user id explicitly in state easily without decoding token again.
                                                    // backend returns 'role', and we are 'employer'. So if msg.role === 'employer', it's us.
                                                    const isEmployer = msg.role === 'employer'
                                                    return (
                                                        <div key={msg.id} className={`flex ${isEmployer ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[80%] rounded-lg p-3 ${isEmployer ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                                                {msg.subject && !msg.parent_message_id && (
                                                                    <div className={`mb-2 pb-2 border-b ${isEmployer ? 'border-blue-400' : 'border-gray-300'}`}>
                                                                        <p className={`text-sm font-bold ${isEmployer ? 'text-blue-50' : 'text-gray-700'}`}>
                                                                            {msg.subject}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <p className="whitespace-pre-wrap text-sm">
                                                                  {msg.content && typeof msg.content === 'string'
                                                                    ? msg.content
                                                                        .replace(/{first_name}/g, msg.first_name || '')
                                                                        .replace(/{last_name}/g, msg.last_name || '')
                                                                        .replace(/{full_name}/g, `${msg.first_name || ''} ${msg.last_name || ''}`.trim())
                                                                        .replace(/{job_title}/g, msg.job_title || '')
                                                                        .replace(/{company_name}/g, msg.company_name || '')
                                                                        .replace(/{hiring_contact_name}/g, msg.hiring_contact_name || '')
                                                                        .replace(/{hiring_contact_email}/g, msg.hiring_contact_email || '')
                                                                    : msg.content
                                                                  }
                                                                </p>
                                                                <p className={`text-xs mt-1 ${isEmployer ? 'text-blue-100' : 'text-gray-400'}`}>
                                                                    {new Date(msg.created_at).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                        <div className="p-4 bg-white border-t border-gray-200">
                                            <div className="flex gap-2">
                                                <textarea
                                                    value={messageInput}
                                                    onChange={(e) => setMessageInput(e.target.value)}
                                                    placeholder="Type your message..."
                                                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    rows="2"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault()
                                                            handleSendMessage()
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={handleSendMessage}
                                                    disabled={sendingMessage || !messageInput.trim()}
                                                    className="px-4 bg-primary text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                                                >
                                                    {sendingMessage ? '...' : 'Send'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'profile' && (
                                    <>

                                        {/* AI Analysis */}
                                        {data.selectedApp.ai_analysis && (
                                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                    </svg>
                                                    <h3 className="font-semibold text-purple-900">AI Analysis</h3>
                                                    <span className="ml-auto px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-bold shadow-sm">
                                                        {data.selectedApp.ai_match_score}% Match
                                                    </span>
                                                </div>
                                                <p className="text-sm text-purple-900 whitespace-pre-wrap leading-relaxed">{data.selectedApp.ai_analysis}</p>
                                            </div>
                                        )}

                                        {/* Job Requirements vs Candidate */}
                                        {data.job && (data.job.required_skills?.length > 0 || data.job.preferred_skills?.length > 0) && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Requirements Match
                                                </h3>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {data.job.required_skills?.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Required Skills</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {data.job.required_skills.map((skill, idx) => {
                                                                    const hasSkill = data.selectedApp.skills?.some(s => s.skill_name.toLowerCase() === skill.toLowerCase())
                                                                    return (
                                                                        <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${hasSkill ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                                            }`}>
                                                                            {skill} {hasSkill && '✓'}
                                                                        </span>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {data.job.preferred_skills?.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Preferred Skills</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {data.job.preferred_skills.map((skill, idx) => {
                                                                    const hasSkill = data.selectedApp.skills?.some(s => s.skill_name.toLowerCase() === skill.toLowerCase())
                                                                    return (
                                                                        <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${hasSkill ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                                            }`}>
                                                                            {skill} {hasSkill && '✓'}
                                                                        </span>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Work Experience */}
                                        {data.selectedApp.work_experiences && data.selectedApp.work_experiences.length > 0 && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    Work Experience
                                                </h3>
                                                <div className="space-y-4">
                                                    {data.selectedApp.work_experiences.map((exp, idx) => (
                                                        <div key={exp.id || idx} className="border-l-2 border-primary pl-4">
                                                            <h4 className="font-semibold text-gray-900">{exp.job_title}</h4>
                                                            <p className="text-sm text-gray-600">{exp.company_name} • {exp.employment_type}</p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
                                                            </p>
                                                            {exp.description && <p className="text-sm text-gray-700 mt-2">{exp.description}</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Education */}
                                        {data.selectedApp.educations && data.selectedApp.educations.length > 0 && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                                                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                                                    </svg>
                                                    Education
                                                </h3>
                                                <div className="space-y-3">
                                                    {data.selectedApp.educations.map((edu, idx) => (
                                                        <div key={edu.id || idx} className="border-l-2 border-primary pl-4">
                                                            <h4 className="font-semibold text-gray-900">{edu.degree} in {edu.field_of_study}</h4>
                                                            <p className="text-sm text-gray-600">{edu.institution}</p>
                                                            <p className="text-xs text-gray-500">{edu.start_year} - {edu.end_year || 'Present'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Skills */}
                                        {data.selectedApp.skills && data.selectedApp.skills.length > 0 && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    Skills
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {data.selectedApp.skills.map((skill, idx) => (
                                                        <span key={skill.id || idx} className="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium border border-blue-200">
                                                            {skill.skill_name} {skill.proficiency && `• ${skill.proficiency}`}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Languages */}
                                        {data.selectedApp.languages && data.selectedApp.languages.length > 0 && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                    </svg>
                                                    Languages
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {data.selectedApp.languages.map((lang, idx) => (
                                                        <span key={lang.id || idx} className="px-3 py-1 bg-green-50 text-green-800 rounded-lg text-sm font-medium border border-green-200">
                                                            {lang.language} • {lang.proficiency}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Cover Letter */}
                                        {data.selectedApp.cover_letter && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Cover Letter
                                                </h3>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.selectedApp.cover_letter}</p>
                                            </div>
                                        )}

                                        {/* CV Download */}
                                        {data.selectedApp.cv_file_url && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    Resume/CV
                                                </h3>
                                                <a
                                                    href={data.selectedApp.cv_file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Download CV
                                                </a>
                                            </div>
                                        )}

                                        {/* Attachments */}
                                        {data.selectedApp.attachments && data.selectedApp.attachments.length > 0 && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                    Attachments
                                                </h3>
                                                <div className="grid gap-2">
                                                    {data.selectedApp.attachments.map((att) => (
                                                        <div key={att.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:border-gray-300 transition group">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div className="p-2 bg-blue-50 rounded-lg">
                                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-900">{att.type}</p>
                                                                    <a
                                                                        href={getCDNUrl(att.file_url)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-blue-600 hover:underline truncate block"
                                                                    >
                                                                        View File →
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Employer-Required Custom Files */}
                                        {data.selectedApp.custom_files && Array.isArray(data.selectedApp.custom_files) && data.selectedApp.custom_files.length > 0 && (
                                            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                    Additional Required Documents
                                                </h3>
                                                <div className="grid gap-2">
                                                    {data.selectedApp.custom_files.map((file, idx) => (
                                                        <div key={idx} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:border-gray-300 transition group">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div className="p-2 bg-purple-50 rounded-lg">
                                                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-900">{file.requirementName || 'Document'}</p>
                                                                    <p className="text-xs text-gray-500 truncate">{file.fileName || 'file.pdf'}</p>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={file.fileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ml-3 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                View
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                                            <h3 className="font-semibold text-gray-900 mb-4">Review Actions</h3>

                                            {/* Status */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Application Status</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['applied', 'reviewing', 'accepted', 'rejected'].map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => handleStatusChange(status)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors capitalize ${data.selectedApp.status === status
                                                                ? statusColors[status] + ' shadow-sm'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Single AI Review Button */}
                                            <div className="mb-4">
                                                <button
                                                    onClick={handleAIReview}
                                                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                    </svg>
                                                    Run AI Analysis (Deep)
                                                </button>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                                <textarea
                                                    value={data.notes}
                                                    onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
                                                    placeholder="Add your notes about this applicant..."
                                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-500 resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    rows="4"
                                                />
                                                <button
                                                    onClick={handleSaveNotes}
                                                    className="mt-2 w-full px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                                                >
                                                    Save Notes
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>



            {/* Bulk Message Modal */}
            {
                showBulkModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-scale-in">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Send Bulk Message</h3>
                            <p className="text-gray-600 mb-4">
                                Sending to <span className="font-semibold text-primary">{selectedAppIds.size}</span> applicants.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={bulkSubject}
                                        onChange={(e) => setBulkSubject(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="e.g. Update on your application"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <div className="text-xs text-gray-500 mb-2 flex flex-wrap gap-2">
                                        <span className="bg-gray-100 px-2 py-1 rounded">{"{first_name}"}</span>
                                        <span className="bg-gray-100 px-2 py-1 rounded">{"{last_name}"}</span>
                                        <span className="bg-gray-100 px-2 py-1 rounded">{"{full_name}"}</span>
                                        <span className="bg-gray-100 px-2 py-1 rounded">{"{email}"}</span>
                                    </div>
                                    <textarea
                                        value={bulkMessage}
                                        onChange={(e) => setBulkMessage(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        rows="6"
                                        placeholder="Hi {first_name}, ..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setShowBulkModal(false)}
                                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendBulkMessage}
                                        disabled={sendingBulk || !bulkSubject.trim() || !bulkMessage.trim()}
                                        className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {sendingBulk ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Sending...
                                            </>
                                        ) : (
                                            'Send Messages'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}
