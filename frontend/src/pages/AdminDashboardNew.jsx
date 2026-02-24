import { AdminLayout } from '../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { api } from '../api/api'

export function AdminDashboardNew({ token }) {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState('month')
  const [loading, setLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState([
    { title: t('admin.dashboard.totalCandidates'), value: '0', change: '+0%', icon: 'person_search', color: 'blue', trend: 'up' },
    { title: t('admin.dashboard.activeJobs'), value: '0', change: '+0%', icon: 'work', color: 'purple', trend: 'up' },
    { title: t('admin.dashboard.verifiedEmployers'), value: '0', change: '+0%', icon: 'verified', color: 'amber', trend: 'up' },
    { title: t('admin.dashboard.totalApplications'), value: '0', change: '+0%', icon: 'mail_outline', color: 'emerald', trend: 'up' },
  ])
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [timeRange, token])

  const loadDashboardData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [metrics, activity] = await Promise.all([
        api.getAdminMetrics({ range: timeRange }, token),
        api.getAdminActivity(token)
      ])

      setDashboardStats([
        { title: t('admin.dashboard.totalCandidates'), value: (metrics.total_candidates || 0).toLocaleString(), change: metrics.candidate_change || '+0%', icon: 'person_search', color: 'blue', trend: 'up' },
        { title: t('admin.dashboard.activeJobs'), value: (metrics.total_jobs || 0).toLocaleString(), change: metrics.job_change || '+0%', icon: 'work', color: 'purple', trend: 'up' },
        { title: t('admin.dashboard.verifiedEmployers'), value: (metrics.total_employers || 0).toLocaleString(), change: metrics.employer_change || '+0%', icon: 'verified', color: 'amber', trend: 'up' },
        { title: t('admin.dashboard.totalApplications'), value: (metrics.total_applications || 0).toLocaleString(), change: metrics.app_change || '+0%', icon: 'mail_outline', color: 'emerald', trend: 'up' },
      ])

      setRecentActivity(activity.map(a => ({
        id: a.id || Math.random(),
        action: a.action,
        type: a.type,
        time: new Date(a.created_at).toLocaleDateString(),
        icon: a.icon || 'star'
      })))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statColors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  }

  return (
    <AdminLayout currentPage="dashboard">
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#111218] tracking-tight">{t('admin.dashboard.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t('admin.dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {['day', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all capitalize ${timeRange === range
                  ? 'text-white bg-[#1337ec] shadow-lg shadow-blue-200'
                  : 'text-slate-500 hover:text-[#111218] hover:bg-slate-50'
                  }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat) => (
            <div key={stat.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`size-12 rounded-xl flex items-center justify-center ${statColors[stat.color] || 'bg-slate-50 text-slate-600'}`}>
                  <span className="material-symbols-outlined text-[28px]">{stat.icon}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[13px] font-black">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  {stat.change}
                </div>
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{stat.title}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-[#111218]">{loading ? '...' : stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Card */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-[#111218]">{t('admin.dashboard.platformGrowth')}</h3>
                <p className="text-sm text-slate-500 font-medium">Monthly candidate and application metrics</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#1337ec]"></span>
                    <span>Candidates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-slate-200"></span>
                    <span>Applications</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="aspect-[21/9] w-full bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#1337ec 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              <div className="text-center z-10">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">insights</span>
                <p className="text-slate-400 font-bold">Interactive Visualization Coming Soon</p>
              </div>
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-[#111218]">{t('admin.dashboard.recentActivity')}</h3>
              <button className="text-[#1337ec] text-sm font-bold hover:underline">View All</button>
            </div>
            <div className="space-y-6 flex-1">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="size-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-600 text-[20px]">{activity.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#111218] leading-tight">{activity.action}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </div>
                  <p className="text-sm font-black text-[#111218]">System Status</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">All core systems are operational and performing optimally.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#1337ec] to-[#0a24a6] rounded-2xl p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 size-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white/80 uppercase tracking-widest">{t('admin.dashboard.applicationRate')}</p>
              <span className="material-symbols-outlined text-white/60">trending_up</span>
            </div>
            <div className="relative z-10 flex items-baseline gap-2">
              <h4 className="text-4xl font-black">23.4%</h4>
              <p className="text-xs font-bold text-emerald-300">+4.2% this week</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('admin.dashboard.avgTimeToHire')}</p>
              <span className="material-symbols-outlined text-slate-300">schedule</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h4 className="text-4xl font-black text-[#111218]">14.5<span className="text-xl text-slate-400 ml-1">days</span></h4>
              <div className="flex -space-x-2 ml-auto">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`size-8 rounded-full border-2 border-white bg-slate-${i + 1}00`}></div>
                ))}
                <div className="size-8 rounded-full border-2 border-white bg-[#1337ec] flex items-center justify-center text-[10px] text-white font-bold">+12</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Users Now</p>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-600">LIVE</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h4 className="text-4xl font-black text-[#111218]">1,402</h4>
              <div className="flex-1 h-2 bg-slate-100 rounded-full ml-4 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-[#1337ec] w-[65%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

