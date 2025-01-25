import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logAuditEvent } from '../_shared/audit.ts'

interface RevokeApiKeyRequest {
  key_id: string;
}

interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          description: string;
          key_last_four: string;
          created_at: string;
          status: 'active' | 'revoked';
          revoked_at?: string;
          revoked_by?: string;
        };
        Update: {
          status?: 'active' | 'revoked';
          revoked_at?: string;
          revoked_by?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
        };
      };
    };
  };
}

serve(async (req) => {
  console.log('=== Revoke API Key Function Starting ===')
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header:', authHeader)
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get request body
    const { key_id }: RevokeApiKeyRequest = await req.json()
    console.log('Request body:', { key_id })
    if (!key_id) {
      throw new Error('API key ID is required')
    }

    // Get current user and verify admin role
    console.log('Getting user from auth...')
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError) {
      console.error('User error:', userError)
      throw new Error('Unauthorized')
    }
    if (!user) {
      console.error('No user found')
      throw new Error('Unauthorized')
    }
    console.log('Found user:', user.id)

    // Get employee details and verify admin role
    console.log('Getting employee details...')
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('id, organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (employeeError) {
      console.error('Employee error:', employeeError)
      throw new Error('Employee not found')
    }
    if (!employeeData) {
      console.error('No employee data found')
      throw new Error('Employee not found')
    }
    console.log('Found employee:', employeeData)

    if (employeeData.role !== 'admin') {
      throw new Error('Only admins can revoke API keys')
    }

    // Get the API key details before update
    const { data: apiKeyBefore, error: fetchError } = await supabaseClient
      .from('api_keys')
      .select('*')
      .eq('id', key_id)
      .eq('organization_id', employeeData.organization_id)
      .single()

    if (fetchError) {
      throw new Error('API key not found')
    }

    if (apiKeyBefore.status === 'revoked') {
      throw new Error('API key is already revoked')
    }

    // Update the API key status
    const { data: apiKey, error: updateError } = await supabaseClient
      .from('api_keys')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: employeeData.id
      })
      .eq('id', key_id)
      .eq('organization_id', employeeData.organization_id)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to revoke API key')
    }

    // Log the revocation in audit logs
    const { success: auditSuccess, error: auditError } = await logAuditEvent(supabaseClient, {
      organization_id: employeeData.organization_id,
      actor_id: user.id,
      actor_type: 'employee',
      action_type: 'update',
      resource_type: 'api_key',
      resource_id: apiKey.id,
      action_description: 'Revoked API key',
      action_meta: {
        description: apiKey.description,
        key_last_four: apiKey.key_last_four,
        revoked_by_user_id: user.id,
        revoked_by_employee_id: employeeData.id
      },
      details_before: {
        status: apiKeyBefore.status,
        revoked_at: apiKeyBefore.revoked_at,
        revoked_by: apiKeyBefore.revoked_by
      },
      details_after: {
        status: apiKey.status,
        revoked_at: apiKey.revoked_at,
        revoked_by: apiKey.revoked_by
      },
      severity: 'info',
      status: 'success',
      client_ip: req.headers.get('x-forwarded-for') || undefined
    })

    if (!auditSuccess) {
      console.error('Failed to create audit log:', auditError)
      // Don't throw error here - we don't want to fail the revocation if audit logging fails
    }

    return new Response(
      JSON.stringify({
        message: 'API key revoked successfully',
        api_key: apiKey
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )
  } catch (error) {
    // Log error in audit logs if we have the necessary context
    if (employeeData?.organization_id && user?.id) {
      await logAuditEvent(supabaseClient, {
        organization_id: employeeData.organization_id,
        actor_id: user.id,
        actor_type: 'employee',
        action_type: 'update',
        resource_type: 'api_key',
        action_description: 'Failed to revoke API key',
        action_meta: {
          key_id,
          error: error.message,
          employee_id: employeeData.id
        },
        severity: 'error',
        status: 'failure',
        error_message: error.message,
        client_ip: req.headers.get('x-forwarded-for') || undefined
      }).catch(logError => {
        console.error('Failed to log audit event:', logError)
      })
    }

    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    )
  }
}) 