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

        console.log('Ticket processing completed:', {
          priority: processingResult.priority,
          tags: processingResult.tags,
          needsAssignment: processingResult.needsAssignment
        })

        // Combine results
        const finalResult = {
          ...vectorResults,
          ticketProcessing: {
            priority: processingResult.priority,
            priorityReasoning: processingResult.priorityReasoning,
            tags: processingResult.tags,
            tagReasoning: processingResult.tagReasoning,
            needsAssignment: processingResult.needsAssignment,
            assignmentReasoning: processingResult.assignmentReasoning
          }
        }

        return new Response(
          JSON.stringify(finalResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      } catch (processingError) {
        console.error('Ticket processing error:', processingError)
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
