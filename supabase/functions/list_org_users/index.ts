// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Loading list_org_users function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log headers for debugging
    console.log('Auth header:', req.headers.get('Authorization'))
    console.log('API key:', req.headers.get('apikey'))

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
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('Authenticated user:', user.id)

    // Get the user's organization ID from employees table
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('Employee record not found')
    }

    // Get all employees from the same organization with user details
    const { data: orgUsers, error: orgUsersError } = await supabaseClient
      .from('employees')
      .select(`
        id,
        role,
        user_id,
        is_root_admin,
        email,
        name,
        created_at,
        first_name,
        last_name
      `)
      .eq('organization_id', employeeData.organization_id)
      .order('created_at', { ascending: true })

    if (orgUsersError) {
      throw orgUsersError
    }

    // Transform the data to match the expected format
    const transformedUsers = orgUsers.map(employee => ({
      ...employee,
      users: {
        id: employee.user_id,
        email: employee.email,
        raw_user_meta_data: {
          name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unnamed Member'
        }
      }
    }))

    return new Response(
      JSON.stringify({ users: transformedUsers }),
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list_org_users' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
