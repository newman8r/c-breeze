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

    // Get user ID from auth header if available
    let userId: string | undefined
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1]
        const { data: { user } } = await supabaseClient.auth.getUser(token)
        userId = user?.id
      } catch (error) {
        console.warn('Could not get user ID from token:', error)
      }
    }

    // Get organization ID from the ticket
    const { data: ticketOrg } = await supabaseClient
      .from('tickets')
      .select('organization_id')
      .eq('id', requestBody.ticket_id)
      .single()

    const auditEntry: AuditLogEntry = {
      organization_id: ticketOrg.organization_id,
      actor_id: userId,
      actor_type: userId ? 'employee' : 'system',
      action_type: 'update',
      action_description: `Modified ticket: ${Object.keys(changes).join(', ')}`,
      resource_type: 'ticket',
      resource_id: requestBody.ticket_id,
      details_before: currentTicket,
      details_after: updatedTicket
    }

    console.log('Attempting to create audit log entry:', auditEntry)

    const { error: auditError } = await supabaseClient
      .rpc('log_audit_event', {
        _organization_id: auditEntry.organization_id,
        _actor_id: auditEntry.actor_id,
        _actor_type: auditEntry.actor_type,
        _action_type: auditEntry.action_type,
        _action_description: auditEntry.action_description,
        _resource_type: auditEntry.resource_type,
        _resource_id: auditEntry.resource_id,
        _details_before: auditEntry.details_before,
        _details_after: auditEntry.details_after
      })

    if (auditError) {
      console.error('Error creating audit log entry. Full error:', auditError)
      console.error('Error code:', auditError.code)
      console.error('Error message:', auditError.message)
      console.error('Error details:', auditError.details)
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
