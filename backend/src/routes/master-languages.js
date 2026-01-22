import express from 'express'
import { query } from '../db.js'

const router = express.Router()

// GET /master-languages - Get all languages
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, iso_639_1, iso_639_3 FROM master_languages ORDER BY name ASC'
    )
    res.json(rows)
  } catch (err) {
    console.error('Failed to fetch languages:', err)
    res.status(500).json({ error: 'Failed to fetch languages' })
  }
})

export default router
