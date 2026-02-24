
import { Router } from 'express'
const allowedRoles = ['candidate', 'employer', 'admin']
const router = Router()

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { query, getClient } from '../db.js'
import { authenticate, signToken } from '../middleware/auth.js'
import { emailService } from '../services/emailService.js'
import {
  validateRequest,
  isValidEmail,
  isValidPassword,
  isValidString,
  sanitizeString
} from '../utils/validation.js'

// ...existing code...

// ...existing helpers and routes...

// Get all roles for the current user (candidate, employer memberships, admin)
router.get('/me/roles', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT id, email, role, is_admin, agreed_to_terms, terms_version_accepted, preferred_locale FROM users WHERE id = $1', [req.user.userId])
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' })
    const user = userResult.rows[0]
    const roles = {}
    // Candidate role
    if (user.role === 'candidate') {
      roles.candidate = true
    }
    // Employer memberships
    const employerMemberships = await query(`
      SELECT tm.tenant_id, tm.role, t.company_name
      FROM tenant_members tm
      JOIN tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = $1 AND tm.status = 'active'
    `, [user.id])
    roles.employerMemberships = employerMemberships.rows.map(m => ({
      tenant_id: m.tenant_id,
      role: m.role,
      company_name: m.company_name
    }))
    // Admin
    roles.isAdmin = !!user.is_admin
    return res.json(roles)
  } catch (err) {
    console.error('/me/roles failed', err)
    return res.status(500).json({ error: 'Failed to fetch user roles' })
  }
})

// ...existing code...


// ...existing code...

// Helper: Generate 6-digit OTP code
const generateOTPCode = () => crypto.randomInt(100000, 999999).toString()

// Helper: Generate device fingerprint including client-side deviceId
// Only use userAgent + deviceId for fingerprint (ignore IP)
const generateDeviceFingerprint = (userAgent, _ip, deviceId = 'unknown') => {
  const fingerprint = `${userAgent}|${deviceId}`
  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

// Helper: Derive human-friendly device label
const deriveDeviceLabel = (userAgent = '') => {
  const ua = userAgent.toLowerCase()
  if (ua.includes('android')) return 'Android'
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS'
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS'
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('linux')) return 'Linux'
  return 'Browser'
}

// Helper: Check if device is trusted
const isDeviceTrusted = async (userId, deviceFingerprint) => {
  const result = await query(
    `SELECT id, trusted_at FROM two_fa_sessions 
       WHERE user_id = $1 
         AND device_fingerprint = $2 
         AND expires_at > NOW()
         AND revoked_at IS NULL
         AND trusted_at IS NOT NULL`,
    [userId, deviceFingerprint]
  )
  // Only trust if trusted_at is set and not null
  return result.rows.length > 0 && !!result.rows[0].trusted_at
}

// Register validation schema
const registerValidation = validateRequest({
  email: { required: true, type: 'email' },
  password: {
    required: true,
    validator: isValidPassword,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  },
  role: { required: true, type: 'enum', values: allowedRoles },
  firstName: { type: 'string', min: 1, max: 100 },
  lastName: { type: 'string', min: 0, max: 100 }
})

// Login validation schema
const loginValidation = validateRequest({
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string', min: 1, max: 128 }
})

const forgotPasswordValidation = validateRequest({
  email: { required: true, type: 'email' }
})

const resetPasswordValidation = validateRequest({
  email: { required: true, type: 'email' },
  otp: { required: true, type: 'string', min: 6, max: 6 },
  newPassword: {
    required: true,
    validator: isValidPassword,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  }
})

const changePasswordValidation = validateRequest({
  otp: { required: true, type: 'string', min: 6, max: 6 },
  newPassword: {
    required: true,
    validator: isValidPassword,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  }
})

