import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AuditLogRequest {
  organization_id: string
  actor_type: 'employee' | 'customer' | 'ai' | 'system'
  action_type: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'other'
  resource_type: string
  action_description?: string
  action_meta?: Record<string, unknown>
  resource_id?: string
  related_resources?: Record<string, unknown>[]
  details_before?: Record<string, unknown>
  details_after?: Record<string, unknown>
  ai_metadata?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'error' | 'critical'
  error_code?: string
  error_message?: string
  duration_ms?: number
}

console.log('Loading audit-logger function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const body: AuditLogRequest = await req.json()

    // Create Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError

    // Extract client information
    const clientInfo = {
      ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      // Add any other relevant client info
    }

    // Call the audit log function
    const { data, error } = await supabaseClient.rpc('log_audit_event', {
      _organization_id: body.organization_id,
      _actor_id: user?.id,
      _actor_type: body.actor_type,
      _ip_address: clientInfo.ip,
      _user_agent: clientInfo.user_agent,
      _action_type: body.action_type,
      _action_description: body.action_description,
      _action_meta: body.action_meta,
      _resource_type: body.resource_type,
      _resource_id: body.resource_id,
      _related_resources: body.related_resources,
      _details_before: body.details_before,
      _details_after: body.details_after,
      _ai_metadata: body.ai_metadata,
      _session_id: req.headers.get('x-session-id'),
      _request_id: req.headers.get('x-request-id'),
      _client_info: clientInfo,
      _duration_ms: body.duration_ms,
      _severity: body.severity || 'info',
      _status: body.error_code ? 'failure' : 'success',
      _error_code: body.error_code,
      _error_message: body.error_message
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, event_id: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 