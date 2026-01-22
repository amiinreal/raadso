import express from 'express'
import { query } from '../db.js'

const router = express.Router()

// GET /master-nationalities - Get all nationalities
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name FROM master_nationalities ORDER BY name ASC'
    )
    res.json(rows)
  } catch (err) {
    console.error('Failed to fetch nationalities:', err)
    res.status(500).json({ error: 'Failed to fetch nationalities' })
  }
})

export default router
