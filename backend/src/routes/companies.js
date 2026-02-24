import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { checkTenantPermission } from '../middleware/tenantPermissions.js'

const router = Router()

// GET /companies - Public endpoint to search and list companies
router.get('/', async (req, res) => {
  try {
    const { search, industry, location, limit = 50 } = req.query

    let sql = `
      SELECT 
        t.id, 
        t.slug,
        t.company_name, 
        t.industry, 
        t.location, 
        t.description,
        t.about,
        t.website, 
        t.logo_url,
        t.company_size,
        t.founded_year,
        t.social_links,
        t.created_at,
        i.name as industry_name,
        i.slug as industry_slug,
        i.category as industry_category,
        COUNT(DISTINCT j.id) as job_count,
        COUNT(DISTINCT cf.user_id) as follower_count
      FROM tenants t
      LEFT JOIN industries i ON i.id = t.industry_id
      LEFT JOIN jobs j ON j.tenant_id = t.id AND j.active = true
      LEFT JOIN company_followers cf ON cf.company_id = t.id
      WHERE t.approved = true
    `
    
    const params = []
    let paramIdx = 1

    if (search) {
      const likeParam = `%${search}%`
      const normalized = search.toLowerCase().replace(/[^a-z0-9]/g, '')
      const likeNormalized = `%${normalized}%`
      sql += ` AND (
        t.company_name ILIKE $${paramIdx}
        OR t.description ILIKE $${paramIdx}
        OR t.about ILIKE $${paramIdx}
        OR regexp_replace(lower(t.company_name), '[^a-z0-9]', '', 'g') LIKE $${paramIdx + 1}
      )`
      params.push(likeParam)
      params.push(likeNormalized)
      paramIdx += 2
    }

    if (industry) {
      sql += ` AND (i.slug = $${paramIdx} OR i.name ILIKE $${paramIdx + 1} OR t.industry ILIKE $${paramIdx + 1})`
      params.push(industry)
      params.push(`%${industry}%`)
      paramIdx += 2
    }

    if (location) {
      sql += ` AND t.location ILIKE $${paramIdx}`
      params.push(`%${location}%`)
      paramIdx++
    }

    sql += ` GROUP BY t.id, i.id, i.name, i.slug, i.category ORDER BY follower_count DESC, job_count DESC LIMIT $${paramIdx}`
    params.push(parseInt(limit))

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching companies:', error)
    res.status(500).json({ error: 'Failed to fetch companies' })
  }
})

// GET /companies/:slug - Get detailed company profile (public)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params

    const companyResult = await query(
      `SELECT 
        t.*,
        i.name as industry_name,
        i.slug as industry_slug,
        i.category as industry_category,
        COUNT(DISTINCT j.id) as job_count,
        COUNT(DISTINCT cf.user_id) as follower_count
      FROM tenants t
      LEFT JOIN industries i ON i.id = t.industry_id
      LEFT JOIN jobs j ON j.tenant_id = t.id AND j.active = true
      LEFT JOIN company_followers cf ON cf.company_id = t.id
      WHERE t.slug = $1 AND t.approved = true
      GROUP BY t.id, i.id, i.name, i.slug, i.category`,
      [slug]
    )

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const company = companyResult.rows[0]

    // Get active jobs for this company
    const jobsResult = await query(
      `SELECT id, title, location, employment_type, workplace_type, salary_min, salary_max, currency, created_at
       FROM jobs 
       WHERE tenant_id = $1 AND active = true 
       ORDER BY created_at DESC`,
      [company.id]
    )

    res.json({
      ...company,
      jobs: jobsResult.rows
    })
  } catch (error) {
    console.error('Error fetching company:', error)
    res.status(500).json({ error: 'Failed to fetch company' })
  }
})

