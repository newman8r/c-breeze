import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import OpenAI from 'https://esm.sh/openai@4'
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { ChatOpenAI } from "@langchain/openai"
import { 
  FunctionParameters,
  StructuredOutputParser
} from "@langchain/core/output_parsers"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
})

// Initialize the base model first
const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0
})

// Types for our system
interface TicketAnalysisState {
  startTime: string
  customerInquiry: string
  language?: {
    code: string
    confidence: number
  }
  validity?: {
    isValid: boolean
    reason: string
  }
  ticket?: {
    id: string
    status: string
    created_at: string
  }
  error?: {
    type: string
    message: string
    response: string
  }
}

// Tools
const timingTool = {
  name: 'log_start_time',
  description: 'Log the start time of the analysis',
  parameters: {
    type: 'object',
    properties: {
      timestamp: {
        type: 'string',
        description: 'ISO timestamp of when the analysis started'
      }
    },
    required: ['timestamp']
  }
} as const

// Ticket creation tool schema
const createTicketTool = {
  name: 'create_ticket',
  description: 'Create a new support ticket from the analyzed inquiry',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A clear, concise title summarizing the inquiry'
      },
      description: {
        type: 'string',
        description: 'Detailed description of the inquiry, including any translations if needed'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Priority level for the ticket'
      },
      category: {
        type: 'string',
        description: 'Category of the support ticket'
      },
      customerEmail: {
        type: 'string',
        description: 'Email address of the customer making the inquiry'
      },
      customerName: {
        type: 'string',
        description: 'Name of the customer making the inquiry'
      }
    },
    required: ['title', 'description', 'customerEmail', 'customerName']
  }
} as const

// Language detection schema
const languageDetectionSchema = z.object({
  languageCode: z.string().describe('ISO 639-1 language code of the detected language'),
  confidence: z.number().min(0).max(1).describe('Confidence score of the language detection'),
  details: z.object({
    commonWords: z.array(z.string()).describe('Common words found that indicate this language'),
    scriptAnalysis: z.string().describe('Analysis of the writing system/script used')
  }),
  translation: z.object({
    needed: z.boolean().describe('Whether translation to English is needed'),
    text: z.string().optional().describe('English translation of the text if needed')
  })
})

// Create the language agent's function schema
const languageAgentSchema = {
  name: 'detect_language',
  description: 'Analyze and detect the language of a given text',
  parameters: {
    type: 'object',
    properties: {
      languageCode: {
        type: 'string',
        description: 'ISO 639-1 language code of the detected language'
      },
      confidence: {
        type: 'number',
        description: 'Confidence score between 0 and 1'
      },
      details: {
        type: 'object',
        properties: {
          commonWords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Common words found that indicate this language'
          },
          scriptAnalysis: {
            type: 'string',
            description: 'Analysis of the writing system/script used'
          }
        },
        required: ['commonWords', 'scriptAnalysis']
      },
      translation: {
        type: 'object',
        properties: {
          needed: {
            type: 'boolean',
            description: 'Whether translation to English is needed'
          },
          text: {
            type: 'string',
            description: 'English translation if needed'
          }
        },
        required: ['needed']
      }
    },
    required: ['languageCode', 'confidence', 'details', 'translation']
  }
} as const

// Initialize language model with function calling
const languageModel = model.bind({
  functions: [languageAgentSchema],
  function_call: { name: 'detect_language' }
})

// Create the language agent prompt
const languagePrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a language detection specialist. Analyze the provided text and:
1. Determine the primary language (use ISO 639-1 codes like 'en', 'es', etc.)
2. Calculate a confidence score (0-1)
3. Identify common words that helped determine the language
4. Analyze the writing system/script
5. If not English, provide a translation

