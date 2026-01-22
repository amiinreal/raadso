import { Router } from 'express'
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

const router = Router()
const allowedRoles = ['candidate', 'employer', 'admin']

// Helper: Generate 6-digit OTP code
const generateOTPCode = () => crypto.randomInt(100000, 999999).toString()

// Helper: Generate device fingerprint including client-side deviceId
const generateDeviceFingerprint = (userAgent, ip, deviceId = 'unknown') => {
  const fingerprint = `${userAgent}|${ip}|${deviceId}`
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
    `SELECT id FROM two_fa_sessions 
       WHERE user_id = $1 
         AND device_fingerprint = $2 
       AND expires_at > NOW()
       AND revoked_at IS NULL
       AND trusted_at IS NOT NULL`,
    [userId, deviceFingerprint]
  )
  return result.rows.length > 0
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

router.post('/register', registerValidation, async (req, res) => {
  const { email, password, role, firstName, lastName } = req.body

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
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [email, hashed, role],
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
  const { email, password, rememberMe } = req.body
  const userAgent = req.get('user-agent') || 'Unknown'
  const deviceId = req.get('x-device-id') || 'unknown'
  const deviceFingerprint = generateDeviceFingerprint(userAgent, req.ip, deviceId)

  try {
    const userResult = await query('SELECT id, email, password, role, two_fa_enabled FROM users WHERE email = $1', [email])
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
        const longLived = user.role === 'candidate' && !!rememberMe
        const token = signToken({ userId: user.id, role: user.role, candidateId, jti: tokenJti }, { expiresIn: longLived ? '365d' : '12h' })

        const deviceLabel = deriveDeviceLabel(userAgent)
        const expiresAt = new Date(Date.now() + (longLived ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000))

        await query(
          `INSERT INTO two_fa_sessions (user_id, device_fingerprint, expires_at, device_label, user_agent, ip_address, trusted_at, token_jti, revoked_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NULL)
           ON CONFLICT (user_id, device_fingerprint)
           DO UPDATE SET 
             expires_at = EXCLUDED.expires_at,
             device_label = EXCLUDED.device_label,
             user_agent = EXCLUDED.user_agent,
             ip_address = EXCLUDED.ip_address,
             token_jti = EXCLUDED.token_jti,
             revoked_at = NULL,
             trusted_at = NOW()` ,
          [user.id, deviceFingerprint, expiresAt, deviceLabel, userAgent, req.ip, tokenJti]
        )

        return res.json({ token, user: { id: user.id, email: user.email, role: user.role }, candidateId })
      }

      // Device not trusted, require 2FA verification
      const code = generateOTPCode()
      const userName = user.email?.split('@')[0] || 'User'

      await query('INSERT INTO two_fa_codes (user_id, code) VALUES ($1, $2)', [user.id, code])

      const sendResult = await emailService.sendTwoFACode(user.email, code, userName)
      if (!sendResult.success) {
        return res.status(500).json({ error: 'Failed to send verification code' })
      }

      return res.json({ requires2FA: true, userId: user.id, message: 'Verification code sent to your email' })
    }

    let candidateId = null
    if (user.role === 'candidate') {
      const c = await query('SELECT id FROM candidate_profiles WHERE user_id = $1 LIMIT 1', [user.id])
      candidateId = c.rows[0]?.id || null
    }

    const tokenJti = crypto.randomUUID()
    const longLived = user.role === 'candidate' && !!rememberMe
    const token = signToken({ userId: user.id, role: user.role, candidateId, jti: tokenJti }, { expiresIn: longLived ? '365d' : '12h' })

    const deviceLabel = deriveDeviceLabel(userAgent)
    const sessionExpiresAt = new Date(Date.now() + (longLived ? 365 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000))

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

    return res.json({ token, user: { id: user.id, email: user.email, role: user.role }, candidateId })
  } catch (err) {
    console.error('login failed', err)
    return res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/me', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT id, email, role FROM users WHERE id = $1', [req.user.userId])
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

// Refresh token endpoint - generates a new token with extended expiry
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT id, email, role FROM users WHERE id = $1', [req.user.userId])
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

    return res.json({ token: newToken, user: { id: user.id, email: user.email, role: user.role }, candidateId })
  } catch (err) {
    console.error('refresh token failed', err)
    return res.status(500).json({ error: 'Failed to refresh token' })
  }
})

export default router
