import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Admin check middleware
const isAdmin = async (req, res, next) => {
    // Check token payload first
    if (req.user.role === 'admin' || req.user.is_admin) {
        return next()
    }

    // Fallback: Check database (handle legacy tokens or missed payload updates)
    try {
        const result = await query('SELECT role, is_admin FROM users WHERE id = $1', [req.user.userId])
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (user.role === 'admin' || user.is_admin) {
                // Update req.user for this request
                req.user.role = user.role
                req.user.is_admin = user.is_admin
                return next()
            }
        }
    } catch (err) {
        console.error('Admin check verification failed:', err)
    }
    
    return res.status(403).json({ error: 'Admin access required' })
}

// Function to log admin actions
const logAudit = async (adminId, action, targetType, targetId, details) => {
    try {
        await query(
            `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [adminId, action, targetType, targetId, JSON.stringify(details)]
        )
    } catch (err) {
        console.error('Failed to log audit:', err)
    }
}

// Get public config (Privacy Policy)
router.get('/privacy-policy', async (req, res) => {
    try {
        const result = await query("SELECT value FROM platform_config WHERE key = 'privacy_policy_content'")
        res.json({ content: result.rows[0]?.value || '' })
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch privacy policy' })
    }
})

// Get terms version
router.get('/terms-version', async (req, res) => {
    try {
        const result = await query("SELECT value FROM platform_config WHERE key = 'terms_version'")
        res.json({ version: result.rows[0]?.value || '1.0.0' })
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch terms version' })
    }
})

// Admin: Update privacy policy
router.put('/privacy-policy', authenticate, isAdmin, async (req, res) => {
    const { content, forceReaccept } = req.body
    try {
        await query(
            "UPDATE platform_config SET value = $1, updated_at = NOW(), updated_by = $2 WHERE key = 'privacy_policy_content'",
            [content, req.user.userId]
        )

        if (forceReaccept) {
            // Increment terms version or use specific logic
            const versionResult = await query("SELECT value FROM platform_config WHERE key = 'terms_version'")
            const currentVersion = versionResult.rows[0]?.value || '1.0.0'
            const parts = currentVersion.split('.')
            parts[2] = parseInt(parts[2]) + 1
            const newVersion = parts.join('.')

            await query(
                "UPDATE platform_config SET value = $1, updated_at = NOW(), updated_by = $2 WHERE key = 'terms_version'",
                [newVersion, req.user.userId]
            )

            await logAudit(req.user.userId, 'update_privacy_policy', 'config', 'privacy_policy', { version_increment: true, new_version: newVersion })
        } else {
            await logAudit(req.user.userId, 'update_privacy_policy', 'config', 'privacy_policy', { version_increment: false })
        }

        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: 'Failed to update privacy policy' })
    }
})

// Admin: Get audit logs
router.get('/audit-logs', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT al.*, u.email as admin_email 
             FROM audit_logs al 
             LEFT JOIN users u ON al.admin_id = u.id 
             ORDER BY al.created_at DESC LIMIT 100`
        )
        res.json(result.rows)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
})

// Admin: Get Automation Settings
router.get('/settings', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await query("SELECT key, value FROM platform_config WHERE key IN ('enable_ai_recommendations', 'enable_2fa')")
        const settings = {}
        result.rows.forEach(row => settings[row.key] = row.value === 'true')
        res.json(settings)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' })
    }
})

// Admin: Update Setting
router.put('/settings', authenticate, isAdmin, async (req, res) => {
    const { key, value } = req.body
    try {
        // Convert boolean to string 'true'/'false' explicitly if needed
        const valStr = String(value)
        await query(
            `INSERT INTO platform_config (key, value, updated_by) 
             VALUES ($1, $2, $3)
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), updated_by = $3`,
            [key, valStr, req.user.userId]
        )
        await logAudit(req.user.userId, 'update_setting', 'config', key, { newValue: valStr })
        res.json({ success: true, storedValue: valStr })
    } catch (err) {
        console.error('Failed to update setting:', err)
        res.status(500).json({ error: 'Failed to update setting' })
    }
})

export { router as configRouter, logAudit }
