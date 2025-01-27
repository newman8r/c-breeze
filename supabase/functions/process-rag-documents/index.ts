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

function chunkText(text: string): string[] {
  if (!text) return []
  
  console.log('Starting chunking process...')
  const tokenizer = new GPT3Tokenizer({ type: 'gpt3' })
  
  // First, split text into sentences (roughly)
  const sentences = text.split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + '.')
  
  console.log(`Split into ${sentences.length} sentences`)
  
  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentLength = 0
  
  for (const sentence of sentences) {
    const tokenCount = tokenizer.encode(sentence).text.length
    
    if (currentLength + tokenCount > MAX_TOKENS_PER_CHUNK && currentChunk.length > 0) {
      // Current chunk is full, start a new one
      chunks.push(currentChunk.join(' '))
      currentChunk = []
      currentLength = 0
    }
    
    currentChunk.push(sentence)
    currentLength += tokenCount
  }
  
  // Add the last chunk if there is one
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }
  
  console.log(`Created ${chunks.length} chunks`)
  return chunks
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get all pending documents
    const { data: documents, error: fetchError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('status', 'pending')
    
    if (fetchError) throw fetchError
    
    console.log(`Found ${documents?.length || 0} document(s) to process`)
    
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
        const chunks = chunkText(content)
        console.log(`Split into ${chunks.length} chunks`)

        // Get embeddings for all chunks at once
        console.log('Generating embeddings...')
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunks,
        })

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
