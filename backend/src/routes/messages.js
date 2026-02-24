import express from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { checkTenantPermission } from '../middleware/tenantPermissions.js'
import { emailService } from '../services/emailService.js'

const router = express.Router()

// GET /api/messages/:applicationId - Get message history for an application
router.get('/:applicationId', authenticate, async (req, res) => {
    const { applicationId } = req.params
    const userId = req.user.userId || req.user.id
    const userRole = req.user.role

    try {
        // strict access control: user must be the candidate OR the employer (tenant owner)
        // 1. Check if user is the candidate
        const appResult = await query(
            `SELECT a.candidate_id, a.job_id, cp.user_id as candidate_user_id, t.user_id as employer_user_id, a.candidate_id
       FROM applications a
       JOIN candidate_profiles cp ON a.candidate_id = cp.id
       JOIN jobs j ON a.job_id = j.id
       JOIN tenants t ON j.tenant_id = t.id
       WHERE a.id = $1`,
            [applicationId]
        )

        if (appResult.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' })
        }

        const application = appResult.rows[0]

        // Verify ownership
        if (userRole === 'candidate' && application.candidate_user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' })
        }

        if (userRole === 'employer' && application.employer_user_id !== userId) {
            // NOTE: In a real app with team members, we'd check tenant membership not just owner ID
            return res.status(403).json({ error: 'Unauthorized' })
        }

        // Fetch messages
        const messages = await query(
            `SELECT m.*, u.role, u.email,
                    cp.first_name, cp.last_name,
                    t.company_name,
                    j.title as job_title,
                    hc.name as hiring_contact_name,
                    hc.email as hiring_contact_email
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN candidate_profiles cp ON u.id = cp.user_id AND u.role = 'candidate'
       LEFT JOIN tenants t ON u.id = t.user_id AND u.role = 'employer'
       LEFT JOIN applications a ON m.application_id = a.id
       LEFT JOIN jobs j ON a.job_id = j.id
       LEFT JOIN jsonb_to_recordset(j.hiring_contacts) AS hc(name text, email text) ON TRUE
       WHERE m.application_id = $1
       ORDER BY m.created_at ASC`,
            [applicationId]
        )

        res.json(messages.rows)
    } catch (err) {
        console.error('Error fetching messages:', err)
        res.status(500).json({ error: 'Failed to fetch messages' })
    }
})

