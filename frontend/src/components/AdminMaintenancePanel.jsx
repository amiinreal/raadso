import { useState } from 'react'

export function AdminMaintenancePanel() {
  const [adminPassword, setAdminPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [estimatedDowntime, setEstimatedDowntime] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  const authenticate = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:4000/api/server/admin/maintenance/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword })
      })

      if (!response.ok) {
        setFeedback('Invalid admin password')
        return
      }

      const data = await response.json()
      setStatus(data)
      setMessage(data.adminMessage || '')
      setEstimatedDowntime(data.estimatedDowntime || '')
      setAuthenticated(true)
      setFeedback('Authenticated successfully')
    } catch (err) {
      setFeedback('Failed to authenticate: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMaintenance = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:4000/api/server/admin/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword })
      })

      if (!response.ok) throw new Error('Failed to toggle maintenance')
      const data = await response.json()
      setStatus(data.status)
      setFeedback(`Maintenance mode ${data.status.maintenanceMode ? 'enabled' : 'disabled'}`)
    } catch (err) {
      setFeedback('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateMessage = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:4000/api/server/admin/maintenance/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, message, estimatedDowntime })
      })

      if (!response.ok) throw new Error('Failed to update message')
      const data = await response.json()
      setStatus(data.status)
      setFeedback('Maintenance message updated')
    } catch (err) {
      setFeedback('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Maintenance Panel</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              />
            </div>

            {feedback && (
              <div className={`p-3 rounded-lg text-sm ${feedback.includes('Invalid') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {feedback}
              </div>
            )}

            <button
              onClick={authenticate}
              disabled={loading || !adminPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 my-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Maintenance Panel</h2>

        {/* Current Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm">
            <span className="font-semibold">Status:</span> {status?.status}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Maintenance:</span> {status?.maintenanceMode ? '🔴 ON' : '🟢 OFF'}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Last updated: {new Date(status?.lastUpdated).toLocaleString()}
          </p>
        </div>

        {/* Toggle Maintenance */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Maintenance Mode</h3>
          <button
            onClick={toggleMaintenance}
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition-all ${
              status?.maintenanceMode
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50`}
          >
            {loading ? 'Updating...' : status?.maintenanceMode ? 'Go Online' : 'Go Offline'}
          </button>
        </div>

        {/* Maintenance Message */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Maintenance Message</h3>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter maintenance message for users..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          
          <input
            type="text"
            value={estimatedDowntime}
            onChange={(e) => setEstimatedDowntime(e.target.value)}
            placeholder="Estimated downtime (e.g., 1-2 hours)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />

          <button
            onClick={updateMessage}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Message'}
          </button>
        </div>

        {feedback && (
          <div className={`p-3 rounded-lg text-sm ${
            feedback.includes('Error') || feedback.includes('Invalid')
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {feedback}
          </div>
        )}

        <button
          onClick={() => setAuthenticated(false)}
          className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
