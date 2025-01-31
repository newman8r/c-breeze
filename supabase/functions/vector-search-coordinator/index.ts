import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { z } from "zod"

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize OpenAI model
const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0
})

// Define our state schema
const StateSchema = z.object({
  analysisId: z.string().uuid(),
  originalInquiry: z.string(),
  metadata: z.object({
    organizationId: z.string(),
    ticketId: z.string().uuid().optional(),
    language: z.object({
      code: z.string(),
      confidence: z.number(),
      translation: z.object({
        needed: z.boolean(),
        text: z.string().optional()
      })
    }).optional(),
    validity: z.object({
      isValid: z.boolean(),
      reason: z.string()
    }).optional()
  }),
  searchPhrases: z.array(z.string()).optional(),
  vectorResults: z.array(z.object({
    content: z.string(),
    documentId: z.string(),
    similarity: z.number(),
    isRelevant: z.boolean()
  })).optional(),
  status: z.enum(['initializing', 'searching', 'completed', 'error']),
  error: z.object({
    message: z.string(),
    details: z.any()
  }).optional(),
  processingResults: z.object({
    priority: z.string().optional(),
    priorityReasoning: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tagReasoning: z.string().optional(),
    needsAssignment: z.boolean().optional(),
    assignmentReasoning: z.string().optional()
  }).optional()
})

type State = z.infer<typeof StateSchema>

