import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/api'
import { useTranslation } from '../../i18n/TranslationProvider'
import { baseTranslations, defaultLocale, supportedLocales } from '../../i18n/baseTranslations'
import { getPageDetails, getPersonaDetails, pageFilters, personaFilters, resolveKeyMeta } from '../../i18n/translationCategories'

const namespace = 'common'

const parseApiError = (error) => {
  if (!error) return ''
  const raw = typeof error === 'string' ? error : error.message || ''
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.error) return parsed.error
  } catch {
    // ignore malformed payloads
  }
  return raw
}

const isMissingTranslationError = (error) => parseApiError(error).toLowerCase().includes('translation not found')

const personaBadgeStyles = {
  candidate: 'bg-sky-50 text-sky-700 border-sky-200',
  employer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shared: 'bg-slate-100 text-slate-700 border-slate-200',
  all: 'bg-slate-100 text-slate-700 border-slate-200',
}

const pageBadgeStyles = {
  dashboard: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  jobs: 'bg-amber-50 text-amber-700 border-amber-200',
  applications: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  profile: 'bg-rose-50 text-rose-700 border-rose-200',
  navbar: 'bg-teal-50 text-teal-700 border-teal-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  shared: 'bg-slate-100 text-slate-700 border-slate-200',
}

const docAnchors = {
  candidate: {
    dashboard: '/translation-context.html#candidate-dashboard',
    jobs: '/translation-context.html#candidate-jobs',
    applications: '/translation-context.html#candidate-applications',
    profile: '/translation-context.html#candidate-profile',
    landing: '/translation-context.html#candidate-landing',
    settings: '/translation-context.html#candidate-settings',
    'saved-searches': '/translation-context.html#candidate-saved-searches',
    default: '/translation-context.html#shared-shared',
  },
  employer: {
    dashboard: '/translation-context.html#employer-dashboard',
    jobs: '/translation-context.html#employer-jobs',
    applications: '/translation-context.html#employer-applications',
    onboarding: '/translation-context.html#employer-onboarding',
    tenant: '/translation-context.html#employer-tenant',
    default: '/translation-context.html#shared-shared',
  },
  admin: {
    admin: '/translation-context.html#shared-shared',
    default: '/translation-context.html#shared-shared',
  },
  shared: {
    navbar: '/translation-context.html#shared-navbar',
    footer: '/translation-context.html#shared-footer',
    auth: '/translation-context.html#shared-auth',
    legal: '/translation-context.html#shared-legal',
    shared: '/translation-context.html#shared-shared',
    default: '/translation-context.html#shared-shared',
  },
}

const resolveDocLink = (persona, page) => {
  const group = docAnchors[persona] || docAnchors.shared
  return group[page] || group.default || '/translation-context.html'
}

