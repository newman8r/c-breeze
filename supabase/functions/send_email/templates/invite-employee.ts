import { EmailTemplate, InviteEmployeeTemplate } from '../../_shared/types.ts'

export function generateInviteEmployeeEmail(data: InviteEmployeeTemplate): EmailTemplate {
  const { organizationName, inviterName, role, inviteLink } = data

  const subject = `Invitation to join ${organizationName} as ${role}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2C5282;">Join ${organizationName}</h2>
      <p>Hello,</p>
      <p>You've been invited by ${inviterName} to join ${organizationName} as a ${role}.</p>
      <p>Click the link below to accept your invitation:</p>
      <p>
        <a 
          href="${inviteLink}" 
          style="display: inline-block; padding: 10px 20px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px;"
        >
          Accept Invitation
        </a>
      </p>
      <p style="color: #666; font-size: 0.9em;">This invitation will expire in 7 days.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #666; font-size: 0.8em;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `

  const text = `
Join ${organizationName}

Hello,

You've been invited by ${inviterName} to join ${organizationName} as a ${role}.

Click the link below to accept your invitation:
${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim()

  return {
    subject,
    html,
    text
  }
} 