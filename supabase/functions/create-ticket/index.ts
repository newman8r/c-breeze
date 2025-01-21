// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

interface TicketData {
  title: string
  description: string
  customer_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  due_date?: string
  is_internal: boolean
}

serve(async (req: Request) => {
  try {
    console.log("Request received:", req.method)
    
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log("Handling CORS preflight")
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    console.log("Auth header present:", !!authHeader)
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('URL') ?? '',
      Deno.env.get('KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Get user and employee data
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()
    
    console.log("User found:", !!user, "User error:", !!userError)

    if (userError || !user) {
      console.error("User error:", userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get employee record to get organization_id
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()
    
    console.log("Employee found:", !!employee, "Employee error:", !!employeeError)

    if (employeeError || !employee) {
      console.error("Employee error:", employeeError)
      return new Response(JSON.stringify({ error: 'User is not an employee' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const ticketData: TicketData = await req.json()
    console.log("Received ticket data:", ticketData)

    // Validate required fields
    if (!ticketData.title || !ticketData.description || !ticketData.priority) {
      console.log("Missing required fields")
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // For internal tickets, create a special internal customer if one doesn't exist
    let customerId = ticketData.customer_id
    if (ticketData.is_internal) {
      console.log("Processing internal ticket")
      const { data: internalCustomer, error: customerError } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('organization_id', employee.organization_id)
        .eq('email', 'internal@organization.com')
        .single()
      
      console.log("Internal customer found:", !!internalCustomer, "Customer error:", !!customerError)

      if (customerError) {
        console.log("Creating internal customer")
        // Create internal customer
        const { data: newCustomer, error: createError } = await supabaseClient
          .from('customers')
          .insert({
            organization_id: employee.organization_id,
            name: 'Internal',
            email: 'internal@organization.com',
            status: 'active'
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating internal customer:", createError)
          return new Response(JSON.stringify({ error: 'Failed to create internal customer' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        customerId = newCustomer.id
      } else {
        customerId = internalCustomer.id
      }
      console.log("Using customer ID:", customerId)
    } else if (!customerId) {
      console.log("Missing customer ID for non-internal ticket")
      return new Response(JSON.stringify({ error: 'Customer ID is required for non-internal tickets' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create ticket
    console.log("Creating ticket with data:", {
      organization_id: employee.organization_id,
      customer_id: customerId,
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      category: ticketData.category,
      due_date: ticketData.due_date,
      source: ticketData.is_internal ? 'internal' : 'employee',
      assigned_to: employee.id
    })

    const { data: ticket, error: insertError } = await supabaseClient
      .from('tickets')
      .insert([{
        organization_id: employee.organization_id,
        customer_id: customerId,
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        due_date: ticketData.due_date,
        source: ticketData.is_internal ? 'internal' : 'employee',
        assigned_to: employee.id // Assign to the creating employee by default
      }])
      .select()
      .single()

    if (insertError) {
      console.error("Error creating ticket:", insertError)
      return new Response(JSON.stringify({ error: 'Failed to create ticket', details: insertError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log("Ticket created successfully:", ticket)
    return new Response(JSON.stringify({ ticket }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (error) {
    console.error("Caught error:", error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
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
