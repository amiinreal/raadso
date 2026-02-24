import { AdminLayout } from '../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { api } from '../api/api'

export function UsersDirectoryNew({ token }) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [token])

  const loadUsers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getAllUsers(token)
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const displayName = user.full_name || user.company_name || user.firstName || user.name || ''
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <AdminLayout currentPage="users">
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#111218] tracking-tight">{t('admin.users.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t('admin.users.subtitle')}</p>
          </div>
          <button className="bg-[#1337ec] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            {t('admin.users.add')}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder={t('admin.users.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1337ec]/10 focus:border-[#1337ec] transition-all font-medium"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="flex-1 md:flex-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1337ec]/10 focus:border-[#1337ec] transition-all font-bold text-slate-700 appearance-none cursor-pointer"
            >
              <option value="all">{t('admin.users.allRoles')}</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Moderator">Moderator</option>
            </select>
            <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600">
              <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">User Profile</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">System Role</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Join Date</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Activity Status</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-11 rounded-full overflow-hidden border-2 border-slate-100 shrink-0">
                          <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.company_name || user.name || 'U')}&background=random`} alt={user.full_name || user.company_name || user.name} className="size-full object-cover" />
                        </div>
                        <div>
                          <p className="font-black text-[#111218] group-hover:text-[#1337ec] transition-colors">{user.full_name || user.company_name || user.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.role === 'Super Admin' ? 'bg-red-50 text-red-600' :
                        user.role === 'Admin' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-[#111218]">{user.created_at ? new Date(user.created_at).toLocaleDateString() : (user.joinDate || 'N/A')}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500"></span>
                        <span className="text-sm font-bold text-[#111218]">{user.lastActive}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all" title="Edit User">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all" title="Deactivate User">
                          <span className="material-symbols-outlined text-[18px]">no_accounts</span>
                        </button>
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all" title="More Options">
                          <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="py-24 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">person_off</span>
            <h3 className="text-xl font-bold text-slate-900">No users found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search or role filters.</p>
          </div>
        )}

        {/* Pagination Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-bold text-slate-400">
            Showing <span className="text-[#111218]">1 - {filteredUsers.length}</span> of <span className="text-[#111218]">42</span> staff members
          </p>
          <div className="flex items-center gap-1.5">
            <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="size-9 rounded-lg bg-[#1337ec] text-white text-sm font-black shadow-lg shadow-blue-100">1</button>
            <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">2</button>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