// PUT /companies/:slug - Update company profile (requires authentication and ownership)
router.put('/:slug', authenticate, checkTenantPermission('can_update_company_profile'), async (req, res) => {
  try {
    const { slug } = req.params
    const { 
      company_name, industry, industry_id, location, description, about, mission, culture,
      website, logo_url, phone, company_email, company_size, founded_year,
      social_links, youtube_videos
    } = req.body

    // Check ownership
    const tenantCheck = await query('SELECT id, user_id FROM tenants WHERE slug = $1', [slug])
    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const companyId = tenantCheck.rows[0].id
    
    // Generate new slug if company name changed
    let newSlug = slug
    if (company_name) {
      // Generate clean slug from company name
      const baseSlug = company_name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .replace(/-+/g, '-')            // Replace multiple hyphens with single
        .replace(/^-|-$/g, '')          // Remove leading/trailing hyphens
      
      // Check if slug is unique, append number if needed
      let candidate = baseSlug
      let counter = 1
      while (true) {
        const existing = await query('SELECT id FROM tenants WHERE slug = $1 AND id != $2', [candidate, companyId])
        if (existing.rows.length === 0) {
          newSlug = candidate
          break
        }
        counter++
        candidate = `${baseSlug}-${counter}`
      }
    }

    // Convert empty strings to null for integer fields
    const cleanedFoundedYear = founded_year === '' ? null : founded_year
    const cleanedCompanySize = company_size === '' ? null : company_size

    const result = await query(
      `UPDATE tenants
       SET company_name = COALESCE($2, company_name),
         slug = COALESCE($3, slug),
         industry = COALESCE($4, industry),
         industry_id = COALESCE($5, industry_id),
         location = COALESCE($6, location),
         description = COALESCE($7, description),
         about = COALESCE($8, about),
         mission = COALESCE($9, mission),
         culture = COALESCE($10, culture),
         website = COALESCE($11, website),
         logo_url = COALESCE($12, logo_url),
         phone = COALESCE($13, phone),
         company_email = COALESCE($14, company_email),
         company_size = COALESCE($15, company_size),
         founded_year = COALESCE($16, founded_year),
         social_links = COALESCE($17, social_links),
         youtube_videos = COALESCE($18, youtube_videos)
       WHERE id = $1
       RETURNING *`,
      [companyId, company_name, newSlug, industry, industry_id, location, description, about, mission, culture, website, logo_url, 
       phone, company_email, cleanedCompanySize, cleanedFoundedYear, social_links, youtube_videos]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating company:', error)
    res.status(500).json({ error: 'Failed to update company' })
  }
})

// POST /companies/:slug/follow - Follow a company (requires authentication)
router.post('/:slug/follow', authenticate, async (req, res) => {
  try {
    const { slug } = req.params
    const userId = req.user.userId

    // Check if company exists
    const companyCheck = await query('SELECT id FROM tenants WHERE slug = $1 AND approved = true', [slug])
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const companyId = companyCheck.rows[0].id

    // Insert or ignore if already following
    await query(
      `INSERT INTO company_followers (company_id, user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (company_id, user_id) DO NOTHING`,
      [companyId, userId]
    )

    res.json({ message: 'Successfully followed company' })
  } catch (error) {
    console.error('Error following company:', error)
    res.status(500).json({ error: 'Failed to follow company' })
  }
})

// DELETE /companies/:slug/follow - Unfollow a company (requires authentication)
router.delete('/:slug/follow', authenticate, async (req, res) => {
  try {
    const { slug } = req.params
    const userId = req.user.userId

    // Get company ID from slug
    const companyCheck = await query('SELECT id FROM tenants WHERE slug = $1', [slug])
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const companyId = companyCheck.rows[0].id

    await query(
      'DELETE FROM company_followers WHERE company_id = $1 AND user_id = $2',
      [companyId, userId]
    )

    res.json({ message: 'Successfully unfollowed company' })
  } catch (error) {
    console.error('Error unfollowing company:', error)
    res.status(500).json({ error: 'Failed to unfollow company' })
  }
})

// GET /companies/:slug/is-following - Check if user is following a company
router.get('/:slug/is-following', authenticate, async (req, res) => {
  try {
    const { slug } = req.params
    const userId = req.user.userId

    // Get company ID from slug
    const companyCheck = await query('SELECT id FROM tenants WHERE slug = $1', [slug])
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const companyId = companyCheck.rows[0].id

    const result = await query(
      'SELECT id FROM company_followers WHERE company_id = $1 AND user_id = $2',
      [companyId, userId]
    )

    res.json({ isFollowing: result.rows.length > 0 })
  } catch (error) {
    console.error('Error checking follow status:', error)
    res.status(500).json({ error: 'Failed to check follow status' })
  }
})

export default router
