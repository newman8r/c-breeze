import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

let browserClient: ReturnType<typeof createClientComponentClient<any>> | null = null

export const createClient = () => {
  if (browserClient) return browserClient
  
  browserClient = createClientComponentClient<any>()
  return browserClient
}

export const signOut = async () => {
  console.log('Starting sign out process...')
  const supabase = createClient()
  
  try {
    // First call our edge function to log the event and invalidate the session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { error: logoutError } = await supabase.functions.invoke('handle-logout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      if (logoutError) {
        console.error('Error calling logout function:', logoutError)
        // Continue with local cleanup even if the edge function fails
      }
    }

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
    // Still redirect to home page on error
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
      id,
      title,
      description,
      status,
      priority,
      created_at,
      updated_at,
      organization_id,
      customer_id,
      satisfaction_rating,
      customer:customers(
        id,
        name,
        email
      ),
      assigned_employee:employees!tickets_assigned_to_fkey(
        id,
        first_name,
        last_name
      ),
      ticket_tags(
        tag:tags(
          id,
          name,
          color
        )
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(200)
  
  if (error) {
    console.error('Error fetching tickets:', error)
    throw error
  }
  
  // Transform the tickets to include tags array
  const transformedTickets = tickets.map(ticket => ({
    ...ticket,
    customer: ticket.customer?.[0] || { id: '', name: '', email: '' },
    assigned_employee: ticket.assigned_employee?.[0] || null,
    tags: (ticket.ticket_tags || []).map(tt => ({
      ...tt.tag,
      description: '',
      type: 'custom' as const
    })),
    ticket_tags: ticket.ticket_tags?.map(tt => ({
      tag: tt.tag[0] || { id: '', name: '', color: '' }
    })) || []
  }))
  
  console.log('Fetched and transformed tickets:', transformedTickets)
  return transformedTickets
}

export const createTicket = async (ticketData: any) => {
  const supabase = createClient()
  
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()
  console.log('Session check:', session)

  if (!session) {
    throw new Error('No session available')
  }

  // Use the Supabase client's functions feature
  const { data, error } = await supabase.functions.invoke(
    'create-ticket',
    {
      body: ticketData,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    }
  )

  if (error) {
    console.error('Function error:', error)
    throw error
  }

  return data
} 