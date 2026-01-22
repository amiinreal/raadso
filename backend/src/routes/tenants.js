import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import express from 'express'
import {
  validateRequest,
  isValidString,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidInteger,
  isValidYear,
  COMPANY_SIZES,
  TENANT_STATUSES
} from '../utils/validation.js'

const router = express.Router()

// Validation schemas
const tenantValidation = validateRequest({
  company_name: { required: true, type: 'string', min: 2, max: 200 },
  industry: { type: 'string', min: 0, max: 200 },
  industry_id: { validator: (v) => !v || isValidPositiveInteger(v), message: 'industry_id must be a positive integer' },
  location: { type: 'string', min: 0, max: 200 },
  description: { type: 'string', min: 0, max: 1000 },
  about: { type: 'string', min: 0, max: 5000 },
  mission: { type: 'string', min: 0, max: 2000 },
  culture: { type: 'string', min: 0, max: 2000 },
  website: { type: 'url' },
  phone: { required: true, type: 'phone' },
  company_email: { required: true, type: 'email' },
  org_number: { required: true, type: 'string', min: 5, max: 50 },
  company_size: { validator: (v) => !v || COMPANY_SIZES.includes(v), message: 'Invalid company size' },
  founded_year: { type: 'year' }
})

const tenantUpdateValidation = validateRequest({
  company_name: { type: 'string', min: 2, max: 200 },
  industry: { type: 'string', min: 0, max: 200 },
  industry_id: { validator: (v) => !v || isValidPositiveInteger(v), message: 'industry_id must be a positive integer' },
  location: { type: 'string', min: 0, max: 200 },
  description: { type: 'string', min: 0, max: 1000 },
  about: { type: 'string', min: 0, max: 5000 },
  mission: { type: 'string', min: 0, max: 2000 },
  culture: { type: 'string', min: 0, max: 2000 },
  website: { type: 'url' },
  phone: { type: 'phone' },
  company_email: { type: 'email' },
  org_number: { type: 'string', min: 5, max: 50 },
  company_size: { validator: (v) => !v || COMPANY_SIZES.includes(v), message: 'Invalid company size' },
  founded_year: { type: 'year' }
})

const statusUpdateValidation = validateRequest({
  status: { required: true, type: 'enum', values: TENANT_STATUSES },
  rejectionReason: { type: 'string', min: 0, max: 500 }
})

// GET /tenants - List all tenants (filter by user_id if query param provided)
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    let sql = 'SELECT id, slug, user_id, company_name, industry, industry_id, location, description, about, mission, culture, website, logo_url, phone, company_email, org_number, company_size, founded_year, social_links, youtube_videos, status, approved, rejection_reason, created_at FROM tenants';
    const params = [];

    if (userId) {
      sql += ' WHERE user_id = $1';
      params.push(userId);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// GET /tenants/:id - Get specific tenant
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, slug, user_id, company_name, industry, industry_id, location, description, about, mission, culture, website, logo_url, phone, company_email, org_number, company_size, founded_year, social_links, youtube_videos, status, approved, rejection_reason, created_at FROM tenants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// POST /tenants - Create new tenant (requires authentication)
router.post('/', authenticate, tenantValidation, async (req, res) => {
  try {
    const { 
      company_name, industry, industry_id, location, description, about, mission, culture,
      website, logo_url, phone, company_email, org_number, company_size, founded_year,
      social_links, youtube_videos
    } = req.body;
    const userId = req.user.userId;

    if (!company_name || !phone || !company_email || !org_number) {
      return res.status(400).json({ error: 'company_name, phone, company_email, and org_number are required' });
    }

    const result = await query(
      `INSERT INTO tenants (
        user_id, company_name, industry, industry_id, location, description, about, mission, culture,
        website, logo_url, phone, company_email, org_number, company_size, founded_year,
        social_links, youtube_videos, status, approved
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending', false)
       RETURNING id, slug, user_id, company_name, industry, industry_id, location, description, about, mission, culture,
                 website, logo_url, phone, company_email, org_number, company_size, founded_year,
                 social_links, youtube_videos, status, approved, rejection_reason, created_at`,
      [
        userId, company_name, industry, industry_id, location, description, about, mission, culture,
        website, logo_url, phone, company_email, org_number, company_size, founded_year,
        social_links || {}, youtube_videos || []
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// PUT /tenants/:id - Update tenant (requires authentication and ownership)
router.put('/:id', authenticate, tenantUpdateValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      company_name, industry, industry_id, location, description, about, mission, culture,
      website, logo_url, phone, company_email, org_number, company_size, founded_year,
      social_links, youtube_videos
    } = req.body;
    const userId = req.user.userId;

    // Check ownership
    const tenantCheck = await query('SELECT user_id FROM tenants WHERE id = $1', [id]);
    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenantCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this tenant' });
    }

    const result = await query(
        `UPDATE tenants
         SET company_name = COALESCE($2, company_name),
             industry = COALESCE($3, industry),
             industry_id = COALESCE($4, industry_id),
             location = COALESCE($5, location),
             description = COALESCE($6, description),
             about = COALESCE($7, about),
             mission = COALESCE($8, mission),
             culture = COALESCE($9, culture),
             website = COALESCE($10, website),
             logo_url = COALESCE($11, logo_url),
             phone = COALESCE($12, phone),
             company_email = COALESCE($13, company_email),
             org_number = COALESCE($14, org_number),
             company_size = COALESCE($15, company_size),
             founded_year = COALESCE($16, founded_year),
             social_links = COALESCE($17, social_links),
             youtube_videos = COALESCE($18, youtube_videos)
         WHERE id = $1
       RETURNING id, slug, user_id, company_name, industry, industry_id, location, description, about, mission, culture,
                 website, logo_url, phone, company_email, org_number, company_size, founded_year,
                 social_links, youtube_videos, status, approved, rejection_reason, created_at`,
      [
        id, company_name, industry, industry_id, location, description, about, mission, culture,
        website, logo_url, phone, company_email, org_number, company_size, founded_year,
        social_links, youtube_videos
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// POST /tenants/:id/status - Admin-only status update (approved/rejected)
router.post('/:id/status', authenticate, statusUpdateValidation, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' })
  }

  const { status, rejectionReason } = req.body

  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE tenants 
       SET status = $2, 
           approved = ($2 = 'approved'),
           rejection_reason = CASE WHEN $2 = 'rejected' THEN $3 ELSE NULL END
       WHERE id = $1
       RETURNING id, slug, user_id, company_name, industry, industry_id, location, description, about, mission, culture,
                 website, logo_url, phone, company_email, org_number, company_size, founded_year,
                 social_links, youtube_videos, status, approved, rejection_reason, created_at`,
      [id, status, rejectionReason || null]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tenant status:', error);
    res.status(500).json({ error: 'Failed to update tenant status' });
  }
});

export default router;
