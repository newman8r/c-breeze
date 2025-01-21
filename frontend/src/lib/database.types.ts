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
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
      }
      employees: {
        Row: {
          id: string
          org_id: string
          email: string
          name: string
          role: string
          created_at: string
        }
      }
      invitations: {
        Row: {
          id: string
          org_id: string
          email: string
          name: string
          role: string
          created_at: string
          expires_at: string
          accepted: boolean
        }
      }
    }
    Functions: {
      get_current_user_organization: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Tables']['organizations']['Row'][]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: {
          role: 'admin' | 'employee'
          is_root_admin: boolean
          organization_id: string
        }[]
      }
      get_my_valid_invitations: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Tables']['invitations']['Row'][]
      }
    }
  }
} 