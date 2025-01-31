import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { logAuditEvent } from '../_shared/audit.ts'

console.log("Loading modify-ticket-for-agent function...")

interface ModifyTicketRequest {
  ticket_id: string
  status?: string
  priority?: string
  assigned_to?: string | null
  satisfaction_rating?: number | null
}

serve(async (req) => {
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
    const requestBody = await req.json() as ModifyTicketRequest
    if (!requestBody.ticket_id) {
      throw new Error('ticket_id is required')
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current ticket state for audit log
    const { data: ticketBefore, error: getError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', requestBody.ticket_id)
      .single()

    if (getError) {
      throw new Error(`Failed to get ticket: ${getError.message}`)
    }

    // Update the ticket
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: requestBody.status,
        priority: requestBody.priority,
        assigned_to: requestBody.assigned_to,
        satisfaction_rating: requestBody.satisfaction_rating,
        updated_at: new Date().toISOString(),
        // Disable AI when assigning to a human
        ai_enabled: requestBody.assigned_to ? false : undefined
      })
      .eq('id', requestBody.ticket_id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update ticket: ${updateError.message}`)
    }

    // Log the audit event
    await logAuditEvent(supabase, {
      organization_id: ticketBefore.organization_id,
      actor_type: 'ai',
      action_type: 'update',
      action_description: 'AI agent modified ticket',
      resource_type: 'ticket',
      resource_id: requestBody.ticket_id,
      details_before: ticketBefore,
      details_after: ticket,
      status: 'success'
    })

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