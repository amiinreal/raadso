import React, { useEffect, useState } from 'react';
import api from '../api/api';

const PERMISSION_KEYS = [
  { key: 'can_edit_company', label: 'Edit Company Info' },
  { key: 'can_review_applications', label: 'Review Applications' },
  { key: 'can_post_job', label: 'Post Job Listings' },
  { key: 'can_update_job', label: 'Update Job Listings' },
  { key: 'can_send_message', label: 'Send Messages' },
];

export default function TenantPermissionsPage({ tenantId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/tenant-members/${tenantId}`)
      .then(res => setMembers(res.data))
      .catch(() => setError('Failed to load members'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handlePermissionChange = (userId, key, value) => {
    setMembers(members => members.map(m =>
      m.user_id === userId ? {
        ...m,
        permissions: { ...m.permissions, [key]: value }
      } : m
    ));
  };

  const savePermissions = (userId, permissions) => {
    api.put(`/tenant-members/${tenantId}/${userId}`, { permissions })
      .then(() => alert('Permissions updated'))
      .catch(() => alert('Failed to update permissions'));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Member Permissions</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Role</th>
            {PERMISSION_KEYS.map(p => (
              <th key={p.key} className="border px-2 py-1">{p.label}</th>
            ))}
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.user_id}>
              <td className="border px-2 py-1">{member.name || member.email}</td>
              <td className="border px-2 py-1">{member.role}</td>
              {PERMISSION_KEYS.map(p => (
                <td key={p.key} className="border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={!!member.permissions?.[p.key]}
                    onChange={e => handlePermissionChange(member.user_id, p.key, e.target.checked)}
                    disabled={member.role === 'owner'}
                  />
                </td>
              ))}
              <td className="border px-2 py-1">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                  onClick={() => savePermissions(member.user_id, member.permissions)}
                  disabled={member.role === 'owner'}
                >Save</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
