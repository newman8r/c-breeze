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

// Define request schema
const RequestSchema = z.object({
  ticketId: z.string().uuid(),
  organizationId: z.string().uuid(),
  newMessageId: z.string().uuid()
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
  ['system', `You are an expert support ticket response generator. Your role is to:
1. Generate appropriate responses based on the conversation analysis
2. Maintain a professional yet friendly tone
3. Be clear about any actions taken (ticket closed, assigned to human, etc.)
4. Provide clear next steps when needed

Response Guidelines:
- For solved tickets: Thank them for their confirmation and explain what's happening
- For human assignments: Explain why we're assigning to a human and what to expect
- For continued conversation: Address their concerns and ask clarifying questions
- Keep responses concise but complete
- Be empathetic and professional

Always ensure the customer understands what's happening next.`],
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
  async (input: z.infer<typeof RequestSchema>) => {
    console.log('Starting conversation analysis for ticket:', input.ticketId)

    // Fetch conversation context using the user's JWT
    const contextResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/conversation-context`, {
      method: 'POST',
      headers: {
        'Authorization': input.userJWT, // Pass through the user's JWT
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticketId: input.ticketId,
        organizationId: input.organizationId
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
      // Update ticket status
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/api-update-ticket-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticketId: input.ticketId,
          status: 'closed',
          satisfactionRating: result.satisfactionRating
        })
      })
    } else if (result.action === 'assign_human') {
      // Randomly select an employee
      const employees = input.context.employees
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)]
      
      // Update ticket assignment
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/modify-ticket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticketId: input.ticketId,
          assignedTo: randomEmployee.id
        })
      })

      result.assignedEmployeeId = randomEmployee.id
      result.assignedEmployeeName = randomEmployee.name
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

// Serve the endpoint
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const body = await req.json()
    const validatedInput = RequestSchema.parse(body)

    console.log('Getting customer data for user:', user.email)

    // Get customer data for this user using service role client
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, organization_id')
      .eq('email', user.email)
      .single()

    if (customerError || !customerData) {
      console.error('Customer not found:', customerError)
      throw new Error('Customer not found')
    }

    console.log('Checking ticket access:', {
      ticketId: validatedInput.ticketId,
      organizationId: validatedInput.organizationId,
      customerId: customerData.id,
      customerOrgId: customerData.organization_id
    })

    // Verify user has access to the ticket (using service role client)
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, customer_id')
      .eq('id', validatedInput.ticketId)
      .eq('organization_id', validatedInput.organizationId)
      .eq('customer_id', customerData.id)
      .single()

    console.log('Ticket query result:', { ticket, error: ticketError })

    if (ticketError || !ticket) {
      console.error('Ticket access error:', { ticketError })
      throw new Error('Ticket not found or access denied')
    }

    // Add the JWT to the input for use in the chain
    const result = await analysisChain.invoke({
      ...validatedInput,
      userJWT
    })

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
