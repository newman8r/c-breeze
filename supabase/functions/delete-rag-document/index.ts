import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Loading delete-rag-document function...')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the document ID from the request
    const { documentId } = await req.json()
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No auth header')
    }

    // Initialize Supabase client with user's auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    )

    // Get user's organization
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('organization_id')
      .single()

    if (employeeError || !employeeData) {
      throw new Error('Could not determine organization')
    }

    // Get the document to delete (to get its storage path)
    const { data: document, error: docError } = await supabaseClient
      .from('rag_documents')
      .select('storage_path')
      .eq('id', documentId)
      .single()

    if (docError) throw docError
    if (!document) throw new Error('Document not found')

    // Delete the file from storage
    const { error: storageError } = await supabaseClient.storage
      .from('rag_documents')
      .remove([document.storage_path])

    if (storageError) throw storageError

    // Delete associated chunks
    const { error: chunksError } = await supabaseClient
      .from('rag_chunks')
      .delete()
      .eq('document_id', documentId)

    if (chunksError) throw chunksError

    // Delete the document record
    const { error: deleteError } = await supabaseClient
      .from('rag_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) throw deleteError

    // Update RAG settings status to needs_rebuild
    const { error: settingsError } = await supabaseClient
      .from('rag_settings')
      .update({ status: 'needs_rebuild' })
      .eq('organization_id', employeeData.organization_id)

    if (settingsError) throw settingsError

    return new Response(
      JSON.stringify({ success: true }),
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