You must respond using the detect_language function with complete information.`],
  ['human', '{text}']
])

// Create structured output parser for language detection
const languageOutputParser = StructuredOutputParser.fromZodSchema(languageDetectionSchema)

// Create the language detection chain
const languageChain = RunnableSequence.from([
  languagePrompt,
  languageModel,
  // Extract the function call arguments and parse them
  (response) => {
    if (!response.additional_kwargs?.function_call?.arguments) {
      throw new Error('No function call arguments found in response')
    }
    return JSON.parse(response.additional_kwargs.function_call.arguments)
  }
])

// Validity check schema
const validityCheckSchema = z.object({
  isValid: z.boolean().describe('Whether the inquiry is valid for a support ticket'),
  reason: z.string().describe('Detailed explanation of the validity decision'),
  category: z.enum(['valid_inquiry', 'spam', 'harassment', 'off_topic', 'unclear']).describe('Category of the validity check result'),
  confidence: z.number().min(0).max(1).describe('Confidence score of the validity assessment'),
  suggestedResponse: z.string().optional().describe('If invalid, a suggested response to the user explaining why')
}).describe('Validity check result with detailed analysis')

// Create the validity agent's function schema
const validityAgentSchema = {
  name: 'check_validity',
  description: 'Analyze if a customer inquiry is valid for a support ticket',
  parameters: zodToJsonSchema(validityCheckSchema)
} as const

// Initialize validity model with function calling
const validityModel = model.bind({
  functions: [validityAgentSchema],
  function_call: { name: 'check_validity' }
})

// Create the validity agent prompt
const validityPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a validity assessment specialist for a help desk ticket system. Your role is to:

1. Analyze customer inquiries to determine if they are valid support ticket requests
2. Detect and flag inappropriate content (spam, harassment, etc.)
3. Ensure inquiries are relevant to a help desk context
4. Provide detailed explanations for your decisions
5. Suggest appropriate responses for invalid inquiries

Valid inquiries typically:
- Ask for help with a product, service, or system
- Report technical issues or bugs
- Request information about features or functionality
- Seek clarification on documentation or processes

Invalid inquiries include:
- Spam or automated messages
- Harassment, threats, or inappropriate content
- Questions completely unrelated to support (e.g., "What's the weather?")
- Nonsensical or unclear messages

For each inquiry:
1. Assess the content carefully
2. Determine validity with a confidence score
3. Categorize the result
4. Provide a detailed reason for your decision
5. If invalid, suggest a polite and helpful response explaining why

Be thorough but fair in your assessment. If in doubt about validity, lean towards accepting the inquiry and flag it as low confidence.`],
  ['human', `Please analyze this customer inquiry for validity. Consider the following context:
Language detected: {languageCode}
Original inquiry: {inquiry}
{translation}`]
])

// Create the validity check chain
const validityChain = RunnableSequence.from([
  validityPrompt,
  validityModel,
  // Extract the function call arguments and parse them
  (response) => {
    if (!response.additional_kwargs?.function_call?.arguments) {
      throw new Error('No function call arguments found in response')
    }
    return JSON.parse(response.additional_kwargs.function_call.arguments)
  }
])

// Error handling schema
const errorResponseSchema = z.object({
  responseMessage: z.string().describe('The response message to send to the user'),
  internalNote: z.string().describe('Internal note about why this was flagged'),
  severity: z.enum(['low', 'medium', 'high']).describe('Severity level of the invalid inquiry'),
  suggestedActions: z.array(z.string()).describe('Suggested actions for handling this type of inquiry'),
  translatedResponse: z.string().optional().describe('Response translated to the original inquiry language if needed')
}).describe('Error response with detailed handling instructions')

// Create the error agent's function schema
const errorAgentSchema = {
  name: 'generate_error_response',
  description: 'Generate an appropriate error response for an invalid inquiry',
  parameters: zodToJsonSchema(errorResponseSchema)
} as const

// Initialize error model with function calling
const errorModel = model.bind({
  functions: [errorAgentSchema],
  function_call: { name: 'generate_error_response' }
})

// Create the error agent prompt
const errorPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are an error handling specialist for a modern help desk chat system. Your role is to:

1. Generate concise, chat-friendly responses to invalid inquiries
2. Keep responses brief but clear and professional
3. Maintain a helpful tone while being direct
4. Suggest next steps when appropriate
5. Ensure responses are culturally appropriate and properly translated

Response Style Guidelines:
- Use a conversational, direct tone
- Avoid formal letter structures (no "Dear User", "Best regards", etc.)
- Keep responses to 1-2 short paragraphs
- Be clear but concise about why the inquiry cannot be processed
- For non-English responses, maintain the same casual but professional tone

Response Structure:
- Start with the main point
- Briefly explain why (if appropriate)
- Suggest what to do next (if applicable)

