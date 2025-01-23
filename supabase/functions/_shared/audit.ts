import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuditLogParams {
  organization_id: string
  actor_id?: string
  actor_type: 'employee' | 'customer' | 'ai' | 'system'
  action_type: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'other'
  resource_type: 'system' | 'organization' | 'employee' | 'customer' | 'ticket' | 'tag' | 'invitation' | 'profile' | 'user_settings'
  resource_id?: string
  action_description?: string
  action_meta?: Record<string, unknown>
  details_before?: Record<string, unknown>
  details_after?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'error' | 'critical'
  status?: 'success' | 'failure'
  error_code?: string
  error_message?: string
  client_ip?: string
}

export async function logAuditEvent(
  supabase: SupabaseClient,
  params: AuditLogParams
): Promise<{ success: boolean; error?: string }> {
  console.log('Creating audit log entry:', JSON.stringify(params, null, 2))

  let ipAddress = null
  if (params.client_ip) {
    console.log('Raw client IP:', params.client_ip)
    
    // Handle comma-separated IP addresses (e.g. from x-forwarded-for)
    const firstIp = params.client_ip.split(',')[0].trim()
    console.log('Parsed IP:', firstIp)
    
    // Basic IP validation (IPv4 or IPv6)
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
    const ipv6Regex = /^[0-9a-fA-F:]+$/
    
    if (ipv4Regex.test(firstIp) || ipv6Regex.test(firstIp)) {
      ipAddress = firstIp
      console.log('Valid IP address detected:', ipAddress)
    } else {
      console.warn('Invalid IP address format:', firstIp)
    }
  } else {
    console.log('No client IP provided')
  }

  try {
    const { data: eventId, error: auditError } = await supabase.rpc('log_audit_event', {
      _organization_id: params.organization_id,
      _actor_id: params.actor_id,
      _actor_type: params.actor_type,
      _action_type: params.action_type,
      _resource_type: params.resource_type,
      _resource_id: params.resource_id,
      _action_description: params.action_description,
      _action_meta: params.action_meta,
      _details_before: params.details_before,
      _details_after: params.details_after,
      _severity: params.severity || 'info',
      _status: params.status || 'success',
      _error_code: params.error_code,
      _error_message: params.error_message,
      _ip_address: ipAddress,
      _user_agent: null
    })

    if (auditError) {
      console.error('Failed to create audit log:', auditError)
      return { success: false, error: auditError.message }
    }

    console.log('Successfully created audit log:', eventId)
    return { success: true }
  } catch (err) {
    console.error('Error creating audit log:', err)
    return { success: false, error: err.message }
  }
} 