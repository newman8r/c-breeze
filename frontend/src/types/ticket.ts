export interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  customer: {
    name: string
    email: string
    company?: string
    phone?: string
  }
  assigned_employee?: {
    id: string
    first_name: string
    last_name: string
  } | null
  team?: string
  due_date?: string
  ticket_tags: Array<{
    tag: {
      name: string
    }
  }>
  status_changes?: Array<{
    new_status: string
    timestamp: string
  }>
  activities?: Array<{
    user: string
    action: string
    timestamp: string
  }>
  attachments?: Array<{
    name: string
    size: string
  }>
}

export interface SelectedTicket {
  id: string
  isOpen: boolean
}

export interface CreateTicketForm {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_internal: boolean
  customer_id?: string
  category?: string
  due_date?: string
} 