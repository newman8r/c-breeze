// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Hello from List RAG Documents!')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with the Auth context of the logged in user
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

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Authenticated user:', user.id)

    // Get documents for the user
    const { data: documents, error: docsError } = await supabaseClient
      .from('rag_documents')
      .select(`
        id,
        name,
        description,
        status,
        chunks,
        file_type,
        file_size,
        storage_path,
        metadata,
        created_at,
        updated_at,
        processed_at,
        error_message,
        user_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      throw docsError
    }

    console.log('Found documents:', documents?.length ?? 0)
    if (documents && documents.length > 0) {
      console.log('First document:', {
        id: documents[0].id,
        name: documents[0].name,
        user_id: documents[0].user_id
      })
    }

    // Format the response to match the frontend expectations
    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description || '',
      status: doc.status,
      chunks: doc.chunks || 0,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      lastUpdated: doc.updated_at,
      processedAt: doc.processed_at,
      errorMessage: doc.error_message,
      metadata: doc.metadata,
    }))

    return new Response(
      JSON.stringify({
        documents: formattedDocs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-rag-documents' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
