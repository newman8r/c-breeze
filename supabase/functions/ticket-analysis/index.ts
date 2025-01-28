import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from 'https://esm.sh/openai@4'
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from 'npm:@langchain/core/prompts'
import { RunnableSequence } from 'npm:@langchain/core/runnables'
import { ChatOpenAI } from 'npm:@langchain/openai'
import { 
  FunctionParameters,
  JsonOutputFunctionsParser
} from 'npm:langchain/output_parsers'
import { z } from 'npm:zod'
import { zodToJsonSchema } from 'npm:zod-to-json-schema'

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
}).describe('Language detection result with detailed analysis')

// Create the language agent's function schema
const languageAgentSchema = {
  name: 'detect_language',
  description: 'Analyze and detect the language of a given text with high confidence',
  parameters: zodToJsonSchema(languageDetectionSchema)
} as const

// Initialize language model with function calling
const languageModel = model.bind({
  functions: [languageAgentSchema],
  function_call: { name: 'detect_language' }
})

// Create the language agent prompt
const languagePrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a language detection and translation specialist agent. Your role is to:
1. Analyze text to determine its primary language
2. Provide ISO 639-1 language codes (e.g. 'en' for English, 'es' for Spanish)
3. Calculate a confidence score based on:
   - Presence of language-specific characters/scripts
   - Common words and phrases
   - Grammar patterns
4. Identify key words that helped determine the language
5. Analyze the writing system/script used
6. If the language is not English (languageCode != 'en'):
   - Set translation.needed to true
   - Provide an accurate English translation in translation.text
   - Maintain the original meaning and tone in the translation
   If the language is English:
   - Set translation.needed to false
   - Do not provide a translation

Be conservative with confidence scores:
- Score > 0.9: Very clear language indicators present
- Score > 0.7: Strong language indicators but some ambiguity
- Score > 0.5: Moderate confidence, mixed language elements
- Score < 0.5: Low confidence, unclear or minimal text

Always analyze the full text before making a determination.`],
  ['human', '{text}']
])

// Create the language detection chain
const languageChain = RunnableSequence.from([
  languagePrompt,
  languageModel,
  new JsonOutputFunctionsParser<z.infer<typeof languageDetectionSchema>>()
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
  new JsonOutputFunctionsParser<z.infer<typeof validityCheckSchema>>()
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
  new JsonOutputFunctionsParser<z.infer<typeof errorResponseSchema>>()
])

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
  }).optional()
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
  ['system', `You are the coordinator agent responsible for managing the ticket analysis process.
Your role is to:
1. Maintain a complete state of the analysis using the provided state schema
2. Coordinate with specialized agents (language, validity, error) to gather information
3. Make decisions based on the collected information
4. Create support tickets for valid inquiries using the create_ticket tool
5. Ensure all timestamps and IDs are properly recorded
6. Handle any errors gracefully and maintain state consistency

When creating tickets:
- Generate a clear, concise title that summarizes the inquiry
- Include both original text and translation (if any) in the description
- Set appropriate priority based on content analysis
- Choose relevant category based on the inquiry type

