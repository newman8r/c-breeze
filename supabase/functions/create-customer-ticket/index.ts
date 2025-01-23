import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface CustomerTicketRequest {
  email: string;
  description: string;
  organization_id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, description, organization_id } = await req.json() as CustomerTicketRequest

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Generate a title from the first few words (max 50 chars)
    const title = description.split(' ').reduce((acc, word) => {
      if (acc.length + word.length + 1 <= 50) {
        return acc + (acc ? ' ' : '') + word
      }
      return acc
    }, '')

    // Start a transaction
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        organization_id,
        email,
        name: email.split('@')[0], // Temporary name from email
        status: 'pending_verification'
      })
      .select()
      .single()

    if (customerError) {
      throw customerError
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        organization_id,
        customer_id: customer.id,
        title,
        status: 'open',
        priority: 'medium'
      })
      .select()
      .single()

    if (ticketError) {
      throw ticketError
    }

    // Create the initial message
    const { error: messageError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        content: description,
        sender_type: 'customer',
        message_origin: 'ticket'
      })

    if (messageError) {
      throw messageError
    }

    // TODO: Send verification email
    // For now, we'll just log that we would send it
    console.log('Would send verification email to:', email)

    return new Response(
      JSON.stringify({
        customer,
        ticket,
        message: 'Customer and ticket created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 