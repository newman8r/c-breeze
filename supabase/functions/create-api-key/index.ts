import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logAuditEvent } from '../_shared/audit.ts'

interface CreateApiKeyRequest {
  description: string;
}

interface Database {
  public: {
    Tables: {
      api_keys: {
        Insert: {
          id?: string;
          organization_id: string;
          employee_id: string;
          description: string;
          key_hash: string;
          key_last_four: string;
          status: 'active' | 'revoked';
          metadata?: Record<string, unknown>;
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
    Functions: {
      generate_api_key: {
        Returns: {
          api_key: string;
          key_hash: string;
          key_last_four: string;
        }[];
      };
    };
  };
}

serve(async (req) => {
  console.log('=== Create API Key Function Starting ===')
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
    const { description }: CreateApiKeyRequest = await req.json()
    console.log('Request body:', { description })
    if (!description) {
      throw new Error('Description is required')
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
      throw new Error('Only admins can create API keys')
    }

    // Generate new API key using our database function
    const { data: keyData, error: keyGenError } = await supabaseClient
      .rpc('generate_api_key')
      .single()

    if (keyGenError || !keyData) {
      throw new Error('Failed to generate API key')
    }

    // Insert the new API key record
    const { data: apiKey, error: insertError } = await supabaseClient
      .from('api_keys')
      .insert({
        organization_id: employeeData.organization_id,
        employee_id: employeeData.id,
        description,
        key_hash: keyData.key_hash,
        key_last_four: keyData.key_last_four,
        status: 'active',
        metadata: {
          created_by_user_id: user.id,
          created_from_ip: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      .select('id, description, key_last_four, created_at, status')
      .single()

    if (insertError) {
      throw new Error('Failed to create API key')
    }

    // Log the creation in audit logs using the shared function
    const { success: auditSuccess, error: auditError } = await logAuditEvent(supabaseClient, {
      organization_id: employeeData.organization_id,
      actor_id: user.id,
      actor_type: 'employee',
      action_type: 'create',
      resource_type: 'api_key',
      resource_id: apiKey.id,
      action_description: 'Created new API key',
      action_meta: {
        description: apiKey.description,
        key_last_four: apiKey.key_last_four,
        created_by_user_id: user.id,
        employee_id: employeeData.id,
        created_from_ip: req.headers.get('x-forwarded-for') || 'unknown'
      },
      severity: 'info',
      status: 'success',
      client_ip: req.headers.get('x-forwarded-for') || undefined
    })

    if (!auditSuccess) {
      console.error('Failed to create audit log:', auditError)
      // Don't throw error here - we don't want to fail the API key creation if audit logging fails
    }

    // Return the API key details
    // Note: This is the only time the full API key will be shown
    return new Response(
      JSON.stringify({
        api_key: {
          ...apiKey,
          key: keyData.api_key, // Full key - only shown once
        },
        message: 'Store this API key securely. It will not be shown again.',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 201,
      }
    )
  } catch (error) {
    // Log error in audit logs if we have the necessary context
    if (employeeData?.organization_id && user?.id) {
      await logAuditEvent(supabaseClient, {
        organization_id: employeeData.organization_id,
        actor_id: user.id,
        actor_type: 'employee',
        action_type: 'create',
        resource_type: 'api_key',
        action_description: 'Failed to create API key',
        action_meta: {
          description: description,
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
