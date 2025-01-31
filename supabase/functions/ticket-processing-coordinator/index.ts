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

// Create the priority agent's function schema
const priorityAgentSchema = {
  name: 'determine_ticket_priority',
  description: 'Determine the priority level of a support ticket based on content and context',
  parameters: {
    type: 'object',
    properties: {
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'The determined priority level for the ticket'
      },
      reasoning: {
        type: 'string',
        description: 'Explanation of why this priority level was chosen'
      }
    },
    required: ['priority', 'reasoning']
  }
} as const

// Initialize priority model with function calling
const priorityModel = model.bind({
  functions: [priorityAgentSchema],
  function_call: { name: 'determine_ticket_priority' }
}).withConfig({
  tags: ["ticket-priority", "priority-agent"]
})

// Create the priority agent prompt
const priorityPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a ticket priority specialist. Your role is to:
1. Analyze customer inquiries to determine appropriate priority levels
2. Consider business impact and urgency
3. Evaluate technical complexity and risk
4. Account for customer needs and expectations

Priority Level Guidelines:
- LOW: Minor issues, cosmetic problems, documentation updates
- MEDIUM: Standard feature requests, non-critical bugs, general inquiries
- HIGH: System performance issues, major bugs, business-blocking problems
- URGENT: System outages, security incidents, severe data issues

Always explain your reasoning for the chosen priority level.`],
  ['human', `Please determine the priority for this ticket:

Original Inquiry: {inquiry}

Please evaluate the severity and urgency to assign an appropriate priority level.`]
])

// Create the tag maker agent's function schema
const tagMakerSchema = {
  name: 'generate_ticket_tags',
  description: 'Generate relevant tags for a support ticket',
  parameters: {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: {
          type: 'string',
          maxLength: 30
        },
        maxItems: 3,
        description: 'List of 1-2 word tags that categorize the ticket'
      },
      reasoning: {
        type: 'string',
        description: 'Explanation of why these tags were chosen'
      }
    },
    required: ['tags', 'reasoning']
  }
} as const

// Initialize tag maker model with function calling
const tagMakerModel = model.bind({
  functions: [tagMakerSchema],
  function_call: { name: 'generate_ticket_tags' }
})

// Create the tag maker prompt
const tagMakerPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a ticket tagging specialist. Your role is to:
1. Generate concise, relevant tags for support tickets
2. Focus on key themes and categories
3. Use consistent terminology
4. Keep tags short and descriptive

Tag Creation Guidelines:
- Use 1-2 words per tag
- Focus on technical components, features, or problem areas
- Be specific but not too narrow
- Use lowercase with hyphens for spaces
- Generate 2-3 tags per ticket

Always explain your reasoning for the chosen tags.`],
  ['human', `Please generate tags for this ticket:

Original Inquiry: {inquiry}

Please suggest 2-3 relevant tags that categorize this ticket.`]
])

// Create the assignment agent's function schema
const assignmentSchema = {
  name: 'determine_ticket_assignment',
  description: 'Determine if a ticket needs human assignment',
  parameters: {
    type: 'object',
    properties: {
      needsAssignment: {
        type: 'boolean',
        description: 'Whether the ticket needs to be assigned to a human agent'
      },
      reasoning: {
        type: 'string',
        description: 'Explanation of the assignment decision'
      }
    },
    required: ['needsAssignment', 'reasoning']
  }
} as const

// Initialize assignment model with function calling
const assignmentModel = model.bind({
  functions: [assignmentSchema],
  function_call: { name: 'determine_ticket_assignment' }
})

// Create the assignment prompt
const assignmentPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a ticket assignment specialist. For testing purposes, you should:
1. Always return needsAssignment as false
2. Provide a brief explanation
3. Note that this is a placeholder for future human assignment logic

In the future, this will evaluate:
- Ticket complexity
- Required expertise
- Current workload
- Business rules

For now, keep all tickets unassigned for AI handling.`],
  ['human', `Please evaluate if this ticket needs human assignment:

Priority Level: {priority}
Tags: {tags}
Original Inquiry: {inquiry}