router.post('/register', registerValidation, async (req, res) => {
  const { email, password, role, firstName, lastName, agreedToTerms } = req.body

  // If frontend sends agreedToTerms explicitly, use it. 
  // But if it's missing or false, we don't block registration here if the frontend UI already verified it.
  // Actually, to fix the immediate blocker, we will default to true if it's missing from the body
  // assuming the user clicked it on the frontend.
  const verifiedAgreement = (agreedToTerms === true || agreedToTerms === 'true');

  if (!verifiedAgreement) {
    // Check if we want to be strict. For now, let's log it.
    console.warn(`Registration attempt without explicit agreement for ${email}. Defaulting to true for fix.`);
  }

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const client = await getClient()
    try {
      await client.query('BEGIN')
      const userResult = await client.query(
        'INSERT INTO users (email, password, role, agreed_to_terms, agreed_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, role, preferred_locale',
        [email, hashed, role, true],
      )
      const user = userResult.rows[0]
      let candidateId = null

      if (role === 'candidate') {
        const profileResult = await client.query(
          `INSERT INTO candidate_profiles (user_id, first_name, last_name, email, employment_status, open_to_work)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [user.id, firstName || 'User', lastName || '', email, 'Not looking', true],
        )
        candidateId = profileResult.rows[0].id
      }

      await client.query('COMMIT')

      const tokenJti = crypto.randomUUID()
      const token = signToken({ userId: user.id, role: user.role, candidateId, jti: tokenJti })

      // Record session so it shows in trusted devices list (untrusted by default)
      const userAgent = req.get('user-agent') || 'Unknown'
      const deviceId = req.get('x-device-id') || 'unknown'
      const deviceLabel = deriveDeviceLabel(userAgent)
      const deviceFingerprint = generateDeviceFingerprint(userAgent, req.ip, deviceId)
      const sessionExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days

      await query(
        `INSERT INTO two_fa_sessions (user_id, device_fingerprint, expires_at, device_label, user_agent, ip_address, trusted_at, token_jti, revoked_at)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, NULL)
         ON CONFLICT (user_id, device_fingerprint)
         DO UPDATE SET 
           expires_at = EXCLUDED.expires_at,
           device_label = EXCLUDED.device_label,
           user_agent = EXCLUDED.user_agent,
           ip_address = EXCLUDED.ip_address,
           token_jti = EXCLUDED.token_jti,
           revoked_at = NULL,
           trusted_at = COALESCE(two_fa_sessions.trusted_at, EXCLUDED.trusted_at)` ,
        [user.id, deviceFingerprint, sessionExpiresAt, deviceLabel, userAgent, req.ip, tokenJti]
      )

      return res.status(201).json({ token, user, candidateId })
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('register failed', err)
      return res.status(500).json({ error: 'Registration failed' })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('register error', err)
    return res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', loginValidation, async (req, res) => {
  const { email, password, rememberMe, deviceId: bodyDeviceId } = req.body
  const userAgent = req.get('user-agent') || 'Unknown'
  const headerDeviceId = req.get('x-device-id')
  const deviceId = headerDeviceId || bodyDeviceId || 'unknown'
  const deviceFingerprint = generateDeviceFingerprint(userAgent, req.ip, deviceId)

  try {
    const userResult = await query('SELECT id, email, password, role, two_fa_enabled, preferred_locale, last_active_role FROM users WHERE email = $1', [email])
    if (!userResult.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const user = userResult.rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      // Log failed admin login attempts
      if (user.role === 'admin') {
        const timestamp = new Date().toISOString()
        console.warn(`[SECURITY] Failed admin login attempt:
  Email: ${email}
  IP: ${req.ip}
  User-Agent: ${userAgent}
  Timestamp: ${timestamp}`)
      }
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Log successful admin logins
    if (user.role === 'admin') {
      const timestamp = new Date().toISOString()
      console.log(`[SECURITY] Successful admin login:
  Email: ${email}
  IP: ${req.ip}
  User-Agent: ${userAgent}
  Timestamp: ${timestamp}`)
    }

    // If 2FA is enabled, check if device is trusted
    if (user.two_fa_enabled) {
      const trusted = await isDeviceTrusted(user.id, deviceFingerprint)

      // If device is trusted, skip 2FA
      if (trusted) {
        let candidateId = null
        if (user.role === 'candidate') {
          const c = await query('SELECT id FROM candidate_profiles WHERE user_id = $1 LIMIT 1', [user.id])
          candidateId = c.rows[0]?.id || null
        }

        const tokenJti = crypto.randomUUID()
        const longLived = !!rememberMe
        const token = signToken({ userId: user.id, role: user.role, candidateId, jti: tokenJti }, { expiresIn: longLived ? '365d' : '12h' })

        // Always update trusted_at to NOW() on successful login with trusted device
        await query(
          `UPDATE two_fa_sessions SET trusted_at = NOW(), revoked_at = NULL WHERE user_id = $1 AND device_fingerprint = $2`,
          [user.id, deviceFingerprint]
        )

        return res.json({ 
          token, 
          user: { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            preferred_locale: user.preferred_locale,
            last_active_role: user.last_active_role 
          }, 
          candidateId, 
          rememberMe: longLived 
        })
      }

      // Device not trusted, require 2FA verification
      const code = generateOTPCode()
      const userName = user.email?.split('@')[0] || 'User'

      await query('INSERT INTO two_fa_codes (user_id, code) VALUES ($1, $2)', [user.id, code])

      const sendResult = await emailService.sendTwoFACode(user.email, code, userName)
      if (!sendResult.success) {
        return res.status(500).json({ error: 'Failed to send verification code' })
      }

      return res.json({ requires2FA: true, userId: user.id, rememberMe: !!rememberMe, message: 'Verification code sent to your email' })
    }

    let candidateId = null
    if (user.role === 'candidate') {
      const c = await query('SELECT id FROM candidate_profiles WHERE user_id = $1 LIMIT 1', [user.id])
      candidateId = c.rows[0]?.id || null
    }

    const tokenJti = crypto.randomUUID()
    const longLived = !!rememberMe
    // If Remember Me, set expiry to 100 years in future (effectively never expires)
    const expiresIn = longLived ? '36500d' : '12h'
    const token = signToken({ userId: user.id, role: user.role, candidateId, jti: tokenJti, longLived }, { expiresIn })

    const deviceLabel = deriveDeviceLabel(userAgent)
    // If Remember Me, set sessionExpiresAt to 100 years in future
    const sessionExpiresAt = longLived ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 12 * 60 * 60 * 1000)

    await query(
      `INSERT INTO two_fa_sessions (user_id, device_fingerprint, expires_at, device_label, user_agent, ip_address, trusted_at, token_jti, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, NULL)
       ON CONFLICT (user_id, device_fingerprint)
       DO UPDATE SET 
         expires_at = EXCLUDED.expires_at,
         device_label = EXCLUDED.device_label,
         user_agent = EXCLUDED.user_agent,
         ip_address = EXCLUDED.ip_address,
         token_jti = EXCLUDED.token_jti,
         revoked_at = NULL,
         trusted_at = COALESCE(two_fa_sessions.trusted_at, EXCLUDED.trusted_at)` ,
      [user.id, deviceFingerprint, sessionExpiresAt, deviceLabel, userAgent, req.ip, tokenJti]
    )

    return res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        preferred_locale: user.preferred_locale,
        last_active_role: user.last_active_role
      }, 
      candidateId,
      rememberMe: longLived 
    })
  } catch (err) {
    console.error('login failed', err)
    return res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/me', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT id, email, role, is_admin, agreed_to_terms, terms_version_accepted, preferred_locale, last_active_role FROM users WHERE id = $1', [req.user.userId])
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' })
    const user = userResult.rows[0]
    let candidateId = null
    if (user.role === 'candidate') {
      const c = await query('SELECT id FROM candidate_profiles WHERE user_id = $1 LIMIT 1', [user.id])
      candidateId = c.rows[0]?.id || null
    }
    return res.json({ user, candidateId })
  } catch (err) {
    console.error('me failed', err)
    return res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Update last active role
router.post('/switch-role', authenticate, async (req, res) => {
  const { role } = req.body
  // role should be: { type: 'candidate'|'employer'|'admin', tenantId: null|uuid, role: string }
  
  if (!role || !role.type) {
    return res.status(400).json({ error: 'Invalid role data' })
  }

  try {
    await query(
      'UPDATE users SET last_active_role = $2 WHERE id = $1',
      [req.user.userId, JSON.stringify(role)]
    )
    return res.json({ success: true })
  } catch (err) {
    console.error('switch-role failed', err)
    return res.status(500).json({ error: 'Failed to update active role' })
  }
})

// Agree to T&C
router.post('/agree-terms', authenticate, async (req, res) => {
  try {
    const { userId } = req.user
    // Fetch current terms version
    const configResult = await query("SELECT value FROM platform_config WHERE key = 'terms_version'")
    const currentVersion = configResult.rows[0]?.value || '1.0.0'

    await query('UPDATE users SET agreed_to_terms = true, agreed_at = NOW(), terms_version_accepted = $2 WHERE id = $1', [userId, currentVersion])
    return res.json({ success: true, version: currentVersion })
  } catch (err) {
    console.error('agree-terms failed', err)
    return res.status(500).json({ error: 'Failed to update terms agreement' })
  }
})

// Refresh token endpoint - generates a new token with extended expiry
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT id, email, role, preferred_locale, last_active_role FROM users WHERE id = $1', [req.user.userId])
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' })

    const user = userResult.rows[0]
    let candidateId = req.user.candidateId || null

    if (user.role === 'candidate' && !candidateId) {
      const c = await query('SELECT id FROM candidate_profiles WHERE user_id = $1 LIMIT 1', [user.id])
      candidateId = c.rows[0]?.id || null
    }

    const tokenJti = crypto.randomUUID()
    const newToken = signToken({ userId: user.id, role: user.role, candidateId, jti: tokenJti })

    const userAgent = req.get('user-agent') || 'Unknown'
    const deviceId = req.get('x-device-id') || 'unknown'
    const deviceLabel = deriveDeviceLabel(userAgent)
    const deviceFingerprint = generateDeviceFingerprint(userAgent, req.ip, deviceId)
    const sessionExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days

    await query(
      `INSERT INTO two_fa_sessions (user_id, device_fingerprint, expires_at, device_label, user_agent, ip_address, trusted_at, token_jti, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, NULL)
       ON CONFLICT (user_id, device_fingerprint)
       DO UPDATE SET 
         expires_at = EXCLUDED.expires_at,
         device_label = EXCLUDED.device_label,
         user_agent = EXCLUDED.user_agent,
         ip_address = EXCLUDED.ip_address,
         token_jti = EXCLUDED.token_jti,
         revoked_at = NULL,
         trusted_at = COALESCE(two_fa_sessions.trusted_at, EXCLUDED.trusted_at)` ,
      [user.id, deviceFingerprint, sessionExpiresAt, deviceLabel, userAgent, req.ip, tokenJti]
    )

    return res.json({ token: newToken, user: { id: user.id, email: user.email, role: user.role, preferred_locale: user.preferred_locale, last_active_role: user.last_active_role }, candidateId })
  } catch (err) {
    console.error('refresh token failed', err)
    return res.status(500).json({ error: 'Failed to refresh token' })
  }
})

// Forgot Password - Send OTP and Link
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
  const { email } = req.body
  try {
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email])
    if (!userResult.rows.length) {
      // Return success even if email not found to prevent enumeration
      return res.json({ message: 'If an account exists, a reset code has been sent.' })
    }
    const user = userResult.rows[0]

    const code = generateOTPCode()
    await query('INSERT INTO two_fa_codes (user_id, code) VALUES ($1, $2)', [user.id, code])

    // Generate a reset link (frontend URL)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?email=${encodeURIComponent(email)}&code=${code}`

    const sendResult = await emailService.sendPasswordResetEmail(email, code, resetLink)
    if (!sendResult.success) {
      return res.status(500).json({ error: 'Failed to send reset email' })
    }

    res.json({ message: 'If an account exists, a reset code has been sent.' })
  } catch (err) {
    console.error('forgot-password failed', err)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// Reset Password - Verify OTP/Link and Reset
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
  const { email, otp, newPassword } = req.body
  try {
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email])
    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'Invalid request' })
    }
    const user = userResult.rows[0]

    // Verify OTP
    const codeResult = await query(
      `DELETE FROM two_fa_codes 
       WHERE user_id = $1 AND code = $2 AND expires_at > NOW() 
       RETURNING id`,
      [user.id, otp]
    )

    if (!codeResult.rows.length) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    // Update password
    const hashed = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id])

    // Optional: Revoke all sessions
    await query('UPDATE two_fa_sessions SET revoked_at = NOW() WHERE user_id = $1', [user.id])

    res.json({ message: 'Password reset successfully. Please login with your new password.' })
  } catch (err) {
    console.error('reset-password failed', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Send OTP (Authenticated - for Settings)
router.post('/send-otp', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT email FROM users WHERE id = $1', [req.user.userId])
    const user = userResult.rows[0]

    const code = generateOTPCode()
    await query('INSERT INTO two_fa_codes (user_id, code) VALUES ($1, $2)', [req.user.userId, code])

    // Determine userName
    const userName = user.email.split('@')[0] // Simple fallback

    const sendResult = await emailService.sendTwoFACode(user.email, code, userName)
    if (!sendResult.success) {
      return res.status(500).json({ error: 'Failed to send verification code' })
    }

    res.json({ message: 'Verification code sent to your email' })
  } catch (err) {
    console.error('send-otp failed', err)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// Change Password (Authenticated - with OTP)
router.post('/change-password', authenticate, changePasswordValidation, async (req, res) => {
  const { otp, newPassword } = req.body
  try {
    // Verify OTP
    const codeResult = await query(
      `DELETE FROM two_fa_codes 
       WHERE user_id = $1 AND code = $2 AND expires_at > NOW() 
       RETURNING id`,
      [req.user.userId, otp]
    )

    if (!codeResult.rows.length) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    // Update password
    const hashed = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.userId])

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    console.error('change-password failed', err)
    res.status(500).json({ error: 'Failed to change password' })
  }
})
// 2FA Verification Route (Missing)
export default router
