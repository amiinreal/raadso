import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import { api } from '../api/api'

const MANAGER_AUTO_PERMISSIONS = new Set(['can_post_job', 'can_assign_application'])

export default function TenantPermissions() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [hasAccess, setHasAccess] = useState(null)
    const [myUserId, setMyUserId] = useState(null)
    const [userIdReady, setUserIdReady] = useState(false)

    const token = localStorage.getItem('job-platform-token')

    const permissionTypes = [
        { key: 'can_post_job', label: 'Post Jobs' },
        { key: 'can_manage_team', label: 'Manage Team (Add/Remove/Roles)' },
        { key: 'can_invite_members', label: 'Invite Team Members' },
        { key: 'can_edit_tenant', label: 'Edit Company Info' },
        { key: 'can_assign_application', label: 'Assign Applications' },
        { key: 'can_manage_permissions', label: 'Manage Permissions' },
        { key: 'can_update_company_profile', label: 'Update Company Profile' },
        { key: 'can_view_audit_logs', label: 'View Audit Logs' }
    ]

    const normalizePermissions = (raw) => {
        if (!raw) return {}
        if (typeof raw === 'object') return raw
        try {
            return JSON.parse(raw) || {}
        } catch {
            return {}
        }
    }

    const fetchMembers = async () => {
        const data = await api.getTenantMembers(id, token)
        const normalized = (data || [])
            .filter(m => m.status === 'active')
            .map(member => ({
                ...member,
                permissions: normalizePermissions(member.permissions)
            }))
        setMembers(normalized)
        return normalized
    }

    useEffect(() => {
        setUserIdReady(false)
        if (!token) {
            setMyUserId(null)
            setUserIdReady(true)
            return
        }
        try {
            const decoded = jwtDecode(token)
            const decodedId = decoded?.userId
            setMyUserId(decodedId != null ? String(decodedId) : null)
        } catch (err) {
            console.error('Failed to decode auth token for permissions page', err)
            setMyUserId(null)
        } finally {
            setUserIdReady(true)
        }
    }, [token])

    useEffect(() => {
        const verifyAccess = async () => {
            if (!id || !token) {
                setError('Missing tenant or authentication information')
                setHasAccess(false)
                setLoading(false)
                return
            }

            if (!userIdReady) {
                return
            }

            if (!myUserId) {
                setError('Unable to determine your account access. Please login again.')
                setHasAccess(false)
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                const memberList = await fetchMembers()
                let me = memberList.find(m => String(m.user_id) === String(myUserId))
                let isOwner = me?.role === 'owner'

                if (!me) {
                    const tenantResponse = await fetch(`${api.baseURL}/tenants/${id}`, {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
                    })
                    if (!tenantResponse.ok) {
                        throw new Error('Failed to load tenant')
                    }
                    const tenantData = await tenantResponse.json()
                    isOwner = String(tenantData.user_id) === String(myUserId)
                    if (isOwner) {
                        me = { role: 'owner', permissions: {} }
                    }
                }

                const hasManagePermissions = isOwner || !!me?.permissions?.can_manage_permissions
                setHasAccess(hasManagePermissions)

                if (!hasManagePermissions) {
                    setError('You do not have permission to manage team permissions.')
                    return
                }

                setError(null)
            } catch (err) {
                console.error('Failed to load members', err)
                setError('Failed to load members')
            } finally {
                setLoading(false)
            }
        }

        verifyAccess()
    }, [id, token, myUserId, userIdReady])

    const handleTogglePermission = async (memberId, permissionKey, currentValue) => {
        const member = members.find(m => m.user_id === memberId)
        if (!member) return

        const memberIsOwner = member.role === 'owner'
        const managerHasAutoPermission = member.role === 'manager' && MANAGER_AUTO_PERMISSIONS.has(permissionKey)
        if (memberIsOwner || managerHasAutoPermission) {
            return
        }

        const newPermissions = { ...(member.permissions || {}), [permissionKey]: !currentValue }

        // Optimistic update
        setMembers(prev => prev.map(m =>
            m.user_id === memberId ? { ...m, permissions: newPermissions } : m
        ))

        try {
            // Use API to update. Assuming updateMember supports permissions object
            // We might need to send role as well if the endpoint expects it
            await fetch(`${api.baseURL}/tenant-members/${id}/${memberId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    role: member.role, // Keep role same
                    permissions: newPermissions
                })
            })
        } catch (err) {
            console.error('Failed to update permission', err)
            // Revert on failure
            fetchMembers()
            alert('Failed to update permission')
        }
    }

    if (loading) return <div className="p-8 text-center">Loading permissions...</div>

    if (!loading && hasAccess === false) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-3">Access Restricted</h2>
                    <p className="text-sm text-gray-600 mb-6">You need the Manage Permissions grant to update team access.</p>
                    <button
                        onClick={() => navigate('/tenant-members')}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        Go to Team Members
                    </button>
                </div>
            </div>
        )
    }

    if (error) return <div className="p-8 text-center text-red-600">{error}</div>

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Member Permissions</h1>
                <button
                    onClick={() => navigate('/tenant-members')}
                    className="text-blue-600 hover:text-blue-800"
                >
                    Back to Team Members
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            {permissionTypes.map(p => (
                                <th key={p.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {p.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {members.map(member => (
                            <tr key={member.user_id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</div>
                                            <div className="text-sm text-gray-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                            member.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {member.role}
                                    </span>
                                </td>
                                {permissionTypes.map(p => {
                                    const isOwner = member.role === 'owner'
                                    const isMe = String(member.user_id) === String(myUserId)
                                    const isManager = member.role === 'manager'
                                    const managerAutoEnabled = MANAGER_AUTO_PERMISSIONS.has(p.key) && isManager
                                    // Owner has everything implicity, usually permissions obj only matters for managers/members
                                    // But our logic checks permissions explicitly for some things. 
                                    // Ideally Owner returns true for all checks in code, or we force checkboxes checked and disabled.
                                    // Current backend logic: `if (requester.role !== 'owner') ... check permissions`
                                    // So Owners don't need permissions set.
                                    // Managers DO need them.
                                    // So disable for Owner (always active effectively).

                                    return (
                                        <td key={p.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                type="checkbox"
                                                checked={isOwner || managerAutoEnabled || !!member.permissions?.[p.key]}
                                                disabled={isOwner || isMe || managerAutoEnabled} // Can't edit owner/self/auto perms
                                                onChange={(e) => handleTogglePermission(member.user_id, p.key, !!member.permissions?.[p.key])}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                            />
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
