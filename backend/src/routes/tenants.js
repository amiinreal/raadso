import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { checkTenantPermission } from '../middleware/tenantPermissions.js'
import { logAudit } from './config.js'
import express from 'express'
import {
  validateRequest,
  isValidString,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidInteger,
  isValidPositiveInteger,
  isValidYear,
  COMPANY_SIZES,
  TENANT_STATUSES
} from '../utils/validation.js'

const router = express.Router()

// Helper function to parse permissions
const parsePermissions = (raw) => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

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
    // Modified query to get tenants where user is owner OR member
    let sql = `
      SELECT DISTINCT t.id, t.slug, t.user_id, t.company_name, t.industry, t.industry_id, 
             t.location, t.description, t.about, t.mission, t.culture, t.website, t.logo_url, 
             t.phone, t.company_email, t.org_number, t.company_size, t.founded_year, 
             t.social_links, t.youtube_videos, t.status, t.approved, t.rejection_reason, t.created_at 
      FROM tenants t
    `;
    const params = [];

    if (userId) {
      // Join with tenant_members to check membership
      sql += `
        LEFT JOIN tenant_members tm ON t.id = tm.tenant_id
        WHERE t.user_id = $1 OR (tm.user_id = $1 AND tm.status = 'active')
      `;
      params.push(userId);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT 100';
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

    const tenant = result.rows[0];

    // Fetch tenant members with user info
    const membersResult = await query(
      `SELECT 
        tm.id,
        tm.user_id,
        tm.role,
        tm.permissions,
        tm.status,
        u.email,
        u.first_name,
        u.last_name
       FROM tenant_members tm
       LEFT JOIN users u ON u.id = tm.user_id
       WHERE tm.tenant_id = $1
       ORDER BY tm.status DESC, tm.invited_at DESC`,
      [id]
    );

    tenant.members = membersResult.rows.map(member => ({
      ...member,
      permissions: parsePermissions(member.permissions)
    }));

    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// GET /tenants/:id/audit-logs - Owner-only activity feed
router.get('/:id/audit-logs', authenticate, checkTenantPermission('can_view_audit_logs'), async (req, res) => {
  try {
    const { id } = req.params
    const tenantCheck = await query('SELECT id FROM tenants WHERE id = $1', [id])
    if (!tenantCheck.rows.length) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const result = await query(
      `SELECT tal.id, tal.actor_user_id, tal.actor_role, tal.action, tal.target_type, tal.target_id, tal.metadata, tal.created_at,
              u.first_name, u.last_name, u.email
       FROM tenant_audit_logs tal
       JOIN users u ON u.id = tal.actor_user_id
       WHERE tal.tenant_id = $1
       ORDER BY tal.created_at DESC
       LIMIT 200`,
      [id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching tenant audit logs:', error)
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

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

    const baseSlug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSuffix = Math.floor(Math.random() * 10000);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const result = await query(
      `INSERT INTO tenants (
        user_id, company_name, slug, industry, industry_id, location, description, about, mission, culture,
        website, logo_url, phone, company_email, org_number, company_size, founded_year,
        social_links, youtube_videos, status, approved
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'pending', false)
       RETURNING id, slug, user_id, company_name, industry, industry_id, location, description, about, mission, culture,
                 website, logo_url, phone, company_email, org_number, company_size, founded_year,
                 social_links, youtube_videos, status, approved, rejection_reason, created_at`,
      [
        userId, company_name, slug, industry, industry_id, location, description, about, mission, culture,
        website, logo_url, phone, company_email, org_number, company_size, founded_year,
        social_links || {}, youtube_videos || []
      ]
    );

    // Add owner as active member in tenant_members
    const tenantId = result.rows[0].id;
    await query(
      `INSERT INTO tenant_members (tenant_id, user_id, role, status, accepted_at)
       VALUES ($1, $2, 'owner', 'active', NOW())
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner', status = 'active', accepted_at = NOW()`,
      [tenantId, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// PUT /tenants/:id - Update tenant (permission-gated)
router.put('/:id', authenticate, checkTenantPermission('can_edit_tenant'), tenantUpdateValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_name, industry, industry_id, location, description, about, mission, culture,
      website, logo_url, phone, company_email, org_number, company_size, founded_year,
      social_links, youtube_videos
    } = req.body;

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

    // If approved, ensure the user is added as owner in tenant_members
    if (status === 'approved') {
      const tenant = result.rows[0];
      await query(
        `INSERT INTO tenant_members (tenant_id, user_id, role, status, accepted_at)
         VALUES ($1, $2, 'owner', 'active', NOW())
         ON CONFLICT (tenant_id, user_id) 
         DO UPDATE SET role = 'owner', status = 'active', accepted_at = COALESCE(tenant_members.accepted_at, NOW())`,
        [tenant.id, tenant.user_id]
      );
    }
    await logAudit(req.user.userId, `tenant_${status}`, 'tenant', id, { rejectionReason })

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tenant status:', error);
    res.status(500).json({ error: 'Failed to update tenant status' });
  }
});

// GET /tenants/:tenantId/audit-logs - Get audit logs for a tenant
router.get('/:tenantId/audit-logs', authenticate, checkTenantPermission('can_view_audit_logs'), async (req, res) => {
  try {
    const { tenantId } = req.params
    const { offset = 0, limit = 50, action, startDate, endDate } = req.query

    // Check if user has access to this tenant
    const tenantAccess = await query(
      `SELECT t.id FROM tenants t
       LEFT JOIN tenant_members tm ON tm.tenant_id = t.id AND tm.user_id = $1 AND tm.status = 'active'
       WHERE t.id = $2 AND (t.user_id = $1 OR tm.user_id IS NOT NULL)
       LIMIT 1`,
      [req.user.userId, tenantId]
    )

    if (tenantAccess.rows.length === 0) {
      return res.status(403).json({ error: 'No access to this tenant' })
    }

    // Build query for audit logs
    let whereClause = `al.target_id IN (
      SELECT j.id FROM jobs j WHERE j.tenant_id = $1
    ) OR al.details->>'tenantId' = $1`

    let queryParams = [tenantId]
    let paramIndex = 2

    if (action) {
      whereClause += ` AND al.action = $${paramIndex}`
      queryParams.push(action)
      paramIndex++
    }

    if (startDate) {
      whereClause += ` AND al.created_at >= $${paramIndex}`
      queryParams.push(startDate)
      paramIndex++
    }

    if (endDate) {
      whereClause += ` AND al.created_at <= $${paramIndex}`
      queryParams.push(endDate)
      paramIndex++
    }

    const countResult = await query(
      `SELECT COUNT(*) as count FROM audit_logs al WHERE ${whereClause}`,
      queryParams
    )

    const logsResult = await query(
      `SELECT 
        al.id,
        al.admin_id,
        u.email as admin_email,
        al.action,
        al.target_type,
        al.target_id,
        al.details,
        al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.admin_id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    )

    res.json({
      total: parseInt(countResult.rows[0].count),
      offset: parseInt(offset),
      limit: parseInt(limit),
      logs: logsResult.rows
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

export default router;
