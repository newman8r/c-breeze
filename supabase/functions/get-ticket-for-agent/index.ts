import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"

console.log("Loading get-ticket-for-agent function...")

interface GetTicketRequest {
  ticket_id: string
  organization_id: string
  customer_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify service role key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Service role key is required')
    }
    const serviceKey = authHeader.replace('Bearer ', '')
    if (serviceKey !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      throw new Error('Invalid service role key')
    }

    // Get and validate request body
    const requestBody = await req.json() as GetTicketRequest
    if (!requestBody.ticket_id || !requestBody.organization_id || !requestBody.customer_id) {
      throw new Error('Missing required fields')
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get ticket data with all necessary joins
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        customer_id,
        organization_id,
        status,
        priority,
        assigned_to,
        satisfaction_rating,
        created_at,
        updated_at,
        messages:ticket_messages(
          id,
          content,
          sender_type,
          created_at,
          metadata
        ),
        analysis:ticket_analysis(
          id,
          status,
          vector_search_results,
          processing_results,
          response_generation_results,
          created_at,
          updated_at
        )
      `)
      .eq('id', requestBody.ticket_id)
      .eq('organization_id', requestBody.organization_id)
      .eq('customer_id', requestBody.customer_id)
      .order('created_at', { foreignTable: 'ticket_messages', ascending: true })
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      throw new Error('Failed to fetch ticket data')
    }

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    return new Response(
      JSON.stringify(ticket),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('service role key') ? 403 : 500
      }
    )
  }
}) 