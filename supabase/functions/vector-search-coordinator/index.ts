import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { ChatOpenAI } from "@langchain/openai"
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize the base model
const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0
})

// Create the search agent's function schema
const searchAgentSchema = {
  name: 'analyze_search_results',
  description: 'Analyze vector search results for relevance to the inquiry',
  parameters: {
    type: 'object',
    properties: {
      searchPhrases: {
        type: 'array',
        items: { type: 'string' },
        description: 'Search phrases extracted from the inquiry'
      },
      results: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              documentId: { type: 'string' },
              similarity: { type: 'number' },
              isRelevant: { type: 'boolean' },
              relevanceReason: { type: 'string' }
            },
            required: ['content', 'documentId', 'similarity', 'isRelevant']
          }
        }
      }
    },
    required: ['searchPhrases', 'results']
  }
} as const

// Initialize search model with function calling
const searchModel = model.bind({
  functions: [searchAgentSchema],
  function_call: { name: 'analyze_search_results' }
})

// Create the search agent prompt
const searchPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a vector search analysis specialist. Your role is to:
1. Analyze search results for relevance to the original inquiry
2. Identify key information that helps answer the inquiry
3. Filter out irrelevant or low-quality matches
4. Provide clear reasons for relevance decisions

For each search result:
- Compare content directly to the inquiry context
- Consider both semantic and literal relevance
- Look for specific product, feature, or process mentions
- Evaluate if the information would help resolve the inquiry

Mark results as relevant if they:
- Directly answer the inquiry
- Provide necessary background information
- Explain related processes or features
- Offer solutions to similar problems

Always explain your relevance decisions clearly.`],
  ['human', `Please analyze these vector search results:
Original Inquiry: {inquiry}
Search Results: {searchResults}
Context: {context}`]
])

// Define schemas for request validation
const RequestSchema = z.object({
  analysisId: z.string().uuid(),
  originalInquiry: z.string(),
  metadata: z.object({
    organizationId: z.string(),
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
  })
})

// Create a single chain that includes all steps
const vectorSearchChain = RunnableSequence.from([
  // Input processing and validation
  async (input: { analysisId: string, originalInquiry: string, metadata: any }) => {
    const { analysisId, originalInquiry, metadata } = RequestSchema.parse(input)
    return { analysisId, originalInquiry, metadata }
  },
  // Search phrase generation
  async (input) => {
    console.log('Generating search phrases...')
    const response = await fetch(`${supabaseUrl}/functions/v1/inquiry-cleanup-agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inquiry: input.originalInquiry })
    })
  
    if (!response.ok) {
      throw new Error('Failed to generate search phrases')
    }
  
    const { searchPhrases } = await response.json()
    return { ...input, searchPhrases }
  },
  // Vector search and relevance evaluation
  async (input) => {
    const results: Record<string, any[]> = {}
    for (const phrase of input.searchPhrases) {
      console.log(`Searching for phrase: ${phrase}`)
      const searchResult = await fetch(`${supabaseUrl}/functions/v1/search-rag-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: phrase,
          organization_id: input.metadata.organizationId,
          limit: 5
        })
      }).then(r => r.json())
      
      // Evaluate relevance for each chunk
      const evaluatedChunks = await Promise.all(
        searchResult.results.map(async (result: any) => {
          const chunk = {
            content: result.content,
            documentId: result.document.id,
            similarity: result.similarity
          }
          const relevance = await fetch(`${supabaseUrl}/functions/v1/chunk-relevance-agent`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              chunk,
              inquiry: input.originalInquiry
            })
          }).then(r => r.json())
          
          return {
            ...chunk,
            isRelevant: relevance.isRelevant,
            relevanceReason: relevance.reason
          }
        })
      )
      
      results[phrase] = evaluatedChunks
    }
    return { ...input, results }
  },
  // Search analysis
  async (input) => {
    const analysisResult = await searchPrompt.pipe(searchModel).pipe(
      (response) => {
        if (!response.additional_kwargs?.function_call?.arguments) {
          throw new Error('No function call arguments found in response')
        }
        return JSON.parse(response.additional_kwargs.function_call.arguments)
      }
    ).invoke({
      inquiry: input.originalInquiry,
      searchResults: JSON.stringify(input.results),
      context: JSON.stringify({
        analysisId: input.analysisId,
        metadata: input.metadata
      })
    })
    return { ...input, analysis: analysisResult }
  },
  // Final output processing
  (result) => ({
    searchPhrases: result.searchPhrases,
    results: result.results,
    analysis: result.analysis
  })
])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const result = await vectorSearchChain.invoke(body)

    return new Response(
      JSON.stringify(result),
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
