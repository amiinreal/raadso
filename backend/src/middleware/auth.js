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

    // If token carries a jti, optionally check session (but don't enforce strict expiry)
    if (decoded.jti) {
      const sessionResult = await query(
        `SELECT revoked_at FROM two_fa_sessions 
         WHERE token_jti = $1 
         LIMIT 1`,
        [decoded.jti]
      )

      // Only reject if explicitly revoked
      if (sessionResult.rows.length > 0 && sessionResult.rows[0].revoked_at) {
        return res.status(401).json({ error: 'Session has been revoked' })
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
