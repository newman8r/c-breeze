import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string;
          description: string;
          key_last_four: string;
          created_at: string;
          last_used_at: string | null;
          status: 'active' | 'revoked';
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
  console.log('=== List API Keys Function Starting ===')
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

    // Get current user
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

    // Get employee details
    console.log('Getting employee details...')
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('id, organization_id')
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

    // Get API keys for the organization
    console.log('Fetching API keys...')
    const { data: apiKeys, error: apiKeysError } = await supabaseClient
      .from('api_keys')
      .select('id, description, key_last_four, created_at, last_used_at, status')
      .eq('organization_id', employeeData.organization_id)
      .order('created_at', { ascending: false })

    if (apiKeysError) {
      console.error('API keys error:', apiKeysError)
      throw new Error('Failed to fetch API keys')
    }

    // Return the API keys
    return new Response(
      JSON.stringify({
        api_keys: apiKeys || [],
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