When you receive new information or need to make updates:
- Always include the full state object in your response
- Use ISO format for all timestamps
- Preserve existing state fields when adding new information
- Set appropriate status flags based on the analysis progress`],
  new MessagesPlaceholder('agent_scratchpad'),
  ['human', '{input}']
])

// Create the coordinator chain
const coordinatorChain = RunnableSequence.from([
  coordinatorPrompt,
  coordinatorModel,
  new JsonOutputFunctionsParser<z.infer<typeof CoordinatorStateSchema>>()
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

// Update the serve function to use both agents
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Received request body:', body)

    const { customerInquiry, customerEmail, customerName, organizationId } = body

    if (!customerInquiry) {
      throw new Error('Missing required parameter: customerInquiry')
    }

    if (!organizationId) {
      throw new Error('Missing required parameter: organizationId')
    }

    if (!customerEmail) {
      throw new Error('Missing required parameter: customerEmail')
    }

    if (!customerName) {
      throw new Error('Missing required parameter: customerName')
    }

    // Initialize analysis state
    const initialState: z.infer<typeof CoordinatorStateSchema> = {
      analysisId: crypto.randomUUID(),
      startTime: new Date().toISOString(),
      customerInquiry: {
        content: customerInquiry,
        email: customerEmail,
        name: customerName,
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    }

    // Perform language detection
    console.log('Detecting language...')
    const languageResult = await languageChain.invoke({
      text: customerInquiry
    })

    console.log('Language detection result:', languageResult)

    // After language detection, perform validity check
    console.log('Checking inquiry validity...')
    const validityResult = await validityChain.invoke({
      inquiry: customerInquiry,
      languageCode: languageResult.languageCode,
      translation: languageResult.translation.needed ? 
        `English translation: ${languageResult.translation.text}` : 
        'No translation needed'
    })

    console.log('Validity check result:', validityResult)

    // Update state with both language and validity analysis
    const updatedState = {
      ...initialState,
      languageAnalysis: {
        code: languageResult.languageCode,
        confidence: languageResult.confidence,
        detectedAt: new Date().toISOString(),
        translation: {
          needed: languageResult.translation.needed,
          text: languageResult.translation.text
        }
      },
      validityAnalysis: {
        isValid: validityResult.isValid,
        reason: validityResult.reason,
        analyzedAt: new Date().toISOString(),
        category: validityResult.category,
        confidence: validityResult.confidence,
        suggestedResponse: validityResult.suggestedResponse
      }
    }

    // If inquiry is invalid, generate error response
    if (!validityResult.isValid) {
      console.log('Invalid inquiry detected:', validityResult.reason)
      
      // Generate error response
      console.log('Generating error response...')
      const errorResult = await errorChain.invoke({
        languageCode: languageResult.languageCode,
        inquiry: customerInquiry,
        translation: languageResult.translation.needed ? languageResult.translation.text : undefined,
        validityResult: validityResult.isValid,
        category: validityResult.category,
        reason: validityResult.reason
      })

      console.log('Error response generated:', errorResult)

      // Log invalid inquiry for monitoring (you can extend this to save to a database)
      console.log('Invalid Inquiry Log:', {
        timestamp: new Date().toISOString(),
        inquiry: customerInquiry,
        language: languageResult.languageCode,
        category: validityResult.category,
        reason: validityResult.reason,
        severity: errorResult.severity,
        internalNote: errorResult.internalNote
      })

      return new Response(
        JSON.stringify({
          success: true,
          state: {
            ...updatedState,
            error: {
              type: 'invalid_inquiry',
              message: validityResult.reason,
              response: languageResult.languageCode === 'en' ? 
                errorResult.responseMessage : 
                errorResult.translatedResponse || errorResult.responseMessage,
              occurredAt: new Date().toISOString(),
              severity: errorResult.severity,
              suggestedActions: errorResult.suggestedActions,
              internalNote: errorResult.internalNote
            }
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      )
    }

    // Continue with coordinator if valid
    const finalState = await coordinatorChain.invoke({
      input: JSON.stringify(updatedState),
      agent_scratchpad: []
    })

    // If coordinator indicates ticket creation is needed
    if (finalState.validityAnalysis?.isValid && !finalState.ticketCreation) {
      try {
        // Create the ticket with customer information and organization ID from request
        const ticketResult = await createTicket(
          organizationId,
          finalState.customerInquiry.content,
          finalState.customerInquiry.content + 
            (finalState.languageAnalysis?.translation?.needed ? 
              `\n\nTranslation: ${finalState.languageAnalysis.translation.text}` : ''),
          'medium', // Default priority, could be determined by content analysis
          'general', // Default category, could be determined by content analysis
          finalState.customerInquiry.email,
          finalState.customerInquiry.name,
          {
            analysisId: finalState.analysisId,
            languageAnalysis: finalState.languageAnalysis,
            validityAnalysis: finalState.validityAnalysis,
            originalInquiry: finalState.customerInquiry.content,
            processedAt: new Date().toISOString()
          }
        )

        // Update final state with ticket information
        finalState.ticketCreation = {
          id: ticketResult.ticket.id,
          status: ticketResult.ticket.status,
          createdAt: ticketResult.ticket.created_at
        }
      } catch (error) {
        console.error('Error creating ticket:', error)
        finalState.error = {
          type: 'ticket_creation_failed',
          message: error.message,
          response: 'Failed to create support ticket',
          occurredAt: new Date().toISOString()
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        state: finalState
      }),
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