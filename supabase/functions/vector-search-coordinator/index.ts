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
  }).optional()
})

type State = z.infer<typeof StateSchema>

// Create the search phrase extractor
const searchPhraseExtractor = RunnableSequence.from([
  ChatPromptTemplate.fromMessages([
    ["system", "Extract 2-3 key search phrases from the inquiry. Focus on technical terms, error messages, and specific features."],
    ["human", "{inquiry}"]
  ]),
  model,
  (output) => output.content.split('\n').filter(Boolean).map(p => p.trim())
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
    console.log('Extracted phrases:', phrases)
    return phrases
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
        query: phrase,
        organization_id: this.state.metadata.organizationId,
        ticket_id: this.state.metadata.ticketId,
        limit: 5
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
    console.log(`Found ${data.results.length} results for phrase: "${phrase}"`)
    return data.results
  }

  // Process vector search results
  private processResults(results: any[]): any[] {
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

  // Execute the vector search process
  async execute(): Promise<State> {
    try {
      // Extract search phrases
      await this.updateState({ status: 'searching' })
      const searchPhrases = await this.extractSearchPhrases()
      await this.updateState({ searchPhrases })

      // Perform searches sequentially to avoid overwhelming the search service
      console.log('Starting vector search...')
      const allResults = []
      for (const phrase of searchPhrases) {
        console.log(`Processing search phrase: "${phrase}"`)
        const results = await this.searchPhrase(phrase)
        console.log(`Results for "${phrase}":`, {
          count: results.length,
          similarities: results.map(r => r.similarity)
        })
        allResults.push(...results)
      }

      console.log('All searches completed:', {
        totalResults: allResults.length,
        phrases: searchPhrases
      })

      // Process and store results
      const processedResults = this.processResults(allResults)
      
      if (processedResults.length === 0) {
        console.log('No results after processing')
        await this.updateState({
          status: 'completed',
          vectorResults: [],
          error: {
            message: 'No relevant vector search results found',
            details: { searchPhrases }
          }
        })
      } else {
        console.log('Updating state with processed results:', {
          count: processedResults.length,
          topSimilarities: processedResults
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .map(r => ({
              similarity: r.similarity,
              preview: r.content.substring(0, 50) + '...'
            }))
        })
        await this.updateState({
          vectorResults: processedResults,
          status: 'completed'
        })
      }

      console.log('Vector search completed:', {
        analysisId: this.state.analysisId,
        resultCount: processedResults.length,
        status: this.state.status,
        hasError: !!this.state.error
      })

      return this.state

    } catch (error) {
      console.error('Vector search error:', error)
      await this.updateState({
        status: 'error',
        error: {
          message: error.message,
          details: error
        }
      })
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
    
    // Create and execute the vector search agent
    const agent = new VectorSearchAgent(body)
    const result = await agent.execute()

    // Only proceed with ticket processing if we have results
    if (result.status === 'completed' && result.metadata.ticketId && result.vectorResults?.length > 0) {
      try {
        // Import ticket processing dynamically to avoid circular dependencies
        const { ticketProcessingChain } = await import('../ticket-processing-coordinator/index.ts')
        
        console.log('Starting ticket processing with vector results')
        const processingResult = await ticketProcessingChain.invoke({
          analysisId: result.analysisId,
          originalInquiry: result.originalInquiry,
          results: { all: result.vectorResults },
          metadata: result.metadata
        })

        // Return combined results
        return new Response(
          JSON.stringify({
            ...result,
            processingResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      } catch (processingError) {
        console.error('Ticket processing error:', processingError)
        return new Response(
          JSON.stringify({
            ...result,
            processingError: {
              message: processingError.message,
              type: processingError.name
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    // Return just the vector search results if no ticket processing was needed/possible
    return new Response(
      JSON.stringify(result),
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
