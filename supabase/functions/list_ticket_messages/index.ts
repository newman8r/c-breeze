import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No auth header')
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user data
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      throw new Error('Invalid auth token')
    }

    // Get ticket_id from query params
    const url = new URL(req.url)
    const ticket_id = url.searchParams.get('ticket_id')
    if (!ticket_id) {
      throw new Error('Missing ticket_id parameter')
    }

    // Get user's organization
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('User not found in organization')
    }

    // Verify ticket belongs to user's organization
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('organization_id')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticketData) {
      throw new Error('Ticket not found')
    }

    if (ticketData.organization_id !== employeeData.organization_id) {
      throw new Error('Ticket does not belong to user\'s organization')
    }

    // Get messages for the ticket
    const { data: messages, error: messagesError } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket_id)
      .order('created_at', { ascending: false })

    if (messagesError) {
      throw messagesError
    }

    return new Response(
      JSON.stringify({
        messages: messages || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 