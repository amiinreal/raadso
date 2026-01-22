import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// GET /industries - Get all industries
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, slug, category FROM industries ORDER BY category, name',
      []
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching industries:', error)
    res.status(500).json({ error: 'Failed to fetch industries' })
  }
})

export default router
