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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          contact_info: Json | null
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          name: string
          organization_id: string
          status: string | null
          user_id: string | null
          created_by_ai: boolean | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string
          email: string
          id?: string
          last_login_at?: string | null
          name: string
          organization_id: string
          status?: string | null
          user_id?: string | null
          created_by_ai?: boolean | null
        }
      }
      tickets: {
        Row: {
          ai_metadata: Json | null
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by_ai: boolean | null
          customer_id: string
          description: string
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          satisfaction_rating: number | null
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_metadata?: Json | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by_ai?: boolean | null
          customer_id: string
          description: string
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          satisfaction_rating?: number | null
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
      }
    }
  }
} 