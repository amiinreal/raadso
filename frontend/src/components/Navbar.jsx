const tabs = [
  { key: 'dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard', requiresAuth: true, roles: ['candidate', 'employer', 'admin'] },
  { key: 'jobs', labelKey: 'nav.jobs', fallbackLabel: 'Jobs', requiresAuth: false, roles: ['candidate', 'employer'] },
  { key: 'companies', labelKey: 'nav.companies', fallbackLabel: 'Companies', requiresAuth: false, roles: ['candidate', 'employer'] },
  { key: 'profile', labelKey: 'nav.profile', fallbackLabel: 'Profile', requiresAuth: true, roles: ['candidate'] },
  { key: 'applications', labelKey: 'nav.applications', fallbackLabel: 'Applications', requiresAuth: true, roles: ['candidate', 'employer'] },
  { key: 'team-members', labelKey: 'nav.team-members', fallbackLabel: 'Team Members', requiresAuth: true, roles: ['employer'] },
  { key: 'create-job', labelKey: 'nav.create-job', fallbackLabel: 'Post Job', requiresAuth: true, roles: ['employer'] },
  { key: 'admin', labelKey: 'nav.admin', fallbackLabel: 'Admin', requiresAuth: true, roles: ['admin'] },
]

import { useState, useEffect, useMemo, useRef } from 'react'
import { api } from '../api/api'
import { useTranslation } from '../i18n/TranslationProvider'
import { defaultLocale } from '../i18n/baseTranslations'

