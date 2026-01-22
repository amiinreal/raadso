import { useEffect, useState } from 'react'

export function CandidateApplicationsPage() {
  const [data, setData] = useState({ applications: [], loading: true, error: null })
  const [selectedApp, setSelectedApp] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [unreadByApp, setUnreadByApp] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('job-platform-token')
        const response = await fetch('http://localhost:4000/applications', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const apps = await response.json()
        setData({ 
          applications: Array.isArray(apps) ? apps : apps?.applications || [],
          loading: false,
          error: null
        })
        
        // Fetch unread counts
        fetchUnreadCounts()
      } catch (err) {
        setData({ applications: [], loading: false, error: err.message })
      }
    }
    fetchData()
  }, [])

  const fetchUnreadCounts = async () => {
    try {
      const token = localStorage.getItem('job-platform-token')
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
  }

  const statusColors = {
    'applied': 'bg-blue-50 text-blue-700 border-blue-200',
    'reviewing': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'accepted': 'bg-green-50 text-green-700 border-green-200',
    'rejected': 'bg-red-50 text-red-700 border-red-200'
  }

  const fetchMessages = async (appId) => {
    setLoadingMessages(true)
    try {
      const token = localStorage.getItem('job-platform-token')
      const response = await fetch(`http://localhost:4000/messages/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const msgs = await response.json()
        setMessages(msgs)
      }
    } catch (err) {
      console.error('Failed to fetch messages', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedApp) return
    setSendingMessage(true)
    try {
      const token = localStorage.getItem('job-platform-token')
      
      // Find the first message in this conversation to use as parent
      const parentMessage = messages.find(m => !m.parent_message_id) || messages[0]
      
      const response = await fetch(`http://localhost:4000/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          applicationId: selectedApp.id, 
          content: messageInput,
          parentMessageId: parentMessage?.id || null // Send as reply if there's an existing conversation
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const newMessage = await response.json()
      setMessages(prev => [...prev, newMessage])
      setMessageInput('')
    } catch (err) {
      console.error(err)
      alert('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleViewMessages = async (app) => {
    setSelectedApp(app)
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

  const handleCloseMessages = () => {
    setSelectedApp(null)
    setMessages([])
    setMessageInput('')
  }

  if (data.loading) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
      <div className="max-w-7xl mx-auto">
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

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold mb-1">TOTAL</p>
            <p className="text-2xl font-bold text-gray-900">{data.applications.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-600 font-semibold mb-1">APPLIED</p>
            <p className="text-2xl font-bold text-blue-700">{data.applications.filter(a => a.status === 'applied').length}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-xs text-yellow-600 font-semibold mb-1">REVIEWING</p>
            <p className="text-2xl font-bold text-yellow-700">{data.applications.filter(a => a.status === 'reviewing').length}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-xs text-green-600 font-semibold mb-1">ACCEPTED</p>
            <p className="text-2xl font-bold text-green-700">{data.applications.filter(a => a.status === 'accepted').length}</p>
          </div>
        </div>

        {data.applications.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications yet</h3>
            <p className="text-gray-600">Start applying to jobs to see them here</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {data.applications.map(app => (
              <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{app.job_title || app.jobTitle || 'Job Title'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{app.company_name || app.companyName || 'Company'}</p>
                    {app.location && <p className="text-sm text-gray-600">{app.location}</p>}
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border capitalize ${statusColors[app.status] || statusColors.applied}`}>
                    {app.status || 'applied'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div>
                    {app.applied_at && (
                      <p>Applied {new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewMessages(app)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    View Messages
                    {unreadByApp[app.id] > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {unreadByApp[app.id]}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedApp.job_title || selectedApp.jobTitle}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedApp.company_name || selectedApp.companyName}</p>
                  </div>
                  <button
                    onClick={handleCloseMessages}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p>No messages yet</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg p-4 ${
                        msg.role === 'candidate' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {msg.subject && !msg.parent_message_id && (
                          <div className={`mb-2 pb-2 border-b ${msg.role === 'candidate' ? 'border-blue-400' : 'border-gray-300'}`}>
                            <p className={`text-sm font-bold ${msg.role === 'candidate' ? 'text-blue-50' : 'text-gray-700'}`}>
                              {msg.subject}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-xs font-semibold ${msg.role === 'candidate' ? 'text-blue-100' : 'text-gray-600'}`}>
                            {msg.role === 'employer' ? msg.company_name : `${msg.first_name} ${msg.last_name}`}
                          </p>
                          <span className={`text-xs ${msg.role === 'candidate' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(msg.created_at).toLocaleString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !messageInput.trim()}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

