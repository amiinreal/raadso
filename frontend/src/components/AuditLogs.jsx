import { useState, useEffect } from 'react'
import { api } from '../api/api'
import { Download, FileJson } from 'lucide-react'

export function AuditLogs({ token, tenantId, user }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({ offset: 0, limit: 50, total: 0 })

  useEffect(() => {
    if (token && tenantId) {
      fetchAuditLogs()
    }
  }, [token, tenantId, pagination.offset])

  const fetchAuditLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        offset: pagination.offset,
        limit: pagination.limit,
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const response = await fetch(
        `http://localhost:4000/api/tenants/${tenantId}/audit-logs?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (!response.ok) throw new Error('Failed to fetch audit logs')
      const data = await response.json()
      setLogs(data.logs)
      setPagination(prev => ({ ...prev, total: data.total }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, offset: 0 }))
  }

  const downloadAsJson = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadAsExcel = () => {
    // Simple CSV export (Excel compatible)
    let csv = 'Action,Target Type,Date,User,Details\n'
    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleString()
      const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : ''
      csv += `"${log.action}","${log.target_type}","${date}","${log.admin_email}","${details}"\n`
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Audit Logs</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              <option value="job_created">Job Created</option>
              <option value="job_updated">Job Updated</option>
              <option value="job_published">Job Published</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={downloadAsJson}
            disabled={logs.length === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FileJson size={18} />
            Export JSON
          </button>
          <button
            onClick={downloadAsExcel}
            disabled={logs.length === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download size={18} />
            Export Excel
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Logs Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.target_type}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.admin_email || 'System'}</td>
                      <td className="px-4 py-3">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs overflow-auto max-h-32">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
