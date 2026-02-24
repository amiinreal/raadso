import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function AdminLayout({ children, currentPage = 'dashboard' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Robustly extract locale and admin route slug from current location
  const pathParts = location.pathname.split('/').filter(Boolean)
  const supportedLocales = ['en', 'so']

  const hasLocale = supportedLocales.includes(pathParts[0])
  const locale = hasLocale ? pathParts[0] : 'en'
  const adminRouteSlug = hasLocale ? pathParts[1] : pathParts[0] || 'admin-portal-secret123'

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: `/${locale}/${adminRouteSlug}` },
    { id: 'jobs', label: 'Jobs', icon: 'work_history', href: `/${locale}/${adminRouteSlug}/jobs` },
    { id: 'candidates', label: 'Candidates', icon: 'person', href: `/${locale}/${adminRouteSlug}/candidates` },
    { id: 'employers', label: 'Employers', icon: 'business', href: `/${locale}/${adminRouteSlug}/employers` },
    { id: 'tenants', label: 'Tenants', icon: 'apartment', href: `/${locale}/${adminRouteSlug}/tenants` },
    { id: 'users', label: 'Users', icon: 'admin_panel_settings', href: `/${locale}/${adminRouteSlug}/users` },
    { id: 'translations', label: 'Translations', icon: 'translate', href: `/${locale}/${adminRouteSlug}/translations` },
    { id: 'automation', label: 'Automation', icon: 'settings_automation', href: `/${locale}/${adminRouteSlug}/automation` },
  ]

  const supportNav = [
    { id: 'settings', label: 'Settings', icon: 'settings', href: `/${locale}/${adminRouteSlug}/settings` },
    { id: 'help', label: 'Help Center', icon: 'help_outline', href: '#' },
  ]

  const handleNavClick = (href) => {
    navigate(href)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">shield_admin</span>
          </div>
          <div>
            <h1 className="text-slate-900 text-base font-bold leading-none">RAADI</h1>
            <p className="text-slate-500 text-xs font-medium">Admin Console</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === item.id
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Support Section */}
        <div className="px-4 py-4 space-y-1 border-t border-slate-100">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Support
          </div>
          {supportNav.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.href)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQ5zQ9ooWliunKQiRpODK-xzp_MvNVIKOB7RsH9NleoKalbLgmAqfSD7ZLIXL68oqjxwQaO22tYgwpQ1hDpSHVUxXDtH9Vb5W8K0ZlmHiAPfPhZRTaPiCdSc4Fh3edTSSEgImJqt29Do8EvfhUVGwRtXbLfz8HbhtDVNFMy-IXJwPK6jDABZWvvUfwrIjUhhZjZimoFs8xxUePOMaZixFxVHU-3O7mDhwq2iAi2G23tQwi0TeLEAA77CbhgA7th_rrQErYgTU7juk"
              alt="User"
              className="size-8 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Alex Rivera</p>
              <p className="text-[10px] text-slate-500 truncate">Super Admin</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-sm">unfold_more</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm font-medium text-slate-500 gap-2">
              <span>Admin</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-slate-900 capitalize">{currentPage}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
                  placeholder="Search platform..."
                  type="text"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="size-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined">notifications</span>
                </button>
                <button className="size-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined">chat_bubble</span>
                </button>
                <div className="h-8 w-px bg-slate-200 mx-1"></div>
                <button className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors whitespace-nowrap">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Post New Job
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
