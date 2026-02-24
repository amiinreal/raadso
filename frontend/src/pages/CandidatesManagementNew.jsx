import { AdminLayout } from '../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { api } from '../api/api'

export function CandidatesManagementNew({ token }) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCandidates()
  }, [token])

  const loadCandidates = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getAllCandidates(token)
      setCandidates(data)
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCandidates = candidates.filter((candidate) => {
    const fullName = candidate.full_name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.name || ''
    const matchesSearch =
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.email && candidate.email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === 'all' || candidate.status === filterStatus
    return matchesSearch && matchesStatus
  })
  return (
    <AdminLayout currentPage="candidates">
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#111218] tracking-tight">{t('admin.candidates.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t('admin.candidates.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white text-[#111218] border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              {t('admin.candidates.export')}
            </button>
            <button className="bg-[#1337ec] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Add Candidate
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder={t('admin.candidates.search')}
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
              <option value="all">{t('admin.candidates.allStatus')}</option>
              <option value="active">{t('admin.candidates.active')}</option>
              <option value="inactive">{t('admin.candidates.inactive')}</option>
            </select>
            <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>
        </div>

        {/* Candidates Table Component */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Candidate Information</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Title & Experience</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Profile Completion</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Recent Activity</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((candidate, idx) => (
                  <tr key={candidate.candidate_id || candidate.user_id || candidate.id || idx} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full overflow-hidden border-2 border-slate-100 shrink-0">
                          <img src={candidate.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.full_name || candidate.name || 'C')}&background=random`} alt={candidate.full_name || candidate.name} className="size-full object-cover" />
                        </div>
                        <div>
                          <p className="font-black text-[#111218] group-hover:text-[#1337ec] transition-colors">{candidate.full_name || candidate.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{candidate.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#111218]">{candidate.title}</span>
                        <span className="text-xs text-slate-400 font-medium mt-0.5">{candidate.experience} exp.</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-slate-400">Progress</span>
                          <span className="text-emerald-600">{candidate.score}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${candidate.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${candidate.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        <span className="text-sm font-bold text-[#111218]">{candidate.lastActivity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all">
                          <span className="material-symbols-outlined text-[20px]">mail</span>
                        </button>
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
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
        {filteredCandidates.length === 0 && (
          <div className="py-24 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
            <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <span className="material-symbols-outlined text-4xl">person_search</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">No candidates found</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">Try refining your search terms or adjusting the status filters.</p>
          </div>
        )}

        {/* Pagination Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-bold text-slate-400">
            Showing <span className="text-[#111218]">1 - {filteredCandidates.length}</span> of <span className="text-[#111218]">842</span> candidates
          </p>
          <div className="flex items-center gap-1.5">
            <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="size-9 rounded-lg bg-[#1337ec] text-white text-sm font-black shadow-lg shadow-blue-100">1</button>
            <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">2</button>
            <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">3</button>
            <span className="px-1 text-slate-300">...</span>
            <button className="size-9 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">42</button>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
