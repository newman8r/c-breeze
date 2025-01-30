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

// Initialize the base model
const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0.7 // Slightly higher temperature for more natural responses
})

// Create the response generator schema
const responseGeneratorSchema = {
  name: 'generate_ticket_response',
  description: 'Generate a response to a support ticket using available context',
  parameters: {
    type: 'object',
    properties: {
      response: {
        type: 'string',
        description: 'The generated response to the ticket'
      },
      reasoning: {
        type: 'string',
        description: 'Explanation of how the response was crafted'
      },
      next_steps: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Suggested next steps or follow-up actions'
      }
    },
    required: ['response', 'reasoning', 'next_steps']
  }
} as const

// Initialize response model with function calling
const responseModel = model.bind({
  functions: [responseGeneratorSchema],
  function_call: { name: 'generate_ticket_response' }
})

// Create the response generator prompt
const responsePrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are an expert support ticket response generator. Your role is to:
1. Analyze the customer inquiry and available context
2. Consider relevant documentation from vector search
3. Account for ticket priority and tags
4. Generate a clear, helpful response

Response Guidelines:
- Be professional yet friendly
- Address all parts of the inquiry
- Include specific details from relevant documentation
- Adjust tone based on ticket priority
- Provide clear next steps
- Keep responses concise but complete

Always explain your reasoning and suggest follow-up actions.`],
  ['human', `Please generate a response for this ticket:

Original Inquiry: {inquiry}

Ticket Information:
Priority: {priority}
Tags: {tags}
Priority Reasoning: {priorityReasoning}

Relevant Documentation:
{vectorSearchResults}

Please generate an appropriate response that addresses the inquiry and incorporates relevant information.`]
])

// Define schema for request validation
const RequestSchema = z.object({
  ticketProcessingResults: z.object({
    analysisId: z.string().uuid(),
    priority: z.string(),
    priorityReasoning: z.string(),
    tags: z.array(z.string()),
    tagReasoning: z.string(),
    needsAssignment: z.boolean(),
    assignmentReasoning: z.string(),
    metadata: z.object({
      organizationId: z.string().uuid(),
      ticketId: z.string().uuid().optional()
    })
  }),
  vectorSearchResults: z.object({
    analysisId: z.string().uuid(),
    results: z.record(z.array(z.object({
      content: z.string(),
      documentId: z.string(),
      similarity: z.number(),
      isRelevant: z.boolean(),
      relevanceReason: z.string().optional(),
      confidence: z.number().optional(),
      keyMatches: z.array(z.string()).optional()
    }))),
    metadata: z.object({
      organizationId: z.string().uuid()
    })
  }),
  originalInquiry: z.string()
}).strict()

// Create the response generation chain
const responseGenerationChain = RunnableSequence.from([
  // Input validation
  async (input) => {
    console.log('Starting response generation coordinator with input:', {
      analysisId: input.ticketProcessingResults.analysisId,
      ticketId: input.ticketProcessingResults.metadata.ticketId,
      hasVectorResults: !!input.vectorSearchResults?.results
    })

    console.log('Starting response generation, validating input...')
    const validated = RequestSchema.parse(input)
    
    // Verify analysis IDs match
    if (validated.ticketProcessingResults.analysisId !== validated.vectorSearchResults.analysisId) {
      throw new Error('Analysis IDs do not match between ticket processing and vector search results')
    }

    // Verify organization IDs match
    if (validated.ticketProcessingResults.metadata.organizationId !== validated.vectorSearchResults.metadata.organizationId) {
      throw new Error('Organization IDs do not match between ticket processing and vector search results')
    }

    console.log('Generating response for ticket:', { 
      analysisId: validated.ticketProcessingResults.analysisId,
      priority: validated.ticketProcessingResults.priority,
      tags: validated.ticketProcessingResults.tags
    })
    return validated
  },

  // Response generation
  async (input) => {
    console.log('Generating response...')
    const responseGenerated = await responsePrompt.pipe(responseModel).invoke({
      inquiry: input.originalInquiry,
      priority: input.ticketProcessingResults.priority,
      tags: JSON.stringify(input.ticketProcessingResults.tags),
      priorityReasoning: input.ticketProcessingResults.priorityReasoning,
      vectorSearchResults: JSON.stringify(input.vectorSearchResults.results)
    })

    // Parse function call result
    if (!responseGenerated.additional_kwargs?.function_call?.arguments) {
      throw new Error('No response generation result found')
    }
    const responseResult = JSON.parse(responseGenerated.additional_kwargs.function_call.arguments)
    console.log('Response generated with next steps:', responseResult.next_steps)

    // Update analysis record with response and completed status
    console.log('Initializing Supabase client for status update...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Attempting to update ticket_analysis record:', {
      analysisId: input.ticketProcessingResults.analysisId,
      status: 'completed',
      hasResponse: !!responseResult.response
    })

    // First get the existing record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('ticket_analysis')
      .select('vector_search_results')
      .eq('id', input.ticketProcessingResults.analysisId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch existing record:', fetchError)
      throw new Error(`Failed to fetch existing record: ${fetchError.message}`)
    }

    // Update the analysis record
    const { data: updateData, error: updateError } = await supabase
      .from('ticket_analysis')
      .update({
        response_generation_results: {
          response: responseResult.response,
          reasoning: responseResult.reasoning,
          next_steps: responseResult.next_steps
        },
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', input.ticketProcessingResults.analysisId)
      .select()

    if (updateError) {
      console.error('Failed to update ticket_analysis:', updateError)
      throw new Error(`Failed to update analysis with response results: ${updateError.message}`)
    }

    // Create the ticket message
    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: input.ticketProcessingResults.metadata.ticketId,
        organization_id: input.ticketProcessingResults.metadata.organizationId,
        content: responseResult.response,
        sender_type: 'ai',
        metadata: {
          analysis_id: input.ticketProcessingResults.analysisId,
          reasoning: responseResult.reasoning,
          next_steps: responseResult.next_steps
        }
      })

    if (messageError) {
      console.error('Failed to create ticket message:', messageError)
      throw new Error(`Failed to create ticket message: ${messageError.message}`)
    }

    console.log('Successfully updated ticket_analysis and created message:', {
      analysisId: input.ticketProcessingResults.analysisId,
      newStatus: 'completed',
      updateData
    })

    // Return final result
    return {
      analysisId: input.ticketProcessingResults.analysisId,
      response: responseResult.response,
      reasoning: responseResult.reasoning,
      next_steps: responseResult.next_steps,
      metadata: {
        priority: input.ticketProcessingResults.priority,
        tags: input.ticketProcessingResults.tags,
        organizationId: input.ticketProcessingResults.metadata.organizationId,
        ticketId: input.ticketProcessingResults.metadata.ticketId
      }
    }
  }
])

// Export the chain for use in other coordinators
export { responseGenerationChain }

// Keep the serve function for standalone testing
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const result = await responseGenerationChain.invoke(body)

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