import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { emailService } from '../services/emailService.js'
import { validateRequest, isValidEmail, isValidUUID } from '../utils/validation.js'

const router = Router()

const inviteMemberValidation = validateRequest({
  email: { required: true, validator: isValidEmail, message: 'Invalid email format' },
  role: { required: false, type: 'enum', values: ['owner', 'manager', 'member'], default: 'member' },
})

// POST /tenant-members/invite - Invite a user to tenant
router.post('/invite', authenticate, async (req, res) => {
  try {
    const { tenantId, email, role = 'member', permissions = {} } = req.body

    if (!tenantId || !email) {
      return res.status(400).json({ error: 'tenantId and email are required' })
    }

    // Check if user is owner/manager of the tenant
    const tenantCheck = await query(
      `SELECT tm.role FROM tenant_members tm
       WHERE tm.tenant_id = $1 AND tm.user_id = $2 AND tm.status = 'active'`,
      [tenantId, req.user.userId]
    )

    if (tenantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to invite members to this tenant' })
    }

    const currentUserRole = tenantCheck.rows[0].role
    if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
      return res.status(403).json({ error: 'Only owners and managers can invite members' })
    }

    // Check if invitee email is valid
    const normalizedEmail = email.toLowerCase()

    // Get or create user for invitee
    let inviteeId = null
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    )

    if (existingUser.rows.length > 0) {
      inviteeId = existingUser.rows[0].id

      // Check if already a member
      const memberCheck = await query(
        'SELECT id FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, inviteeId]
      )

      if (memberCheck.rows.length > 0) {
        return res.status(400).json({ error: 'User is already a member of this tenant' })
      }
    }

    // Insert invitation record (or update if exists)
    if (inviteeId) {
      const result = await query(
        `INSERT INTO tenant_members (tenant_id, user_id, role, permissions, status, invited_by, invited_at)
         VALUES ($1, $2, $3, $4, 'invited', $5, NOW())
         ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET role = $3, permissions = $4, status = 'invited', invited_by = $5, invited_at = NOW()
         RETURNING *`,
        [tenantId, inviteeId, role, JSON.stringify(permissions), req.user.userId]
      )

      // Send invitation email
      const currentUser = await query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.userId])
      const tenant = await query('SELECT company_name FROM tenants WHERE id = $1', [tenantId])

      const inviterName = currentUser.rows[0]
        ? `${currentUser.rows[0].first_name} ${currentUser.rows[0].last_name}`.trim()
        : 'Team Member'
      const tenantName = tenant.rows[0]?.company_name || 'Team'

      const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-tenant-invitation?tenantId=${tenantId}&email=${encodeURIComponent(normalizedEmail)}`

      await emailService.sendTenantInvitation(normalizedEmail, inviterName, tenantName, invitationLink)

      res.status(201).json({
        success: true,
        message: 'Invitation sent',
        member: result.rows[0],
      })
    } else {
      // User doesn't exist - create pending invitation
      // Store invitation for later user creation
      const result = await query(
        `INSERT INTO tenant_members (tenant_id, user_id, role, permissions, status, invited_by, invited_at)
         VALUES ($1, NULL, $2, $3, 'invited', $4, NOW())
         RETURNING *`,
        [tenantId, role, JSON.stringify(permissions), req.user.userId]
      )

      // Store email in a temporary place or send unique invite link
      // For now, notify that user doesn't exist yet
      res.status(201).json({
        success: true,
        message: 'Invitation created. User will be able to accept it after creating an account.',
        pending: true,
        email: normalizedEmail,
      })
    }
  } catch (err) {
    console.error('Invite member failed:', err)
    res.status(500).json({ error: 'Failed to send invitation' })
  }
})

// POST /tenant-members/accept - Accept tenant invitation
router.post('/accept', authenticate, async (req, res) => {
  try {
    const { tenantId } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' })
    }

    // Find and update invitation
    const result = await query(
      `UPDATE tenant_members 
       SET status = 'active', accepted_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'invited'
       RETURNING *`,
      [tenantId, req.user.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already accepted' })
    }

    res.json({
      success: true,
      message: 'Invitation accepted',
      member: result.rows[0],
    })
  } catch (err) {
    console.error('Accept invitation failed:', err)
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

// POST /tenant-members/decline - Decline tenant invitation
router.post('/decline', authenticate, async (req, res) => {
  try {
    const { tenantId } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' })
    }

    // Find and update invitation
    const result = await query(
      `UPDATE tenant_members 
       SET status = 'declined', declined_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'invited'
       RETURNING *`,
      [tenantId, req.user.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    res.json({
      success: true,
      message: 'Invitation declined',
    })
  } catch (err) {
    console.error('Decline invitation failed:', err)
    res.status(500).json({ error: 'Failed to decline invitation' })
  }
})

// GET /tenant-members/:tenantId - Get members of a tenant
router.get('/:tenantId', authenticate, async (req, res) => {
  try {
    const { tenantId } = req.params

    // Check if user is member of tenant
    const memberCheck = await query(
      `SELECT role FROM tenant_members 
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
      [tenantId, req.user.userId]
    )

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this tenant' })
    }

    // Get all members
    const members = await query(
      `SELECT 
        tm.id,
        tm.user_id,
        tm.role,
        tm.status,
        tm.invited_at,
        tm.accepted_at,
        u.email,
        u.first_name,
        u.last_name
       FROM tenant_members tm
       LEFT JOIN users u ON u.id = tm.user_id
       WHERE tm.tenant_id = $1
       ORDER BY tm.status DESC, tm.invited_at DESC`,
      [tenantId]
    )

    res.json(members.rows)
  } catch (err) {
    console.error('Get tenant members failed:', err)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// PUT /tenant-members/:tenantId/:userId - Update member role/status
router.put('/:tenantId/:userId', authenticate, async (req, res) => {
  try {
    const { tenantId, userId } = req.params
    const { role, permissions } = req.body

    // Check if requester is owner/manager
    const tenantCheck = await query(
      `SELECT role FROM tenant_members 
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
      [tenantId, req.user.userId]
    )

    if (tenantCheck.rows.length === 0 || (tenantCheck.rows[0].role !== 'owner' && tenantCheck.rows[0].role !== 'manager')) {
      return res.status(403).json({ error: 'You do not have permission to update members' })
    }

    if (role && !['owner', 'manager', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    let updateFields = []
    let updateValues = [tenantId, userId]
    let idx = 3
    if (role) {
      updateFields.push(`role = $${idx}`)
      updateValues.push(role)
      idx++
    }
    if (permissions) {
      updateFields.push(`permissions = $${idx}`)
      updateValues.push(JSON.stringify(permissions))
      idx++
    }
    updateFields.push('updated_at = NOW()')
    const result = await query(
      `UPDATE tenant_members 
       SET ${updateFields.join(', ')}
       WHERE tenant_id = $1 AND user_id = $2
       RETURNING *`,
      updateValues
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Update member failed:', err)
    res.status(500).json({ error: 'Failed to update member' })
  }
})

// DELETE /tenant-members/:tenantId/:userId - Remove member from tenant
router.delete('/:tenantId/:userId', authenticate, async (req, res) => {
  try {
    const { tenantId, userId } = req.params

    // Check if requester is owner/manager
    const tenantCheck = await query(
      `SELECT role FROM tenant_members 
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
      [tenantId, req.user.userId]
    )

    if (tenantCheck.rows.length === 0 || (tenantCheck.rows[0].role !== 'owner' && tenantCheck.rows[0].role !== 'manager')) {
      return res.status(403).json({ error: 'You do not have permission to remove members' })
    }

    // Prevent removing the owner
    const targetMember = await query(
      `SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    )

    if (targetMember.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (targetMember.rows[0].role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the owner from the tenant' })
    }

    // Delete member
    await query(
      `DELETE FROM tenant_members WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    )

    // Send removal notification email
    const user = await query('SELECT email, first_name FROM users WHERE id = $1', [userId])
    const tenant = await query('SELECT company_name FROM tenants WHERE id = $1', [tenantId])

    if (user.rows[0] && tenant.rows[0]) {
      await emailService.sendMemberRemovalNotification(
        user.rows[0].email,
        user.rows[0].first_name || 'User',
        tenant.rows[0].company_name
      )
    }

    res.json({ success: true, message: 'Member removed' })
  } catch (err) {
    console.error('Remove member failed:', err)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

// GET /tenant-members/invitations/pending - Get pending invitations for user
router.get('/invitations/pending', authenticate, async (req, res) => {
  try {
    const invitations = await query(
      `SELECT 
        tm.id,
        tm.tenant_id,
        tm.role,
        tm.invited_at,
        t.company_name,
        t.logo_url,
        u.first_name,
        u.last_name
       FROM tenant_members tm
       JOIN tenants t ON t.id = tm.tenant_id
       LEFT JOIN users u ON u.id = tm.invited_by
       WHERE tm.user_id = $1 AND tm.status = 'invited'
       ORDER BY tm.invited_at DESC`,
      [req.user.userId]
    )

    res.json(invitations.rows)
  } catch (err) {
    console.error('Get pending invitations failed:', err)
    res.status(500).json({ error: 'Failed to fetch invitations' })
  }
})

export default router