export function Navbar({
  activeTab,
  onChange,
  user,
  onLogout,
  onAuth,
  isAuthenticated = false,
  token,
  currentRole,
  onRoleSwitch,
}) {
  const { t, locale, switchLocale, buildPath, localeSettings = [], supportedLocales = [] } = useTranslation()
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationError, setNotificationError] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const languageMenuRef = useRef(null)

  const [pendingInvitations, setPendingInvitations] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])

  useEffect(() => {
    if (!token || !isAuthenticated) return
    
    api.getUserRoles(token)
      .then((data) => {
        const roleOptions = []
        if (data.candidate) {
          roleOptions.push({
            type: 'candidate',
            label: t('roles.candidate', 'Candidate'), 
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
            label: t('roles.admin', 'Admin'),
            tenantId: null,
            role: 'admin',
          })
        }
        setAvailableRoles(roleOptions)
      })
      .catch((err) => console.error('Failed to load roles', err))
  }, [token, isAuthenticated, t])

  const getRoleLabel = (role) => {
    if (!role) return t('roles.candidate', 'Candidate')
    const normalized = `${role}`.trim()
    if (!normalized) return t('roles.candidate', 'Candidate')
    const fallback = normalized.charAt(0).toUpperCase() + normalized.slice(1)
    return t(`roles.${normalized}`, fallback)
  }

  const userRoleLabel = getRoleLabel(user?.role)
  const userDisplayName = user?.email?.split('@')[0] || t('navbar.userFallback', 'User')

  // Fetch deadline notifications and pending invitations
  useEffect(() => {
    if (!user?.id || !token) return

    // Request browser notification permission
    if (user.role === 'candidate' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true)
        setNotificationError(false)

        // 1. Fetch Pending Invitations
        try {
          const invitations = await api.getPendingInvitations(token)
          setPendingInvitations(invitations || [])
        } catch (err) {
          console.error('Failed to fetch pending invitations', err)
        }

        // 2. Fetch Candidate Notifications (if candidate)
        if (user.role === 'candidate') {
          // Trigger deadline check
          const result = await api.checkDeadlineNotifications(user.id, token)

          // Get all unread notifications
          const dbNotifications = await api.getNotifications(user.id, true, token)

          // Transform for display
          const displayNotifications = dbNotifications.map(notif => {
            const deadline = new Date(notif.deadline || notif.application_deadline)
            const now = new Date()
            const hoursLeft = (deadline - now) / (1000 * 60 * 60)

            return {
              id: notif.id,
              jobId: notif.job_id,
              adNumber: notif.ad_number,
              title: notif.title,
              message: notif.message,
              deadline,
              notificationTime: notif.notification_time,
              timesSent: notif.times_sent,
              hoursLeft: Math.round(hoursLeft),
              isUrgent: notif.notification_time === '24_hours',
              isRead: notif.is_read,
              createdAt: notif.created_at
            }
          })

          // Sort by urgency and creation date
          displayNotifications.sort((a, b) => {
            if (a.isUrgent && !b.isUrgent) return -1
            if (!a.isUrgent && b.isUrgent) return 1
            return new Date(b.createdAt) - new Date(a.createdAt)
          })

          setNotifications(displayNotifications)

          // Send browser notification for new urgent notifications
          if ('Notification' in window && Notification.permission === 'granted' && result.created?.length > 0) {
            result.created.forEach(notif => {
              if (notif.id) {
                new Notification(t('navbar.jobAlertTitle', 'Job Application Deadline Alert'), {
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  body: `${notif.message} - ${notif.title}`,
                  tag: `deadline-${notif.job_id}`,
                  requireInteraction: true,
                  actions: [
                    { action: 'open', title: t('navbar.jobAlertViewAction', 'View Job') },
                    { action: 'dismiss', title: t('navbar.jobAlertDismissAction', 'Dismiss') }
                  ]
                })
              }
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch/create notifications:', err)
        setNotificationError(true)
      } finally {
        setNotificationsLoading(false)
      }
    }

    // Fetch on mount
    fetchNotifications()

    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id, token, user?.role, t])

  const handleAcceptInvitation = async (invitation) => {
    try {
      await api.acceptInvitation(invitation.id, token)
      setPendingInvitations(prev => prev.filter(i => i.id !== invitation.id))
      alert(`${t('navbar.acceptInvitationSuccess', 'Invitation accepted for')} ${invitation.company_name}! ${t('navbar.reloadNotice', 'Reloading...')}`)
      // Reload to refresh roles/permissions
      window.location.reload()
    } catch (err) {
      console.error('Failed to accept invitation:', err)
      alert(t('navbar.acceptInvitationFailure', 'Failed to accept invitation'))
    }
  }

  const handleDeclineInvitation = async (invitation) => {
    if (!window.confirm(`${t('navbar.declineInvitationPrompt', 'Decline invitation from')} ${invitation.company_name}?`)) return
    try {
      await api.declineInvitation(invitation.id, token)
      setPendingInvitations(prev => prev.filter(i => i.id !== invitation.id))
    } catch (err) {
      console.error('Failed to decline invitation:', err)
      alert(t('navbar.declineInvitationFailure', 'Failed to decline invitation'))
    }
  }

  // Fetch unread message count for both candidates and employers
  useEffect(() => {
    if (!user?.id || !token) return

    const fetchUnreadMessages = async () => {
      try {
        const response = await fetch('http://localhost:4000/messages/unread/count', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setUnreadMessageCount(data.unreadCount || 0)
        }
      } catch (err) {
        console.error('Failed to fetch unread message count:', err)
      }
    }

    // Fetch on mount
    fetchUnreadMessages()

    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadMessages, 30 * 1000)
    return () => clearInterval(interval)
  }, [user?.id, token])

  // Handle notification actions
  const handleNotificationClick = async (notification) => {
    try {
      await api.markNotificationAsRead(user.id, notification.id, token)
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n))
      setShowNotifications(false)

      // Navigate to the job
      const jobIdentifier = notification.adNumber || notification.jobId
      if (jobIdentifier && onChange) {
        onChange('jobs')
        // Use window location to ensure full navigation
        setTimeout(() => {
          window.location.hash = ''
          window.location.pathname = buildPath(`jobs/${jobIdentifier}`)
        }, 100)
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleDismissNotification = async (notificationId) => {
    try {
      await api.deleteNotification(user.id, notificationId, token)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Failed to dismiss notification:', err)
    }
  }

  const handleLocaleSelect = (targetLocale) => {
    if (!targetLocale || targetLocale.code === locale) return
    const isAdminUser = user?.role === 'admin'
    // Non-admins cannot choose admin-only or disabled locales
    if (!isAdminUser) {
      if (targetLocale.adminOnly) return
      if (!targetLocale.enabled) return
    }
    switchLocale(targetLocale.code, { force: isAdminUser })
    setShowLanguageMenu(false)
  }

  // Filter tabs based on auth state and user role
  const visibleTabs = tabs.filter((tab) => {
    if (!isAuthenticated) return !tab.requiresAuth
    if (!user?.role) return !tab.requiresAuth
    return tab.roles.includes(user.role)
  })

  const unreadAlerts = notifications.filter((n) => !n.isRead).length
  const invitationSummary = pendingInvitations.length > 0 ? `${pendingInvitations.length} ${t('navbar.invitationsLabel', 'invitation(s)')}` : ''
  const alertSummary = unreadAlerts > 0 ? `${unreadAlerts} ${t('navbar.alertsLabel', 'alert(s)')}` : ''

  const availableLocales = useMemo(() => {
    const source = localeSettings.length
      ? localeSettings
      : supportedLocales.map((code) => ({ locale: code, enabled: true }))

    return source
      .map((entry) => {
        const code = entry.locale || entry.code || ''
        const labelKey = code === 'en' ? 'language.english' : code === 'so' ? 'language.somali' : `language.${code}`
        const fallbackLabel = code ? code.toUpperCase() : t('language.switcherLabel', 'Language')
        const adminOnly = entry.adminOnly ?? entry.admin_only ?? false
        const isAdminUser = user?.role === 'admin'
        const enabled = isAdminUser ? true : (entry.enabled !== false && !adminOnly)
        return {
          code,
          label: entry.label || t(labelKey, fallbackLabel),
          enabled,
          adminOnly,
          comingSoonMessage: entry.comingSoonMessage
            ?? entry.coming_soon_message
            ?? t('language.comingSoonMessage', 'We are still translating this language. Stay tuned!'),
        }
      })
      .filter((entry) => !!entry.code)
      .sort((a, b) => {
        if (a.enabled && !b.enabled) return -1
        if (!a.enabled && b.enabled) return 1
        return a.code.localeCompare(b.code)
      })
  }, [localeSettings, supportedLocales, t])

  const activeLocaleMeta = availableLocales.find((entry) => entry.code === locale)

  useEffect(() => {
    if (!showLanguageMenu) return
    const handleClick = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) {
        setShowLanguageMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showLanguageMenu])

  return (
    <header className="bg-card-white border-b border-border-color shrink-0 z-30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer" onClick={() => onChange('dashboard')}>
              {/* Blue Star Logo */}
              <div className="h-10 w-10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-9 h-9 text-blue-600"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    fill="#2563eb"
                    stroke="#2563eb"
                  />
                </svg>
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-bold text-2xl leading-none text-blue-600 tracking-wide">RAADI</span>
                <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
                  {userRoleLabel}
                </span>
              </div>
            </div>
            <nav className="hidden xl:ml-10 xl:flex xl:space-x-1 items-center">
              {visibleTabs.map((tab) => (
                <a
                  key={tab.key}
                  onClick={() => onChange(tab.key)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${activeTab === tab.key
                    ? 'text-primary bg-indigo-50'
                    : 'text-text-secondary hover:text-primary'
                    }`}
                >
                  {t(tab.labelKey, tab.fallbackLabel)}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden sm:block relative" ref={languageMenuRef}>
              <button
                type="button"
                onClick={() => setShowLanguageMenu((prev) => !prev)}
                aria-label={t('language.switcherLabel', 'Language')}
                aria-haspopup="menu"
                aria-expanded={showLanguageMenu}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border-color rounded-full text-sm font-semibold text-text-main hover:border-primary/50 hover:text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 0c2.5 0 4 4 4 9s-1.5 9-4 9-4-4-4-9 1.5-9 4-9zm-9 9h18" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wide">
                  {(activeLocaleMeta?.code || locale || defaultLocale).substring(0, 2).toUpperCase()}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-border-color rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-border-color bg-slate-50">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t('language.switcherLabel', 'Language')}</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-1">
                    {availableLocales.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => handleLocaleSelect(option)}
                        disabled={!option.enabled}
                        className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${option.enabled ? 'hover:bg-primary/5' : 'cursor-not-allowed opacity-70 bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-main">{option.label}</span>
                            {option.adminOnly && (
                              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">{t('admin.locale.adminOnly', 'Admin only')}</span>
                            )}
                          </div>
                          {option.code === locale && (
                            <span className="text-xs font-semibold text-primary">
                              {t('language.currentLocale', 'Current')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary uppercase tracking-wide">{option.code}</div>
                        {!option.enabled && (
                          <p className="text-xs text-amber-700 flex items-center gap-1">
                            <span aria-hidden="true">⚠️</span>
                            {option.comingSoonMessage || t('language.comingSoonMessage', 'We are still translating this language. Stay tuned!')}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {user && (
              <>
                {/* Message Notification Bell */}
                <button
                  onClick={() => {
                    if (user.role === 'candidate') {
                      onChange('applications')
                    } else if (user.role === 'employer') {
                      onChange('dashboard')
                    }
                  }}
                  className="hidden sm:block text-text-secondary hover:text-primary p-1 rounded-full relative transition-colors"
                  title={t('navbar.messages', 'Messages')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {unreadMessageCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 min-w-5 bg-red-500 rounded-full border-2 border-white text-white text-xs font-semibold flex items-center justify-center">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </button>

                {/* Notifications Bell (Candidates & Employers with pending invites) */}
                {(user.role === 'candidate' || pendingInvitations.length > 0) && (
                  <>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="hidden sm:block text-text-secondary hover:text-primary p-1 rounded-full relative transition-colors"
                      title={t('navbar.notifications', 'Notifications')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {(notifications.length > 0 || pendingInvitations.length > 0) && (
                        <span className="absolute top-1.5 right-1.5 h-5 w-5 bg-red-500 rounded-full border-2 border-white text-white text-xs font-semibold flex items-center justify-center animate-pulse">
                          {Math.min((notifications.length + pendingInvitations.length), 9)}{notifications.length + pendingInvitations.length > 9 ? '+' : ''}
                        </span>
                      )}
                    </button>
                    {showNotifications && (
                      <div className="fixed md:absolute right-2 md:right-0 top-16 md:top-full mt-2 w-[calc(100vw-1rem)] md:w-96 max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-base font-bold text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {t('navbar.notificationsTitle', 'Notifications')}
                              </p>
                              <p className="text-xs text-indigo-100 mt-1">
                                {invitationSummary}
                                {invitationSummary && alertSummary ? ', ' : ''}
                                {alertSummary}
                                {!invitationSummary && !alertSummary ? t('navbar.notificationsEmptyDescription', 'No new notifications') : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => setShowNotifications(false)}
                              className="text-white hover:text-indigo-100 p-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {notificationsLoading ? (
                          <div className="p-8 text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-3"></div>
                            <p className="text-sm text-gray-600">{t('navbar.notificationsLoading', 'Loading notifications...')}</p>
                          </div>
                        ) : notificationError ? (
                          <div className="p-8 text-center">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{t('navbar.notificationsError', 'Failed to load notifications')}</p>
                            <button onClick={() => window.location.reload()} className="text-xs text-blue-600">{t('navbar.retry', 'Retry')}</button>
                          </div>
                        ) : (pendingInvitations.length === 0 && notifications.length === 0) ? (
                          <div className="p-8 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-sm font-semibold text-gray-900 mb-1">{t('navbar.notificationsEmptyTitle', 'All caught up!')}</p>
                            <p className="text-xs text-gray-500">{t('navbar.notificationsEmptyDescription', 'No new notifications')}</p>
                          </div>
                        ) : (
                          <div className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100">
                            {/* Pending Invitations Section */}
                            {pendingInvitations.length > 0 && (
                              <div className="bg-blue-50/70 border-b-2 border-blue-100">
                                <div className="px-4 py-2 bg-blue-100/50 text-xs font-bold text-blue-700 uppercase tracking-wide sticky top-0">
                                      {t('navbar.pendingInvitesLabel', 'Team Invitations')}
                                </div>
                                {pendingInvitations.map(invitation => (
                                  <div key={invitation.id} className="p-4 hover:bg-blue-50 transition-all">
                                    <div className="flex items-start gap-3">
                                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-blue-200 shadow-sm shrink-0 overflow-hidden">
                                        {invitation.logo_url ? (
                                          <img src={invitation.logo_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <span className="text-blue-600 font-bold">{invitation.company_name[0]}</span>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-900">
                                              <span className="font-bold">{invitation.first_name} {invitation.last_name}</span> {t('navbar.invitedYouToJoin', 'invited you to join')} <span className="font-bold text-blue-700">{invitation.company_name}</span>
                                        </p>
                                            <p className="text-xs text-gray-500 mt-1">{t('navbar.roleLabel', 'Role')}: <span className="font-medium">{getRoleLabel(invitation.role)}</span></p>
                                        <div className="flex gap-2 mt-3">
                                          <button
                                            onClick={() => handleAcceptInvitation(invitation)}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700 transition-colors"
                                          >
                                                {t('navbar.accept', 'Accept')}
                                          </button>
                                          <button
                                            onClick={() => handleDeclineInvitation(invitation)}
                                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded shadow-sm hover:bg-gray-50 transition-colors"
                                          >
                                                {t('navbar.decline', 'Decline')}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Existing Notifications */}
                            {notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className={`group p-4 hover:bg-gray-50 transition-all ${notif.isRead ? 'opacity-60' : ''
                                  } ${notif.isUrgent ? 'bg-red-50/50 border-l-4 border-l-red-500' : 'bg-orange-50/50 border-l-4 border-l-orange-400'}`}
                              >
                                {/* Header with icon and dismiss */}
                                <div className="flex items-start gap-3 mb-3">
                                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${notif.isUrgent ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'
                                    }`}>
                                    {notif.isUrgent ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${notif.isUrgent ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
                                        }`}>
                                        {notif.isUrgent ? t('navbar.urgentBadge', '🚨 Urgent') : t('navbar.reminderBadge', '⏰ Reminder')}
                                      </span>
                                      {!notif.isRead && (
                                        <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
                                      )}
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{notif.title}</p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDismissNotification(notif.id)
                                    }}
                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title={t('navbar.dismiss', 'Dismiss')}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Message */}
                                <div className="ml-13 mb-3">
                                  <p className="text-xs text-gray-700 leading-relaxed mb-2">{notif.message}</p>

                                  {/* Deadline info */}
                                  <div className="flex items-center gap-2 text-xs">
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${notif.isUrgent ? 'text-red-600' : 'text-orange-600'
                                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className={`font-medium ${notif.isUrgent ? 'text-red-700' : 'text-orange-700'
                                      }`}>
                                      {t('jobDetail.deadline', 'Deadline')}: {notif.deadline.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>

                                {/* Action button */}
                                <div className="ml-13">
                                  <button
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md ${notif.isUrgent
                                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                                        : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white'
                                      }`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {t('navbar.viewJobCta', 'View Job & Apply Now')}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="hidden sm:flex items-center gap-3 border-l border-border-color pl-5 h-8 relative">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-semibold text-text-main leading-none">{userDisplayName}</p>
                    <p className="text-xs text-text-secondary mt-1 leading-none">{userRoleLabel}</p>
                  </div>
                  <div
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-100 to-indigo-200 flex items-center justify-center text-primary font-bold text-sm border border-indigo-100 ring-2 ring-transparent hover:ring-indigo-100 transition-all cursor-pointer"
                  >
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-text-main">{user.email}</p>
                        <p className="text-xs text-text-secondary">{userRoleLabel}</p>
                      </div>
                      
                      {availableRoles.length > 1 && (
                        <>
                           <div className="px-4 py-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wide bg-slate-50 border-b border-gray-100">
                             {t('navbar.switchRole', 'Switch Role')}
                           </div>
                           {availableRoles.map(role => {
                              const isCurrent = currentRole ? 
                                (currentRole.role === role.role && currentRole.tenantId === role.tenantId && currentRole.type === role.type) :
                                (user.role === role.role && user.tenant_id === role.tenantId);

                              return (
                                <button
                                  key={`${role.type}-${role.tenantId || 'na'}-${role.role}`}
                                  onClick={(e) => {
                                      e.stopPropagation()
                                      if (isCurrent) return;
                                      
                                      if (onRoleSwitch) onRoleSwitch(role)
                                      else if (window.onRoleSwitch) window.onRoleSwitch(role)
                                      setShowDropdown(false)
                                  }}
                                  disabled={isCurrent}
                                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                                    isCurrent ? 'bg-indigo-50 text-primary font-bold cursor-default' : 'text-text-main hover:bg-gray-50'
                                  }`}
                                >
                                   <span className="w-5 text-center flex-shrink-0">
                                     {role.type === 'admin' ? '🛡️' : role.type === 'employer' ? '🏢' : '👤'}
                                   </span>
                                   <span className="truncate">{role.label}</span>
                                   {isCurrent && (
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                     </svg>
                                   )}
                                </button>
                              )
                           })}
                           <div className="border-b border-gray-100"></div>
                        </>
                      )}
                      <a
                        href={buildPath('saved-search')}
                        onClick={(e) => {
                          e.preventDefault()
                          onChange('saved-search')
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
                        </svg>
                        {t('navbar.savedSearch', 'Saved Search')}
                      </a>
                      <a
                        href={buildPath('settings')}
                        onClick={(e) => {
                          e.preventDefault()
                          onChange('settings')
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t('navbar.settings', 'Settings')}
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDropdown(false)
                          onLogout()
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('navbar.logout', 'Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {!user && (
              <button
                onClick={onAuth}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors"
              >
                {t('navbar.signIn', 'Sign In')}
              </button>
            )}
            <div className="flex items-center gap-2 xl:hidden">
              {user && user.role === 'candidate' && (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-text-secondary hover:text-primary p-2 rounded-full relative transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-white text-white text-xs font-semibold flex items-center justify-center animate-pulse">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-text-main hover:text-primary p-2 -mr-2"
                type="button"
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Slide Menu */}
      <div
        className={`fixed inset-y-0 right-0 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 xl:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-blue-600"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  fill="#2563eb"
                  stroke="#2563eb"
                />
              </svg>
              <span className="font-bold text-xl text-blue-600">RAADI</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info Section */}
          {user && (
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-100 to-indigo-200 flex items-center justify-center text-primary font-bold text-lg border-2 border-white shadow-sm">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{userDisplayName}</p>
                  <p className="text-xs text-gray-600">{userRoleLabel}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4">
            {visibleTabs.map((tab) => (
              <a
                key={tab.key}
                onClick={() => {
                  onChange(tab.key)
                  setMobileMenuOpen(false)
                }}
                className={`flex items-center px-6 py-3 text-sm font-medium cursor-pointer transition-colors ${activeTab === tab.key
                  ? 'text-blue-600 bg-blue-50 border-r-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`}
              >
                {t(tab.labelKey, tab.fallbackLabel)}
              </a>
            ))}

            {user && (
              <>
                <div className="my-2 border-t border-gray-200"></div>
                <a
                  href={buildPath('saved-search')}
                  onClick={() => {
                    onChange('saved-search')
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 cursor-pointer transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
                  </svg>
                  {t('navbar.savedSearch', 'Saved Search')}
                </a>
                <a
                  href={buildPath('settings')}
                  onClick={() => {
                    onChange('settings')
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 cursor-pointer transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('navbar.settings', 'Settings')}
                </a>
              </>
            )}

            <div className="my-4 border-t border-gray-200"></div>
            <div className="px-6 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('language.switcherLabel', 'Language')}
            </div>
            <div className="flex flex-col">
              {availableLocales.map((option) => (
                <button
                  key={`${option.code}-mobile`}
                  type="button"
                  onClick={() => {
                    if (!option.enabled || option.code === locale) return
                    switchLocale(option.code)
                    setMobileMenuOpen(false)
                  }}
                  disabled={!option.enabled}
                  className={`flex flex-col items-start px-6 py-3 text-left text-sm border-b border-gray-100 ${option.enabled ? 'text-gray-800 hover:bg-gray-50' : 'text-gray-400 bg-gray-50 cursor-not-allowed'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{option.label}</span>
                    {option.code === locale && (
                      <span className="text-xs text-primary font-semibold">{t('language.currentLocale', 'Current')}</span>
                    )}
                  </div>
                  {!option.enabled && (
                    <p className="text-xs text-amber-700 mt-1">
                      {option.comingSoonMessage || t('language.comingSoonMessage', 'We are still translating this language. Stay tuned!')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Bottom Action */}
          <div className="p-4 border-t border-gray-200">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLogout()
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                  {t('navbar.logout', 'Logout')}
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onAuth()
                }}
                className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                  {t('navbar.signIn', 'Sign In')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Overlay for mobile notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 xl:hidden"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}

      {activeLocaleMeta && !activeLocaleMeta.enabled && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-amber-900 text-sm">
          <p className="flex items-start gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{activeLocaleMeta.comingSoonMessage || t('language.disabledBanner', 'We are still translating this language. Some sections may appear in English.')}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              if (locale !== defaultLocale) {
                switchLocale(defaultLocale)
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-100 text-amber-900 font-semibold text-xs uppercase tracking-wide hover:bg-amber-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            {t('language.disabledBannerCta', 'Switch back to English')}
          </button>
        </div>
      )}
    </header>
  )
}