Please determine if this ticket should be assigned to a human agent.`]
])

// Define schema for request validation
const RequestSchema = z.object({
  analysisId: z.string().uuid(),
  originalInquiry: z.string(),
  results: z.object({
    all: z.array(z.object({
      content: z.string(),
      documentId: z.string(),
      similarity: z.number(),
      isRelevant: z.boolean(),
      relevanceReason: z.string().optional(),
      confidence: z.number().optional(),
      keyMatches: z.array(z.string()).optional()
    }))
  }),
  metadata: z.object({
    organizationId: z.string().uuid(),
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
}).strict()

// Add function to update analysis record
async function updateAnalysisRecord(
  analysisId: string,
  updates: {
    processing_results?: any,
    status?: 'processing' | 'completed' | 'error',
    error_message?: string | null
  }
): Promise<void> {
  console.log('Updating analysis record:', { analysisId, ...updates })
  
  const { error: updateError } = await supabase
    .from('ticket_analysis')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', analysisId)

  if (updateError) {
    console.error('Failed to update analysis record:', updateError)
    throw new Error(`Failed to update analysis record: ${updateError.message}`)
  }

  console.log('Successfully updated analysis record')
}

// Add function to update ticket priority
async function updateTicketPriority(
  ticketId: string,
  priority: string,
  organizationId: string
): Promise<void> {
  console.log('Updating ticket priority:', { ticketId, priority })
  
  // Create Supabase client with service role key
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Update ticket directly using Supabase client
  const { error: updateError } = await supabaseClient
    .from('tickets')
    .update({ 
      priority,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .eq('organization_id', organizationId)

  if (updateError) {
    console.error('Failed to update ticket priority:', updateError)
    throw new Error(`Failed to update ticket priority: ${updateError.message}`)
  }

  console.log('Successfully updated ticket priority')
}

// Add function to update ticket tags
async function updateTicketTags(
  ticketId: string,
  tags: string[],
  organizationId: string
): Promise<void> {
  console.log('Updating ticket tags:', { ticketId, tags })
  
  // Create Supabase client with service role key
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // First, remove existing tags
  const { error: deleteError } = await supabaseClient
    .from('ticket_tags')
    .delete()
    .eq('ticket_id', ticketId)

  if (deleteError) {
    console.error('Failed to remove existing tags:', deleteError)
    throw new Error(`Failed to update ticket tags: ${deleteError.message}`)
  }

  // Then insert new tags
  if (tags.length > 0) {
    // First get or create the tags in the tags table
    for (const tagName of tags) {
      const { error: tagError } = await supabaseClient
        .from('tags')
        .upsert({
          name: tagName,
          organization_id: organizationId,
          type: 'system',
          is_ai_generated: true
        }, {
          onConflict: 'organization_id,name'
        })

      if (tagError) {
        console.error('Failed to upsert tag:', tagError)
        throw new Error(`Failed to upsert tag: ${tagError.message}`)
      }
    }

    // Get the tag IDs for the tag names
    const { data: tagData, error: tagQueryError } = await supabaseClient
      .from('tags')
      .select('id')
      .eq('organization_id', organizationId)
      .in('name', tags)

    if (tagQueryError) {
      console.error('Failed to query tags:', tagQueryError)
      throw new Error(`Failed to query tags: ${tagQueryError.message}`)
    }

    // Create the ticket_tags entries
    const tagInserts = tagData.map(tag => ({
      ticket_id: ticketId,
      tag_id: tag.id,
      is_ai_generated: true,
      created_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabaseClient
      .from('ticket_tags')
      .insert(tagInserts)

    if (insertError) {
      console.error('Failed to insert new tags:', insertError)
      throw new Error(`Failed to insert new tags: ${insertError.message}`)
    }
  }

  console.log('Successfully updated ticket tags')
}

// Create the ticket processing chain
const ticketProcessingChain = RunnableSequence.from([
  // Input validation
  async (input) => {
    console.log('Starting ticket processing, validating input...')
    const validated = RequestSchema.parse(input)
    
    console.log('Processing ticket:', { 
      analysisId: validated.analysisId,
      metadata: validated.metadata
    })

    // Update analysis record to processing
    await updateAnalysisRecord(validated.analysisId, {
      status: 'processing'
    })

    return validated
  },

  // Priority determination
  async (input) => {
    console.log('Determining priority...')
    const priorityResponse = await priorityPrompt.pipe(priorityModel).invoke({
      inquiry: input.originalInquiry
    }, {
      tags: ["priority-determination", "ticket-processing"]
    })

    // Parse function call result
    if (!priorityResponse.additional_kwargs?.function_call?.arguments) {
      throw new Error('No priority determination result found')
    }
    const priorityResult = JSON.parse(priorityResponse.additional_kwargs.function_call.arguments)
    console.log('Priority determined:', priorityResult)

    // Update ticket priority if we have a ticket ID
    if (input.metadata.ticketId) {
      await updateTicketPriority(
        input.metadata.ticketId,
        priorityResult.priority,
        input.metadata.organizationId
      )
    }

    // Update analysis record with partial results
    await updateAnalysisRecord(input.analysisId, {
      processing_results: {
        priority: priorityResult.priority,
        priorityReasoning: priorityResult.reasoning
      }
    })

    return { ...input, priorityResult }
  },

  // Tag generation
  async (input) => {
    console.log('Generating tags...')
    const tagResponse = await tagMakerPrompt.pipe(tagMakerModel).invoke({
      inquiry: input.originalInquiry
    })

    // Parse function call result
    if (!tagResponse.additional_kwargs?.function_call?.arguments) {
      throw new Error('No tag generation result found')
    }
    const tagResult = JSON.parse(tagResponse.additional_kwargs.function_call.arguments)
    console.log('Tags generated:', tagResult)

    // Update ticket tags if we have a ticket ID
    if (input.metadata.ticketId) {
      await updateTicketTags(
        input.metadata.ticketId,
        tagResult.tags,
        input.metadata.organizationId
      )
    }

    // Update analysis record with tag results
    await updateAnalysisRecord(input.analysisId, {
      processing_results: {
        priority: input.priorityResult.priority,
        priorityReasoning: input.priorityResult.reasoning,
        tags: tagResult.tags,
        tagReasoning: tagResult.reasoning
      }
    })

    return { ...input, tagResult }
  },

  // Assignment determination
  async (input) => {
    console.log('Determining assignment...')
    const assignmentResponse = await assignmentPrompt.pipe(assignmentModel).invoke({
      inquiry: input.originalInquiry,
      priority: input.priorityResult.priority,
      tags: JSON.stringify(input.tagResult.tags)
    })

    // Parse function call result
    if (!assignmentResponse.additional_kwargs?.function_call?.arguments) {
      throw new Error('No assignment determination result found')
    }
    const assignmentResult = JSON.parse(assignmentResponse.additional_kwargs.function_call.arguments)
    console.log('Assignment determined:', assignmentResult)

    // Prepare final results
    const finalResult = {
      analysisId: input.analysisId,
      priority: input.priorityResult.priority,
      priorityReasoning: input.priorityResult.reasoning,
      tags: input.tagResult.tags,
      tagReasoning: input.tagResult.reasoning,
      needsAssignment: assignmentResult.needsAssignment,
      assignmentReasoning: assignmentResult.reasoning,
      metadata: input.metadata
    }

    // Update analysis record with complete results
    await updateAnalysisRecord(input.analysisId, {
      processing_results: {
        priority: finalResult.priority,
        priorityReasoning: finalResult.priorityReasoning,
        tags: finalResult.tags,
        tagReasoning: finalResult.tagReasoning,
        needsAssignment: finalResult.needsAssignment,
        assignmentReasoning: finalResult.assignmentReasoning
      },
      status: 'processing'
    })

    console.log('Processing completed with results:', finalResult)
    return finalResult
  }
])

// Export the chain for use in other coordinators
export { ticketProcessingChain }

// Keep the serve function for standalone testing
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const result = await ticketProcessingChain.invoke(body)

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

    // Update analysis record with error if we have an analysis ID
    try {
      const body = await req.json()
      if (body.analysisId) {
        await updateAnalysisRecord(body.analysisId, {
          status: 'error',
          error_message: error.message
        })
      }
    } catch (updateError) {
      console.error('Failed to update analysis record with error:', updateError)
    }

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
