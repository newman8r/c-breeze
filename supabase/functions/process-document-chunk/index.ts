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

interface QueueItem {
  id: string
  document_id: string
  chunk_start: number
  chunk_size: number
  organization_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempt_count: number
}

async function processDocumentChunk(queueItem: QueueItem) {
  const { document_id, chunk_start, chunk_size, organization_id } = queueItem
  
  console.log('Processing chunk for document:', {
    document_id,
    organization_id,
    chunk_start,
    chunk_size
  })

  // Get document details from rag_documents table
  console.log('Fetching document from rag_documents:', document_id)
  const { data: document, error: docError } = await supabase
    .from('rag_documents')
    .select('storage_path, name, status')
    .eq('id', document_id)
    .single()

  if (docError) {
    console.error('Document fetch error:', {
      error: docError,
      document_id,
      organization_id
    })
    throw new Error(`Document fetch failed: ${docError.message}`)
  }

  if (!document) {
    console.error('Document not found:', {
      document_id,
      organization_id
    })
    throw new Error('Document not found in rag_documents table')
  }

  console.log('Found document:', {
    name: document.name,
    storage_path: document.storage_path,
    status: document.status
  })

  // Download the specific range of the file
  console.log('Downloading file chunk:', {
    storage_path: document.storage_path,
    chunk_start,
    chunk_size
  })
  
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('documents')
    .download(document.storage_path, {
      offset: chunk_start,
      length: chunk_size
    })

  if (downloadError) {
    console.error('File download error:', {
      error: downloadError,
      storage_path: document.storage_path
    })
    throw new Error(`File download failed: ${downloadError.message}`)
  }

  // Convert to text and split into paragraphs
  const content = await fileData.text()
  const paragraphs = content.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // Get embeddings for all paragraphs
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: paragraphs,
  })

  // Store chunks and embeddings
  const chunksToInsert = paragraphs.map((chunk, index) => ({
    document_id,
    content: chunk,
    embedding: embeddingResponse.data[index].embedding,
    chunk_index: index,
    status: 'processed' as const
  }))

  const { error: insertError } = await supabase
    .from('rag_chunks')
    .insert(chunksToInsert)

  if (insertError) {
    console.error('Insert error:', insertError)
    throw insertError
  }

  return chunksToInsert.length
}

async function processNextChunks(maxChunks = 3) {
  // Get next batch of pending chunks with retry count < 3
  const { data: queueItems, error: queueError } = await supabase
    .from('document_processing_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempt_count', 3)
    .order('created_at', { ascending: true })
    .limit(maxChunks)

  if (queueError) throw queueError
  if (!queueItems || queueItems.length === 0) return []

  const results = []
  for (const queueItem of queueItems) {
    try {
      // Update status to processing and increment attempt count
      await supabase
        .from('document_processing_queue')
        .update({
          status: 'processing',
          attempt_count: queueItem.attempt_count + 1
        })
        .eq('id', queueItem.id)

      const chunksCreated = await processDocumentChunk(queueItem)

      // Update queue item status
      await supabase
        .from('document_processing_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          chunks_created: chunksCreated
        })
        .eq('id', queueItem.id)

      results.push({ id: queueItem.id, success: true, chunksCreated })

      // Check if this was the last chunk for the document
      const { data: remainingCount } = await supabase
        .from('document_processing_queue')
        .select('id', { count: 'exact' })
        .eq('document_id', queueItem.document_id)
        .in('status', ['pending', 'processing'])

      if (remainingCount === 0) {
        // All chunks processed, update document status
        await supabase
          .from('rag_documents')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', queueItem.document_id)

        // Update rag_settings
        const { data: totalChunks } = await supabase
          .from('document_processing_queue')
          .select('chunks_created', { count: 'exact' })
          .eq('document_id', queueItem.document_id)
          .eq('status', 'completed')

        await supabase
          .from('rag_settings')
          .update({
            last_rebuild_at: new Date().toISOString(),
            total_chunks: totalChunks,
            status: 'up_to_date'
          })
          .eq('organization_id', queueItem.organization_id)
      }
    } catch (error) {
      // Update queue item with error
      await supabase
        .from('document_processing_queue')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', queueItem.id)

      results.push({ id: queueItem.id, success: false, error: error.message })
    }
  }

  return results
}

async function triggerNextBatch() {
  // Check if there are more pending items
  const { count } = await supabase
    .from('document_processing_queue')
    .select('id', { count: 'exact' })
    .eq('status', 'pending')
    .lt('attempt_count', 3)

  if (count > 0) {
    // Call this function again to process next batch
    await fetch(`${supabaseUrl}/functions/v1/process-document-chunk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    })
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Process up to 3 chunks at a time
    const results = await processNextChunks(3)

    // If we processed any chunks and there might be more, trigger next batch
    if (results.length > 0) {
      await triggerNextBatch()
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
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
