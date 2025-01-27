import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UpdateSettingsRequest {
  chunk_size?: number
  chunk_overlap?: number
  embedding_model?: string
}

console.log('Loading update-rag-settings function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No auth header')
    }

    // Parse request body
    const { chunk_size, chunk_overlap, embedding_model } = await req.json() as UpdateSettingsRequest

    // Validate inputs
    if (chunk_size && (chunk_size < 100 || chunk_size > 2000)) {
      throw new Error('Chunk size must be between 100 and 2000')
    }
    if (chunk_overlap && (chunk_overlap < 0 || chunk_overlap > chunk_size)) {
      throw new Error('Chunk overlap must be between 0 and chunk size')
    }
    if (embedding_model && !['text-embedding-3-small', 'text-embedding-3-large'].includes(embedding_model)) {
      throw new Error('Invalid embedding model')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    )

    // Get user from auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Invalid auth token')
    }

    // Get user's organization and verify admin role
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('Could not find organization')
    }

    if (employeeData.role !== 'admin') {
      throw new Error('Only admins can update RAG settings')
    }

    // Build update object with only provided fields
    const updateData: UpdateSettingsRequest = {}
    if (chunk_size !== undefined) updateData.chunk_size = chunk_size
    if (chunk_overlap !== undefined) updateData.chunk_overlap = chunk_overlap
    if (embedding_model !== undefined) updateData.embedding_model = embedding_model

    // Update RAG settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('rag_settings')
      .update(updateData)
      .eq('organization_id', employeeData.organization_id)
      .select()
      .single()

    if (settingsError) {
      throw settingsError
    }

    // Log the settings update
    await supabaseClient.functions.invoke('audit-logger', {
      body: {
        organization_id: employeeData.organization_id,
        actor_id: user.id,
        actor_type: 'employee',
        action_type: 'update',
        resource_type: 'rag_settings',
        resource_id: settings.id,
        action_description: 'Updated RAG settings',
        action_meta: updateData,
        severity: 'info',
        status: 'success'
      }
    })

    return new Response(
      JSON.stringify({
        settings,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 