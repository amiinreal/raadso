import { AdminLayout } from '../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { api } from '../api/api'

export function TranslationPortalNew({ token }) {
  const { t } = useTranslation()
  const [selectedPage, setSelectedPage] = useState('landing')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [translations, setTranslations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTranslations()
  }, [token])

  const loadTranslations = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getTranslationsV2(selectedLanguage, token)
      // data is an array from /v2/scan
      const formatted = data.map((row, idx) => ({
        id: idx,
        key: row.key,
        en: row.sourceValue || '',
        so: row.targetValue || '',
        page: row.domain || row.key.split('.')[0] || 'general',
        lastUpdated: 'Recently',
        updatedBy: 'System',
        status: row.status
      }))
      setTranslations(formatted)
    } catch (error) {
      console.error('Error loading translations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTranslations = translations.filter(
    (item) =>
      (selectedPage === 'all' || item.page === selectedPage) &&
      (item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.so.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <AdminLayout currentPage="translations">
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#111218] tracking-tight">{t('admin.translations.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t('admin.translations.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">publish</span>
              Export
            </button>
            <button className="bg-[#1337ec] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">translate</span>
              Add Translation
            </button>
          </div>
        </div>

        {/* Action Bar / Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder={t('admin.translations.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-[#1337ec] transition-all font-medium"
              />
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                className="flex-1 lg:w-48 pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1337ec]/10 focus:border-[#1337ec] transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="landing">{t('admin.translations.landingPage')}</option>
                <option value="dashboard">{t('admin.translations.dashboard')}</option>
                <option value="jobs">{t('admin.translations.jobs')}</option>
              </select>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="flex-1 lg:w-40 pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1337ec]/10 focus:border-[#1337ec] transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="so">Somali</option>
                <option value="ar">Arabic</option>
              </select>
              <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Area */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Key Identifier</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Source Text (EN)</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Target Translation</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Activity</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTranslations.map(trans => (
                  <tr key={trans.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-5">
                      <code className="text-[10px] font-black bg-blue-50 text-[#1337ec] px-2 py-1 rounded-lg uppercase tracking-wider">
                        {trans.key}
                      </code>
                    </td>
                    <td className="px-6 py-5 max-w-[300px]">
                      <p className="text-sm font-bold text-[#111218] line-clamp-2">{trans.en}</p>
                    </td>
                    <td className="px-6 py-5 max-w-[300px]">
                      <div className="relative group/input">
                        <textarea
                          value={trans.so}
                          rows="1"
                          className="w-full p-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-[#1337ec] focus:ring-1 focus:ring-[#1337ec]/10 transition-all font-medium text-sm resize-none"
                        ></textarea>
                        <button className="absolute right-2 top-2 size-7 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-[#1337ec] opacity-0 group-hover/input:opacity-100 transition-opacity hover:bg-[#1337ec] hover:text-white">
                          <span className="material-symbols-outlined text-[16px]">magic_button</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <p className="text-xs font-black text-[#111218]">{trans.updatedBy}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{trans.lastUpdated}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all">
                          <span className="material-symbols-outlined text-[18px]">history</span>
                        </button>
                        <button className="size-9 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1337ec] transition-all">
                          <span className="material-symbols-outlined text-[18px]">done_all</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-bold text-slate-400">
            Showing <span className="text-[#111218]">1 - {filteredTranslations.length}</span> of <span className="text-[#111218]">248</span> keys
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
