import { AdminLayout } from '../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n/TranslationProvider'
import { api } from '../api/api'

export function AutomationSettingsNew({ token }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    enable_ai_recommendations: false,
    enable_2fa: false,
  })
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [autoVerification, setAutoVerification] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [token])

  const loadSettings = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getSystemSettings(token)
      setSettings(data)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key) => {
    const newValue = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newValue }))
    try {
      await api.updateSystemSetting(key, newValue, token)
    } catch (error) {
      console.error('Error updating setting:', error)
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !newValue }))
    }
  }

  return (
    <AdminLayout currentPage="automation">
      <div className="p-8 space-y-8 max-w-[1200px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#111218] tracking-tight">{t('admin.automation.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium">{t('admin.automation.subtitle')}</p>
          </div>
          <button className="bg-[#1337ec] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">save</span>
            {t('admin.automation.save')}
          </button>
        </div>

        {/* Grid of Automation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Notifications */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1337ec]">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#111218]">{t('admin.automation.emailNotifications')}</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${emailNotifications ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {emailNotifications ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 ${emailNotifications ? 'bg-[#1337ec]' : 'bg-slate-200'
                  }`}
              >
                <div className={`size-4 bg-white rounded-full transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0'
                  }`} />
              </button>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
              Manage automated user alerts, daily system reports, and critical administrative updates sent via email.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <button className="text-[#1337ec] text-sm font-bold hover:underline flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Configure Rules
              </button>
              <span className="text-slate-400 text-[11px] font-bold">Last triggered: 2m ago</span>
            </div>
          </div>

          {/* Auto-Verification */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1337ec]">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#111218]">Auto-Verification</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${autoVerification ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {autoVerification ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAutoVerification(!autoVerification)}
                className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 ${autoVerification ? 'bg-[#1337ec]' : 'bg-slate-200'
                  }`}
              >
                <div className={`size-4 bg-white rounded-full transition-transform ${autoVerification ? 'translate-x-6' : 'translate-x-0'
                  }`} />
              </button>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
              Automatically approve new user profiles and submitted documents based on confidence score thresholds.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <button className="text-[#1337ec] text-sm font-bold hover:underline flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">rule</span>
                Set Thresholds
              </button>
              <span className="text-slate-400 text-[11px] font-bold">Setup Required</span>
            </div>
          </div>

          {/* AI Job Matching */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1337ec]">
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#111218]">{t('admin.automation.aiMatching')}</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${settings.enable_ai_recommendations ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {settings.enable_ai_recommendations ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleToggle('enable_ai_recommendations')}
                className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 ${settings.enable_ai_recommendations ? 'bg-[#1337ec]' : 'bg-slate-200'
                  }`}
              >
                <div className={`size-4 bg-white rounded-full transition-transform ${settings.enable_ai_recommendations ? 'translate-x-6' : 'translate-x-0'
                  }`} />
              </button>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
              Controls for the frequency and sensitivity of the matching engine. Pairs talent with roles automatically.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <button className="text-[#1337ec] text-sm font-bold hover:underline flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Sensitivity
              </button>
              <span className="text-slate-400 text-[11px] font-bold">98% Accuracy</span>
            </div>
          </div>

          {/* 2FA Security */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1337ec]">
                  <span className="material-symbols-outlined">security</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#111218]">Two-Factor Auth</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${settings.enable_2fa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {settings.enable_2fa ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleToggle('enable_2fa')}
                className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 ${settings.enable_2fa ? 'bg-[#1337ec]' : 'bg-slate-200'
                  }`}
              >
                <div className={`size-4 bg-white rounded-full transition-transform ${settings.enable_2fa ? 'translate-x-6' : 'translate-x-0'
                  }`} />
              </button>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
              Require all users to verify their identity via email or SMS when logging in from a new device.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <button className="text-[#1337ec] text-sm font-bold hover:underline flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                Security Policy
              </button>
              <span className="text-slate-400 text-[11px] font-bold">Global Enforcement</span>
            </div>
          </div>
        </div>

        {/* Automation Overview / Analytics Row */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h4 className="font-black text-xl text-[#111218] mb-2">Automation Performance Engine</h4>
            <p className="text-slate-500 font-medium">The automation engine is currently processing <span className="text-[#111218] font-black">1,240 tasks per hour</span> with an industry-leading success rate.</p>
            <div className="flex items-center gap-6 mt-6">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-[#111218]">99.4%</span>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Success Rate</span>
              </div>
              <div className="size-12 border-r border-slate-100"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-[#111218]">24.5k</span>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Tasks Daily</span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-72 h-40 bg-blue-50 rounded-2xl border-2 border-blue-100/50 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <path d="M0 50 Q 25 20, 50 50 T 100 50" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-4xl font-black text-[#1337ec]">99.4%</span>
            <span className="text-[11px] uppercase font-bold text-[#1337ec]/60 tracking-widest mt-1">Reliability Index</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
