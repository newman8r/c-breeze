import { EmailTemplate, InviteEmployeeTemplate } from '../../../_shared/types.ts'

export function generateInviteEmployeeEmail(data: InviteEmployeeTemplate): EmailTemplate {
  const { organizationName, inviterName, role, inviteLink } = data
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #2C5282; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4A90E2;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer { color: #4A5568; font-size: 0.9em; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Join ${organizationName} on Ocean Breeze</h2>
          <p>Hello!</p>
          <p>${inviterName} has invited you to join ${organizationName} as a ${role} on Ocean Breeze, 
             your new customer support platform.</p>
          <p>Click the button below to accept your invitation and create your account:</p>
          <a href="${inviteLink}" class="button">Accept Invitation</a>
          <p>If you're unable to click the button, copy and paste this link into your browser:</p>
          <p>${inviteLink}</p>
          <div class="footer">
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Join ${organizationName} on Ocean Breeze

Hello!

${inviterName} has invited you to join ${organizationName} as a ${role} on Ocean Breeze, your new customer support platform.

To accept your invitation and create your account, visit this link:
${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
  `

  return {
    subject: `Join ${organizationName} on Ocean Breeze`,
    html,
    text
  }
} 