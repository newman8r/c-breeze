// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Request received:", req.method)

    // Verify auth
    const authHeader = req.headers.get('Authorization')
    console.log("Auth header present:", !!authHeader)
    
    if (!authHeader) {
      throw new Error('No auth header')
    }

    // Get request body
    const { title, description, priority } = await req.json()

    // Required fields validation
    if (!title || !description || !priority) {
      throw new Error('Missing required fields')
    }

    // Initialize Supabase client with auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) {
      throw new Error('Invalid auth token')
    }

    // Get user's organization
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('Could not find organization')
    }

    console.log('Organization ID:', employeeData.organization_id)

    // Get or create internal customer for this organization
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', employeeData.organization_id)
      .eq('email', 'internal@organization.com')
      .single()

    if (customerError) {
      // Create internal customer if not found
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([{
          organization_id: employeeData.organization_id,
          name: 'Internal',
          email: 'internal@organization.com',
          status: 'active',
          contact_info: {}
        }])
        .select()
        .single()

      if (createError) throw createError
      customer = newCustomer
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert([{
        title,
        description,
        priority,
        organization_id: employeeData.organization_id,
        customer_id: customer.id,
        status: 'open'
      }])
      .select()
      .single()

    if (ticketError) throw ticketError

    return new Response(JSON.stringify(ticket), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Caught error:", error)

    return new Response(
      JSON.stringify({ error: error.message }),
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