Examples by category:
- Spam: "We can only help with genuine support inquiries. Please submit your actual question about our product or service."
- Off-topic: "This seems unrelated to our services. For product support or account help, please try asking a specific question about our platform."
- Unclear: "Could you please provide more details about what you need help with? Specific information will help us assist you better."
- Harassment: "We're here to help, but we need to keep communication respectful. Please rephrase your question without inappropriate language, and we'll be happy to assist."

Remember to match the tone of the response to the severity of the issue while keeping it conversational.`],
  ['human', `Please generate a chat-friendly error response for this invalid inquiry.
Context:
Language: {languageCode}
Original inquiry: {inquiry}
Translation (if any): {translation}
Validity result: {validityResult}
Category: {category}
Reason: {reason}`]
])

// Create the error handling chain
const errorChain = RunnableSequence.from([
  errorPrompt,
  errorModel,
  // Extract the function call arguments and parse them
  (response) => {
    if (!response.additional_kwargs?.function_call?.arguments) {
      throw new Error('No function call arguments found in response')
    }
    return JSON.parse(response.additional_kwargs.function_call.arguments)
  }
])

// Add vector search function
async function performVectorSearch(
  analysisId: string,
  originalInquiry: string,
  organizationId: string,
  metadata: any
): Promise<any> {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vector-search-coordinator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      analysisId,
      originalInquiry,
      metadata: {
        ...metadata,
        organizationId
      }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to perform vector search')
  }

  return response.json()
}

// Define the coordinator's state schema using Zod
const CoordinatorStateSchema = z.object({
  analysisId: z.string().uuid().describe('Unique identifier for this analysis session'),
  startTime: z.string().datetime().describe('ISO timestamp when analysis started'),
  customerInquiry: z.object({
    content: z.string().describe('The original customer inquiry text'),
    email: z.string().describe('Customer email address'),
    name: z.string().describe('Customer name'),
    metadata: z.object({
      source: z.string().optional().describe('Source of the inquiry (email, chat, etc)'),
      timestamp: z.string().datetime().describe('When the inquiry was received')
    })
  }),
  languageAnalysis: z.object({
    code: z.string().describe('ISO 639-1 language code'),
    confidence: z.number().min(0).max(1).describe('Confidence score of language detection'),
    detectedAt: z.string().datetime(),
    translation: z.object({
      needed: z.boolean().describe('Whether translation was needed'),
      text: z.string().optional().describe('English translation if needed')
    })
  }).optional(),
  validityAnalysis: z.object({
    isValid: z.boolean().describe('Whether the inquiry is valid for a support ticket'),
    reason: z.string().describe('Explanation of validity decision'),
    analyzedAt: z.string().datetime()
  }).optional(),
  ticketCreation: z.object({
    id: z.string().uuid().describe('ID of the created ticket'),
    status: z.string().describe('Current status of the ticket'),
    createdAt: z.string().datetime()
  }).optional(),
  error: z.object({
    type: z.string().describe('Type of error encountered'),
    message: z.string().describe('Error message'),
    response: z.string().describe('Response message to send to customer'),
    occurredAt: z.string().datetime()
  }).optional(),
  vectorSearchResults: z.object({
    searchPhrases: z.array(z.string()),
    results: z.record(z.array(z.object({
      content: z.string(),
      documentId: z.string(),
      similarity: z.number(),
      isRelevant: z.boolean(),
      relevanceReason: z.string().optional()
    })))
  }).optional(),
}).describe('Complete state of the ticket analysis process')

// Convert Zod schema to JSON schema for OpenAI functions
const coordinatorStateJsonSchema = zodToJsonSchema(CoordinatorStateSchema)

// Create the coordinator's function schema
const coordinatorFunctionSchema = {
  name: 'update_analysis_state',
  description: 'Update the state of the ticket analysis process with new information',
  parameters: coordinatorStateJsonSchema
} as const

// Initialize the coordinator model with function calling
const coordinatorModel = model.bind({
  functions: [coordinatorFunctionSchema, createTicketTool],
  function_call: { name: 'update_analysis_state' }
})

// Create the coordinator agent prompt with state management
const coordinatorPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a friendly, modern AI support assistant. Your responses should be:
- Direct and conversational (like instant messaging)
- Clear and straight to the point
- Natural and engaging
- Using emojis to enhance (not decorate) meaning

When creating support tickets:
1. Write titles that are clear and action-oriented
2. Keep descriptions concise and direct
3. Use natural language, not corporate speak
4. Include translations if needed (but keep them equally conversational)

Examples of good responses:
✅ "Your login is locked - let's get you back in 🔐"
✅ "Found the billing error! Here's what happened..."
✅ "Quick fix for your image upload issue 🖼️"

Examples to avoid:
❌ "Thank you for submitting a ticket regarding..."
❌ "We have received your inquiry about..."
❌ "Dear valued customer..."
❌ "Please be advised that..."

Remember: Write like you're messaging a colleague - professional but direct and natural.`],
  new MessagesPlaceholder('agent_scratchpad'),
  ['human', '{input}']
])

