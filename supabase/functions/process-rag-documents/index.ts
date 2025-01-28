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

// Maximum size of text to process in one go (50KB)
const MAX_CHUNK_SIZE = 50 * 1024

async function processDocumentChunk(queueItem: any) {
  const { document_id, chunk_start, chunk_size, organization_id } = queueItem

  // Get document details
  const { data: document, error: docError } = await supabase
    .from('rag_documents')
    .select('storage_path')
    .eq('id', document_id)
    .single()

  if (docError || !document) throw new Error('Document not found')

  // Download the specific range of the file
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('rag_documents')
    .download(document.storage_path, {
      offset: chunk_start,
      length: chunk_size
    })

  if (downloadError) throw downloadError

  // Convert to text and split into paragraphs
  const content = await fileData.text()
  console.log('Processing content length:', content.length)
  
  const paragraphs = content.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
  
  console.log('Split into paragraphs:', {
    numParagraphs: paragraphs.length,
    sampleLengths: paragraphs.slice(0, 3).map(p => p.length)
  })

  // Get embeddings for all paragraphs
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: paragraphs,
  })

  console.log('Got embeddings for paragraphs:', {
    numEmbeddings: embeddingResponse.data.length,
    firstEmbeddingSize: embeddingResponse.data[0].embedding.length
  })

  // Store chunks and embeddings
  const chunksToInsert = paragraphs.map((chunk, index) => ({
    document_id,
    content: chunk,
    embedding: embeddingResponse.data[index].embedding,
    chunk_index: index,
    status: 'processed'
  }))

  console.log('Inserting chunks:', {
    numChunks: chunksToInsert.length,
    firstChunkLength: chunksToInsert[0].content.length
  })

  const { error: insertError } = await supabase
    .from('rag_chunks')
    .insert(chunksToInsert)

  if (insertError) throw insertError

  // Update document status and chunk count
  console.log('Updating document status with chunks:', chunksToInsert.length)
  
  const { error: updateError } = await supabase
    .from('rag_documents')
    .update({
      status: 'processed',
      chunks: chunksToInsert.length,
      processed_at: new Date().toISOString()
    })
    .eq('id', document_id)

  if (updateError) throw updateError

  // Clear all queue items for this document since we processed everything
  console.log('Clearing remaining queue items for document:', document_id)
  await supabase
    .from('document_processing_queue')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      chunks_created: chunksToInsert.length
    })
    .eq('document_id', document_id)

  return chunksToInsert.length
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Received request body:', body)

    const { documentId, rebuild } = body

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create a client with the user's auth context
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    )

    // Get the user's organization
    const { data: employeeData, error: employeeError } = await userClient
      .from('employees')
      .select('organization_id')
      .single()

    if (employeeError || !employeeData) {
      console.error('Employee lookup error:', employeeError)
      throw new Error('Could not determine organization')
    }

    console.log('Found organization:', employeeData.organization_id)

    // If rebuild is true, get all documents for the organization
    let documentsToProcess: any[] = []
    if (rebuild) {
      console.log('Rebuilding all documents')
      const { data: docs, error: docsError } = await supabase
        .from('rag_documents')
        .select('id')
        .eq('organization_id', employeeData.organization_id)

      if (docsError) {
        console.error('Error fetching documents:', docsError)
        throw new Error('Failed to fetch documents for rebuild')
      }

      documentsToProcess = docs
    } else {
      if (!documentId) {
        console.error('Missing required parameter: documentId')
        throw new Error('documentId is required for single document processing')
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(documentId)) {
        console.error('Invalid documentId format:', documentId)
        throw new Error('documentId must be a valid UUID')
      }

      documentsToProcess = [{ id: documentId }]
    }

    console.log('Processing documents:', documentsToProcess.map(d => d.id))

    // Process each document
    for (const doc of documentsToProcess) {
      // Clear existing chunks if rebuilding
      if (rebuild) {
        console.log('Clearing existing chunks for document:', doc.id)
        await supabase
          .from('rag_chunks')
          .delete()
          .eq('document_id', doc.id)
      }

      // Get document details
      console.log('Looking up document:', doc.id)
      const { data: document, error: docError } = await supabase
        .from('rag_documents')
        .select('*')
        .eq('id', doc.id)
        .eq('organization_id', employeeData.organization_id)
        .single()

      if (docError) {
        console.error('Document fetch error:', docError)
        continue // Skip this document but continue with others
      }

      if (!document) {
        console.error('Document not found:', { documentId: doc.id, organizationId: employeeData.organization_id })
        continue // Skip this document but continue with others
      }

      console.log('Found document:', {
        id: document.id,
        name: document.name,
        storage_path: document.storage_path,
        status: document.status
      })

      // Get file info from storage
      console.log('Getting file info from storage')
      const { data: fileInfo, error: fileError } = await supabase
        .storage
        .from('rag_documents')
        .list(document.storage_path.split('/').slice(0, -1).join('/'), {
          limit: 1,
          search: document.storage_path.split('/').pop()
        })

      if (fileError) {
        console.error('Failed to get file info:', fileError)
        continue // Skip this document but continue with others
      }

      if (!fileInfo || fileInfo.length === 0) {
        console.error('File not found in storage:', document.storage_path)
        continue // Skip this document but continue with others
      }

      const fileSize = fileInfo[0].metadata.size
      if (!fileSize) {
        console.error('Could not determine file size:', fileInfo[0])
        continue // Skip this document but continue with others
      }

      const numChunks = Math.ceil(fileSize / MAX_CHUNK_SIZE)

      console.log('File details:', {
        size: fileSize,
        numChunks,
        chunkSize: MAX_CHUNK_SIZE
      })

      // Create queue items for each chunk
      const queueItems = Array.from({ length: numChunks }, (_, i) => ({
        document_id: doc.id,
        organization_id: employeeData.organization_id,
        chunk_start: i * MAX_CHUNK_SIZE,
        chunk_size: Math.min(MAX_CHUNK_SIZE, fileSize - (i * MAX_CHUNK_SIZE)),
        total_size: fileSize,
        status: 'pending'
      }))

      // Insert queue items and get back the inserted records
      const { data: insertedItems, error: queueError } = await supabase
        .from('document_processing_queue')
        .insert(queueItems)
        .select()

      if (queueError) {
        console.error('Queue insert error:', queueError)
        continue // Skip this document but continue with others
      }

      // Process first chunk immediately
      if (insertedItems && insertedItems.length > 0) {
        const firstChunk = insertedItems[0]
        try {
          console.log('Processing first chunk:', {
            id: firstChunk.id,
            document_id: doc.id,
            chunk_index: 0,
            total_chunks: insertedItems.length
          })

          // Update status to processing
          await supabase
            .from('document_processing_queue')
            .update({ status: 'processing' })
            .eq('id', firstChunk.id)

          const chunksCreated = await processDocumentChunk({
            ...firstChunk,
            document_id: doc.id,
            organization_id: employeeData.organization_id
          })

          // Update queue item status
          await supabase
            .from('document_processing_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              chunks_created: chunksCreated
            })
            .eq('id', firstChunk.id)

          // Check if this was the last chunk
          const { count: remainingCount } = await supabase
            .from('document_processing_queue')
            .select('*', { count: 'exact' })
            .eq('document_id', doc.id)
            .in('status', ['pending', 'processing'])

          console.log('Checking remaining chunks:', {
            documentId: doc.id,
            remainingCount,
            queueStatus: 'pending,processing'
          })

          if (remainingCount === 0) {
            console.log('All chunks processed, updating RAG settings')
            
            // Log the subquery first
            const { data: orgDocIds, error: orgDocsError } = await supabase
              .from('rag_documents')
              .select('id')
              .eq('organization_id', employeeData.organization_id)

            if (orgDocsError) {
              console.error('Error getting org document ids:', orgDocsError)
            } else {
              console.log('Organization document ids:', orgDocIds.map(d => d.id))
            }

            // Get total chunks count by joining with rag_documents
            console.log('Counting chunks for organization documents...')
            const { data: chunkData, count: totalChunks, error: countError } = await supabase
              .from('rag_chunks')
              .select('*', { count: 'exact' })
              .in('document_id', orgDocIds.map(d => d.id))

            if (countError) {
              console.error('Error counting chunks:', countError)
            }

            console.log('Total chunks count result:', {
              totalChunks,
              error: countError?.message,
              sampleChunks: chunkData?.slice(0, 2)
            })

            // Update RAG settings status
            console.log('Updating RAG settings with:', {
              status: 'up_to_date',
              totalChunks,
              organizationId: employeeData.organization_id
            })

            const { data: updateResult, error: updateError } = await supabase
              .from('rag_settings')
              .update({
                status: 'up_to_date',
                last_rebuild_at: new Date().toISOString(),
                total_chunks: totalChunks || 0
              })
              .eq('organization_id', employeeData.organization_id)
              .select()

            if (updateError) {
              console.error('Error updating RAG settings:', updateError)
            } else {
              console.log('RAG settings updated successfully:', updateResult)
            }
          } else {
            console.log('More chunks to process:', remainingCount)
            // Set document status to processing
            await supabase
              .from('rag_documents')
              .update({ status: 'processing' })
              .eq('id', doc.id)
          }
        } catch (error) {
          console.error('Error processing first chunk:', error)
          // Update queue item with error
          await supabase
            .from('document_processing_queue')
            .update({
              status: 'failed',
              error_message: error.message
            })
            .eq('id', firstChunk.id)
          // Continue with other documents
          continue
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Started processing ${documentsToProcess.length} document(s)`,
        documentsQueued: documentsToProcess.length
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
