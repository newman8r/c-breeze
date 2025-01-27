import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from 'https://esm.sh/openai@4'

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the search query and limit from the request
    const { query, limit = 5 } = await req.json()
    if (!query) {
      throw new Error('Search query is required')
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create a client with the user's auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    )

    // Get the user's organization
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id')
      .single()

    if (employeeError || !employeeData) {
      throw new Error('Could not determine organization')
    }

    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    })

    // Use the match_chunks function to find similar chunks
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_chunks',
      {
        query_embedding: JSON.stringify(embeddingResponse.data[0].embedding),
        match_threshold: 0.7, // Adjust this threshold as needed
        match_count: limit
      }
    )

    if (matchError) throw matchError

    // Get document details for the matched chunks
    const documentIds = [...new Set(matches.map(m => m.document_id))]
    const { data: documents, error: docError } = await supabase
      .from('rag_documents')
      .select('id, name, description')
      .in('id', documentIds)

    if (docError) throw docError

    // Combine chunk matches with document metadata
    const results = matches.map(match => ({
      ...match,
      document: documents.find(d => d.id === match.document_id)
    }))

    return new Response(
      JSON.stringify({ results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    )
  }
}) 
