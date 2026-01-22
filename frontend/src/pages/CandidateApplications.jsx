import { useState, useEffect, useRef } from 'react'

export function CandidateApplications({ applications = [], candidateId, token }) {
    const [selectedApplication, setSelectedApplication] = useState(null)

    // Messaging State
    const [activeAppId, setActiveAppId] = useState(null)
    const [messages, setMessages] = useState([])
    const [messageInput, setMessageInput] = useState('')
    const [loadingMessages, setLoadingMessages] = useState(false)
    const messagesEndRef = useRef(null)

    const statusColors = {
        'applied': 'bg-blue-50 text-blue-700 border-blue-200',
        'reviewing': 'bg-yellow-50 text-yellow-700 border-yellow-200',
        'accepted': 'bg-green-50 text-green-700 border-green-200',
        'rejected': 'bg-red-50 text-red-700 border-red-200'
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleOpenMessages = async (appId) => {
        setActiveAppId(appId)
        setLoadingMessages(true)
        setMessageInput('')
        try {
            const response = await fetch(`http://localhost:4000/messages/${appId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setMessages(data)
            }
        } catch (err) {
            console.error('Failed to fetch messages', err)
        } finally {
            setLoadingMessages(false)
        }
    }

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !activeAppId) return

        try {
            const response = await fetch(`http://localhost:4000/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ applicationId: activeAppId, content: messageInput })
            })

            if (response.ok) {
                const newMessage = await response.json()
                setMessages(prev => [...prev, newMessage])
                setMessageInput('')
            }
        } catch (err) {
            console.error('Failed to send message', err)
            alert('Failed to send message')
        }
    }

    const activeApp = applications.find(a => a.id === activeAppId)

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light relative">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        My Applications
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Job Applications</h2>
                    <p className="text-gray-600 text-sm">Track and manage all applications you've submitted</p>
                </div>

                {/* Stats Overview */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs text-gray-500 font-semibold mb-1">TOTAL</p>
                        <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <p className="text-xs text-blue-600 font-semibold mb-1">APPLIED</p>
                        <p className="text-2xl font-bold text-blue-700">{applications.filter(a => a.status === 'applied').length}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                        <p className="text-xs text-yellow-600 font-semibold mb-1">REVIEWING</p>
                        <p className="text-2xl font-bold text-yellow-700">{applications.filter(a => a.status === 'reviewing').length}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                        <p className="text-xs text-green-600 font-semibold mb-1">ACCEPTED</p>
                        <p className="text-2xl font-bold text-green-700">{applications.filter(a => a.status === 'accepted').length}</p>
                    </div>
                </div>

                {/* Applications List */}
                {applications.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications yet</h3>
                        <p className="text-gray-600">Start applying to jobs to see them here</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {applications.map(app => (
                            <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900">{app.job_title || 'Job Title'}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{app.company_name || 'Company'}</p>
                                        {app.location && <p className="text-sm text-gray-600">{app.location}</p>}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold border capitalize ${statusColors[app.status] || statusColors.applied}`}>
                                            {app.status || 'applied'}
                                        </span>
                                        <button
                                            onClick={() => handleOpenMessages(app.id)}
                                            className="text-sm text-primary hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            Messages
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    {app.applied_at && (
                                        <p>Applied {new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Messages Drawer */}
            {activeAppId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                    <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="font-semibold text-gray-900">{activeApp?.company_name || 'Employer'}</h3>
                                <p className="text-xs text-gray-500">{activeApp?.job_title}</p>
                            </div>
                            <button onClick={() => setActiveAppId(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {loadingMessages ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <p>No messages yet.</p>
                                    <p className="text-sm">Start a conversation with {activeApp?.company_name || 'the employer'}.</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.role === 'candidate' || msg.first_name === 'You'
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-lg p-3 ${isMe ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                                                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                                <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="flex gap-2">
                                <textarea
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Type a message..."
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
                                    disabled={!messageInput.trim()}
                                    className="px-4 bg-primary text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
