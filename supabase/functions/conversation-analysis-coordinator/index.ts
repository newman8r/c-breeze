import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { z } from "zod"
import { ChatOpenAI } from "@langchain/openai"
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"

// Define the types we need
interface Database {
  public: {
    Tables: {
      ticket_messages: {
        Row: {
          id: string;
          ticket_id: string;
          content: string;
          sender_type: string;
          created_at: string;
        };
      };
      ticket_analysis: {
        Row: {
          id: string;
          ticket_id: string;
          status: 'pending' | 'processing' | 'completed' | 'error';
          response_generation_results?: {
            response: string;
            [key: string]: any;
          };
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Initialize the base model
const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0
})

// Define base request schema
const BaseRequestSchema = z.object({
  ticketId: z.string().uuid(),
  organizationId: z.string().uuid(),
  newMessageId: z.string().uuid()
})

// Define the internal chain input schema that includes customerId
const ChainInputSchema = BaseRequestSchema.extend({
  customerId: z.string().uuid()
})

// Define conversation context schema
const ConversationContextSchema = z.object({
  messageHistory: z.array(z.object({
    id: z.string().uuid(),
    content: z.string(),
    sender_type: z.enum(['employee', 'customer', 'system', 'ai']),
    created_at: z.string(),
    metadata: z.record(z.any()).optional()
  })),
  ticketAnalysis: z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'processing', 'completed', 'error']),
    vector_search_results: z.record(z.any()).optional(),
    processing_results: z.record(z.any()).optional(),
    response_generation_results: z.record(z.any()).optional()
  }).nullable(),
  employees: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: z.string()
  }))
})

// Create the analysis agent prompt
const analysisPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are an expert conversation analyst for a support ticket system. Your role is to:
1. Analyze the conversation history to determine if the problem is solved
2. Determine if human intervention is needed
3. Provide clear reasoning for your decisions

Consider a problem solved when:
- The customer explicitly confirms their satisfaction
- All their questions have been answered
- They acknowledge the solution works

Consider human intervention needed when:
- The customer specifically requests it
- The issue requires physical presence (tech dispatch, sales meeting)
- The problem is too complex for AI
- It's an emergency situation
- Multiple back-and-forth exchanges haven't resolved the issue

Always explain your reasoning and be thorough in your analysis.`],
  ['human', `Please analyze this conversation:

Message History:
{messageHistory}

Previous Analysis:
{ticketAnalysis}

Please determine:
1. Is the problem solved?
2. Is human intervention needed?
3. What should be our next action?`]
])

// Initialize analysis model with function calling
const analysisModel = model.bind({
  functions: [{
    name: 'analyze_conversation',
    description: 'Analyze the conversation and determine next steps',
    parameters: {
      type: 'object',
      properties: {
        isSolved: {
          type: 'boolean',
          description: 'Whether the problem is considered solved'
        },
        needsHuman: {
          type: 'boolean',
          description: 'Whether human intervention is needed'
        },
        action: {
          type: 'string',
          enum: ['close_ticket', 'assign_human', 'continue_conversation'],
          description: 'The next action to take'
        },
        satisfactionRating: {
          type: 'number',
          description: 'Customer satisfaction rating (1-5) based on their feedback',
          minimum: 1,
          maximum: 5
        },
        reasoning: {
          type: 'string',
          description: 'Detailed explanation of the analysis and decision'
        }
      },
      required: ['isSolved', 'needsHuman', 'action', 'reasoning']
    }
  }],
  function_call: { name: 'analyze_conversation' }
})

// Create the response generator prompt
const responsePrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a friendly, modern AI support assistant. Your responses should be:
- Direct and conversational (like instant messaging)
- Clear and straight to the point
- Natural and engaging
- Using emojis to enhance (not decorate) meaning

Response Style Guide:
For solved tickets:
✅ "Perfect! Everything's working now. I'll close this ticket 🎉"
✅ "Great! You're all set. Closing this one up ✨"

For human handoff:
✅ "I'm bringing in one of our experts for this. They'll jump in shortly 👋"
✅ "This needs a specialist's touch. Getting them involved now 🔄"

For follow-ups:
✅ "Quick question - have you tried clearing your cache?"
✅ "Could you check if the error still happens after logging out and back in?"

Examples to avoid:
❌ "Dear customer, I trust this message finds you well..."
❌ "Thank you for your continued patience..."
❌ "Best regards, AI Support"
❌ "We appreciate your understanding..."

Remember: Write like you're messaging a colleague - professional but direct and natural.`],
  ['human', `Please generate a response based on this analysis:

Analysis Result:
{analysisResult}

Message History:
{messageHistory}

Please generate an appropriate response that explains any actions taken and next steps.`]
])

