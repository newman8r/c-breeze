import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders } from "../_shared/cors.ts"
import { SendEmailRequest } from "../send_email/_shared/types.ts"

interface CreateInvitationRequest {
  invitee_email: string
  invitee_name?: string
  role: 'admin' | 'employee'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the JWT from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    const jwt = authHeader.replace('Bearer ', '')

    // Create a new Supabase client for this request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
    })

    // Get current user's data from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError) {
      throw new Error(`User error: ${userError.message}`)
    }
    if (!user) {
      throw new Error('No user found in session')
    }

    // Get the request body
    const { invitee_email, invitee_name, role } = await req.json() as CreateInvitationRequest

    // Validate input
    if (!invitee_email) {
      throw new Error('Email is required')
    }
    if (!role || !['admin', 'employee'].includes(role)) {
      throw new Error('Valid role (admin or employee) is required')
    }

    // Get the current user's organization and verify they are an admin
    const { data: userData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (employeeError) {
      throw new Error(`Employee error: ${employeeError.message}`)
    }
    if (!userData) {
      throw new Error('No employee record found')
    }

    if (userData.role !== 'admin') {
      throw new Error('Only admins can create invitations')
    }

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('invitations')
      .insert({
        organization_id: userData.organization_id,
        invitee_email,
        invitee_name,
        role,
        invited_by: user.id
      })
      .select()
      .single()

    if (inviteError) {
      throw new Error(`Invitation error: ${inviteError.message}`)
    }
    if (!invitation) {
      throw new Error('Failed to create invitation record')
    }

    // Get organization name for the email
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select('name')
      .eq('id', userData.organization_id)
      .single()

    if (orgError) {
      throw new Error(`Organization error: ${orgError.message}`)
    }
    if (!orgData) {
      throw new Error('Organization not found')
    }

    // Generate invite link
    const inviteLink = `${Deno.env.get('FRONTEND_URL')}/invitation?token=${invitation.id}`

    // Send invitation email using our existing send_email function
    const emailRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send_email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        to: invitee_email,
        template: 'invite-employee',
        data: {
          organizationName: orgData.name,
          inviterName: user.email,
          role: role,
          inviteLink: inviteLink
        }
      } as SendEmailRequest)
    })

    const emailData = await emailRes.json()
    console.log('Email response:', emailData)

    if (!emailRes.ok) {
      // If email fails, invalidate the invitation
      await supabaseClient
        .from('invitations')
        .update({ is_invalidated: true })
        .eq('id', invitation.id)

      throw new Error(`Failed to send invitation email: ${emailData.error || JSON.stringify(emailData)}`)
    }

    return new Response(
      JSON.stringify({ success: true, invitation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create_invitation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 