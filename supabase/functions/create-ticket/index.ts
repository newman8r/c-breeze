// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.fresh.dev/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Hello from Functions!")

interface TicketRequest {
  title: string
  description: string
  customer_id?: string // Optional for internal tickets
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  due_date?: string
  assigned_to?: string
  tags?: string[]
  is_internal?: boolean
}

interface ErrorResponse {
  error: string
  details?: unknown
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    )

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Get employee record and verify permissions
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('id, organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('User is not an employee')
    }

    // Parse request body
    const requestData: TicketRequest = await req.json()

    // Validate required fields
    if (!requestData.title || !requestData.description || !requestData.priority) {
      throw new Error('Missing required fields')
    }

    // For internal tickets, we don't require a customer_id
    if (!requestData.is_internal && !requestData.customer_id) {
      throw new Error('Customer ID is required for non-internal tickets')
    }

    // If customer_id is provided, verify it belongs to the organization
    if (requestData.customer_id) {
      const { data: customerData, error: customerError } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('id', requestData.customer_id)
        .eq('organization_id', employeeData.organization_id)
        .single()

      if (customerError || !customerData) {
        throw new Error('Invalid customer ID')
      }
    }

    // Create the ticket
    const ticketData = {
      organization_id: employeeData.organization_id,
      customer_id: requestData.customer_id,
      title: requestData.title,
      description: requestData.description,
      status: 'open',
      priority: requestData.priority,
      category: requestData.category,
      source: requestData.is_internal ? 'internal' : 'employee',
      assigned_to: requestData.assigned_to,
      due_date: requestData.due_date ? new Date(requestData.due_date).toISOString() : null
    }

    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .insert(ticketData)
      .select()
      .single()

    if (ticketError) {
      throw new Error(`Failed to create ticket: ${ticketError.message}`)
    }

    // If tags were provided, create ticket-tag associations
    if (requestData.tags && requestData.tags.length > 0) {
      // First verify all tags exist and belong to the organization
      const { data: tagsData, error: tagsError } = await supabaseClient
        .from('tags')
        .select('id')
        .eq('organization_id', employeeData.organization_id)
        .in('id', requestData.tags)

      if (tagsError) {
        throw new Error('Error verifying tags')
      }

      if (tagsData.length !== requestData.tags.length) {
        throw new Error('One or more invalid tag IDs')
      }

      // Create ticket-tag associations
      const ticketTags = requestData.tags.map(tagId => ({
        ticket_id: ticket.id,
        tag_id: tagId
      }))

      const { error: tagAssocError } = await supabaseClient
        .from('ticket_tags')
        .insert(ticketTags)

      if (tagAssocError) {
        throw new Error('Error associating tags with ticket')
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Ticket created successfully',
        ticket
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    )

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: error.message
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-ticket' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
