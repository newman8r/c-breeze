import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Loading API update ticket tags function...')

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
    const { ticket_id, tags, organization_id } = await req.json()

    if (!ticket_id || !tags || !Array.isArray(tags)) {
      throw new Error('Ticket ID and tags array are required')
    }

    // Verify the ticket exists and belongs to the organization
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('id, organization_id')
      .eq('id', ticket_id)
      .eq('organization_id', organization_id)
      .single()

    if (ticketError || !ticket) {
      console.error('Ticket error:', ticketError)
      throw new Error('Invalid ticket ID or ticket not found')
    }

    // First, remove existing tags for this ticket
    const { error: deleteError } = await supabaseClient
      .from('ticket_tags')
      .delete()
      .eq('ticket_id', ticket_id)

    if (deleteError) {
      console.error('Error deleting existing tags:', deleteError)
      throw new Error('Failed to update ticket tags')
    }

    // Then insert new tags
    if (tags.length > 0) {
      const tagInserts = tags.map(tag => ({
        ticket_id,
        organization_id,
        tag_name: tag,
        created_at: new Date().toISOString(),
        created_by: 'ai_agent'
      }))

      const { error: insertError } = await supabaseClient
        .from('ticket_tags')
        .insert(tagInserts)

      if (insertError) {
        console.error('Error inserting new tags:', insertError)
        throw new Error('Failed to insert new tags')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id,
        tags_count: tags.length
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