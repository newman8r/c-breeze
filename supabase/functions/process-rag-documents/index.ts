import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from 'https://esm.sh/openai@4'
import GPT3Tokenizer from 'https://esm.sh/gpt3-tokenizer@1.1.5'

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
})

// OpenAI recommends 200-1000 tokens per chunk for embeddings
const MAX_TOKENS_PER_CHUNK = 500

async function chunkText(text: string): Promise<string[]> {
  if (!text) return []
  
  console.log('Starting chunking process...')

  // First, split text into paragraphs
  const paragraphs = text.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  console.log(`Split into ${paragraphs.length} paragraphs`)

  // Get token count for each paragraph using OpenAI
  const tokenCounts = await Promise.all(
    paragraphs.map(async (p) => {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: p,
        encoding_format: 'float'
      })
      return response.usage.total_tokens
    })
  )

  // Combine paragraphs into chunks based on token count
  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentLength = 0

  paragraphs.forEach((paragraph, i) => {
    const tokenCount = tokenCounts[i]
    
    if (currentLength + tokenCount > MAX_TOKENS_PER_CHUNK && currentChunk.length > 0) {
      // Current chunk is full, start a new one
      chunks.push(currentChunk.join('\n\n'))
      currentChunk = []
      currentLength = 0
    }
    
    currentChunk.push(paragraph)
    currentLength += tokenCount
  })
  
  // Add the last chunk if there is one
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'))
  }
  
  console.log(`Created ${chunks.length} chunks`)
  return chunks
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if this is a rebuild operation
    const { rebuild = false } = await req.json().catch(() => ({}))
    
    // Get the user from the auth header
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

    if (rebuild) {
      console.log('Rebuild requested - clearing existing embeddings...')
      const { error: deleteError } = await supabase
        .from('rag_chunks')
        .delete()
        .neq('id', 0) // Delete all rows

      if (deleteError) throw deleteError
    }

    // Get documents to process - all for rebuild, only pending for normal processing
    const { data: documents, error: fetchError } = await supabase
      .from('rag_documents')
      .select('*')
      .in('status', rebuild ? ['processed', 'pending', 'failed'] : ['pending'])
    
    if (fetchError) throw fetchError
    
    console.log(`Found ${documents?.length || 0} document(s) to process`)

    if (rebuild && (!documents || documents.length === 0)) {
      throw new Error('No documents found to process')
    }
    
    const results = []
    for (const document of (documents || [])) {
      console.log(`Processing document: ${document.id}`)
      
      try {
        // Download document content
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('rag_documents')
      .download(document.storage_path)

    if (downloadError) throw downloadError

        // Convert to text and chunk
        const content = await fileData.text()
        const chunks = await chunkText(content)
        console.log(`Split into ${chunks.length} chunks`)

        // Get embeddings for all chunks at once
        console.log('Generating embeddings...')
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunks,
        })

        // Delete any existing chunks for this document
        const { error: deleteChunksError } = await supabase
          .from('rag_chunks')
          .delete()
          .eq('document_id', document.id)

        if (deleteChunksError) throw deleteChunksError

        // Store chunks and embeddings
        console.log('Storing chunks and embeddings...')
        const chunksToInsert = chunks.map((chunk, index) => ({
          document_id: document.id,
          content: chunk,
          embedding: embeddingResponse.data[index].embedding,
          chunk_index: index
        }))

        const { error: insertError } = await supabase
          .from('rag_chunks')
          .insert(chunksToInsert)

        if (insertError) throw insertError

        // Update document status
        await supabase
          .from('rag_documents')
          .update({
            status: 'processed',
            chunks: chunks.length,
            processed_at: new Date().toISOString()
          })
          .eq('id', document.id)

        results.push({
          documentId: document.id,
          success: true,
          chunks: chunks.length
        })
        
        console.log(`Successfully processed document ${document.id}`)
      } catch (error) {
        console.error(`Error processing document ${document.id}:`, error)
        
        // Update document status to failed
        await supabase
          .from('rag_documents')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', document.id)

        results.push({
          documentId: document.id,
          success: false,
          error: error.message
        })
      }
    }

    if (rebuild) {
      console.log('Updating rag_settings for organization:', employeeData.organization_id)
      console.log('Total chunks processed:', results.reduce((acc, r) => acc + (r.success ? r.chunks : 0), 0))

      // Update last_rebuild_at in rag_settings
      const { data: settingsData, error: updateError } = await supabase
        .from('rag_settings')
        .update({
          last_rebuild_at: new Date().toISOString(),
          total_chunks: results.reduce((acc, r) => acc + (r.success ? r.chunks : 0), 0),
          status: 'up_to_date'
        })
        .eq('organization_id', employeeData.organization_id)
        .select()

      if (updateError) {
        console.error('Error updating rag_settings:', updateError)
        throw updateError
      }

      console.log('Successfully updated rag_settings:', settingsData)
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
