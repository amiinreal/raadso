import { Router } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { emailService } from '../services/emailService.js'
import { validateRequest, isValidEmail } from '../utils/validation.js'

const router = Router()
const jwtSecret = process.env.JWT_SECRET || 'dev-secret'

// Helper: Generate device fingerprint (must match login logic: userAgent + deviceId)
const generateDeviceFingerprint = (userAgent, deviceId = 'unknown') => {
  const fingerprint = `${userAgent}|${deviceId}`
  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

// Helper: Derive human-friendly device label from user agent
const deriveDeviceLabel = (userAgent) => {
  const ua = (userAgent || '').toLowerCase()
  if (ua.includes('android')) return 'Android'
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS'
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS'
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('linux')) return 'Linux'
  return 'Browser'
}

// Helper: Encrypt session data using AES-256-GCM
const encryptSession = (data) => {
  try {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(sessionKey, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()

    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex')
    })
  } catch (err) {
    console.error('Failed to encrypt session:', err)
    throw err
  }
}

const decryptSession = (encrypted) => {
  try {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(sessionKey, 'salt', 32)
    const { iv, data, authTag } = JSON.parse(encrypted)

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, 'hex')
    )
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return JSON.parse(decrypted)
  } catch (err) {
    console.error('Failed to decrypt session:', err)
    return null
  }
}

const twoFAValidation = validateRequest({
  email: { required: true, validator: isValidEmail, message: 'Invalid email format' },
})

// Helper: Generate 6-digit OTP code
const generateOTPCode = () => {
  return crypto.randomInt(100000, 999999).toString()
}

// Helper: Generate temp token for 2FA session
const generateTempToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// POST /auth/2fa/enable - Start 2FA setup (send code to email)
router.post('/enable', authenticate, async (req, res) => {
  try {
    const { email } = req.body

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Check if user exists - use the token's user ID
    const userResult = await query(
      'SELECT id, email FROM users WHERE id = $1',
      [req.user.userId]
    )

    if (userResult.rows.length === 0) {
      console.error('User not found for ID:', req.user.userId)
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult.rows[0]
    const userName = user.email?.split('@')[0] || 'User'
    const verifyEmail = email.toLowerCase()

    // Expire all old unused codes for this user
    await query(
      'UPDATE two_fa_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [req.user.userId]
    )

    // Generate OTP code
    const code = generateOTPCode()

    // Store OTP code in database
    try {
      await query(
        'INSERT INTO two_fa_codes (user_id, code) VALUES ($1, $2)',
        [req.user.userId, code]
      )
    } catch (dbErr) {
      console.error('Database error inserting 2FA code:', dbErr)
      return res.status(500).json({ error: 'Failed to generate verification code' })
    }

    // Send email with code
    let sendResult
    try {
      sendResult = await emailService.sendTwoFACode(verifyEmail, code, userName)
    } catch (emailErr) {
      console.error('Email service error:', emailErr)
      return res.status(500).json({ error: 'Failed to send verification code: ' + emailErr.message })
    }

    if (!sendResult.success) {
      console.error('Email send failed:', sendResult.error)
      return res.status(500).json({ error: 'Failed to send verification code: ' + (sendResult.error?.message || 'Unknown error') })
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      tempToken: generateTempToken(),
    })
  } catch (err) {
    console.error('2FA enable failed:', err)
    res.status(500).json({ error: 'Failed to enable 2FA: ' + err.message })
  }
})

