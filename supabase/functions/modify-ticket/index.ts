// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

interface ModifyTicketRequest {
  ticket_id: string
  status?: string
  priority?: string
  assigned_employee_id?: string | null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log request details
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Get and log the request body
    const requestBody = await req.json() as ModifyTicketRequest
    console.log('Request body:', requestBody)

    // Validate required fields
    if (!requestBody.ticket_id) {
      return new Response(
        JSON.stringify({ error: 'ticket_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Start building the update object
    const updates: Record<string, any> = {}

    // Handle status change
    if (requestBody.status) {
      console.log('Updating status to:', requestBody.status)
      updates.status = requestBody.status
    }

    // Handle priority change
    if (requestBody.priority) {
      console.log('Updating priority to:', requestBody.priority)
      updates.priority = requestBody.priority
    }

    // Handle assignment change
    if (requestBody.assigned_employee_id !== undefined) {
      console.log('Updating assignment to:', requestBody.assigned_employee_id)
      updates.assigned_employee_id = requestBody.assigned_employee_id
      
      // If assigning someone and status is 'open', automatically move to 'in_progress'
      if (requestBody.assigned_employee_id && !requestBody.status) {
        const { data: currentTicket } = await supabaseClient
          .from('tickets')
          .select('status')
          .eq('id', requestBody.ticket_id)
          .single()

        if (currentTicket?.status === 'open') {
          updates.status = 'in_progress'
        }
      }
    }

    console.log('Final updates object:', updates)

    // Update the ticket
    const { data, error } = await supabaseClient
      .from('tickets')
      .update(updates)
      .eq('id', requestBody.ticket_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating ticket:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ data, message: 'Ticket updated successfully' }),
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/modify-ticket' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