// POST /api/messages - Send a new message or reply
router.post('/', authenticate, checkTenantPermission('can_send_message'), async (req, res) => {
    const { applicationId, content, parentMessageId, subject } = req.body
    const senderId = req.user.userId || req.user.id
    const userRole = req.user.role

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' })
    }

    try {
        // 1. Verify access & get recipient details
        const appResult = await query(
            `SELECT a.id, 
              cp.user_id as candidate_user_id, cp.first_name as cand_first, cp.last_name as cand_last, cp.email as cand_email,
              t.user_id as employer_user_id, t.company_name, u_emp.email as emp_email
       FROM applications a
       JOIN candidate_profiles cp ON a.candidate_id = cp.id
       JOIN jobs j ON a.job_id = j.id
       JOIN tenants t ON j.tenant_id = t.id
       JOIN users u_emp ON t.user_id = u_emp.id
       WHERE a.id = $1`,
            [applicationId]
        )

        if (appResult.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' })
        }

        const appData = appResult.rows[0]
        let recipientEmail, recipientName, messageSubject

        // Authorization & Email Prep
        const isReply = !!parentMessageId
        let emailSubject = subject // Use provided subject if it's a new message
        
        // If this is a reply, fetch the parent message to get its subject
        if (isReply && !emailSubject) {
            const parentMsg = await query(
                `SELECT subject FROM messages WHERE id = $1`,
                [parentMessageId]
            )
            if (parentMsg.rows.length > 0) {
                emailSubject = parentMsg.rows[0].subject
            }
        }
        
        messageSubject = subject // Store for database (use provided subject or null for replies)
        
        if (userRole === 'candidate') {
            if (appData.candidate_user_id !== senderId) return res.status(403).json({ error: 'Unauthorized' })
            recipientEmail = appData.emp_email
            recipientName = appData.company_name || 'Employer'
            if (!emailSubject) {
                emailSubject = isReply ? `Re: Message regarding application` : `New message from ${appData.cand_first || 'Candidate'} regarding application`
            }
        } else if (userRole === 'employer') {
            if (appData.employer_user_id !== senderId) return res.status(403).json({ error: 'Unauthorized' })
            recipientEmail = appData.cand_email
            recipientName = appData.cand_first || 'Candidate'
            if (!emailSubject) {
                emailSubject = isReply ? `Re: Message from ${appData.company_name || 'Employer'}` : `New message from ${appData.company_name || 'Employer'}`
            }
        } else if (userRole === 'admin') {
            // Admins can message anyone (optional)
            // defaulting to messaging the candidate for now if admin initiates? 
            // strict logic: admins might not use this route often, but let's allow messaging candidate
            recipientEmail = appData.cand_email
            recipientName = appData.cand_first || 'Candidate'
            if (!emailSubject) {
                emailSubject = isReply ? `Re: Message from Administrator` : `Message from Administrator`
            }
        } else {
            return res.status(403).json({ error: 'Unauthorized role' })
        }

        // 2. Insert Message (with optional parent_message_id and subject)
        const insertResult = await query(
            `INSERT INTO messages (application_id, sender_id, content, parent_message_id, subject)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [applicationId, senderId, content, parentMessageId || null, messageSubject || null]
        )

        const newMessage = insertResult.rows[0]

        // 3. Send Email Notification (Async - don't block response)
        // Get total unread count for the recipient to include in email
        let unreadCount = 0
        if (userRole === 'candidate') {
            // Recipient is employer - get their unread count
            const unreadResult = await query(
                `SELECT COUNT(*) as count FROM messages m
                 JOIN applications a ON m.application_id = a.id
                 JOIN jobs j ON a.job_id = j.id
                 JOIN tenants t ON j.tenant_id = t.id
                 WHERE t.user_id = $1 AND m.sender_id != $1 AND m.is_read = false`,
                [appData.employer_user_id]
            )
            unreadCount = parseInt(unreadResult.rows[0]?.count || 0)
        } else if (userRole === 'employer') {
            // Recipient is candidate - get their unread count
            const unreadResult = await query(
                `SELECT COUNT(*) as count FROM messages m
                 JOIN applications a ON m.application_id = a.id
                 JOIN candidate_profiles cp ON a.candidate_id = cp.id
                 WHERE cp.user_id = $1 AND m.sender_id != $1 AND m.is_read = false`,
                [appData.candidate_user_id]
            )
            unreadCount = parseInt(unreadResult.rows[0]?.count || 0)
        }
        
        // 3. Send Email Notification (Async - don't block response)
        // Derive sender name from the fetched application data
        let senderName = 'User'
        if (userRole === 'employer') {
            senderName = appData.company_name || 'Employer'
        } else if (userRole === 'candidate') {
            senderName = `${appData.cand_first} ${appData.cand_last}`.trim() || 'Candidate'
        } else if (userRole === 'admin') {
            senderName = 'Administrator'
        }

        emailService.sendCandidateMessage(
            recipientEmail,
            recipientName,
            emailSubject,
            content, // message body
            senderName, // employer name / sender name
            unreadCount // total unread count for recipient
        ).catch(err => console.error('Failed to send message email notification:', err))

        // 4. Return the message
        res.status(201).json({
            ...newMessage,
            first_name: req.user.firstName,
            last_name: req.user.lastName,
            role: req.user.role
        })

    } catch (err) {
        console.error('Error sending message:', err)
        res.status(500).json({ error: 'Failed to send message' })
    }
})

// PUT /api/messages/:applicationId/mark-read - Mark all messages in an application as read for current user
router.put('/:applicationId/mark-read', authenticate, async (req, res) => {
    const { applicationId } = req.params
    const userId = req.user.userId || req.user.id
    const userRole = req.user.role

    try {
        // Verify access
        const appResult = await query(
            `SELECT a.id, cp.user_id as candidate_user_id, t.user_id as employer_user_id
       FROM applications a
       JOIN candidate_profiles cp ON a.candidate_id = cp.id
       JOIN jobs j ON a.job_id = j.id
       JOIN tenants t ON j.tenant_id = t.id
       WHERE a.id = $1`,
            [applicationId]
        )

        if (appResult.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' })
        }

        const application = appResult.rows[0]

        if (userRole === 'candidate' && application.candidate_user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' })
        }

        if (userRole === 'employer' && application.employer_user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' })
        }

        // Mark all messages sent by the OTHER party as read
        await query(
            `UPDATE messages 
       SET is_read = true 
       WHERE application_id = $1 
       AND sender_id != $2 
       AND is_read = false`,
            [applicationId, userId]
        )

        res.json({ success: true })
    } catch (err) {
        console.error('Error marking messages as read:', err)
        res.status(500).json({ error: 'Failed to mark messages as read' })
    }
})

// GET /api/messages/unread/count - Get count of unread messages for current user
router.get('/unread/count', authenticate, async (req, res) => {
    const userId = req.user.userId || req.user.id
    const userRole = req.user.role

    try {
        let unreadCount = 0
        
        if (userRole === 'candidate') {
            // Count unread messages from employers
            const result = await query(
                `SELECT COUNT(DISTINCT m.application_id) as count
         FROM messages m
         JOIN applications a ON m.application_id = a.id
         JOIN candidate_profiles cp ON a.candidate_id = cp.id
         WHERE cp.user_id = $1 
         AND m.sender_id != $1
         AND m.is_read = false`,
                [userId]
            )
            unreadCount = parseInt(result.rows[0]?.count || 0)
        } else if (userRole === 'employer') {
            // Count unread messages from candidates
            const result = await query(
                `SELECT COUNT(DISTINCT m.application_id) as count
         FROM messages m
         JOIN applications a ON m.application_id = a.id
         JOIN jobs j ON a.job_id = j.id
         JOIN tenants t ON j.tenant_id = t.id
         WHERE t.user_id = $1 
         AND m.sender_id != $1
         AND m.is_read = false`,
                [userId]
            )
            unreadCount = parseInt(result.rows[0]?.count || 0)
        }

        res.json({ unreadCount })
    } catch (err) {
        console.error('Error getting unread count:', err)
        res.status(500).json({ error: 'Failed to get unread count' })
    }
})

// GET /api/messages/unread/by-application - Get unread message counts per application for current user
router.get('/unread/by-application', authenticate, async (req, res) => {
    const userId = req.user.userId || req.user.id
    const userRole = req.user.role

    try {
        let unreadByApp = []
        
        if (userRole === 'candidate') {
            // Get unread counts per application
            const result = await query(
                `SELECT m.application_id, COUNT(*) as unread_count
         FROM messages m
         JOIN applications a ON m.application_id = a.id
         JOIN candidate_profiles cp ON a.candidate_id = cp.id
         WHERE cp.user_id = $1 
         AND m.sender_id != $1
         AND m.is_read = false
         GROUP BY m.application_id`,
                [userId]
            )
            unreadByApp = result.rows
        } else if (userRole === 'employer') {
            // Get unread counts per application
            const result = await query(
                `SELECT m.application_id, COUNT(*) as unread_count
         FROM messages m
         JOIN applications a ON m.application_id = a.id
         JOIN jobs j ON a.job_id = j.id
         JOIN tenants t ON j.tenant_id = t.id
         WHERE t.user_id = $1 
         AND m.sender_id != $1
         AND m.is_read = false
         GROUP BY m.application_id`,
                [userId]
            )
            unreadByApp = result.rows
        }

        res.json({ unreadByApplication: unreadByApp })
    } catch (err) {
        console.error('Error getting unread by application:', err)
        res.status(500).json({ error: 'Failed to get unread counts' })
    }
})

// GET /api/messages/unread/applications - Get all unread messages with application details
router.get('/unread/applications', authenticate, async (req, res) => {
    const userId = req.user.userId || req.user.id
    const userRole = req.user.role

    try {
        let result = []
        
        if (userRole === 'candidate') {
            result = await query(
                `SELECT DISTINCT
                    a.id as application_id,
                    a.status,
                    j.title as job_title,
                    t.company_name,
                    COUNT(m.id) as unread_count
                 FROM applications a
                 JOIN jobs j ON a.job_id = j.id
                 JOIN tenants t ON j.tenant_id = t.id
                 JOIN candidate_profiles cp ON a.candidate_id = cp.id
                 LEFT JOIN messages m ON m.application_id = a.id
                    AND m.sender_id != cp.user_id
                    AND m.is_read = false
                 WHERE cp.user_id = $1
                 GROUP BY a.id, a.status, j.title, t.company_name
                 HAVING COUNT(m.id) > 0
                 ORDER BY COUNT(m.id) DESC, a.created_at DESC`,
                [userId]
            )
        } else if (userRole === 'employer') {
            result = await query(
                `SELECT DISTINCT
                    a.id as application_id,
                    a.status,
                    j.title as job_title,
                    cp.first_name || ' ' || cp.last_name as candidate_name,
                    COUNT(m.id) as unread_count
                 FROM applications a
                 JOIN jobs j ON a.job_id = j.id
                 JOIN tenants t ON j.tenant_id = t.id
                 JOIN candidate_profiles cp ON a.candidate_id = cp.id
                 LEFT JOIN messages m ON m.application_id = a.id
                    AND m.sender_id != t.user_id
                    AND m.is_read = false
                 WHERE t.user_id = $1
                 GROUP BY a.id, a.status, j.title, cp.first_name, cp.last_name
                 HAVING COUNT(m.id) > 0
                 ORDER BY COUNT(m.id) DESC, a.created_at DESC`,
                [userId]
            )
        }

        res.json({ unreadApplications: result.rows || [] })
    } catch (err) {
        console.error('Error getting unread applications:', err)
        res.status(500).json({ error: 'Failed to get unread applications' })
    }
})

export default router