// POST /auth/2fa/verify - Verify 2FA code and enable 2FA
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { code } = req.body

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' })
    }

    // Check if code exists and is not expired/used
    const codeResult = await query(
      `SELECT id FROM two_fa_codes 
       WHERE user_id = $1 AND code = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.userId, code]
    )

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    const codeId = codeResult.rows[0].id

    // Mark code as used
    await query('UPDATE two_fa_codes SET used_at = NOW() WHERE id = $1', [codeId])

    // Enable 2FA for user
    await query(
      'UPDATE users SET two_fa_enabled = true, two_fa_verified_at = NOW() WHERE id = $1',
      [req.user.userId]
    )

    res.json({
      success: true,
      message: '2FA has been enabled successfully',
    })
  } catch (err) {
    console.error('2FA verify failed:', err)
    res.status(500).json({ error: 'Failed to verify code' })
  }
})

// POST /auth/2fa/disable - Disable 2FA
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: 'Password is required to disable 2FA' })
    }

    // Verify user exists and has 2FA enabled
    const userResult = await query(
      'SELECT id, password_hash FROM users WHERE id = $1 AND two_fa_enabled = true',
      [req.user.userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: '2FA is not enabled for this account' })
    }

    // TODO: Verify password hash if implemented
    // For now, we'll just require confirmation via current session

    // Disable 2FA
    await query(
      'UPDATE users SET two_fa_enabled = false, two_fa_verified_at = NULL WHERE id = $1',
      [req.user.userId]
    )

    // Clean up unused codes
    await query('DELETE FROM two_fa_codes WHERE user_id = $1 AND used_at IS NULL', [req.user.userId])

    res.json({
      success: true,
      message: '2FA has been disabled',
    })
  } catch (err) {
    console.error('2FA disable failed:', err)
    res.status(500).json({ error: 'Failed to disable 2FA' })
  }
})

// POST /auth/2fa/send-code - Send OTP during login (when 2FA is enabled)
router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Find user with 2FA enabled
    const userResult = await query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) AND two_fa_enabled = true',
      [email]
    )

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists for security
      return res.status(400).json({ error: 'Invalid email or 2FA not enabled' })
    }

    const user = userResult.rows[0]

    // Expire all old unused codes for this user immediately
    await query(
      'UPDATE two_fa_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    )

    const userName = user.email?.split('@')[0] || 'User'
    const code = generateOTPCode()

    // Store OTP code
    await query(
      'INSERT INTO two_fa_codes (user_id, code) VALUES ($1, $2)',
      [user.id, code]
    )

    // Send email with code
    const sendResult = await emailService.sendTwoFACode(user.email, code, userName)

    if (!sendResult.success) {
      return res.status(500).json({ error: 'Failed to send verification code' })
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      userId: user.id, // Return user ID so frontend can verify code
    })
  } catch (err) {
    console.error('2FA send-code failed:', err)
    res.status(500).json({ error: 'Failed to send code' })
  }
})

// POST /auth/2fa/login-verify - Verify 2FA code during login
router.post('/login-verify', async (req, res) => {
  try {
    const { userId, code, trustDevice, deviceId, rememberMe } = req.body

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code are required' })
    }

    const codeResult = await query(
      `SELECT id, user_id FROM two_fa_codes 
       WHERE user_id = $1 AND code = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    )

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    const codeId = codeResult.rows[0].id
    await query('UPDATE two_fa_codes SET used_at = NOW() WHERE id = $1', [codeId])

    const userResult = await query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult.rows[0]

    let candidateId = null
    if (user.role === 'candidate') {
      const candResult = await query('SELECT id FROM candidate_profiles WHERE user_id = $1', [userId])
      if (candResult.rows.length > 0) {
        candidateId = candResult.rows[0].id
      }
    }

    const userAgent = req.get('user-agent') || 'Unknown'
    const deviceLabel = deriveDeviceLabel(userAgent)
    const normalizedDeviceId = deviceId || req.get('x-device-id') || 'unknown'
    const deviceFingerprint = generateDeviceFingerprint(userAgent, normalizedDeviceId)
    const rememberRequested = !!rememberMe
    const shouldTrustDevice = !!trustDevice
    const longLived = shouldTrustDevice || rememberRequested

    const tokenJti = crypto.randomUUID()
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        jti: tokenJti,
        longLived
      },
      jwtSecret,
      { expiresIn: longLived ? '30d' : '7d' }
    )

    const expiresAt = longLived
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const trustedAtValue = shouldTrustDevice ? new Date() : null

    let upserted = false
    try {
      const upsertResult = await query(
        `INSERT INTO two_fa_sessions (user_id, device_fingerprint, expires_at, device_label, user_agent, ip_address, trusted_at, token_jti, revoked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
         ON CONFLICT (user_id, device_fingerprint) DO UPDATE
         SET expires_at = EXCLUDED.expires_at,
             device_label = EXCLUDED.device_label,
             user_agent = EXCLUDED.user_agent,
             ip_address = EXCLUDED.ip_address,
             token_jti = EXCLUDED.token_jti,
             revoked_at = NULL,
             trusted_at = CASE WHEN EXCLUDED.trusted_at IS NOT NULL THEN EXCLUDED.trusted_at ELSE two_fa_sessions.trusted_at END`,
        [user.id, deviceFingerprint, expiresAt, deviceLabel, userAgent, req.ip, trustedAtValue, tokenJti]
      )
      upserted = upsertResult.rowCount > 0
    } catch (err) {
      console.error('2FA trusted device upsert failed:', err)
    }

    if (!shouldTrustDevice) {
      await query(
        `UPDATE two_fa_sessions SET revoked_at = NOW() WHERE user_id = $1 AND token_jti != $2 AND revoked_at IS NULL AND (trusted_at IS NULL OR trusted_at < NOW() - INTERVAL '29 days')`,
        [user.id, tokenJti]
      )
    }

    console.log('2FA device trust flow', {
      userId: user.id,
      deviceFingerprint,
      trusted: shouldTrustDevice,
      rememberRequested,
      longLived,
      upserted
    })

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      candidateId,
      rememberMe: longLived,
      redirectTo: '/' // Default redirect
    })
  } catch (err) {
    console.error('2FA login-verify failed:', err)
    res.status(500).json({ error: 'Failed to verify code' })
  }
})

