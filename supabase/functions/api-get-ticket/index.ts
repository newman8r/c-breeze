import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface Tag {
  id: string
  name: string
  description: string
  color: string
  type: 'system' | 'custom'
}

interface TicketTag {
  tag_id: string
  created_at: string
  created_by: string
  tags: Tag
}

interface Customer {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
}

interface Ticket {
  id: string
  organization_id: string
  customer_id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  customers: Customer
  ticket_tags: TicketTag[]
}

console.log('Loading api-get-ticket function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is an employee
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get employee data to verify organization access
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: 'User is not an employee' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ticket ID from URL parameters
    const url = new URL(req.url)
    const ticketId = url.searchParams.get('ticket_id')

    if (!ticketId) {
      throw new Error('Ticket ID is required')
    }

    // Get ticket details with tags
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select(`
        id,
        organization_id,
        customer_id,
        title,
        description,
        status,
        priority,
        created_at,
        updated_at,
        customers (
          id,
          name,
          email
        ),
        ticket_tags (
          tag_id,
          created_at,
          created_by,
          tags (
            id,
            name,
            description,
            color,
            type
          )
        )
      `)
      .eq('id', ticketId)
      .eq('organization_id', employee.organization_id)
      .single()

    if (ticketError || !ticket) {
      console.error('Ticket error:', ticketError)
      throw new Error('Invalid ticket ID or ticket not found')
    }

    // Transform the tags data to be more API-friendly
    const transformedTicket = {
      ...ticket,
      tags: ticket.ticket_tags?.map(tt => ({
        ...tt.tags,
        added_at: tt.created_at,
        added_by: tt.created_by
      })) || [],
      ticket_tags: undefined // Remove the nested structure
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket: transformedTicket
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}) 