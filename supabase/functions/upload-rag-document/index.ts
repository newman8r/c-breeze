// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Hello from Upload RAG Document!')

const SUPPORTED_FILE_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/json',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]

interface UploadRequest {
  fileName: string
  fileType: string
  fileSize: number
  description?: string
  metadata?: Record<string, unknown>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { fileName, fileType, fileSize, description } = await req.json()

    if (!fileName || !fileType || !fileSize) {
      throw new Error('Missing required fields')
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError) throw userError

    // Get the user's organization
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employeeData) {
      throw new Error('Could not determine organization')
    }

    // Generate a unique path for the file
    const timestamp = new Date().getTime()
    const path = `${user.id}/${timestamp}-${fileName}`

    // Create a record in the rag_documents table
    const { data: document, error: documentError } = await supabaseClient
      .from('rag_documents')
      .insert({
        name: fileName,
        description: description || `Uploaded on ${new Date().toLocaleString()}`,
        status: 'pending',
        file_type: fileType,
        file_size: fileSize,
        storage_path: path,
        metadata: {},
        user_id: user.id,
        organization_id: employeeData.organization_id
      })
      .select()
      .single()

    if (documentError) throw documentError

    // Update RAG settings status to needs_rebuild
    const { error: settingsError } = await supabaseClient
      .from('rag_settings')
      .update({ status: 'needs_rebuild' })
      .eq('organization_id', employeeData.organization_id)

    if (settingsError) throw settingsError

    return new Response(
      JSON.stringify({ 
        path,
        document,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)

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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/upload-rag-document' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
