// Example: Add a middleware or function to check can_post_job before allowing job post (pseudo, adapt to your job posting route)
// Usage: Place this middleware before job creation handler in jobs.js or similar
export async function checkCanPostJob(req, res, next) {
  const { tenantId } = req.body
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })
  // Check if user is owner
  const ownerCheck = await query('SELECT user_id FROM tenants WHERE id = $1', [tenantId])
  const isOwner = ownerCheck.rows.length && ownerCheck.rows[0].user_id === req.user.userId
  if (isOwner) return next()
  // Check member role/permissions
  const memberCheck = await query('SELECT role, permissions FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = $3', [tenantId, req.user.userId, 'active'])
  if (!memberCheck.rows.length) return res.status(403).json({ error: 'Not a member of this tenant' })
  const { role, permissions } = memberCheck.rows[0]
  let parsedPerms = {}
  try { parsedPerms = permissions ? JSON.parse(permissions) : {} } catch { parsedPerms = {} }
  if (role === 'manager' || parsedPerms.can_post_job) return next()
  return res.status(403).json({ error: 'You do not have permission to post jobs for this tenant' })
}
import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { emailService } from '../services/emailService.js'
import { validateRequest, isValidEmail, isValidUUID } from '../utils/validation.js'

const router = Router()

const parsePermissions = (raw) => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

const inviteMemberValidation = validateRequest({
  email: { required: true, validator: isValidEmail, message: 'Invalid email format' },
  role: { required: false, type: 'enum', values: ['owner', 'manager', 'member'], default: 'member' },
})

