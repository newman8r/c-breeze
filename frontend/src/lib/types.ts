export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'employee'
          organization_id: string
          is_root_admin: boolean
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: string
          priority: string
          created_at: string
          updated_at: string
          organization_id: string
          customer_id: string
          satisfaction_rating: number | null
        }
      }
    }
  }
} 