import { useState, useEffect } from 'react'

export function TenantMembers({ tenant, token }) {
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [modal, setModal] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadMembers()
  }, [tenant?.id, token])

  const loadMembers = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:4000/tenant-members/${tenant.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to load members')
      const data = await response.json()
      setMembers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async (e) => {
    e.preventDefault()
    setInviting(true)
    setError('')

    try {
      const response = await fetch('http://localhost:4000/tenant-members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId: tenant.id,
          email: newMemberEmail,
          role: newMemberRole,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send invitation')
      }

      setSuccess('Invitation sent successfully!')
      setNewMemberEmail('')
      setNewMemberRole('member')
      setTimeout(() => {
        setSuccess('')
        loadMembers()
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await fetch(`http://localhost:4000/tenant-members/${tenant.id}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) throw new Error('Failed to update role')
      setSuccess('Role updated successfully')
      loadMembers()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(`http://localhost:4000/tenant-members/${tenant.id}/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to remove member')
      setSuccess('Member removed successfully')
      loadMembers()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  const activeMembers = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'invited')

  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="w-full max-w-4xl h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-600 mt-2">{tenant?.company_name || 'Tenant'}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Invite New Member Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="colleague@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={inviting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {inviting ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
            </form>
          </div>

          {/* Active Members */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Active Members ({activeMembers.length})</h2>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="h-8 w-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading members...</p>
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No active members yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {activeMembers.map(member => (
                  <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {member.first_name} {member.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        {member.accepted_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Joined {new Date(member.accepted_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded font-medium text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                          <option value="owner">Owner</option>
                        </select>

                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded font-medium text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {pendingMembers.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Pending Invitations ({pendingMembers.length})</h2>
              </div>

              <div className="divide-y">
                {pendingMembers.map(member => (
                  <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{member.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Invited {new Date(member.invited_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded font-medium text-sm border border-yellow-200">
                          {member.role}
                        </span>

                        <button
                          onClick={() => handleRemoveMember(member.user_id || member.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded font-medium text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Information */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">Role Permissions</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><strong>Owner:</strong> Full control over team, members, and settings</li>
              <li><strong>Manager:</strong> Can manage job postings, applications, and invite members</li>
              <li><strong>Member:</strong> Can view and manage their own job postings and applications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