// Create the search phrase extractor
const searchPhraseExtractor = RunnableSequence.from([
  ChatPromptTemplate.fromMessages([
    ["system", "Extract 2-3 key search phrases from the inquiry. Each phrase should be 2-4 words focused on technical terms, error messages, or specific features. Return each phrase on a new line without quotes or punctuation."],
    ["human", "{inquiry}"]
  ]),
  model,
  (output) => output.content
    .split('\n')
    .filter(Boolean)
    .map(p => p.trim())
    .map(p => p.replace(/["',]/g, '')) // Remove quotes and commas
])

// Vector Search Agent
class VectorSearchAgent {
  private state: State

  constructor(initialState: Partial<State>) {
    this.state = StateSchema.parse({
      ...initialState,
      status: 'initializing'
    })
  }

  // Get the current state
  getState(): State {
    return this.state
  }

  // Update state safely
  private async updateState(updates: Partial<State>): Promise<void> {
    this.state = StateSchema.parse({
      ...this.state,
      ...updates
    })
  }

  // Extract search phrases
  private async extractSearchPhrases(): Promise<string[]> {
    console.log('Extracting search phrases...')
    const phrases = await searchPhraseExtractor.invoke({
      inquiry: this.state.originalInquiry
    })
    
    // Clean up and validate phrases
    const cleanPhrases = phrases
      .filter(p => p.length > 0)
      .map(p => p.toLowerCase().trim())
    
    console.log('Extracted search phrases:', cleanPhrases)
    return cleanPhrases
  }

  // Perform vector search for a single phrase
  private async searchPhrase(phrase: string): Promise<any[]> {
    console.log(`Searching for phrase: "${phrase}"`)
    const response = await fetch(`${supabaseUrl}/functions/v1/search-rag-documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: phrase.trim(),
        organization_id: this.state.metadata.organizationId,
        ticket_id: this.state.metadata.ticketId,
        limit: 5,
        similarity_threshold: 0.5 // Add minimum similarity threshold
      })
    })

    if (!response.ok) {
      throw new Error(`Search failed for phrase: ${phrase}`)
    }

    const data = await response.json()
    if (!data.results) {
      console.log(`No results found for phrase: "${phrase}"`)
      return []
    }

    // Log more details about the results
    console.log(`Found ${data.results.length} results for phrase: "${phrase}"`, {
      similarities: data.results.map(r => ({
        similarity: r.similarity,
        preview: r.content.substring(0, 50) + '...'
      }))
    })
    
    return data.results
  }

  // Process vector search results
  private async processResults(results: any[]): Promise<any[]> {
    console.log('Processing raw search results:', {
      totalResults: results.length,
      resultIds: results.map(r => r.document_id)
    })

    if (results.length === 0) {
      console.log('No results to process')
      return []
    }

    // Deduplicate by document_id, keeping highest similarity
    const uniqueResults = Object.values(
      results.reduce((acc, curr) => {
        if (!acc[curr.document_id] || curr.similarity > acc[curr.document_id].similarity) {
          acc[curr.document_id] = curr
        }
        return acc
      }, {})
    )

    console.log('Processed results:', {
      uniqueCount: uniqueResults.length,
      similarities: uniqueResults.map(r => ({
        id: r.document_id,
        similarity: r.similarity,
        preview: r.content.substring(0, 50) + '...'
      }))
    })

    const mappedResults = uniqueResults.map(r => ({
      content: r.content,
      documentId: r.document_id,
      similarity: r.similarity,
      isRelevant: true
    }))

    return mappedResults
  }

  // Add method to update analysis record
  private async updateAnalysisRecord(
    analysisId: string,
    status: 'processing' | 'completed' | 'error',
    results?: any,
    errorMessage?: string
  ) {
    const { error: updateError } = await supabase
      .from('ticket_analysis')
      .update({
        vector_search_results: results || null,
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)

    if (updateError) {
      console.error('Error updating analysis record:', updateError)
      throw new Error(`Failed to update analysis record: ${updateError.message}`)
    }
  }

  // Execute the vector search process
  async execute(): Promise<any> {
    try {
      // Update status to processing
      await this.updateAnalysisRecord(this.state.analysisId, 'processing')

      // Extract search phrases
      const searchPhrases = await this.extractSearchPhrases()

      // Perform vector search for each phrase
      const searchPromises = searchPhrases.map(phrase => 
        this.searchPhrase(phrase)
      )

      const searchResults = await Promise.all(searchPromises)
      const flatResults = searchResults.flat()
      
      // Process results
      const processedResults = await this.processResults(flatResults)

      // Update analysis record with results
      await this.updateAnalysisRecord(
        this.state.analysisId,
        'completed',
        {
          searchPhrases,
          results: processedResults
        }
      )

      return {
        analysisId: this.state.analysisId,
        originalInquiry: this.state.originalInquiry,
        metadata: this.state.metadata,
        searchPhrases,
        vectorResults: processedResults,
        status: 'completed'
      }
    } catch (error) {
      console.error('Error in vector search:', error)
      
      // Update analysis record with error
      await this.updateAnalysisRecord(
        this.state.analysisId,
        'error',
        null,
        error.message
      )

      throw error
    }
  }
}

// Serve the endpoint
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Phase 1: Vector Search
    console.log('Starting Phase 1: Vector Search')
    const agent = new VectorSearchAgent(body)
    const vectorResults = await agent.execute()

    // Phase 2: Ticket Processing (only if we have vector results)
    if (vectorResults.status === 'completed' && 
        vectorResults.metadata.ticketId && 
        vectorResults.vectorResults?.length > 0) {
      try {
        console.log('Starting Phase 2: Ticket Processing')
        const { ticketProcessingChain } = await import('../ticket-processing-coordinator/index.ts')
        
        const processingResult = await ticketProcessingChain.invoke({
          analysisId: vectorResults.analysisId,
          originalInquiry: vectorResults.originalInquiry,
          results: { all: vectorResults.vectorResults },
          metadata: vectorResults.metadata
        })

        // Update analysis record with processing results
        const { error: updateError } = await supabase
          .from('ticket_analysis')
          .update({
            processing_results: {
              priority: processingResult.priority,
              priorityReasoning: processingResult.priorityReasoning,
              tags: processingResult.tags,
              tagReasoning: processingResult.tagReasoning,
              needsAssignment: processingResult.needsAssignment,
              assignmentReasoning: processingResult.assignmentReasoning
            },
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', vectorResults.analysisId)

        if (updateError) {
          throw new Error(`Failed to update analysis with processing results: ${updateError.message}`)
        }

        // Phase 3: Response Generation
        console.log('Starting Phase 3: Response Generation')
        const { responseGenerationChain } = await import('../response-generation-coordinator/index.ts')
        
        const responseResult = await responseGenerationChain.invoke({
          ticketProcessingResults: processingResult,
          vectorSearchResults: {
            analysisId: vectorResults.analysisId,
            results: { all: vectorResults.vectorResults },
            metadata: vectorResults.metadata
          },
          originalInquiry: vectorResults.originalInquiry
        })

        // Return combined results
        return new Response(
          JSON.stringify({
            ...vectorResults,
            ticketProcessing: processingResult,
            responseGeneration: responseResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      } catch (processingError) {
        console.error('Ticket processing error:', processingError)
        
        // Update analysis record with error
        const { error: updateError } = await supabase
          .from('ticket_analysis')
          .update({
            status: 'error',
            error_message: processingError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', vectorResults.analysisId)

        if (updateError) {
          console.error('Error updating analysis status:', updateError)
        }

        return new Response(
          JSON.stringify({
            ...vectorResults,
            processingError: {
              message: processingError.message,
              type: processingError.name
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    // Return vector search results if no ticket processing was needed/possible
    return new Response(
      JSON.stringify(vectorResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Agent execution error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        type: error.name,
        details: error.cause,
        status: 'error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 