// Initialize response model with function calling
const responseModel = model.bind({
  functions: [{
    name: 'generate_response',
    description: 'Generate an appropriate response based on the analysis',
    parameters: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description: 'The response message to send to the customer'
        },
        tone: {
          type: 'string',
          enum: ['grateful', 'informative', 'apologetic', 'helpful'],
          description: 'The tone of the response'
        }
      },
      required: ['response', 'tone']
    }
  }],
  function_call: { name: 'generate_response' }
})

// Create the analysis chain
const analysisChain = RunnableSequence.from([
  // Input validation and context fetching
  async (input: z.infer<typeof ChainInputSchema>) => {
    console.log('Starting conversation analysis for ticket:', input.ticketId)

    // First verify ticket access using get-ticket-for-agent
    const ticketResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-ticket-for-agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticket_id: input.ticketId,
        organization_id: input.organizationId,
        customer_id: input.customerId
      })
    })

    if (!ticketResponse.ok) {
      const error = await ticketResponse.json()
      throw new Error(error.error || 'Failed to verify ticket access')
    }

    // Then fetch conversation context
    const contextResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/conversation-context`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticketId: input.ticketId,
        organizationId: input.organizationId,
        customerId: input.customerId
      })
    })

    if (!contextResponse.ok) {
      const error = await contextResponse.json()
      throw new Error(error.error || 'Failed to fetch conversation context')
    }

    const context = await contextResponse.json()
    const validatedContext = ConversationContextSchema.parse(context)

    return {
      ...input,
      context: validatedContext
    }
  },

  // Analysis
  async (input) => {
    console.log('Analyzing conversation...')
    const analysisResult = await analysisPrompt.pipe(analysisModel).invoke({
      messageHistory: JSON.stringify(input.context.messageHistory, null, 2),
      ticketAnalysis: JSON.stringify(input.context.ticketAnalysis, null, 2)
    })

    // Parse function call result
    if (!analysisResult.additional_kwargs?.function_call?.arguments) {
      throw new Error('No analysis result found')
    }
    const result = JSON.parse(analysisResult.additional_kwargs.function_call.arguments)

    // Handle different actions
    if (result.action === 'close_ticket') {
      console.log('Closing ticket:', input.ticketId)
      // Update ticket status using modify-ticket-for-agent
      const updateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/modify-ticket-for-agent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticket_id: input.ticketId,
          status: 'closed',
          satisfaction_rating: result.satisfactionRating
        })
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        console.error('Failed to close ticket:', errorData)
        // Don't throw error, but log it and continue
        result.action = 'continue_conversation'
        result.reasoning += '\nAttempted to close the ticket but encountered an error. Continuing the conversation.'
      } else {
        console.log('Successfully closed ticket')
      }
    } else if (result.action === 'assign_human') {
      console.log('Assigning ticket to human agent...')
      
      // Log the context to see what we're getting
      console.log('Context employees:', input.context.employees)
      console.log('Organization ID:', input.organizationId)
      
      // Get valid employees (filter out null names)
      const validEmployees = input.context.employees.filter(emp => {
        console.log('Checking employee:', emp)
        const isValid = emp && emp.id && emp.name
        console.log('Is valid employee?', isValid)
        return isValid
      })
      
      console.log('Valid employees found:', validEmployees.length)
      
      if (validEmployees.length === 0) {
        console.log('No valid employees found for assignment, continuing conversation')
        result.action = 'continue_conversation'
        result.reasoning += '\nNo available employees found for assignment. Continuing the conversation.'
      } else {
        // Simple random selection for now
        const selectedEmployee = validEmployees[Math.floor(Math.random() * validEmployees.length)]
        
        console.log('Selected employee for assignment:', selectedEmployee)
        
        // Update ticket assignment and disable AI
        const assignPayload = {
          ticket_id: input.ticketId,
          assigned_to: selectedEmployee.id,
          ai_enabled: false // Disable AI when assigning to human
        }
        console.log('Sending assignment payload:', assignPayload)
        
        const assignResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/modify-ticket-for-agent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(assignPayload)
        })

        const assignResponseData = await assignResponse.json()
        console.log('Assignment response:', {
          ok: assignResponse.ok,
          status: assignResponse.status,
          data: assignResponseData
        })

        if (!assignResponse.ok) {
          console.error('Failed to assign ticket:', assignResponseData)
          result.action = 'continue_conversation'
          result.reasoning += '\nAttempted to assign the ticket but encountered an error. Continuing the conversation.'
        } else {
          console.log('Successfully assigned ticket')
          result.assignedEmployeeId = selectedEmployee.id
          result.assignedEmployeeName = selectedEmployee.name
          
          // Add a note about the handoff
          const handoffNote = `This ticket has been assigned to ${selectedEmployee.name}. They will review the conversation and assist you further.`
          
          // Create a system message about the handoff
          const { data: noteData, error: noteError } = await supabase
            .from('ticket_messages')
            .insert({
              ticket_id: input.ticketId,
              organization_id: input.organizationId,
              content: handoffNote,
              sender_type: 'system',
              metadata: {
                event_type: 'human_handoff',
                assigned_to: {
                  id: selectedEmployee.id,
                  name: selectedEmployee.name
                }
              }
            })
            .select()
            .single()

          if (noteError) {
            console.error('Failed to create handoff note:', noteError)
            // Don't throw error, just log it
          } else {
            console.log('Created handoff note:', noteData)
          }

          // Verify the AI status was updated
          const { data: updatedTicket, error: verifyError } = await supabase
            .from('tickets')
            .select('ai_enabled, assigned_to')
            .eq('id', input.ticketId)
            .single()

          console.log('Ticket status after assignment:', updatedTicket)
          if (verifyError) {
            console.error('Failed to verify ticket update:', verifyError)
          }
        }
      }
    }

    return {
      ...input,
      analysisResult: result
    }
  },

  // Response Generation
  async (input) => {
    console.log('Generating response...')
    const responseResult = await responsePrompt.pipe(responseModel).invoke({
      analysisResult: JSON.stringify(input.analysisResult, null, 2),
      messageHistory: JSON.stringify(input.context.messageHistory, null, 2)
    })

    // Parse function call result
    if (!responseResult.additional_kwargs?.function_call?.arguments) {
      throw new Error('No response generation result found')
    }
    const response = JSON.parse(responseResult.additional_kwargs.function_call.arguments)

    // Create ticket message
    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: input.ticketId,
        organization_id: input.organizationId,
        content: response.response,
        sender_type: 'ai',
        metadata: {
          analysis_id: input.context.ticketAnalysis?.id,
          action_taken: input.analysisResult.action,
          reasoning: input.analysisResult.reasoning,
          tone: response.tone,
          is_closing_message: input.analysisResult.action === 'close_ticket',
          assigned_employee: input.analysisResult.assignedEmployeeId ? {
            id: input.analysisResult.assignedEmployeeId,
            name: input.analysisResult.assignedEmployeeName
          } : undefined
        }
      })

    if (messageError) {
      throw new Error(`Failed to create ticket message: ${messageError.message}`)
    }

    return {
      ...input.analysisResult,
      response: response.response
    }
  }
])

interface TicketData {
  id: string
  organization_id: string
  customer_id: string
  status: string
  priority: string
  ai_enabled: boolean
  assigned_to?: string
  satisfaction_rating?: number
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Clone the request for multiple body reads
    const reqClone = req.clone()

    // Parse the request body
    const { ticketId, messageId, organizationId } = await reqClone.json()

    // Get the ticket details first to check AI enabled status
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('ai_enabled, organization_id, customer_id')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      throw new Error(`Failed to fetch ticket: ${ticketError.message}`)
    }

    // If AI is disabled for this ticket, return early
    if (!ticket.ai_enabled) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'AI responses are disabled for this ticket',
          aiDisabled: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Get the JWT token from the Authorization header
    const userJWT = req.headers.get('Authorization')
    if (!userJWT) {
      throw new Error('Missing authorization header')
    }

    // Create a Supabase client with the user's JWT
    const userClient = createClient<Database>(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: userJWT
          }
        }
      }
    )

    // Get user data
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse and validate the base request
    const body = await req.json()
    const validatedInput = BaseRequestSchema.parse(body)

    console.log('Getting customer data for user:', user.email)

    // Get customer data using service role client
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, organization_id')
      .eq('email', user.email)
      .single()

    if (customerError || !customerData) {
      console.error('Customer not found:', customerError)
      throw new Error('Customer not found')
    }

    // Create and validate the chain input with customer data
    const chainInput = ChainInputSchema.parse({
      ticketId: validatedInput.ticketId,
      organizationId: validatedInput.organizationId,
      newMessageId: validatedInput.newMessageId,
      customerId: customerData.id
    })

    // Run the analysis chain with the validated input
    const result = await analysisChain.invoke(chainInput)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' || error.message === 'Ticket not found or access denied' ? 403 : 500 
      }
    )
  }
}) 
