import { AdminLayout } from '../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { api } from '../api/api'

export function TenantsManagementNew({ token }) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTenants()
  }, [token])

  const loadTenants = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getTenants({}, token)
      setTenants(data)
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = tenants.filter((tenant) => {
    const tenantName = tenant.company_name || tenant.name || ''
    const matchesSearch =
      tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tenant.company_email && tenant.company_email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <AdminLayout currentPage="tenants">
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#111218] tracking-tight">{t('admin.tenants.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t('admin.tenants.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#1337ec] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">domain_add</span>
            {t('admin.tenants.add')}
          </button>
        </div>

        {/* Stats Summary Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1337ec]">
              <span className="material-symbols-outlined">corporate_fare</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tenants</p>
              <p className="text-2xl font-black text-[#111218]">1,280</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Users</p>
              <p className="text-2xl font-black text-[#111218]">42.5k</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Revenue</p>
              <p className="text-2xl font-black text-[#111218]">$12k</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder={t('admin.tenants.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1337ec]/10 focus:border-[#1337ec] transition-all font-medium"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 md:flex-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1337ec]/10 focus:border-[#1337ec] transition-all font-bold text-slate-700 appearance-none cursor-pointer"
            >
              <option value="all">{t('admin.tenants.allStatus')}</option>
              <option value="active">{t('admin.tenants.active')}</option>
              <option value="suspended">{t('admin.tenants.suspended')}</option>
            </select>
            <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600">
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
          </div>
        </div>

        {/* Tenants Table Grid */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Tenant Details</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Plan & Subscription</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">User Count</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Resource Usage</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#111218] font-black">
                          {(tenant.company_name || tenant.name || 'T').charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-[#111218] group-hover:text-[#1337ec] transition-colors">{tenant.company_name || tenant.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{tenant.company_email || tenant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${tenant.plan === 'Enterprise' ? 'bg-purple-50 text-purple-600' :
                          tenant.plan === 'Pro' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                          }`}>
                          {tenant.plan}
                        </span>
                        <span className="text-xs text-slate-400 font-medium mt-1">Joined {tenant.joinDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-300 text-[18px]">group</span>
                        <span className="text-sm font-black text-[#111218]">{tenant.users}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase">
                          <span className="text-slate-400">Usage</span>
                          <span className={tenant.usage > 90 ? 'text-red-500' : 'text-[#111218]'}>{tenant.usage}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tenant.usage > 90 ? 'bg-red-500' : 'bg-[#1337ec]'}`}
                            style={{ width: `${tenant.usage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${tenant.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all">
                          <span className="material-symbols-outlined text-[18px]">settings</span>
                        </button>
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
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
        {filteredTenants.length === 0 && (
          <div className="py-24 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">domain_disabled</span>
            <h3 className="text-xl font-bold text-slate-900">No tenants found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your filters to find existing tenants.</p>
          </div>
        )}

        {/* Pagination Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-bold text-slate-400">
            Showing <span className="text-[#111218]">1 - {filteredTenants.length}</span> of <span className="text-[#111218]">1,280</span> tenants
          </p>
          <div className="flex items-center gap-1.5">
            <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="size-9 rounded-lg bg-[#1337ec] text-white text-sm font-black shadow-lg shadow-blue-100">1</button>
            <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">2</button>
            <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">3</button>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
