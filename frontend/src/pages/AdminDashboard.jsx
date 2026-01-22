import { useEffect, useState } from 'react'
import { api } from '../api/api'

export function AdminDashboard({ tenants = [], onRefresh, onSetStatus, token }) {
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [activeTab, setActiveTab] = useState('tenants')
  const [allUsers, setAllUsers] = useState([])
  const [employers, setEmployers] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Automation settings
  const [automationSettings, setAutomationSettings] = useState({
    enableNotifications: true,
    enableEmailNotifications: true,
    notificationCheckInterval: 120,
    enable2FA: true,
    enableJobRecommendations: true
  })

  useEffect(() => {
    if (onRefresh) onRefresh()
    // Load automation settings
    const stored = localStorage.getItem('adminSettings')
    if (stored) {
      setAutomationSettings(JSON.parse(stored))
    }
  }, [onRefresh])

  const fetchUsers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const users = await api.getAllUsers(token)
      setAllUsers(users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const emps = await api.getAllEmployers(token)
      setEmployers(emps)
    } catch (error) {
      console.error('Error fetching employers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidates = async () => {
    if (!token) return
    setLoading(true)
    try {
      const cands = await api.getAllCandidates(token)
      setCandidates(cands)
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    else if (activeTab === 'employers') fetchEmployers()
    else if (activeTab === 'candidates') fetchCandidates()
  }, [activeTab, token])

  const handleApprove = (tenant) => {
    if (confirm(`Approve ${tenant.company_name}?`)) {
      onSetStatus && onSetStatus(tenant.id, 'approved', null)
    }
  }

  const handleReject = (tenant) => {
    setSelectedTenant(tenant)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const submitRejection = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    onSetStatus && onSetStatus(selectedTenant.id, 'rejected', rejectionReason)
    setShowRejectModal(false)
    setSelectedTenant(null)
    setRejectionReason('')
  }

  return (
    <div className="grid gap-4">
      <div>
        <p className="pill">Admin</p>
        <h2 className="text-xl font-semibold text-slate-900 mt-2">Admin Dashboard</h2>
        <p className="text-slate-600">Manage users, employers, candidates, and tenant approvals.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'tenants'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Tenant Approvals ({tenants.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Users ({allUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('employers')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'employers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Employers ({employers.length})
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'candidates'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Candidates ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('automation')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'automation'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Automation
        </button>
      </div>

      {loading && (
        <div className="grid-card p-6 text-center text-slate-500">Loading...</div>
      )}

      {/* Tenant Approvals Tab */}
      {activeTab === 'tenants' && !loading && (
        <div className="grid gap-4">
        {tenants.length === 0 && (
          <div className="grid-card p-6 text-center text-slate-500">No tenants submitted yet.</div>
        )}
        {tenants.map((t) => (
          <div key={t.id} className="grid-card p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.company_name}</h3>
                <p className="text-sm text-slate-500">{t.industry || '—'} · {t.location || '—'}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2 ${
                  t.status === 'approved'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : t.status === 'rejected'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.status === 'approved' ? '#16a34a' : t.status === 'rejected' ? '#dc2626' : '#d97706' }}
                />
                {t.status || 'pending'}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-slate-500 font-semibold mb-1">Contact Information</p>
                <p className="text-slate-800"><strong>Email:</strong> {t.company_email || '—'}</p>
                <p className="text-slate-800"><strong>Phone:</strong> {t.phone || '—'}</p>
                <p className="text-slate-800"><strong>Website:</strong> {t.website ? <a href={t.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t.website}</a> : '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold mb-1">Business Details</p>
                <p className="text-slate-800"><strong>Org. Number:</strong> {t.org_number || '—'}</p>
                <p className="text-slate-800"><strong>Submitted:</strong> {new Date(t.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {t.description && (
              <div className="mb-4 text-sm">
                <p className="text-slate-500 font-semibold mb-1">Company Description</p>
                <p className="text-slate-700">{t.description}</p>
              </div>
            )}

            {t.status === 'rejected' && t.rejection_reason && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                <p className="text-red-800 font-semibold mb-1">Rejection Reason:</p>
                <p className="text-red-700">{t.rejection_reason}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(t)}
                disabled={t.status === 'approved'}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${t.status === 'approved' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-green-600 text-white hover:opacity-90'}`}
              >
                {t.status === 'approved' ? 'Approved' : 'Approve'}
              </button>
              <button
                onClick={() => handleReject(t)}
                disabled={t.status === 'rejected'}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${t.status === 'rejected' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:opacity-90'}`}
              >
                {t.status === 'rejected' ? 'Rejected' : 'Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* All Users Tab */}
      {activeTab === 'users' && !loading && (
        <div className="grid-card p-0 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-3">Profile</div>
            <div className="col-span-3">Joined</div>
          </div>
          {allUsers.length === 0 && (
            <div className="p-6 text-center text-slate-500">No users found.</div>
          )}
          {allUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-12 px-4 py-3 border-b border-slate-100 text-sm items-center">
              <div className="col-span-4 text-slate-800">{user.email}</div>
              <div className="col-span-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'employer' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="col-span-3 text-slate-700">
                {user.full_name || user.company_name || '—'}
              </div>
              <div className="col-span-3 text-slate-500 text-xs">
                {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employers Tab */}
      {activeTab === 'employers' && !loading && (
        <div className="grid gap-4">
          {employers.length === 0 && (
            <div className="grid-card p-6 text-center text-slate-500">No employers found.</div>
          )}
          {employers.map((emp) => (
            <div key={emp.user_id} className="grid-card p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{emp.company_name}</h3>
                  <p className="text-sm text-slate-500">{emp.email}</p>
                  <p className="text-xs text-slate-400">{emp.industry || '—'} · {emp.location || '—'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  emp.status === 'approved' ? 'bg-green-100 text-green-700' :
                  emp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {emp.status}
                </span>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-semibold">Contact</p>
                  <p className="text-slate-700">{emp.company_email || '—'}</p>
                  <p className="text-slate-700">{emp.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">Jobs</p>
                  <p className="text-slate-700">{emp.active_job_count} active / {emp.job_count} total</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">Org Number</p>
                  <p className="text-slate-700">{emp.org_number || '—'}</p>
                </div>
              </div>
              {emp.website && (
                <p className="text-sm mt-2">
                  <a href={emp.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {emp.website}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && !loading && (
        <div className="grid gap-4">
          {candidates.length === 0 && (
            <div className="grid-card p-6 text-center text-slate-500">No candidates found.</div>
          )}
          {candidates.map((cand) => (
            <div key={cand.user_id} className="grid-card p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{cand.full_name || 'No name'}</h3>
                  <p className="text-sm text-slate-500">{cand.email}</p>
                  <p className="text-xs text-slate-400">{cand.location || '—'}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  candidate
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-semibold">Contact</p>
                  <p className="text-slate-700">{cand.phone || '—'}</p>
                  {cand.website && (
                    <a href={cand.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {cand.website}
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">Applications</p>
                  <p className="text-slate-700">{cand.application_count} submitted</p>
                </div>
              </div>
              {cand.bio && (
                <div className="mt-3 text-sm">
                  <p className="text-slate-500 font-semibold mb-1">Bio</p>
                  <p className="text-slate-700">{cand.bio}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Reject Tenant</h3>
            <p className="text-sm text-slate-600 mb-4">Provide a reason for rejecting <strong>{selectedTenant?.company_name}</strong>. This will be visible to the employer.</p>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
              rows={4}
              placeholder="e.g., Missing required business documentation, Invalid organization number, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={submitRejection}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:opacity-90"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedTenant(null)
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && !loading && (
        <div className="grid gap-4">
          <h3 className="text-lg font-semibold text-slate-900">System Automation Controls</h3>
          
          {/* Notification Automation */}
          <div className="grid-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-900">Deadline Notifications</h4>
                <p className="text-sm text-slate-600">Auto-send notifications when deadlines approach</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={automationSettings.enableNotifications}
                  onChange={(e) => {
                    const updated = { ...automationSettings, enableNotifications: e.target.checked }
                    setAutomationSettings(updated)
                    localStorage.setItem('adminSettings', JSON.stringify(updated))
                  }}
                  className="w-4 h-4 rounded border-slate-300"
                />
              </label>
            </div>
            <div className="text-sm text-slate-600">
              Status: <span className={automationSettings.enableNotifications ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {automationSettings.enableNotifications ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="grid-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-900">Email Notifications</h4>
                <p className="text-sm text-slate-600">Send email alerts for important events</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={automationSettings.enableEmailNotifications}
                  onChange={(e) => {
                    const updated = { ...automationSettings, enableEmailNotifications: e.target.checked }
                    setAutomationSettings(updated)
                    localStorage.setItem('adminSettings', JSON.stringify(updated))
                  }}
                  className="w-4 h-4 rounded border-slate-300"
                />
              </label>
            </div>
            <div className="text-sm text-slate-600">
              Status: <span className={automationSettings.enableEmailNotifications ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {automationSettings.enableEmailNotifications ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>

          {/* Notification Check Interval */}
          <div className="grid-card p-6">
            <div className="mb-4">
              <h4 className="font-semibold text-slate-900 mb-2">Notification Check Interval</h4>
              <p className="text-sm text-slate-600 mb-3">Check for upcoming deadlines every (minutes):</p>
              <input
                type="number"
                min="5"
                max="1440"
                step="5"
                value={automationSettings.notificationCheckInterval}
                onChange={(e) => {
                  const updated = { ...automationSettings, notificationCheckInterval: parseInt(e.target.value) }
                  setAutomationSettings(updated)
                  localStorage.setItem('adminSettings', JSON.stringify(updated))
                }}
                className="border border-slate-300 rounded-lg px-3 py-2 w-24 text-sm font-semibold"
              />
              <p className="text-xs text-slate-500 mt-2">Current: {automationSettings.notificationCheckInterval} minutes</p>
            </div>
          </div>

          {/* 2FA */}
          <div className="grid-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-900">Two-Factor Authentication (2FA)</h4>
                <p className="text-sm text-slate-600">Require 2FA for user accounts</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={automationSettings.enable2FA}
                  onChange={(e) => {
                    const updated = { ...automationSettings, enable2FA: e.target.checked }
                    setAutomationSettings(updated)
                    localStorage.setItem('adminSettings', JSON.stringify(updated))
                  }}
                  className="w-4 h-4 rounded border-slate-300"
                />
              </label>
            </div>
            <div className="text-sm text-slate-600">
              Status: <span className={automationSettings.enable2FA ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {automationSettings.enable2FA ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>

          {/* Job Recommendations */}
          <div className="grid-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-900">Job Recommendations</h4>
                <p className="text-sm text-slate-600">Generate personalized job recommendations</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={automationSettings.enableJobRecommendations}
                  onChange={(e) => {
                    const updated = { ...automationSettings, enableJobRecommendations: e.target.checked }
                    setAutomationSettings(updated)
                    localStorage.setItem('adminSettings', JSON.stringify(updated))
                  }}
                  className="w-4 h-4 rounded border-slate-300"
                />
              </label>
            </div>
            <div className="text-sm text-slate-600">
              Status: <span className={automationSettings.enableJobRecommendations ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {automationSettings.enableJobRecommendations ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