// Create the coordinator chain
const coordinatorChain = RunnableSequence.from([
  coordinatorPrompt,
  coordinatorModel,
  // Extract the function call arguments and parse them
  (response) => {
    if (!response.additional_kwargs?.function_call?.arguments) {
      throw new Error('No function call arguments found in response')
    }
    return JSON.parse(response.additional_kwargs.function_call.arguments)
  }
])

// Add the ticket creation function
async function createTicket(
  organizationId: string,
  title: string,
  description: string,
  priority: string,
  category: string,
  customerEmail: string,
  customerName: string,
  aiMetadata: any
): Promise<any> {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-ai-ticket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      organizationId,
      title,
      description,
      priority,
      category,
      customerEmail,
      customerName,
      aiMetadata
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to create ticket: ${error.message}`)
  }

  return response.json()
}

// Add function to create initial analysis record
async function createAnalysisRecord(
  analysisId: string,
  organizationId: string,
  ticketId: string
): Promise<any> {
  const { data, error } = await supabase
    .from('ticket_analysis')
    .insert({
      id: analysisId,
      organization_id: organizationId,
      ticket_id: ticketId,
      status: 'processing'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating analysis record:', error)
    throw new Error(`Failed to create analysis record: ${error.message}`)
  }

  return data
}

// Update the updateTicket function to use the new table
const updateTicket = async (state: any) => {
  const { analysisId, vectorSearchResults, ticketCreation } = state
  
  console.log('Update Ticket State:', {
    analysisId,
    ticketId: ticketCreation?.id,
    hasVectorResults: !!vectorSearchResults
  })
  
  if (!analysisId) {
    throw new Error('No analysis ID provided for ticket update')
  }

  if (!ticketCreation?.id) {
    throw new Error('No ticket ID found in state')
  }

  try {
    // Update the analysis record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('ticket_analysis')
      .update({
        vector_search_results: vectorSearchResults,
        status: vectorSearchResults ? 'completed' : 'error',
        error_message: !vectorSearchResults ? 'Failed to get vector search results' : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating analysis record:', updateError)
      throw new Error(`Failed to update analysis record: ${updateError.message}`)
    }

    console.log('Analysis record updated:', updatedRecord)

    return {
      ...state,
      status: updatedRecord.status,
      analysisRecord: updatedRecord
    }
  } catch (error) {
    console.error('Detailed update error:', error)
    throw error
  }
}

// Create the main analysis chain
const mainAnalysisChain = RunnableSequence.from([
  // Phase 1: Initial Setup and Analysis Record Creation
  async (input: { customerInquiry: string, customerEmail: string, customerName: string, organizationId: string }) => {
    // Input validation
    if (!input.customerInquiry) throw new Error('Missing required parameter: customerInquiry')
    if (!input.organizationId) throw new Error('Missing required parameter: organizationId')
    if (!input.customerEmail) throw new Error('Missing required parameter: customerEmail')
    if (!input.customerName) throw new Error('Missing required parameter: customerName')

    // Initialize state with analysis ID
    const analysisId = crypto.randomUUID()
    const startTime = new Date().toISOString()

    // Create initial ticket
    const ticketResult = await createTicket(
      input.organizationId,
      input.customerInquiry,
      input.customerInquiry,
      'medium', // Default priority, will be updated by processing
      'general',
      input.customerEmail,
      input.customerName,
      {
        analysisId,
        startTime,
        processedAt: startTime
      }
    )

    // Create analysis record
    await createAnalysisRecord(analysisId, input.organizationId, ticketResult.ticket.id)

    // Initialize state
    return {
      analysisId,
      startTime,
      customerInquiry: input.customerInquiry,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      organizationId: input.organizationId,
      ticketCreation: {
        id: ticketResult.ticket.id,
        status: ticketResult.ticket.status,
        createdAt: ticketResult.ticket.created_at
      }
    }
  },

  // Phase 2: Language Analysis
  async (input) => {
    // Language detection
    const languageResult = await languageChain.invoke({
      text: input.customerInquiry
    })

    // Add language analysis to state
    return {
      ...input,
      languageAnalysis: {
        code: languageResult.languageCode,
        confidence: languageResult.confidence,
        detectedAt: new Date().toISOString(),
        translation: languageResult.translation
      }
    }
  },

  // Phase 3: Validity Check
  async (input) => {
    // Perform validity check
    const validityResult = await validityChain.invoke({
      inquiry: input.customerInquiry,
      languageCode: input.languageAnalysis.code,
      translation: input.languageAnalysis.translation.needed ? 
        `English translation: ${input.languageAnalysis.translation.text}` : 
        'No translation needed'
    })

    // Add validity check to state
    return {
      ...input,
      validityCheck: {
        isValid: validityResult.isValid,
        reason: validityResult.reason,
        category: validityResult.category,
        confidence: validityResult.confidence
      }
    }
  },

  // Phase 4: Vector Search and Documentation Analysis
  async (input) => {
    if (input.error) {
      // Update analysis record with error
      const { error: updateError } = await supabase
        .from('ticket_analysis')
        .update({
          status: 'error',
          error_message: input.error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.analysisId)
      
      if (updateError) {
        console.error('Error updating analysis status:', updateError)
      }
      
      return input
    }

    try {
      if (!input.ticketCreation?.id) {
        throw new Error('Missing ticket ID for vector search')
      }

      console.log('Starting vector search with state:', {
        analysisId: input.analysisId,
        ticketId: input.ticketCreation.id,
        organizationId: input.organizationId
      })
      
      const searchResults = await performVectorSearch(
        input.analysisId,
        input.customerInquiry,
        input.organizationId,
        {
          ticketId: input.ticketCreation.id,
          language: input.languageAnalysis,
          validity: input.validityCheck
        }
      )

      // Update analysis record with vector search results
      const { error: updateError } = await supabase
        .from('ticket_analysis')
        .update({
          vector_search_results: searchResults,
          status: 'processing', // Still need ticket processing
          updated_at: new Date().toISOString()
        })
        .eq('id', input.analysisId)

      if (updateError) {
        throw new Error(`Failed to update analysis with vector results: ${updateError.message}`)
      }

      return {
        ...input,
        vectorSearchResults: searchResults
      }
    } catch (error) {
      console.error('Vector search error:', error)
      
      // Update analysis record with error
      const { error: updateError } = await supabase
        .from('ticket_analysis')
        .update({
          status: 'error',
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.analysisId)
      
      if (updateError) {
        console.error('Error updating analysis status:', updateError)
      }

      return {
        ...input,
        error: {
          type: 'vector_search_error',
          message: error.message,
          occurredAt: new Date().toISOString()
        }
      }
    }
  },

  // Phase 5: Final State Processing
  (result) => ({
    success: true,
    state: {
      analysisId: result.analysisId,
      startTime: result.startTime,
      customerInquiry: {
        content: result.customerInquiry,
        email: result.customerEmail,
        name: result.customerName,
        metadata: {
          timestamp: result.startTime
        }
      },
      languageAnalysis: {
        code: result.languageAnalysis.code,
        confidence: result.languageAnalysis.confidence,
        detectedAt: result.languageAnalysis.detectedAt,
        translation: result.languageAnalysis.translation
      },
      validityAnalysis: {
        isValid: result.validityCheck.isValid,
        reason: result.validityCheck.reason,
        analyzedAt: new Date().toISOString()
      },
      ticketCreation: result.ticketCreation,
      vectorSearchResults: result.vectorSearchResults,
      error: result.error
    }
  })
])

// Serve the endpoint
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const result = await mainAnalysisChain.invoke(body)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 