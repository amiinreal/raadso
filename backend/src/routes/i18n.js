import express from 'express'
import { getTranslationMap, DEFAULT_LANGUAGE } from '../services/translationService.js'
import { query } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  const lang = (req.query.lang || DEFAULT_LANGUAGE).toLowerCase()
  try {
    const map = await getTranslationMap(lang)
    return res.json({ language: lang, translations: map })
  } catch (error) {
    console.error('Failed to load translations', error)
    return res.status(500).json({ error: 'Failed to load translations' })
  }
})

// Get translations for a specific page
router.get('/page/:pageName', async (req, res) => {
  const { pageName } = req.params
  const lang = (req.query.lang || DEFAULT_LANGUAGE).toLowerCase()
  
  try {
    const { rows } = await query(
      `SELECT translation_key, translation_value FROM page_translations 
       WHERE page_name = $1 AND language_code = $2
       ORDER BY translation_key`,
      [pageName, lang]
    )
    
    const translations = {}
    rows.forEach(row => {
      translations[row.translation_key] = row.translation_value
    })
    
    return res.json({ 
      page: pageName,
      language: lang, 
      translations 
    })
  } catch (error) {
    console.error('Failed to load page translations', error)
    return res.status(500).json({ error: 'Failed to load page translations' })
  }
})

export default router
