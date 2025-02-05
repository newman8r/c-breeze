import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface TicketMessage {
  ticket_id: string;
  content: string;
  is_private?: boolean;
  responding_to_id?: string;
  origin?: 'ticket' | 'email' | 'chat' | 'sms' | 'phone' | 'api' | 'other';
  metadata?: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No auth header')
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user data
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      throw new Error('Invalid auth token')
    }

    // Get request data
    const { ticket_id, content, is_private = false, responding_to_id, origin = 'ticket', metadata = {} }: TicketMessage = await req.json()

    // Validate required fields
    if (!ticket_id || !content) {
      throw new Error('Missing required fields: ticket_id or content')
    }

    // First try to get employee data
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()

    // If employee not found, try to get customer data
    if (employeeError || !employeeData) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, organization_id')
        .eq('email', user.email)
        .single()

      if (customerError || !customerData) {
        throw new Error('User not found as employee or customer')
      }

      // Verify the ticket belongs to this customer
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', ticket_id)
        .eq('customer_id', customerData.id)
        .eq('organization_id', customerData.organization_id)
        .single()

      if (ticketError || !ticketData) {
        throw new Error('Ticket not found or access denied')
      }

      // Create the message as customer
      const { data: message, error: messageError } = await supabase
        .from('ticket_messages')
        .insert([{
          ticket_id,
          organization_id: customerData.organization_id,
          sender_id: user.id,
          content,
          sender_type: 'customer',
          is_private,
          responding_to_id,
          origin,
          metadata
        }])
        .select()
        .single()

      if (messageError) {
        throw messageError
      }

      return new Response(
        JSON.stringify({ message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Employee flow - verify ticket belongs to organization
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticket_id)
      .eq('organization_id', employeeData.organization_id)
      .single()

    if (ticketError || !ticketData) {
      throw new Error('Ticket not found or access denied')
    }

    // Create the message as employee
    const { data: message, error: messageError } = await supabase
      .from('ticket_messages')
      .insert([{
        ticket_id,
        organization_id: employeeData.organization_id,
        sender_id: user.id,
        content,
        sender_type: 'employee',
        is_private,
        responding_to_id,
        origin,
        metadata
      }])
      .select()
      .single()

    if (messageError) {
      throw messageError
    }

    return new Response(
      JSON.stringify({ message }),
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