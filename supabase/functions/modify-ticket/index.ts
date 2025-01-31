// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAuditEvent } from '../_shared/audit.ts'

console.log("Hello from Functions!")

interface ModifyTicketRequest {
  ticket_id: string
  status?: string
  priority?: string
  assigned_to?: string | null
  satisfaction_rating?: number | null
  ai_enabled?: boolean
}

interface AuditLogEntry {
  organization_id: string
  actor_id?: string
  actor_type: 'employee' | 'customer' | 'ai' | 'system'
  action_type: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'other'
  action_description: string
  resource_type: 'ticket'
  resource_id: string
  details_before?: any
  details_after?: any
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

    // Verify auth
    const authHeader = req.headers.get('Authorization')
    console.log("Auth header present:", !!authHeader)
    
    if (!authHeader || authHeader === 'Bearer undefined') {
      return new Response(
        JSON.stringify({ error: 'No valid auth header' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Get the current state of the ticket for audit logging
    const { data: currentTicket, error: fetchError } = await supabaseClient
      .from('tickets')
      .select('*')
      .eq('id', requestBody.ticket_id)
      .single()

    if (fetchError) {
      console.error('Error fetching current ticket:', fetchError)
      throw fetchError
    }

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
    if (requestBody.assigned_to !== undefined) {
      console.log('Updating assignment to:', requestBody.assigned_to)
      updates.assigned_to = requestBody.assigned_to
      
      // If assigning someone and status is 'open', automatically move to 'in_progress'
      if (requestBody.assigned_to && !requestBody.status && currentTicket.status === 'open') {
        updates.status = 'in_progress'
      }
    }

    // Handle AI enabled toggle
    if (requestBody.ai_enabled !== undefined) {
      console.log('Updating AI enabled to:', requestBody.ai_enabled)
      updates.ai_enabled = requestBody.ai_enabled
    }

    // Handle satisfaction rating change
    if (requestBody.satisfaction_rating !== undefined) {
      console.log('Updating satisfaction rating to:', requestBody.satisfaction_rating)
      // Validate rating is between 1 and 5
      if (requestBody.satisfaction_rating !== null && 
          (requestBody.satisfaction_rating < 1 || requestBody.satisfaction_rating > 5)) {
        throw new Error('Satisfaction rating must be between 1 and 5')
      }
      updates.satisfaction_rating = requestBody.satisfaction_rating
    }

    console.log('Final updates object:', updates)

    // Only proceed with update if there are changes
    if (Object.keys(updates).length > 0) {
      const { data: updatedTicket, error: updateError } = await supabaseClient
        .from('tickets')
        .update(updates)
        .eq('id', requestBody.ticket_id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating ticket:', updateError)
        throw updateError
      }

      // Log the audit event
      await logAuditEvent(supabaseClient, {
        organization_id: currentTicket.organization_id,
        actor_id: user.id,
        actor_type: 'employee',
        action_type: 'update',
        action_description: 'Modified ticket',
        resource_type: 'ticket',
        resource_id: requestBody.ticket_id,
        details_before: currentTicket,
        details_after: updatedTicket,
        status: 'success'
      })

      return new Response(
        JSON.stringify(updatedTicket),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify(currentTicket),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
