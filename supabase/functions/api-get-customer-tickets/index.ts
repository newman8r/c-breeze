import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Loading API get customer tickets function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get API key
    const apiKey = req.headers.get('apikey')
    console.log('Verifying API key...')
    if (!apiKey) {
      throw new Error('API key is required')
    }

    // Get the last 4 characters of the provided API key
    const keyLastFour = apiKey.slice(-4)
    console.log('Key last four:', keyLastFour)

    // First get the API key by last four digits
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('id, organization_id, employee_id, status, key_hash, key_last_four')
      .eq('key_last_four', keyLastFour)
      .eq('status', 'active')
      .single()

    if (apiKeyError) {
      console.error('API key error:', apiKeyError)
      throw new Error('Invalid API key')
    }

    // Now verify the full key
    const { data: verificationResults, error: verificationError } = await supabaseClient
      .rpc('verify_api_key', { key_to_verify: apiKey })

    if (verificationError) {
      console.error('API key verification error:', verificationError)
      throw new Error('Invalid API key')
    }

    const verificationData = verificationResults?.[0]
    if (!verificationData?.is_valid || verificationData.organization_id !== apiKeyData.organization_id) {
      console.error('API key verification failed')
      throw new Error('Invalid API key')
    }

    console.log('Found API key data:', apiKeyData)

    // Get email from URL parameters
    const url = new URL(req.url)
    const email = url.searchParams.get('email')

    if (!email) {
      throw new Error('Email is required')
    }

    // First get the customer by email
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('id')
      .eq('email', email)
      .eq('organization_id', apiKeyData.organization_id)
      .single()

    if (customerError) {
      console.error('Customer error:', customerError)
      throw new Error('Customer not found')
    }

    // Get all tickets for the customer
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('tickets')
      .select(`
        id,
        organization_id,
        customer_id,
        title,
        description,
        status,
        priority,
        created_at,
        updated_at,
        customers (
          id,
          name,
          email
        ),
        ticket_messages (
          id,
          content,
          sender_type,
          created_at,
          metadata
        )
      `)
      .eq('customer_id', customer.id)
      .eq('organization_id', apiKeyData.organization_id)
      .order('created_at', { ascending: false })

    if (ticketsError) {
      console.error('Tickets error:', ticketsError)
      throw new Error('Failed to fetch tickets')
    }

    // Format the response to group messages with their tickets
    const formattedTickets = tickets.map(ticket => ({
      ...ticket,
      messages: ticket.ticket_messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }))

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          email: email
        },
        tickets: formattedTickets
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}) 