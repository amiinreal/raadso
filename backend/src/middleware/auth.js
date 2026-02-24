import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { query } from '../db.js'

const jwtSecret = process.env.JWT_SECRET || 'dev-secret'

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)

    // If token carries a jti, check session and always enforce expiry/revoked for all sessions
    if (decoded.jti) {
      const sessionResult = await query(
        `SELECT revoked_at, expires_at FROM two_fa_sessions 
         WHERE token_jti = $1 
         LIMIT 1`,
        [decoded.jti]
      )

      if (sessionResult.rows.length > 0) {
        const { revoked_at, expires_at } = sessionResult.rows[0]
        if (revoked_at) {
          return res.status(401).json({ error: 'Session has been revoked' })
        }
        // Always enforce expiry for all sessions (trusted or not)
        if (expires_at && new Date(expires_at) < new Date()) {
          return res.status(401).json({ error: 'Session has expired' })
        }
      }
    }

    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Sign JWT with optional custom expiry (default 90 days)
export const signToken = (payload, opts = {}) => {
  const jti = payload.jti || crypto.randomUUID()
  const expiresIn = opts.expiresIn || '90d'
  return jwt.sign({ ...payload, jti }, jwtSecret, { expiresIn })
}
