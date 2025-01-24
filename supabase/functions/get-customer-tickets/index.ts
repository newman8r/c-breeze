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

    // Get customer data for this user
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, organization_id')
      .eq('email', user.email)
      .single()

    if (customerError || !customerData) {
      throw new Error('Customer not found')
    }

    // Get tickets for this customer
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_messages(
          id,
          content,
          sender_type,
          created_at,
          is_private,
          responding_to_id,
          origin,
          metadata
        )
      `)
      .eq('customer_id', customerData.id)
      .eq('organization_id', customerData.organization_id)
      .order('created_at', { ascending: false })

    if (ticketsError) {
      throw ticketsError
    }

    // Filter out private messages from the response
    const ticketsWithPublicMessages = tickets.map(ticket => ({
      ...ticket,
      ticket_messages: ticket.ticket_messages
        .filter(message => !message.is_private)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }))

    return new Response(
      JSON.stringify({
        tickets: ticketsWithPublicMessages
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 