// POST /tenant-members/invite - Invite a user to tenant
router.post('/invite', authenticate, async (req, res) => {
  try {
    const {
      tenantId,
      email,
      role: requestedRole = 'member',
      permissions = {}
    } = req.body
    const allowedRoles = new Set(['owner', 'manager', 'member'])
    const targetRole = allowedRoles.has(requestedRole) ? requestedRole : 'member'

    if (!tenantId || !email) {
      return res.status(400).json({ error: 'tenantId and email are required' })
    }

    // Set default permissions based on role
    let finalPermissions = permissions
    if (targetRole === 'manager') {
      // Managers get default permissions
      finalPermissions = {
        can_post_job: true,
        can_update_job: true,
        can_assign_application: true,
        ...permissions
      }
    } else if (targetRole === 'member') {
      // Members get no default permissions, only what's explicitly set
      finalPermissions = permissions
    }

    // Check if user is owner or has invite permission
    // First, check if user is the owner in tenants table
    const ownerCheck = await query('SELECT user_id FROM tenants WHERE id = $1', [tenantId])
    const isOwner = ownerCheck.rows.length && ownerCheck.rows[0].user_id === req.user.userId
    let requesterRole = isOwner ? 'owner' : null

    let hasInvitePermission = false
    if (isOwner) {
      hasInvitePermission = true
    } else {
      // Check member role and permissions
      const tenantCheck = await query(
        `SELECT tm.role, tm.permissions FROM tenant_members tm
         WHERE tm.tenant_id = $1 AND tm.user_id = $2 AND tm.status = 'active'`,
        [tenantId, req.user.userId]
      )
      if (tenantCheck.rows.length) {
        const { role: memberRole, permissions } = tenantCheck.rows[0]
        requesterRole = memberRole
        const parsedPerms = parsePermissions(permissions)
        if (
          memberRole === 'owner' ||
          parsedPerms.can_manage_team ||
          parsedPerms.can_invite_members ||
          parsedPerms.can_invite // legacy flag support
        ) {
          hasInvitePermission = true
        }
      }
    }
    if (!hasInvitePermission) {
      return res.status(403).json({ error: 'You do not have permission to invite members to this tenant' })
    }

    if (!isOwner) {
      if (targetRole === 'owner') {
        return res.status(403).json({ error: 'Only tenant owners can invite another owner' })
      }
      if (requesterRole === 'member' && targetRole === 'manager') {
        return res.status(403).json({ error: 'Members cannot invite users as managers' })
      }
    }

    // Check if invitee email is valid
    const normalizedEmail = email.toLowerCase()

    // Get or create user for invitee
    let inviteeId = null
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    )

    const currentUser = await query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.userId])
    const tenant = await query('SELECT company_name FROM tenants WHERE id = $1', [tenantId])
    const inviterName = currentUser.rows[0]
      ? `${currentUser.rows[0].first_name} ${currentUser.rows[0].last_name}`.trim()
      : 'Team Member'
    const tenantName = tenant.rows[0]?.company_name || 'Team'
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-tenant-invitation?tenantId=${tenantId}&email=${encodeURIComponent(normalizedEmail)}`

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
      // Insert invitation record (or update if exists)
      const result = await query(
        `INSERT INTO tenant_members (tenant_id, user_id, role, permissions, status, invited_by, invited_at)
         VALUES ($1, $2, $3, $4, 'invited', $5, NOW())
         ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET role = $3, permissions = $4, status = 'invited', invited_by = $5, invited_at = NOW()
         RETURNING *`,
        [tenantId, inviteeId, targetRole, JSON.stringify(finalPermissions), req.user.userId]
      )
      await emailService.sendTenantInvitation(normalizedEmail, inviterName, tenantName, invitationLink)
      res.status(201).json({
        success: true,
        message: 'Invitation sent',
        member: result.rows[0],
      })
    } else {
      // User doesn't exist - create pending invitation with OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const result = await query(
        `INSERT INTO tenant_members (tenant_id, user_id, role, permissions, status, invited_by, invited_at, invited_email, invited_otp, invited_otp_expires)
         VALUES ($1, NULL, $2, $3, 'invited', $4, NOW(), $5, $6, NOW() + INTERVAL '10 minutes')
         RETURNING *`,
        [tenantId, targetRole, JSON.stringify(finalPermissions), req.user.userId, normalizedEmail, otp]
      )
      await emailService.sendTenantInvitation(normalizedEmail, inviterName, tenantName, invitationLink)
      // Also send OTP email
      await emailService.sendTwoFACode(normalizedEmail, otp, inviterName)
      res.status(201).json({
        success: true,
        message: 'Invitation created. User will be able to accept it after creating an account.',
        pending: true,
        email: normalizedEmail,
      })
    }
    // POST /tenant-members/onboard-invitee - Onboard invited user (set name, password, verify OTP)
    router.post('/onboard-invitee', async (req, res) => {
      try {
        const { tenantId, email, firstName, lastName, password, otp } = req.body
        if (!tenantId || !email || !firstName || !lastName || !password || !otp) {
          return res.status(400).json({ error: 'All fields are required' })
        }
        // Find invitation
        const invite = await query(
          `SELECT * FROM tenant_members WHERE tenant_id = $1 AND invited_email = $2 AND status = 'invited'`,
          [tenantId, email.toLowerCase()]
        )
        if (invite.rows.length === 0) {
          return res.status(404).json({ error: 'Invitation not found' })
        }
        const row = invite.rows[0]
        // Normalize OTPs for comparison (string, trim, leading zeros)
        const submittedOtp = (otp || '').toString().trim()
        const storedOtp = (row.invited_otp || '').toString().trim()
        const now = new Date()
        const expires = new Date(row.invited_otp_expires)
        if (!storedOtp || submittedOtp !== storedOtp || expires < now) {
          console.error('OTP validation failed', {
            submittedOtp,
            storedOtp,
            expires,
            now,
            invited_otp_expires: row.invited_otp_expires
          })
          let reason = ''
          if (!storedOtp) reason = 'No OTP stored.'
          else if (submittedOtp !== storedOtp) reason = 'OTP mismatch.'
          else if (expires < now) reason = 'OTP expired.'
          return res.status(400).json({ error: 'Invalid or expired OTP', reason })
        }
        // Create user
        const bcryptModule = await import('bcryptjs')
        const bcrypt = bcryptModule.default || bcryptModule
        const hashed = await bcrypt.hash(password, 10)
        const userRes = await query(
          `INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, 'employer', $3, $4) RETURNING id`,
          [email.toLowerCase(), hashed, firstName, lastName]
        )
        const userId = userRes.rows[0].id

        // Validate userId is UUID and row.id is integer
        const { isValidUUID } = await import('../utils/validation.js')
        if (!isValidUUID(userId)) {
          console.error('onboard-invitee: userId is not a valid UUID:', userId)
          return res.status(500).json({ error: 'Internal error: userId is not a valid UUID', userId })
        }
        if (typeof row.id !== 'number') {
          console.error('onboard-invitee: row.id is not an integer:', row.id)
          return res.status(500).json({ error: 'Internal error: row.id is not an integer', rowId: row.id })
        }

        // Update invitation to link user
        await query(
          `UPDATE tenant_members SET user_id = $1, status = 'active', accepted_at = NOW(), invited_otp = NULL, invited_otp_expires = NULL WHERE id = $2`,
          [userId, row.id]
        )
        res.json({ success: true, message: 'Account created and joined company' })
      } catch (err) {
        console.error('Onboard invited user failed:', err)
        res.status(500).json({ error: 'Failed to onboard invited user' })
      }
    })

    // POST /tenant-members/resend-invite-otp - Resend OTP for invited user
    router.post('/resend-invite-otp', async (req, res) => {
      try {
        const { tenantId, email } = req.body
        if (!tenantId || !email) return res.status(400).json({ error: 'tenantId and email required' })
        const invite = await query(
          `SELECT * FROM tenant_members WHERE tenant_id = $1 AND invited_email = $2 AND status = 'invited'`,
          [tenantId, email.toLowerCase()]
        )
        if (invite.rows.length === 0) return res.status(404).json({ error: 'Invitation not found' })
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        await query(
          `UPDATE tenant_members SET invited_otp = $1, invited_otp_expires = NOW() + INTERVAL '10 minutes' WHERE id = $2`,
          [otp, invite.rows[0].id]
        )
        await emailService.sendTwoFACode(email, otp, 'Team Invitation')
        res.json({ success: true, message: 'OTP resent' })
      } catch (err) {
        console.error('Resend invite OTP failed:', err)
        res.status(500).json({ error: 'Failed to resend OTP' })
      }
    })
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


    // Check if user is member of tenant_members (active) OR is the owner (user_id in tenants table)
    const memberCheck = await query(
      `SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
      [tenantId, req.user.userId]
    )

    if (memberCheck.rows.length === 0) {
      // Not in tenant_members, check if user is owner in tenants table
      const ownerCheck = await query(
        `SELECT id FROM tenants WHERE id = $1 AND user_id = $2`,
        [tenantId, req.user.userId]
      )
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this tenant' })
      }
      // Owner: allow access
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
        tm.permissions,
        u.email,
        u.first_name,
        u.last_name
       FROM tenant_members tm
       LEFT JOIN users u ON u.id = tm.user_id
       WHERE tm.tenant_id = $1
       ORDER BY tm.status DESC, tm.invited_at DESC`,
      [tenantId]
    )

    let memberRows = members.rows.map(member => ({
      ...member,
      permissions: parsePermissions(member.permissions)
    }))

    // If owner is not in the list, add them as a virtual member
    const ownerCheck = await query(
      `SELECT user_id FROM tenants WHERE id = $1`,
      [tenantId]
    )
    const ownerId = ownerCheck.rows[0]?.user_id
    if (ownerId && !memberRows.some(m => m.user_id === ownerId)) {
      // Fetch owner user info
      const ownerUser = await query(
        `SELECT id as user_id, email, first_name, last_name FROM users WHERE id = $1`,
        [ownerId]
      )
      if (ownerUser.rows.length > 0) {
        memberRows = [
          {
            id: null,
            user_id: ownerUser.rows[0].user_id,
            role: 'owner',
            status: 'active',
            invited_at: null,
            accepted_at: null,
            permissions: {},
            email: ownerUser.rows[0].email,
            first_name: ownerUser.rows[0].first_name,
            last_name: ownerUser.rows[0].last_name
          },
          ...memberRows
        ]
      }
    }

    res.json(memberRows)
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

    // Check if target user is the tenant creator (owner)
    const ownerCheck = await query('SELECT user_id FROM tenants WHERE id = $1', [tenantId])
    if (ownerCheck.rows.length && ownerCheck.rows[0].user_id === userId) {
      return res.status(400).json({ error: 'Cannot change role of the tenant creator (owner)' })
    }

    // Check if requester is owner/manager
    const tenantCheck = await query(
      `SELECT role, permissions FROM tenant_members 
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
      [tenantId, req.user.userId]
    )

    if (tenantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const requester = tenantCheck.rows[0]
    const requesterPerms = parsePermissions(requester.permissions)
    const isOwner = requester.role === 'owner'
    const canManageTeam = isOwner || requesterPerms.can_manage_team
    const canManagePermissions = isOwner || requesterPerms.can_manage_permissions

    if (role && !canManageTeam) {
      return res.status(403).json({ error: 'You do not have permission to update member roles' })
    }

    if (permissions && !canManagePermissions) {
      return res.status(403).json({ error: 'You do not have permission to update member permissions' })
    }

    if (!isOwner && role === 'owner') {
      return res.status(403).json({ error: 'Only owners can assign the Owner role' })
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
    
    // If changing to manager role, set default permissions
    let finalPermissions = permissions || {}
    if (role === 'manager' && !permissions) {
      finalPermissions = {
        can_post_job: true,
        can_update_job: true,
        can_assign_application: true
      }
    }
    
    if (permissions || role === 'manager') {
      updateFields.push(`permissions = $${idx}`)
      updateValues.push(JSON.stringify(finalPermissions))
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

    const tenantCheck = await query(
      `SELECT role, permissions FROM tenant_members 
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
      [tenantId, req.user.userId]
    )

    let canManageTeam = false
    if (tenantCheck.rows.length) {
      const requester = tenantCheck.rows[0]
      const requesterPerms = parsePermissions(requester.permissions)
      canManageTeam = requester.role === 'owner' || requesterPerms.can_manage_team
    } else {
      const ownerCheck = await query('SELECT user_id FROM tenants WHERE id = $1 AND user_id = $2', [tenantId, req.user.userId])
      canManageTeam = ownerCheck.rows.length > 0
    }

    if (!canManageTeam) {
      return res.status(403).json({ error: 'You do not have permission to remove members' })
    }


    // Prevent removing the tenant creator (owner)
    const ownerCheck = await query('SELECT user_id FROM tenants WHERE id = $1', [tenantId])
    if (ownerCheck.rows.length && ownerCheck.rows[0].user_id === userId) {
      return res.status(400).json({ error: 'Cannot remove the tenant creator (owner)' })
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

// POST /tenant-members/invitations/:invitationId/accept - Accept invitation
router.post('/invitations/:invitationId/accept', authenticate, async (req, res) => {
  try {
    const { invitationId } = req.params
    const userId = req.user.userId

    // Verify invitation belongs to user
    const invitation = await query(
      'SELECT * FROM tenant_members WHERE id = $1 AND user_id = $2 AND status = $3',
      [invitationId, userId, 'invited']
    )

    if (invitation.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or invalid' })
    }

    // Accept invitation
    const result = await query(
      `UPDATE tenant_members 
       SET status = 'active', accepted_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [invitationId]
    )

    res.json({ success: true, member: result.rows[0] })
  } catch (err) {
    console.error('Accept invitation failed:', err)
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

// POST /tenant-members/invitations/:invitationId/decline - Decline invitation
router.post('/invitations/:invitationId/decline', authenticate, async (req, res) => {
  try {
    const { invitationId } = req.params
    const userId = req.user.userId

    // Verify invitation belongs to user
    const invitation = await query(
      'SELECT * FROM tenant_members WHERE id = $1 AND user_id = $2 AND status = $3',
      [invitationId, userId, 'invited']
    )

    if (invitation.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or invalid' })
    }

    // Delete/Decline invitation
    // We can either delete the record or mark as declined. Deleting keeps table cleaner.
    // User asked: "if removed they cannot join the the invite becomes invalid"
    // By deleting (or using status check above on acceptance), we ensure validity.
    // Let's delete it for now to keep it simple, or update status to 'declined'.
    // Updating status preserves history.
    await query(
      `UPDATE tenant_members 
       SET status = 'declined', declined_at = NOW() 
       WHERE id = $1`,
      [invitationId]
    )

    res.json({ success: true, message: 'Invitation declined' })
  } catch (err) {
    console.error('Decline invitation failed:', err)
    res.status(500).json({ error: 'Failed to decline invitation' })
  }
})

export default router
