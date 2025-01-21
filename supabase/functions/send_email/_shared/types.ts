export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface SendEmailRequest {
  to: string
  template: string
  data?: Record<string, unknown>
}

export interface SendEmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface ErrorResponse {
  error: string
  details?: unknown
}

// Template specific interfaces
export interface InviteEmployeeTemplate {
  organizationName: string
  inviterName: string
  role: 'admin' | 'employee'
  inviteLink: string
} 