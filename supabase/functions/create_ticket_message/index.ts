import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface TicketMessage {
  ticket_id: string
  content: string
  is_private: boolean
  responding_to_id?: string
  origin?: 'ticket' | 'email' | 'chat' | 'sms' | 'phone' | 'api' | 'other'
  metadata?: Record<string, unknown>
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
    const { ticket_id, content, is_private, responding_to_id, origin = 'ticket', metadata = {} }: TicketMessage = await req.json()

    // Validate required fields
    if (!ticket_id || !content) {
      throw new Error('Missing required fields')
    }

    // Get user's organization and role
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('User not found in organization')
    }

    // Verify ticket belongs to user's organization
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('organization_id')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticketData) {
      throw new Error('Ticket not found')
    }

    if (ticketData.organization_id !== employeeData.organization_id) {
      throw new Error('Ticket does not belong to user\'s organization')
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id,
        organization_id: employeeData.organization_id,
        sender_id: user.id,
        sender_type: 'employee',
        content,
        responding_to_id,
        origin,
        is_private,
        metadata
      })
      .select()
      .single()

    if (messageError) {
      throw messageError
    }

    return new Response(
      JSON.stringify({
        message: 'Message created successfully',
        data: message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 