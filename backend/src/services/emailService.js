let resend = null
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@raadi.dev'

// Initialize Resend on module load
async function initializeResend() {
  try {
    const resendModule = await import('resend')
    const Resend = resendModule.Resend
    resend = new Resend(process.env.RESEND_API_KEY)
    console.log('Resend email service initialized successfully')
    return true
  } catch (err) {
    console.warn('⚠️  Resend not installed or not configured. Email features will not work.')
    console.warn('To enable email features, run: npm install resend')
    console.warn('Then set RESEND_API_KEY in your .env file')
    return false
  }
}

// Initialize on import
initializeResend().catch(err => {
  console.warn('Failed to initialize Resend:', err.message)
})

export const emailService = {
  // Send 2FA OTP code
  sendTwoFACode: async (email, code, userName) => {
    try {
      // Check if Resend is initialized
      if (!resend) {
        console.error('Resend email service not initialized. Install with: npm install resend')
        return { success: false, error: new Error('Email service not configured. Please install Resend: npm install resend') }
      }

      const { data, error } = await resend.emails.send({
        from: `RAADI <${SENDER_EMAIL}>`,
        to: email,
        subject: 'Your RAADI Two-Factor Authentication Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">RAADI</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Two-Factor Authentication</p>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center;">
              <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Hi ${userName},</p>
              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">Your authentication code is:</p>
              
              <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
              
              <p style="color: #999; font-size: 12px; margin: 20px 0 0 0;">This code expires in 10 minutes.</p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">© 2026 RAADI. All rights reserved.</p>
            </div>
          </div>
        `,
      })

      if (error) {
        console.error('Failed to send 2FA code email:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (err) {
      console.error('2FA email service error:', err)
      return { success: false, error: err }
    }
  },

  // Send tenant member invitation
  sendTenantInvitation: async (email, inviterName, tenantName, invitationLink) => {
    try {
      // Check if Resend is initialized
      if (!resend) {
        console.error('Resend email service not initialized')
        return { success: false, error: new Error('Email service not configured') }
      }

      const { data, error } = await resend.emails.send({
        from: `RAADI <${SENDER_EMAIL}>`,
        to: email,
        subject: `${inviterName} invited you to join ${tenantName} on RAADI`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">RAADI</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Employer Collaboration Platform</p>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 15px 0;">Hi there,</p>
              
              <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
                <strong>${inviterName}</strong> has invited you to join the <strong>${tenantName}</strong> employer team on RAADI.
              </p>
              
              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
                Accept the invitation to start collaborating with the team on job postings, applications, and candidate reviews.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #999; font-size: 12px; margin: 20px 0 0 0;">
                If you don't have a RAADI account yet, you'll be prompted to create one after accepting the invitation.
              </p>
              
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                If you'd prefer not to join, you can safely ignore this email.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">© 2026 RAADI. All rights reserved.</p>
            </div>
          </div>
        `,
      })

      if (error) {
        console.error('Failed to send tenant invitation email:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (err) {
      console.error('Tenant invitation email service error:', err)
      return { success: false, error: err }
    }
  },

  // Send member removal notification
  sendMemberRemovalNotification: async (email, userName, tenantName) => {
    try {
      // Check if Resend is initialized
      if (!resend) {
        console.error('Resend email service not initialized')
        return { success: false, error: new Error('Email service not configured') }
      }

      const { data, error } = await resend.emails.send({
        from: `RAADI <${SENDER_EMAIL}>`,
        to: email,
        subject: `You've been removed from ${tenantName} on RAADI`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">RAADI</h1>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 15px 0;">Hi ${userName},</p>
              
              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
                You have been removed from the <strong>${tenantName}</strong> team on RAADI. You no longer have access to this team's job postings and applications.
              </p>
              
              <p style="color: #999; font-size: 12px; margin: 20px 0 0 0;">
                If you believe this is a mistake, please contact the team administrator.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">© 2026 RAADI. All rights reserved.</p>
            </div>
          </div>
        `,
      })

      if (error) {
        console.error('Failed to send removal notification email:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (err) {
      console.error('Removal notification email service error:', err)
      return { success: false, error: err.message }
    }
  },

  // Send custom message to candidate (for bulk actions)
  sendCandidateMessage: async (email, candidateName, subject, messageBody, employerName, unreadCount = 0) => {
    try {
      if (!resend) {
        console.error('Resend email service not initialized')
        return { success: false, error: new Error('Email service not configured') }
      }

      const { data, error } = await resend.emails.send({
        from: `RAADI <${SENDER_EMAIL}>`,
        to: email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">RAADI</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Message from ${employerName}</p>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 15px 0;">Hi ${candidateName},</p>
              
              <div style="color: #444; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 25px;">
                ${messageBody}
              </div>
              
              <div style="background-color: #e8f4f8; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #1e40af; font-size: 13px; margin: 0; font-weight: 500;">
                  You have ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''} waiting for you.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:5173/auth" style="background-color: #2563eb; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 14px;">
                  Login to Reply
                </a>
              </div>
              
              <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  This message was sent via RAADI on behalf of ${employerName}.
                </p>
                <p style="color: #999; font-size: 11px; margin: 5px 0 0 0;">
                  Click the "Login to Reply" button above to respond directly to this message.
                </p>
              </div>
            </div>
          </div>
        `,
      })

      if (error) {
        console.error('Failed to send candidate message:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (err) {
      console.error('Candidate message email service error:', err)
      return { success: false, error: err.message }
    }
  },
}
