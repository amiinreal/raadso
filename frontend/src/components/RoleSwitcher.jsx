import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/api'

// Build a stable key for each role so the <select> value works reliably
const buildRoleKey = (role) => {
  if (!role) return ''
  if (role.type === 'candidate') return 'candidate'
  if (role.type === 'admin') return 'admin'
  if (role.type === 'employer') return `employer:${role.tenantId}:${role.role || 'member'}`
  return String(role.type)
}

export function RoleSwitcher({ token, currentRole, onSwitch }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api.getUserRoles(token)
      .then((data) => {
        const roleOptions = []
        if (data.candidate) {
          roleOptions.push({
            type: 'candidate',
            label: 'Candidate',
            tenantId: null,
            role: 'candidate',
          })
        }
        if (data.employerMemberships && data.employerMemberships.length > 0) {
          data.employerMemberships.forEach((m) => {
            roleOptions.push({
              type: 'employer',
              label: `${m.company_name} (${m.role})`,
              tenantId: m.tenant_id,
              role: m.role,
            })
          })
        }
        if (data.isAdmin) {
          roleOptions.push({
            type: 'admin',
            label: 'Admin',
            tenantId: null,
            role: 'admin',
          })
        }
        // Add stable keys
        const withKeys = roleOptions.map((r) => ({
          ...r,
          key: buildRoleKey(r),
        }))
        setRoles(withKeys)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load roles')
        setLoading(false)
      })
  }, [token])

  const currentKey = useMemo(() => {
    if (!currentRole) return roles[0]?.key || ''
    return buildRoleKey(currentRole)
  }, [currentRole, roles])

  if (loading) return <span className="text-xs text-gray-400">Loading roles...</span>
  if (error) return <span className="text-xs text-red-500">{error}</span>
  if (roles.length < 2) return null

  return (
    <select
      className="ml-2 px-2 py-1 rounded border text-xs bg-white"
      value={currentKey}
      onChange={e => {
        const selected = roles.find(r => r.key === e.target.value)
        if (selected && onSwitch) {
          onSwitch({
            type: selected.type,
            label: selected.label,
            tenantId: selected.tenantId,
            role: selected.role,
          })
        }
      }}
    >
      {roles.map((r) => (
        <option key={r.key} value={r.key}>
          {r.label}
        </option>
      ))}
    </select>
  )
}
