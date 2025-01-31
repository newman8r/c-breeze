import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Database } from '../_shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { organizationId, title, description, priority, category, customerEmail, customerName, aiMetadata } = await req.json()

    // First, try to find existing customer
    const { data: existingCustomer } = await supabaseClient
      .from('customers')
      .select('id')
      .eq('email', customerEmail)
      .eq('organization_id', organizationId)
      .single()

    let customerId: string

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabaseClient
        .from('customers')
        .insert({
          email: customerEmail,
          name: customerName,
          organization_id: organizationId,
          created_by_ai: true,
          status: 'active',
          contact_info: {
            email: customerEmail,
            source: 'ai_created'
          }
        })
        .select()
        .single()

      if (customerError) throw customerError
      customerId = newCustomer.id
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .insert({
        organization_id: organizationId,
        customer_id: customerId,
        title,
        description,
        priority: 'low',
        category,
        status: 'open',
        created_by_ai: true,
        ai_metadata: aiMetadata
      })
      .select()
      .single()

    if (ticketError) throw ticketError

    return new Response(
      JSON.stringify({
        success: true,
        ticket
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 
