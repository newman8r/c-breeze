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
  assigned_employee_id?: string | null
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
    if (requestBody.assigned_employee_id !== undefined) {
      console.log('Updating assignment to:', requestBody.assigned_employee_id)
      updates.assigned_employee_id = requestBody.assigned_employee_id
      
      // If assigning someone and status is 'open', automatically move to 'in_progress'
      if (requestBody.assigned_employee_id && !requestBody.status && currentTicket.status === 'open') {
        updates.status = 'in_progress'
      }
    }

    console.log('Final updates object:', updates)

    // Update the ticket
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

    // Create audit log entry
    const changes: Record<string, { from: any; to: any }> = {}
    Object.keys(updates).forEach(key => {
      if (currentTicket[key] !== updatedTicket[key]) {
        changes[key] = {
          from: currentTicket[key],
          to: updatedTicket[key]
        }
      }
    })

    // Get organization ID from the ticket
    const { data: ticketOrg } = await supabaseClient
      .from('tickets')
      .select('organization_id')
      .eq('id', requestBody.ticket_id)
      .single()

    // Get client IP address
    const clientIp = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip')

    console.log('Logging ticket modification to audit log...')
    const { success: auditSuccess, error: auditError } = await logAuditEvent(supabaseClient, {
      organization_id: ticketOrg.organization_id,
      actor_id: user.id,
      actor_type: 'employee',
      action_type: 'update',
      resource_type: 'ticket',
      resource_id: requestBody.ticket_id,
      action_description: `Modified ticket: ${Object.keys(changes).join(', ')}`,
      action_meta: changes,
      details_before: currentTicket,
      details_after: updatedTicket,
      severity: 'info',
      status: 'success',
      client_ip: clientIp
    })

    if (!auditSuccess) {
      console.error('Failed to log audit event:', auditError)
      // Don't throw error here - we don't want to fail the ticket update if audit logging fails
    } else {
      console.log('Successfully created audit log entry')
    }

    return new Response(
      JSON.stringify({ data: updatedTicket, message: 'Ticket updated successfully' }),
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
