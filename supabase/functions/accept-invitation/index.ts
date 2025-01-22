import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Accept invitation function started')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get the invitation ID from the request
    const { invitationId } = await req.json()
    if (!invitationId) {
      throw new Error('Invitation ID is required')
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invalid invitation')
    }

    // Verify invitation is valid
    if (
      invitation.is_accepted ||
      invitation.is_invalidated ||
      invitation.expires_at < new Date().toISOString() ||
      invitation.invitee_email !== user.email
    ) {
      throw new Error('Invalid or expired invitation')
    }

    // Create employee record and mark invitation as accepted in a transaction
    const { data: result, error: transactionError } = await supabaseClient.rpc(
      'accept_invitation',
      {
        _invitation_id: invitationId,
        _user_id: user.id
      }
    )

    if (transactionError) {
      throw transactionError
    }

    return new Response(
      JSON.stringify({ message: 'Invitation accepted successfully' }),
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