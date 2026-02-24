import { Router } from 'express'
import { query, getClient } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { logAudit } from './config.js'
import { invalidateTranslationCache, DEFAULT_LANGUAGE, listTranslationKeys, getTranslationValue } from '../services/translationService.js'
import { translateText } from '../services/geminiAI.js'
import { extractStrings } from '../services/translationExtractor.js'

const router = Router()

const requireAdmin = (req, res, next) => {
  if (!(req.user?.is_admin || req.user?.role === 'admin')) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

router.get('/locales', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT locale, label, enabled, admin_only, coming_soon_message, updated_at
       FROM supported_locales
       ORDER BY locale`
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /translations/locales failed', err)
    res.status(500).json({ error: 'Failed to fetch locale metadata' })
  }
})

router.post('/locales', authenticate, requireAdmin, async (req, res) => {
  const { locale, label, enabled = false, adminOnly = false, comingSoonMessage = null } = req.body || {}
  if (!locale || !label) {
    return res.status(400).json({ error: 'locale and label are required' })
  }

  try {
    const result = await query(
      `INSERT INTO supported_locales (locale, label, enabled, admin_only, coming_soon_message)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (locale)
       DO UPDATE SET
         label = EXCLUDED.label,
         enabled = EXCLUDED.enabled,
         admin_only = EXCLUDED.admin_only,
         coming_soon_message = EXCLUDED.coming_soon_message,
         updated_at = NOW()
       RETURNING locale, label, enabled, admin_only, coming_soon_message, updated_at`,
      [locale, label, enabled, adminOnly, comingSoonMessage]
    )

    await logAudit(req.user.userId, 'upsert_locale', 'supported_locales', result.rows[0].locale, {
      locale,
      label,
      enabled,
      adminOnly,
    })

    res.json(result.rows[0])
  } catch (err) {
    console.error('POST /translations/locales failed', err)
    res.status(500).json({ error: 'Failed to save locale metadata' })
  }
})

router.patch('/locales/:locale', authenticate, requireAdmin, async (req, res) => {
  const { locale } = req.params
  const { label, enabled, adminOnly, comingSoonMessage } = req.body || {}
  const updates = []
  const values = [locale]
  let idx = 2

  if (label !== undefined) {
    updates.push(`label = $${idx++}`)
    values.push(label)
  }
  if (enabled !== undefined) {
    updates.push(`enabled = $${idx++}`)
    values.push(enabled)
  }
  if (adminOnly !== undefined) {
    updates.push(`admin_only = $${idx++}`)
    values.push(adminOnly)
  }
  if (comingSoonMessage !== undefined) {
    updates.push(`coming_soon_message = $${idx++}`)
    values.push(comingSoonMessage)
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No fields provided to update' })
  }

  try {
    const result = await query(
      `UPDATE supported_locales
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE locale = $1
       RETURNING locale, label, enabled, admin_only, coming_soon_message, updated_at`,
      values
    )

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Locale not found' })
    }

    await logAudit(req.user.userId, 'update_locale', 'supported_locales', locale, {
      locale,
      updates: req.body,
    })

    res.json(result.rows[0])
  } catch (err) {
    console.error('PATCH /translations/locales failed', err)
    res.status(500).json({ error: 'Failed to update locale metadata' })
  }
})







router.get('/v2/keys', authenticate, requireAdmin, async (_req, res) => {
  try {
    const keys = await listTranslationKeys()
    return res.json(keys)
  } catch (err) {
    console.error('GET /translations/v2/keys failed', err)
    return res.status(500).json({ error: 'Failed to fetch translation keys' })
  }
})

router.post('/v2/translate', authenticate, requireAdmin, async (req, res) => {
  const { key, targetLanguage, sourceLanguage = DEFAULT_LANGUAGE } = req.body || {}
  if (!key || !targetLanguage) {
    return res.status(400).json({ error: 'key and targetLanguage are required' })
  }

  try {
    const keys = await listTranslationKeys()
    const meta = keys.find((k) => k.key === key)
    if (!meta) {
      return res.status(404).json({ error: 'Translation key not found' })
    }

    const sourceText = await getTranslationValue(key, sourceLanguage)
    if (!sourceText) {
      return res.status(400).json({ error: `No source text for ${key} in ${sourceLanguage}` })
    }

    const suggestion = await translateText({
      key,
      sourceText,
      sourceLanguage,
      targetLanguage,
      description: meta.description,
      domain: meta.domain,
    })

    return res.json({ key, sourceLanguage, targetLanguage, suggestion })
  } catch (err) {
    console.error('POST /translations/v2/translate failed', err)
    if (err.status === 429) {
      return res.status(429).json({ error: err.message || 'AI translate throttled', retryAfterMs: err.retryAfterMs || null })
    }
    return res.status(500).json({ error: err.message || 'Failed to translate' })
  }
})

router.get('/v2/scan', authenticate, requireAdmin, async (req, res) => {
  const sourceLanguage = (req.query.sourceLanguage || DEFAULT_LANGUAGE).toLowerCase()
  const targetLanguage = (req.query.targetLanguage || 'so').toLowerCase()

  try {
    const { rows } = await query(
      `SELECT tk.key, tk.domain, tk.description,
              src.value AS source_value,
              tgt.value AS target_value
       FROM translation_keys tk
       LEFT JOIN translations src
         ON src.translation_key_id = tk.id AND src.language = $1
       LEFT JOIN translations tgt
         ON tgt.translation_key_id = tk.id AND tgt.language = $2
       ORDER BY tk.key`,
      [sourceLanguage, targetLanguage]
    )

    const payload = rows.map((row) => ({
      key: row.key,
      domain: row.domain,
      description: row.description,
      sourceLanguage,
      targetLanguage,
      sourceValue: row.source_value || '',
      targetValue: row.target_value || '',
      status: row.target_value ? 'translated' : (row.source_value ? 'missing' : 'no-source'),
      hasSource: !!row.source_value,
      hasTarget: !!row.target_value,
    }))

    return res.json(payload)
  } catch (err) {
    console.error('GET /translations/v2/scan failed', err)
    return res.status(500).json({ error: 'Failed to scan translations' })
  }
})

router.post('/v2/ai-translate', authenticate, requireAdmin, async (req, res) => {
  const { key, targetLanguage, sourceLanguage = DEFAULT_LANGUAGE, uiContext = '' } = req.body || {}
  if (!key || !targetLanguage) {
    return res.status(400).json({ error: 'key and targetLanguage are required' })
  }

  try {
    const keys = await listTranslationKeys()
    const meta = keys.find((k) => k.key === key)
    if (!meta) {
      return res.status(404).json({ error: 'Translation key not found' })
    }

    const sourceText = await getTranslationValue(key, sourceLanguage)
    if (!sourceText) {
      return res.status(400).json({ error: `No source text for ${key} in ${sourceLanguage}` })
    }

    const suggestion = await translateText({
      key,
      sourceText,
      sourceLanguage,
      targetLanguage,
      description: meta.description,
      domain: meta.domain,
      uiContext,
    })

    return res.json({ key, sourceLanguage, targetLanguage, suggestion })
  } catch (err) {
    console.error('POST /translations/v2/ai-translate failed', err)
    if (err.status === 429) {
      return res.status(429).json({ error: err.message || 'AI translate throttled', retryAfterMs: err.retryAfterMs || null })
    }
    return res.status(500).json({ error: err.message || 'Failed to translate with AI' })
  }
})

router.post('/v2/ai-translate-text', authenticate, requireAdmin, async (req, res) => {
  const {
    text,
    targetLanguage,
    sourceLanguage = DEFAULT_LANGUAGE,
    domain = 'common',
    persona = 'shared',
    page = 'shared',
  } = req.body || {}

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'text and targetLanguage are required' })
  }

  try {
    const keyHint = `adhoc.${domain}.${(text || '').slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '.')}`
    const suggestion = await translateText({
      key: keyHint,
      sourceText: text,
      sourceLanguage,
      targetLanguage,
      description: `Ad-hoc translation for ${persona}/${page}`,
      domain,
      uiContext: `persona:${persona} page:${page}`,
    })

    return res.json({ suggestion })
  } catch (err) {
    console.error('POST /translations/v2/ai-translate-text failed', err)
    if (err.status === 429) {
      return res.status(429).json({ error: err.message || 'AI translate throttled', retryAfterMs: err.retryAfterMs || null })
    }
    return res.status(500).json({ error: err.message || 'Failed to translate text' })
  }
})

router.post('/v2/bulk-upsert', authenticate, requireAdmin, async (req, res) => {
  const { items = [] } = req.body || {}

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'items array is required' })
  }

  const client = await getClient()
  let upserted = 0

  try {
    await client.query('BEGIN')
    for (const entry of items) {
      if (!entry) continue
      const { key, domain, description = null, language, value, variant = null, source = 'manual' } = entry
      if (!key || !domain || !language || typeof value !== 'string') continue
      const lang = String(language).toLowerCase()

      const keyResult = await client.query(
        `INSERT INTO translation_keys (key, domain, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key)
         DO UPDATE SET
           domain = EXCLUDED.domain,
           description = COALESCE(EXCLUDED.description, translation_keys.description)
         RETURNING id`,
        [key, domain, description]
      )

      const translationKeyId = keyResult.rows[0].id

      await client.query(
        `INSERT INTO translations (translation_key_id, language, value, variant, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (translation_key_id, language, variant)
         DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source, updated_at = NOW()`,
        [translationKeyId, lang, value, variant, source]
      )

      upserted += 1
    }

    await client.query('COMMIT')
    return res.json({ upserted })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /translations/v2/bulk-upsert failed', err)
    return res.status(500).json({ error: 'Failed to upsert translations' })
  } finally {
    client.release()
  }
})

router.post('/v2/extract', authenticate, requireAdmin, async (req, res) => {
  const { persona = 'candidate' } = req.body || {}
  try {
    const existing = await query(
      `SELECT tk.key, tk.domain, t.value
       FROM translation_keys tk
       LEFT JOIN translations t ON t.translation_key_id = tk.id AND t.language = $1`,
      [DEFAULT_LANGUAGE]
    )
    const existingSet = new Set()
    const textToKey = new Map()
    existing.rows.forEach((row) => {
      existingSet.add(row.key)
      if (row.value) {
        if (!textToKey.has(row.value)) textToKey.set(row.value, row.key)
      }
    })

    const extractedRaw = extractStrings({ persona })
    const extracted = []
    extractedRaw.forEach((item) => {
      if (existingSet.has(item.key)) return
      const reuseKey = textToKey.get(item.text) || null
      extracted.push({ ...item, reuseKey })
      if (!textToKey.has(item.text)) {
        textToKey.set(item.text, reuseKey || item.key)
      }
    })

    const count = extracted.length
    return res.json({ persona, count, items: extracted })
  } catch (err) {
    console.error('POST /translations/v2/extract failed', err)
    return res.status(500).json({ error: 'Failed to extract strings' })
  }
})

// v2: DB-backed translations (translation_keys + translations tables)
router.post('/v2', authenticate, requireAdmin, async (req, res) => {
  const { key, domain, description = null, language, value, variant = null, source = 'manual' } = req.body || {}

  if (!key || !domain || !language || typeof value !== 'string') {
    return res.status(400).json({ error: 'key, domain, language and value are required' })
  }

  const lang = language.toLowerCase()
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const keyResult = await client.query(
      `INSERT INTO translation_keys (key, domain, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key)
       DO UPDATE SET
         domain = EXCLUDED.domain,
         description = COALESCE(EXCLUDED.description, translation_keys.description)
       RETURNING id, key, domain, description`,
      [key, domain, description]
    )

    const translationKeyId = keyResult.rows[0].id

    let saved
    if (variant) {
      saved = await client.query(
        `INSERT INTO translation_variants (translation_key_id, language, variant, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (translation_key_id, language, variant)
         DO UPDATE SET value = EXCLUDED.value
         RETURNING id, translation_key_id, language, variant, value`,
        [translationKeyId, lang, variant, value]
      )
    } else {
      saved = await client.query(
        `INSERT INTO translations (translation_key_id, language, value, source, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (translation_key_id, language)
         DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source, updated_by = EXCLUDED.updated_by, updated_at = NOW()
         RETURNING id, translation_key_id, language, value, source`,
        [translationKeyId, lang, value, source, req.user.userId]
      )
    }

    await logAudit(
      req.user.userId,
      variant ? 'upsert_translation_variant_v2' : 'upsert_translation_v2',
      variant ? 'translation_variants' : 'translations',
      saved.rows[0].id,
      {
        key,
        domain,
        language: lang,
        variant,
        source,
      }
    )

    await client.query('COMMIT')

    // Clear caches so /i18n responses reflect fresh content
    invalidateTranslationCache(lang)
    if (lang !== DEFAULT_LANGUAGE) {
      invalidateTranslationCache(DEFAULT_LANGUAGE)
    }

    return res.json({
      key,
      domain: keyResult.rows[0].domain,
      description: keyResult.rows[0].description,
      language: lang,
      value,
      variant,
      source,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /translations/v2 failed', err)
    return res.status(500).json({ error: 'Failed to upsert translation' })
  } finally {
    client.release()
  }
})

export default router
