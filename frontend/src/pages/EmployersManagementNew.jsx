import { AdminLayout } from '../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { api } from '../api/api'

export function EmployersManagementNew({ token }) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [employers, setEmployers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEmployers()
  }, [token])

  const loadEmployers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getAllEmployers(token)
      setEmployers(data)
    } catch (error) {
      console.error('Error loading employers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployers = employers.filter((employer) => {
    const name = employer.company_name || employer.name || `${employer.firstName || ''} ${employer.lastName || ''}`.trim() || ''
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employer.email && employer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === 'all' || employer.status === filterStatus
    return matchesSearch && matchesStatus
  })
  return (
    <AdminLayout currentPage="employers">
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#111218] tracking-tight">{t('admin.employers.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t('admin.employers.subtitle')}</p>
          </div>
          <button className="bg-[#1337ec] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t('admin.employers.add')}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder={t('admin.employers.search')}
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
              <option value="all">{t('admin.employers.allStatus')}</option>
              <option value="verified">{t('admin.employers.verified')}</option>
              <option value="pending">{t('admin.employers.pendingReview')}</option>
            </select>
            <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600">
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
          </div>
        </div>

        {/* Employers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployers.map((employer, idx) => (
            <div key={employer.user_id || employer.id || idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl overflow-hidden border border-slate-100 shrink-0">
                    <img src={employer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(employer.company_name || employer.name || 'E')}&background=random`} alt={employer.company_name || employer.name} className="size-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#111218] leading-tight group-hover:text-[#1337ec] transition-colors">{employer.company_name || employer.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span className="text-xs font-bold uppercase tracking-wider">{employer.location || 'Remote'}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${employer.status === 'verified' || employer.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                  {employer.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Jobs</p>
                  <p className="text-lg font-black text-[#111218]">{employer.active_job_count || employer.job_count || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Apps</p>
                  <p className="text-lg font-black text-[#111218]">{Math.floor((employer.job_count || 1) * 12.5)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">star</span>
                  <span className="text-sm font-black text-[#111218]">{employer.rating}</span>
                  <span className="text-xs text-slate-400 font-medium">(24 Reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="size-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] hover:border-[#1337ec] transition-all">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button className="size-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 transition-all">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                  <button className="px-4 py-2 bg-slate-100 text-[#111218] rounded-lg text-xs font-black hover:bg-slate-200 transition-colors">Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredEmployers.length === 0 && (
          <div className="py-20 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">business_off</span>
            <h3 className="text-xl font-bold text-slate-900">No employers found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}

        {/* Pagination Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-sm font-bold text-slate-500">
            Showing <span className="text-[#111218]">1 - {filteredEmployers.length}</span> of <span className="text-[#111218]">24</span> employers
          </p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-all" disabled>
              Previous
            </button>
            <div className="flex items-center gap-1">
              <button className="size-9 rounded-lg bg-[#1337ec] text-white text-sm font-black shadow-lg shadow-blue-100">1</button>
              <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-500 text-sm font-black hover:bg-slate-50">2</button>
              <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-500 text-sm font-black hover:bg-slate-50">3</button>
            </div>
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
