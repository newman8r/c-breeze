import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../lib/database.types'

let browserClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const createClient = () => {
  if (browserClient) return browserClient
  
  browserClient = createClientComponentClient<Database>()
  return browserClient
}

export const signOut = async () => {
  console.log('Starting sign out process...')
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    console.log('Supabase sign out successful')
    
    // Clear all storage in one go
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
    
    // Force reload without using router
    window.location.href = '/'
    
  } catch (error) {
    console.error('Sign out error:', error)
    window.location.href = '/'
  }
}

export const getRecentOrganizationTickets = async (organizationId: string) => {
  if (!organizationId) {
    throw new Error('Organization ID is required')
  }

  console.log('Fetching tickets for organization:', organizationId)
  const supabase = createClient()
  
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(id, name, email),
      assigned_employee:employees!tickets_assigned_to_fkey(id, name),
      resolved_employee:employees!tickets_resolved_by_fkey(id, name),
      ticket_tags(
        tag:tags(id, name, color)
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(200)
  
  if (error) {
    console.error('Error fetching tickets:', error)
    throw error
  }
  
  console.log('Fetched tickets:', tickets)
  return tickets
}

interface CreateTicketForm {
  title: string;
  description: string;
  customer_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  due_date?: string;
  is_internal: boolean;
}

export const createTicket = async (createTicketForm: CreateTicketForm) => {
  const supabase = createClient()
  
  // Get current session and access token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) {
    throw new Error('No access token available')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(createTicketForm)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create ticket')
  }

  return response.json()
} 