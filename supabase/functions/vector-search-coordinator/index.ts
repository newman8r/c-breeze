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

// Create the cleanup agent's function schema
const cleanupAgentSchema = {
  name: 'extract_search_phrases',
  description: 'Extract key search phrases from a customer inquiry',
  parameters: {
    type: 'object',
    properties: {
      searchPhrases: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of search phrases extracted from the inquiry'
      },
      reasoning: {
        type: 'string',
        description: 'Explanation of how the search phrases were extracted'
      }
    },
    required: ['searchPhrases', 'reasoning']
  }
} as const

// Initialize cleanup model with function calling
const cleanupModel = model.bind({
  functions: [cleanupAgentSchema],
  function_call: { name: 'extract_search_phrases' }
})

// Create the cleanup agent prompt
const cleanupPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a search phrase extraction specialist. Your role is to:
1. Analyze customer inquiries to identify key search terms
2. Break down complex inquiries into searchable phrases
3. Extract product names, features, and technical terms
4. Generate variations of important terms

Guidelines for extracting search phrases:
- Focus on specific technical terms and product names
- Include error messages or error codes
- Consider synonyms for technical terms
- Break long descriptions into shorter phrases
- Remove unnecessary context words
- Keep phrases between 2-6 words for best results

Always explain your reasoning for the chosen search phrases.`],
  ['human', '{inquiry}']
])

// Create the cleanup chain
const cleanupChain = RunnableSequence.from([
  (input) => ({ inquiry: input.originalInquiry }),
  cleanupPrompt,
  cleanupModel,
  (response) => {
    if (!response.additional_kwargs?.function_call?.arguments) {
      throw new Error('No function call arguments found in response')
    }
    return JSON.parse(response.additional_kwargs.function_call.arguments)
  }
])

// Create the relevance agent's function schema
const relevanceAgentSchema = {
  name: 'evaluate_chunk_relevance',
  description: 'Evaluate if a document chunk is relevant to the inquiry',
  parameters: {
    type: 'object',
    properties: {
      isRelevant: {
        type: 'boolean',
        description: 'Whether the chunk is relevant to the inquiry'
      },
      confidence: {
        type: 'number',
        description: 'Confidence score between 0 and 1'
      },
      reason: {
        type: 'string',
        description: 'Explanation of why the chunk is or is not relevant'
      },
      keyMatches: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key terms or concepts that match between the chunk and inquiry'
      }
    },
    required: ['isRelevant', 'confidence', 'reason', 'keyMatches']
  }
} as const

// Initialize relevance model with function calling
const relevanceModel = model.bind({
  functions: [relevanceAgentSchema],
  function_call: { name: 'evaluate_chunk_relevance' }
})

// Create the relevance agent prompt
const relevancePrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a document relevance specialist. Your role is to:
1. Evaluate if a document chunk is relevant to a user's inquiry
2. Identify key matching terms and concepts
3. Provide a clear explanation for your relevance decision
4. Assign a confidence score to your evaluation

Guidelines for relevance evaluation:
- Compare specific technical terms and concepts
- Consider both direct and indirect relevance
- Look for matching error messages or symptoms
- Evaluate if the information would help answer the inquiry
- Consider the context and related concepts

Mark chunks as relevant if they:
- Directly answer the inquiry
- Provide necessary background information
- Explain related processes or features
- Offer solutions to similar problems

Always explain your reasoning and highlight key matching terms.`],
  ['human', `Please evaluate this document chunk for relevance:
Inquiry: {inquiry}
Chunk: {chunk.content}
Document ID: {chunk.documentId}
Similarity Score: {chunk.similarity}`]
])

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
  })
})

// Create the vector search chain
const vectorSearchChain = RunnableSequence.from([
  // Input validation
  (input: { analysisId: string, originalInquiry: string, metadata: any }) => {
    const { analysisId, originalInquiry, metadata } = RequestSchema.parse(input)
    console.log('Validated input:', { analysisId, metadata: { ...metadata, ticketId: metadata.ticketId } })
    return { analysisId, originalInquiry, metadata }
  },

  // Search phrase generation
  async (input) => {
    const { searchPhrases } = await cleanupChain.invoke(input)
    return { ...input, searchPhrases }
  },

  // Vector search and relevance evaluation
  async (input) => {
    const results: Record<string, any[]> = {}
    for (const phrase of input.searchPhrases) {
      console.log(`Searching for phrase: ${phrase}`)
      
      // Perform vector search
      const searchResult = await fetch(`${supabaseUrl}/functions/v1/search-rag-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: phrase,
          organization_id: input.metadata.organizationId,
          ticket_id: input.metadata.ticketId,
          limit: 5
        })
      }).then(r => r.json())
      
      // Evaluate relevance using relevance chain
      const relevanceChain = RunnableSequence.from([
        (chunk) => ({
          inquiry: input.originalInquiry,
          chunk: {
            content: chunk.content,
            documentId: chunk.documentId,
            similarity: chunk.similarity
          }
        }),
        relevancePrompt,
        relevanceModel,
        (response) => {
          if (!response.additional_kwargs?.function_call?.arguments) {
            throw new Error('No function call arguments found in response')
          }
          return JSON.parse(response.additional_kwargs.function_call.arguments)
        }
      ])

      const evaluatedChunks = await Promise.all(
        searchResult.results.map(async (result: any) => {
          const chunk = {
            content: result.content,
            documentId: result.document.id,
            similarity: result.similarity
          }

          const relevance = await relevanceChain.invoke(chunk)
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

    return {
      searchPhrases: input.searchPhrases,
      results: input.results,
      analysis: analysisResult
    }
  }
])

// Export the chain for use in the main coordinator
export { vectorSearchChain }

// Keep the serve function for standalone testing
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
