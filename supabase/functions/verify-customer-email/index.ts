import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface VerifyEmailRequest {
  customer_id: string;
  token: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customer_id, token } = await req.json() as VerifyEmailRequest

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

    // TODO: Verify the token
    // For now, we'll just update the status

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update({
        status: 'active',
        email_verified_at: new Date().toISOString()
      })
      .eq('id', customer_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({
        customer: data,
        message: 'Email verified successfully'
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