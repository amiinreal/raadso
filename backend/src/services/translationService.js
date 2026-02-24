import { query } from '../db.js'

export const DEFAULT_LANGUAGE = 'en'
const translationCache = new Map()

const buildFallbackValue = (row, lang) => {
  const requested = row.lang_value
  const english = row.en_value
  if (lang === DEFAULT_LANGUAGE) {
    return english || requested || row.key
  }
  // For non-default locales, avoid falling back to English so missing entries are visible
  return requested || row.key
}

async function loadTranslationsForLanguage(lang = DEFAULT_LANGUAGE) {
  const cacheKey = lang || DEFAULT_LANGUAGE
  // DISABLE CACHE: For immediate updates on reload
  // if (translationCache.has(cacheKey)) {
  //   return translationCache.get(cacheKey)
  // }

  const { rows } = await query(
    `SELECT tk.key, tk.domain, tk.description,
            en.value AS en_value,
            lang.value AS lang_value
     FROM translation_keys tk
     LEFT JOIN translations en
       ON en.translation_key_id = tk.id AND en.language = $1
     LEFT JOIN translations lang
       ON lang.translation_key_id = tk.id AND lang.language = $2
     ORDER BY tk.key`,
    [DEFAULT_LANGUAGE, cacheKey]
  )

  const map = {}
  rows.forEach((row) => {
    map[row.key] = buildFallbackValue(row, cacheKey)
  })

  // translationCache.set(cacheKey, map)
  return map
}

export async function resolveTranslation(key, lang = DEFAULT_LANGUAGE) {
  if (!key) return ''
  const map = await loadTranslationsForLanguage(lang)
  if (Object.prototype.hasOwnProperty.call(map, key)) return map[key]
  // Missing key: fallback to default map if present
  if (lang !== DEFAULT_LANGUAGE) {
    const fallbackMap = await loadTranslationsForLanguage(DEFAULT_LANGUAGE)
    if (Object.prototype.hasOwnProperty.call(fallbackMap, key)) {
      return fallbackMap[key]
    }
  }
  return key
}

export async function getTranslationMap(lang = DEFAULT_LANGUAGE) {
  return loadTranslationsForLanguage(lang)
}

export function invalidateTranslationCache(lang) {
  if (lang) {
    translationCache.delete(lang)
  } else {
    translationCache.clear()
  }
}

export async function listTranslationKeys() {
  const { rows } = await query('SELECT key, domain, description FROM translation_keys ORDER BY key')
  return rows
}

export async function getTranslationValue(key, language = DEFAULT_LANGUAGE) {
  const { rows } = await query(
    `SELECT t.value
     FROM translation_keys tk
     JOIN translations t ON t.translation_key_id = tk.id
     WHERE tk.key = $1 AND t.language = $2
     LIMIT 1`,
    [key, language]
  )
  return rows[0]?.value || null
}