export function TranslationWorkspace({ token }) {
  const { t, locale: activeLocale, localeSettings = [] } = useTranslation()
  const [selectedLocale, setSelectedLocale] = useState(activeLocale || defaultLocale)
  const [personaFilter, setPersonaFilter] = useState('candidate')
  const [pageFilter, setPageFilter] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [remoteTranslations, setRemoteTranslations] = useState({})
  const [dbTranslations, setDbTranslations] = useState({})
  const [scanRows, setScanRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [changes, setChanges] = useState({})
  const [savingKeys, setSavingKeys] = useState({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState({})
  const [aiSuggested, setAiSuggested] = useState({})
  const [extracted, setExtracted] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [extractedSuggestions, setExtractedSuggestions] = useState({})
  const [extractSuggesting, setExtractSuggesting] = useState(false)
  const [syncingBase, setSyncingBase] = useState(false)

  const canonical = baseTranslations[defaultLocale]
  const sourceKeys = useMemo(() => {
    if (scanRows.length) {
      return [...new Set(scanRows.map((row) => row.key))].sort()
    }
    return Object.keys(canonical).sort()
  }, [scanRows, canonical])
  const scanByKey = useMemo(() => {
    const map = {}
    scanRows.forEach((row) => { map[row.key] = row })
    return map
  }, [scanRows])

  const localeOptions = useMemo(() => {
    if (localeSettings.length) {
      return localeSettings.map((entry) => ({
        value: entry.locale,
        label: entry.label || entry.locale.toUpperCase(),
      }))
    }
    return supportedLocales.map((code) => ({ value: code, label: code.toUpperCase() }))
  }, [localeSettings])

  useEffect(() => {
    if (!selectedLocale && localeOptions.length) {
      setSelectedLocale(localeOptions[0].value)
    }
  }, [selectedLocale, localeOptions])

  useEffect(() => {
    if (!selectedLocale) return
    let isMounted = true
    setLoading(true)
    setError(null)
    api.getTranslationScan({ sourceLanguage: defaultLocale, targetLanguage: selectedLocale }, token)
      .then((rows) => {
        if (!isMounted) return
        setScanRows(rows || [])
        const targetMap = {}
        rows?.forEach((row) => {
          if (row.targetValue) targetMap[row.key] = row.targetValue
        })
        setRemoteTranslations(targetMap)
        setDbTranslations(targetMap)
        setChanges({})
        setAiSuggested({})
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Failed to load translations')
        setScanRows([])
        setRemoteTranslations({})
        setDbTranslations({})
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [selectedLocale, reloadNonce, token])

  const filteredRows = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    return sourceKeys
      .map((key) => {
        const meta = resolveKeyMeta(key)
        const scan = scanByKey[key]
        const baseText = scan?.sourceValue || canonical[key] || key
        const existing = remoteTranslations[key] ?? ''
        const draft = Object.prototype.hasOwnProperty.call(changes, key) ? changes[key] : existing
        const personaMatches = personaFilter === 'shared'
          ? meta.persona === 'shared'
          : personaFilter === 'all'
            ? true
            : meta.persona === personaFilter || meta.persona === 'shared'
        const pageMatches = pageFilter === 'shared'
          ? meta.page === 'shared'
          : meta.page === pageFilter || meta.page === 'shared'
        if (!personaMatches || !pageMatches) return null
        const matchesSearch = !searchLower ||
          key.toLowerCase().includes(searchLower) ||
          baseText.toLowerCase().includes(searchLower) ||
          draft?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return null
        return {
          key,
          meta,
          baseText,
          existing,
          draft: draft ?? '',
        }
      })
      .filter(Boolean)
  }, [sourceKeys, canonical, remoteTranslations, personaFilter, pageFilter, searchTerm, changes])

  const extractedRows = useMemo(() => {
    if (!extracted.length) return []
    const searchLower = searchTerm.toLowerCase()
    return extracted.filter((item) => {
      const matchesPersona = personaFilter === 'shared'
        ? item.persona === 'shared'
        : personaFilter === 'all'
          ? true
          : item.persona === personaFilter || item.persona === 'shared'
      const matchesPage = pageFilter === 'shared'
        ? item.page === 'shared'
        : item.page === pageFilter || item.page === 'shared'
      const matchesSearch = !searchLower ||
        item.key.toLowerCase().includes(searchLower) ||
        item.text.toLowerCase().includes(searchLower)
      return matchesPersona && matchesPage && matchesSearch
    })
  }, [extracted, personaFilter, pageFilter, searchTerm])

  const rowStatus = (row) => {
    const scan = scanByKey[row.key]
    if (Object.prototype.hasOwnProperty.call(changes, row.key)) return 'draft'
    if (scan?.status === 'no-source') return 'no-source'
    if (scan?.status === 'missing') return 'missing'
    if (!row.existing) {
      return selectedLocale === defaultLocale ? 'base' : 'missing'
    }
    if (selectedLocale !== defaultLocale && row.existing === row.baseText) {
      return 'inherited'
    }
    return 'saved'
  }

  const resolveDomain = (meta) => {
    if (!meta) return 'common'
    if (meta.persona === 'admin') return 'admin'
    if (meta.persona === 'employer') return 'employer'
    if (meta.persona === 'candidate') return 'candidate'
    return 'common'
  }

  const hydrateExtractedSuggestions = async (items) => {
    if (!token || !items?.length) {
      setExtractedSuggestions({})
      return
    }
    setExtractSuggesting(true)
    const next = {}

    for (const item of items) {
      if (item.reuseKey && remoteTranslations[item.reuseKey]) {
        next[item.key] = { value: remoteTranslations[item.reuseKey], source: 'reuse' }
        continue
      }
      if (selectedLocale === defaultLocale) continue
      try {
        const domain = resolveDomain({ persona: item.persona })
        const res = await api.aiTranslateTextV2({
          text: item.text,
          targetLanguage: selectedLocale,
          sourceLanguage: defaultLocale,
          domain,
          persona: item.persona,
          page: item.page,
        }, token)
        const suggestion = res?.suggestion?.trim?.()
        if (suggestion) {
          next[item.key] = { value: suggestion, source: 'ai' }
        }
      } catch (err) {
        console.error('Failed to suggest extracted translation', err)
      }
    }

    setExtractedSuggestions(next)
    setExtractSuggesting(false)
  }

  const acceptExtracted = async (item) => {
    if (!token) return
    setSavingKeys((prev) => ({ ...prev, [item.key]: true }))
    try {
      const domain = resolveDomain({ persona: item.persona })
      await api.upsertTranslationV2({
        key: item.key,
        domain,
        language: defaultLocale,
        value: item.text,
        source: 'import',
      }, token)
      setRemoteTranslations((prev) => ({ ...prev, [item.key]: item.text }))
      setChanges((prev) => {
        const next = { ...prev }
        delete next[item.key]
        return next
      })
      setExtracted((prev) => prev.filter((row) => row.key !== item.key))
      setExtractedSuggestions((prev) => {
        const next = { ...prev }
        delete next[item.key]
        return next
      })
    } catch (err) {
      console.error('Failed to import extracted key', err)
      alert('Failed to import key')
    } finally {
      setSavingKeys((prev) => {
        const next = { ...prev }
        delete next[item.key]
        return next
      })
    }
  }

  const runExtraction = async (persona) => {
    if (!token) return
    setExtracting(true)
    try {
      const res = await api.extractTranslations({ persona }, token)
      const items = res?.items || []
      setExtractedSuggestions({})
      setExtracted(items)
      await hydrateExtractedSuggestions(items)
      if (!items.length) {
        alert(`No new strings found for ${persona} pages.`)
      }
    } catch (err) {
      console.error('Extraction failed', err)
      alert('Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  useEffect(() => {
    if (extracted.length) {
      hydrateExtractedSuggestions(extracted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocale, remoteTranslations])

  const upsertTranslation = async (translationKey, valueToPersist, meta, options = {}) => {
    if (!token) return null
    const domain = resolveDomain(meta)
    const source = options.ai ? 'ai' : 'manual'
    return api.upsertTranslationV2({ key: translationKey, domain, language: selectedLocale, value: valueToPersist, source }, token)
  }

  const statusBadge = (status) => {
    const map = {
      draft: 'bg-amber-100 text-amber-800 border-amber-200',
      missing: 'bg-rose-100 text-rose-800 border-rose-200',
      'no-source': 'bg-slate-200 text-slate-700 border-slate-300',
      inherited: 'bg-slate-100 text-slate-700 border-slate-200',
      saved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      base: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    }
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const handleChange = (key, value) => {
    setChanges((prev) => ({ ...prev, [key]: value }))
  }

  const handleAiSuggest = async (row) => {
    if (!token) return
    const { key, meta } = row
    setAiLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const uiContext = `persona:${meta.persona || 'n/a'} | page:${meta.page || 'n/a'} | domain:${resolveDomain(meta)} | base:${row.baseText || ''}`
      const res = await api.aiTranslateV2({ key, targetLanguage: selectedLocale, sourceLanguage: defaultLocale, uiContext }, token)
      const suggestion = res?.suggestion?.trim?.()
      if (suggestion) {
        setChanges((prev) => ({ ...prev, [key]: suggestion }))
        setAiSuggested((prev) => ({ ...prev, [key]: true }))
      }
    } catch (err) {
      console.error('AI translate failed', err)
      alert(t('admin.translations.error', 'Unable to load translations at the moment.'))
    } finally {
      setAiLoading((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const persistTranslation = async (key, meta) => {
    if (!token) return
    const value = Object.prototype.hasOwnProperty.call(changes, key) ? changes[key] : remoteTranslations[key]
    if (value === undefined) return
    setSavingKeys((prev) => ({ ...prev, [key]: true }))
    try {
      const ai = !!aiSuggested[key]
      await upsertTranslation(key, value, meta, { ai })
      setRemoteTranslations((prev) => ({ ...prev, [key]: value }))
      setChanges((prev) => {
        const { [key]: _omit, ...rest } = prev
        return rest
      })
      setAiSuggested((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch (err) {
      console.error('Failed to save translation', err)
      alert(t('admin.translations.saveError', 'Unable to save translation.'))
    } finally {
      setSavingKeys((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleSaveAll = async () => {
    if (!token || !Object.keys(changes).length) return
    setBulkSaving(true)
    const entries = Object.entries(changes)
    const savedKeys = []
    for (const [key, value] of entries) {
      try {
        const meta = resolveKeyMeta(key)
        const ai = !!aiSuggested[key]
        await upsertTranslation(key, value, meta, { ai })
        savedKeys.push(key)
        setRemoteTranslations((prev) => ({ ...prev, [key]: value }))
      } catch (err) {
        console.error('Failed to save translation', err)
        alert(`${t('admin.translations.saveError', 'Unable to save translation.')} (${key})`)
        break
      }
    }
    setChanges((prev) => {
      const next = { ...prev }
      savedKeys.forEach((key) => { delete next[key] })
      return next
    })
    setAiSuggested((prev) => {
      const next = { ...prev }
      savedKeys.forEach((key) => { delete next[key] })
      return next
    })
    setBulkSaving(false)
  }

  const syncBaseToDb = async () => {
    if (!token) return
    setSyncingBase(true)
    try {
      const items = sourceKeys.map((key) => {
        const meta = resolveKeyMeta(key)
        const domain = resolveDomain(meta)
        const scan = scanByKey[key]
        return {
          key,
          domain,
          language: defaultLocale,
          value: scan?.sourceValue || canonical[key] || key,
          source: 'seed',
          description: null,
        }
      })
      await api.bulkUpsertTranslationsV2({ items }, token)
      setReloadNonce((prev) => prev + 1)
      alert('Base keys synced to database.')
    } catch (err) {
      console.error('Failed to sync base keys', err)
      alert('Failed to sync base keys')
    } finally {
      setSyncingBase(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-600">
        {t('admin.translations.noToken', 'Sign in as an admin to edit translations.')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg p-4 text-sm flex flex-col gap-1">
        <div className="font-semibold">DB translations (shadow)</div>
        <div className="flex flex-wrap gap-4 text-emerald-900">
          <span><strong>App name:</strong> {dbTranslations['common.app.name'] || '—'}</span>
          <span><strong>Save CTA:</strong> {dbTranslations['common.save.cta'] || '—'}</span>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="pill">{t('admin.translations.title', 'Interface Translations')}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">{t('admin.translations.workspaceTitle', 'Translate the product')}</h3>
            <p className="text-slate-600 text-sm mt-1">{t('admin.translations.description', 'Update the copy that appears across the application.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {personaFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPersonaFilter(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${personaFilter === option.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-slate-200 text-slate-600 hover:border-primary/40'
                  }`}
              >
                {t(option.labelKey, option.fallback)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">{t('admin.translations.extractTitle')}</p>
              <p className="text-xs text-slate-600">{t('admin.translations.extractDesc')}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => runExtraction('candidate')}
                disabled={extracting}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
              >
                {extracting ? t('common.scanning') : t('admin.translations.actions.scanCandidate')}
              </button>
              <button
                type="button"
                onClick={() => runExtraction('employer')}
                disabled={extracting}
                className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {extracting ? t('common.scanning') : t('admin.translations.actions.scanEmployer')}
              </button>
              <button
                type="button"
                onClick={() => runExtraction('all')}
                disabled={extracting}
                className="px-3 py-2 rounded-lg bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {extracting ? t('common.scanning') : t('admin.translations.actions.scanAll')}
              </button>
            </div>
          </div>
          {extractedRows.length > 0 && (
            <div className="overflow-auto max-h-80 border border-slate-200 rounded-lg bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('admin.translations.table.key')}</th>
                    <th className="px-3 py-2 text-left">{t('admin.translations.table.text')}</th>
                    <th className="px-3 py-2 text-left">{t('admin.translations.table.personaPage')}</th>
                    <th className="px-3 py-2 text-left">{t('admin.translations.table.file')}</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {extractedRows.map((item) => (
                    <tr key={item.key} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-slate-800">{item.key}</td>
                      <td className="px-3 py-2 text-slate-800">
                        <div>{item.text}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {extractSuggesting && !extractedSuggestions[item.key] && selectedLocale !== defaultLocale && (
                            <span className="text-slate-500">{t('admin.translations.fetchingSuggestion')}</span>
                          )}
                          {extractedSuggestions[item.key] && (
                            <span>
                              {t('admin.translations.suggested', { locale: selectedLocale })}: {extractedSuggestions[item.key].value}
                              {extractedSuggestions[item.key].source === 'reuse' && ` (${t('admin.translations.reused')})`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{item.persona} / {item.page}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{item.file}</td>
                      <td className="px-3 py-2 text-right">
                        {item.reuseKey && (
                          <span className="mr-2 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            reuse: {item.reuseKey}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => acceptExtracted(item)}
                          disabled={!!savingKeys[item.key]}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {savingKeys[item.key] ? t('common.saving') : t('admin.translations.actions.acceptEn')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {extractedRows.length === 0 && !extracting && (
            <div className="text-xs text-slate-600">{t('admin.translations.noNewStrings')}</div>
          )}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-wrap gap-2">
            {pageFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPageFilter(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${pageFilter === option.value
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
              >
                {t(option.labelKey, option.fallback)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t('admin.translations.localeLabel', 'Locale')}
            </label>
            <select
              value={selectedLocale}
              onChange={(e) => setSelectedLocale(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={syncBaseToDb}
              disabled={syncingBase}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {syncingBase ? t('common.syncing') : t('admin.translations.actions.syncBase')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t('admin.translations.searchPlaceholder', 'Search key or text...')}
            </label>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('admin.translations.searchPlaceholder', 'Search key or text...')}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!Object.keys(changes).length || bulkSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white disabled:opacity-40"
            >
              {bulkSaving
                ? t('admin.translations.saving', 'Saving...')
                : t('admin.translations.actions.saveAll', 'Save all changes')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-600">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary mb-3" />
            <p>{t('admin.translations.loading', 'Loading translations...')}</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-rose-600">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              className="mt-3 text-sm text-primary font-semibold"
              onClick={() => setReloadNonce((prev) => prev + 1)}
            >
              {t('admin.translations.retry', 'Try again')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRows.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">
                {t('admin.translations.empty', 'No keys match your filters yet.')}
              </p>
            )}
            {filteredRows.map((row) => {
              const status = rowStatus(row)
              const personaDetails = getPersonaDetails(row.meta.persona)
              const pageDetails = getPageDetails(row.meta.page)
              const personaLabel = t(personaDetails.labelKey, personaDetails.labelFallback)
              const personaDescription = t(personaDetails.descriptionKey, personaDetails.descriptionFallback)
              const pageLabel = t(pageDetails.labelKey, pageDetails.labelFallback)
              const pageDescription = t(pageDetails.descriptionKey, pageDetails.descriptionFallback)
              const personaBadge = personaBadgeStyles[row.meta.persona] || personaBadgeStyles.shared
              const pageBadge = pageBadgeStyles[row.meta.page] || pageBadgeStyles.shared
              const locationHref = resolveDocLink(row.meta.persona, row.meta.page)
              const scan = scanByKey[row.key]
              const isNoSource = scan?.status === 'no-source'
              const hasTarget = scan?.hasTarget
              const domainBadge = row.meta.persona === 'employer'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : row.meta.persona === 'candidate'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : row.meta.persona === 'admin'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
              return (
                <div key={`${row.key}-${selectedLocale}`} className="p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{row.key}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span className={`px-2 py-0.5 rounded-full border ${personaBadge}`}>
                          {personaLabel}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border ${pageBadge}`}>
                          {pageLabel}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border ${domainBadge}`}>
                          {row.meta.persona === 'shared' ? 'common' : row.meta.persona}
                        </span>
                        <a
                          className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                          href={locationHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('admin.translations.actions.showLocation')}
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {personaDescription} · {pageDescription}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${statusBadge(status)}`}>
                      {t(`admin.translations.status.${status}`, status)}
                    </span>
                  </div>
                  {isNoSource && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <span>{t('admin.translations.missingEnSource')}</span>
                      {selectedLocale !== defaultLocale && (
                        <button
                          type="button"
                          onClick={() => {
                            setChanges((prev) => ({ ...prev, [row.key]: row.baseText }))
                            setSelectedLocale(defaultLocale)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-semibold"
                        >
                          {t('admin.translations.actions.seedEn')}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase font-semibold text-slate-500 block mb-1">
                        {t('admin.translations.baseLabel', 'English base copy')}
                      </label>
                      <div className="text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap">
                        {row.baseText}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase font-semibold text-slate-500 block mb-1">
                        {t('admin.translations.localeValue', 'Selected locale')}
                      </label>
                      <textarea
                        value={row.draft ?? ''}
                        onChange={(e) => handleChange(row.key, e.target.value)}
                        rows={Math.min(5, Math.max(2, Math.ceil((row.draft || '').length / 60)))}
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary"
                        placeholder={row.baseText}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {status === 'missing'
                        ? t('admin.translations.hintMissing', 'No translation yet — falls back to English')
                        : status === 'draft'
                          ? t('admin.translations.hintDraft', 'Unsaved edits pending')
                          : null}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAiSuggest(row)}
                        disabled={!!aiLoading[row.key]}
                        className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {aiLoading[row.key] ? 'Translating…' : 'AI Suggest'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange(row.key, row.baseText)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        {t('admin.translations.actions.copyBase', 'Copy base')}
                      </button>
                      <button
                        type="button"
                        onClick={() => persistTranslation(row.key, row.meta)}
                        disabled={savingKeys[row.key] || (!Object.prototype.hasOwnProperty.call(changes, row.key) && selectedLocale !== defaultLocale && !row.existing)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40"
                      >
                        {savingKeys[row.key]
                          ? t('admin.translations.saving', 'Saving...')
                          : t('admin.translations.actions.saveKey', 'Save key')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
