import { createClient } from '@supabase/supabase-js'
import { serve } from 'https://deno.fresh.dev/std@v9.6.1/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface AuditLogRequest {
  organization_id: string
  actor_id?: string
  actor_type: 'employee' | 'customer' | 'ai' | 'system'
  action_type: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'other'
  action_description?: string
  action_meta?: Record<string, unknown>
  resource_type: 'system' | 'organization' | 'employee' | 'customer' | 'ticket' | 'tag' | 'invitation' | 'profile' | 'user_settings'
  resource_id?: string
  related_resources?: Record<string, unknown>[]
  details_before?: Record<string, unknown>
  details_after?: Record<string, unknown>
  ai_metadata?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'error' | 'critical'
  status?: 'success' | 'failure'
  error_code?: string
  error_message?: string
}

console.log('Loading audit-logger function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Start timing the request
    const startTime = performance.now()

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

    // Parse request body
    const requestBody: AuditLogRequest = await req.json()
    console.log('Received audit log request:', JSON.stringify(requestBody, null, 2))

    // Extract client information
    const clientInfo = {
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      // Note: In testing, we're not validating IP format
      // TODO: Implement proper IP validation for production
    }
    console.log('Client info:', JSON.stringify(clientInfo, null, 2))

    // Extract request context
    const requestId = req.headers.get('x-request-id')
    const sessionId = req.headers.get('x-session-id')
    console.log('Request context:', { requestId, sessionId })

    // Call the audit log function
    const { data: eventId, error } = await supabaseClient.rpc('log_audit_event', {
      _organization_id: requestBody.organization_id,
      _actor_id: requestBody.actor_id,
      _actor_type: requestBody.actor_type,
      _ip_address: null, // Explicitly set to null for testing
      _user_agent: clientInfo.user_agent,
      _action_type: requestBody.action_type,
      _action_description: requestBody.action_description,
      _action_meta: requestBody.action_meta,
      _resource_type: requestBody.resource_type,
      _resource_id: requestBody.resource_id,
      _related_resources: requestBody.related_resources,
      _details_before: requestBody.details_before,
      _details_after: requestBody.details_after,
      _ai_metadata: requestBody.ai_metadata,
      _session_id: sessionId,
      _request_id: requestId,
      _client_info: clientInfo,
      _duration_ms: Math.round(performance.now() - startTime),
      _severity: requestBody.severity || 'info',
      _status: requestBody.status || 'success',
      _error_code: requestBody.error_code,
      _error_message: requestBody.error_message
    })

    if (error) {
      console.error('Error logging audit event:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to log audit event',
          details: error.message
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

    console.log('Successfully logged audit event:', eventId)
    return new Response(
      JSON.stringify({
        message: 'Audit event logged successfully',
        event_id: eventId
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (err) {
    console.error('Unexpected error in audit logger:', err)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err.message
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