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
    console.log("Request received:", req.method)
    console.log("Request headers:", Object.fromEntries(req.headers.entries()))
    
    const requestBody = await req.json()
    console.log("Request body:", requestBody)
    
    const { email, description, organization_id } = requestBody as CustomerTicketRequest

    if (!email || !description || !organization_id) {
      throw new Error('Missing required fields: email, description, or organization_id')
    }

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

    console.log('Creating customer...')
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
      console.error('Customer creation error:', customerError)
      throw customerError
    }
    console.log('Customer created:', customer)

    console.log('Creating ticket...')
    // Create the ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        organization_id,
        customer_id: customer.id,
        title,
        description,
        status: 'open',
        priority: 'medium'
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      throw ticketError
    }
    console.log('Ticket created:', ticket)

    console.log('Creating ticket message...')
    // Create the initial message
    const { error: messageError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        organization_id,
        content: description,
        sender_type: 'customer',
        origin: 'ticket'
      })

    if (messageError) {
      console.error('Message creation error:', messageError)
      throw messageError
    }
    console.log('Message created successfully')

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
    console.error("Function error:", error)
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