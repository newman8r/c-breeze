import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Loading API add ticket message function...')

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

    // Parse request body
    const { ticket_id, message } = await req.json()

    if (!ticket_id || !message) {
      throw new Error('Ticket ID and message are required')
    }

    // Verify the ticket exists and belongs to the organization
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('id, organization_id, customer_id')
      .eq('id', ticket_id)
      .eq('organization_id', apiKeyData.organization_id)
      .single()

    if (ticketError || !ticket) {
      console.error('Ticket error:', ticketError)
      throw new Error('Invalid ticket ID or ticket not found')
    }

    // Create ticket message
    const { data: ticketMessage, error: messageError } = await supabaseClient
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        organization_id: apiKeyData.organization_id,
        content: message,
        sender_type: 'customer',
        metadata: {
          created_via: 'api',
          api_key_id: apiKeyData.id
        }
      })
      .select('id, created_at')
      .single()

    if (messageError) {
      console.error('Message error:', messageError)
      throw new Error('Failed to create ticket message')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: ticketMessage.id,
        created_at: ticketMessage.created_at
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