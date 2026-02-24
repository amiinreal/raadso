import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { baseTranslations, defaultLocale, supportedLocales } from './baseTranslations'

const LOCAL_STORAGE_KEY = 'job-platform-locale'
const TOKEN_STORAGE_KEY = 'job-platform-token'

const TranslationContext = createContext({
  locale: defaultLocale,
  translations: baseTranslations[defaultLocale],
  t: (key, fallback) => fallback || key,
  switchLocale: () => { },
  buildPath: (path) => path,
  loading: false,
  error: null,
  localeSettings: [],
  refreshLocaleSettings: async () => { },
})

const getLocaleFromPath = (path = '') => {
  const segments = path.split('/').filter(Boolean)
  if (segments.length && supportedLocales.includes(segments[0])) {
    return segments[0]
  }
  return null
}

const stripLocaleFromPath = (path) => {
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return ''
  if (supportedLocales.includes(segments[0])) {
    return `/${segments.slice(1).join('/')}`
  }
  return path === '/' ? '' : path
}

export const TranslationProvider = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [locale, setLocale] = useState(() => {
    const fromPath = getLocaleFromPath(location.pathname)
    if (fromPath) return fromPath
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored && supportedLocales.includes(stored)) {
        return stored
      }
    }
    return defaultLocale
  })
  const [translations, setTranslations] = useState(locale === defaultLocale ? { ...baseTranslations[defaultLocale] } : {})
  const [translationsLoading, setTranslationsLoading] = useState(false)
  const [metaLoading, setMetaLoading] = useState(true)
  const [error, setError] = useState(null)
  const [localeSettings, setLocaleSettings] = useState([])
  const preferredLocaleLoaded = useRef(false)
  const providerMounted = useRef(true)

  useEffect(() => () => {
    providerMounted.current = false
  }, [])

  const loadLocaleMetadata = useCallback(async () => {
    if (!providerMounted.current) return []
    setMetaLoading(true)
    try {
      const settings = await api.getLocaleSettings()
      if (!providerMounted.current) return []
      const normalized = Array.isArray(settings) ? settings : []
      setLocaleSettings(normalized)
      return normalized
    } catch (err) {
      console.warn('Failed to load locale metadata', err)
      if (providerMounted.current) {
        setError((prev) => prev || err.message)
      }
      throw err
    } finally {
      if (providerMounted.current) {
        setMetaLoading(false)
      }
    }
  }, [])

  const ensureLocaleInPath = useCallback((pathname) => {
    const segments = pathname.split('/').filter(Boolean)
    if (!segments.length || !supportedLocales.includes(segments[0])) {
      const normalizedRest = pathname === '/' ? '' : pathname
      navigate(`/${locale}${normalizedRest}`, { replace: true })
    }
  }, [locale, navigate])

  useEffect(() => {
    ensureLocaleInPath(location.pathname)
  }, [location.pathname, ensureLocaleInPath])

  useEffect(() => {
    const nextLocale = location.pathname.split('/').filter(Boolean)[0]
    if (nextLocale && supportedLocales.includes(nextLocale) && nextLocale !== locale) {
      setLocale(nextLocale)
    }
  }, [location.pathname, locale])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOCAL_STORAGE_KEY, locale)
  }, [locale])

  useEffect(() => {
    loadLocaleMetadata().catch(() => { })
  }, [loadLocaleMetadata])

  useEffect(() => {
    let isMounted = true
    const loadTranslations = async () => {
      setTranslationsLoading(true)
      setError(null)
      try {
        const remote = await api.getI18nMap(locale)
        if (!isMounted) return

        // Always start with English base translations as the absolute fallback
        const enBase = baseTranslations[defaultLocale] || {}
        // Merge with current locale base translations (if different)
        const currentBase = locale !== defaultLocale ? (baseTranslations[locale] || {}) : {}

        setTranslations({
          ...enBase,
          ...currentBase,
          ...(remote?.translations || {}),
        })
      } catch (err) {
        console.warn('Failed to fetch translations; falling back to base copy', err)
        if (!isMounted) return
        setError(err.message)
        const fallback = { ...(baseTranslations[defaultLocale] || {}) }
        setTranslations(fallback)
      } finally {
        if (isMounted) setTranslationsLoading(false)
      }
    }

    loadTranslations()
    return () => { isMounted = false }
  }, [locale])

  useEffect(() => {
    if (preferredLocaleLoaded.current) return
    preferredLocaleLoaded.current = true
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return

    let isMounted = true
    const loadPreferredLocale = async () => {
      try {
        const result = await api.me(token)
        if (!isMounted) return
        const preferred = result?.user?.preferred_locale || result?.user?.preferredLocale
        if (preferred && supportedLocales.includes(preferred) && preferred !== locale) {
          const remainder = stripLocaleFromPath(location.pathname)
          const nextPath = `/${preferred}${remainder}`
          navigate(`${nextPath}${location.search}${location.hash}`, { replace: true })
          setLocale(preferred)
        }
      } catch (err) {
        console.warn('Unable to hydrate locale preference', err)
      }
    }

    loadPreferredLocale()
    return () => { isMounted = false }
  }, [locale, location.hash, location.pathname, location.search, navigate])

  const isSelectableLocale = useCallback((nextLocale, force = false) => {
    if (!supportedLocales.includes(nextLocale)) return false
    if (force) return true
    const meta = localeSettings.find((entry) => entry.locale === nextLocale)
    if (!meta) return true
    return !!meta.enabled
  }, [localeSettings])

  const switchLocale = useCallback((nextLocale, options = {}) => {
    if (!supportedLocales.includes(nextLocale) || nextLocale === locale) return
    const { force = false } = options
    if (!isSelectableLocale(nextLocale, force)) return
    const remainder = stripLocaleFromPath(location.pathname)
    const nextPath = `/${nextLocale}${remainder}`
    navigate(`${nextPath}${location.search}${location.hash}`, { replace: true })
    setLocale(nextLocale)
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
      if (token) {
        api.updatePreferredLocale(nextLocale, token).catch((err) => {
          console.warn('Failed to persist locale preference', err)
        })
      }
    }
  }, [isSelectableLocale, locale, location.hash, location.pathname, location.search, navigate])

  const buildPath = useCallback((path = '') => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return cleanPath ? `/${locale}/${cleanPath}` : `/${locale}`
  }, [locale])

  const t = useCallback((key, paramsOrFallback) => {
    if (!key) return ''
    let text = translations[key]

    // Handle fallback if key missing
    if (!text) {
      if (typeof paramsOrFallback === 'string') {
        return paramsOrFallback
      }
      return key
    }

    // Handle interpolation (supports both {{param}} and {param})
    if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      Object.keys(paramsOrFallback).forEach(param => {
        const value = paramsOrFallback[param]
        // Replace {{param}} first, then fallback to {param}
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), value !== undefined ? value : '')
        text = text.replace(new RegExp(`{${param}}`, 'g'), value !== undefined ? value : '')
      })
    }

    return text
  }, [translations])

  const refreshLocaleSettings = useCallback(async () => {
    try {
      await loadLocaleMetadata()
    } catch {
      // Errors are already logged inside loader
    }
  }, [loadLocaleMetadata])

  const loading = translationsLoading || metaLoading

  const value = useMemo(() => ({
    locale,
    supportedLocales,
    translations,
    loading,
    error,
    t,
    switchLocale,
    buildPath,
    localeSettings,
    refreshLocaleSettings,
  }), [locale, translations, loading, error, t, switchLocale, buildPath, localeSettings, refreshLocaleSettings])

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => useContext(TranslationContext)
