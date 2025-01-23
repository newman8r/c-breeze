// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Loading handle-logout function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    )

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No auth header')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid auth token')
    }

    // Get the user's organization
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('Could not find organization')
    }

    // Extract client information
    const clientIp = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip')
    
    const clientInfo = {
      ip: clientIp,
      user_agent: req.headers.get('user-agent')
    }

    // Log the logout event
    const { error: auditError } = await supabaseClient.rpc('log_audit_event', {
      _organization_id: employeeData.organization_id,
      _actor_id: user.id,
      _actor_type: 'employee',
      _action_type: 'execute',
      _resource_type: 'system',
      _action_description: 'User logged out',
      _action_meta: {
        email: user.email
      },
      _severity: 'info',
      _status: 'success',
      _ip_address: clientIp,
      _user_agent: clientInfo.user_agent,
      _client_info: clientInfo,
      _request_id: req.headers.get('x-request-id'),
      _session_id: null,
      _error_code: null,
      _error_message: null,
      _details_before: null,
      _details_after: null,
      _related_resources: null,
      _ai_metadata: null,
      _duration_ms: null
    })

    if (auditError) {
      console.error('Error logging logout:', auditError)
      // Don't throw, continue with logout
    }

    // Use the regular signOut instead of admin.signOut
    const { error: signOutError } = await supabaseClient.auth.signOut({
      scope: 'global'
    })

    if (signOutError) {
      throw signOutError
    }

    return new Response(
      JSON.stringify({ message: 'Logged out successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (err) {
    console.error('Logout error:', err)
    return new Response(
      JSON.stringify({
        error: 'Failed to handle logout',
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
}) 