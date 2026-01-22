import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// Get all job categories
router.get('/', async (req, res) => {
  try {
    const { search, parent } = req.query
    let sql = 'SELECT id, name, slug, parent_id FROM job_categories'
    const params = []
    const where = []

    if (search) {
      where.push(`name ILIKE $${params.length + 1}`)
      params.push(`%${search}%`)
    }

    if (parent === 'only') {
      where.push('parent_id IS NULL')
    } else if (parent === 'children') {
      where.push('parent_id IS NOT NULL')
    }

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`
    }

    sql += ' ORDER BY name ASC'

    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('GET /job-categories failed', err)
    res.status(500).json({ error: 'Failed to fetch job categories' })
  }
})

// Create new job category
router.post('/', async (req, res) => {
  try {
    const { name, parentId } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    
    const { rows } = await query(
      `INSERT INTO job_categories (id, name, slug, parent_id, created_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
       RETURNING id, name, slug, parent_id`,
      [name.trim(), slug, parentId || null]
    )
    
    res.json(rows[0])
  } catch (err) {
    console.error('POST /job-categories failed', err)
    res.status(500).json({ error: 'Failed to create job category' })
  }
})

export default router