// GET /auth/2fa/status - Get 2FA status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT two_fa_enabled, two_fa_verified_at FROM users WHERE id = $1',
      [req.user.userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult.rows[0]

    res.json({
      enabled: user.two_fa_enabled,
      verifiedAt: user.two_fa_verified_at,
    })
  } catch (err) {
    console.error('2FA status failed:', err)
    res.status(500).json({ error: 'Failed to get 2FA status' })
  }
})

// GET /auth/2fa/trusted-devices - List trusted devices (30-day window)
router.get('/trusted-devices', authenticate, async (req, res) => {
  try {
    const userAgent = req.get('user-agent') || 'Unknown'
    const currentFingerprint = generateDeviceFingerprint(userAgent, req.ip)

    const result = await query(
      `SELECT id, device_label, user_agent, ip_address, device_fingerprint, trusted_at, expires_at
       FROM two_fa_sessions
       WHERE user_id = $1 AND expires_at > NOW() AND revoked_at IS NULL
       ORDER BY trusted_at DESC` ,
      [req.user.userId]
    )

    const devices = result.rows.map((row) => ({
      id: row.id,
      deviceLabel: row.device_label || deriveDeviceLabel(row.user_agent) || 'Unknown',
      userAgent: row.user_agent || 'Unknown',
      ipAddress: row.ip_address || 'Unknown',
      trustedAt: row.trusted_at,
      expiresAt: row.expires_at,
      isCurrent: row.device_fingerprint === currentFingerprint,
      isTrusted: Boolean(row.trusted_at),
    }))

    res.json({ devices })
  } catch (err) {
    console.error('Failed to list trusted devices:', err)
    res.status(500).json({ error: 'Failed to fetch trusted devices' })
  }
})

// POST /auth/2fa/trusted-devices/revoke - Remove a trusted device
router.post('/trusted-devices/revoke', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.body
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' })
    }

    const updated = await query(
      `UPDATE two_fa_sessions 
          SET revoked_at = NOW() 
        WHERE id = $1 AND user_id = $2 
        RETURNING id`,
      [deviceId, req.user.userId]
    )

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Failed to revoke trusted device:', err)
    res.status(500).json({ error: 'Failed to revoke trusted device' })
  }
})


export default router
