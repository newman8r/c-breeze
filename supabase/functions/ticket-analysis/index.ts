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
const validitySchema = {
  name: 'check_validity',
  description: 'Check if the inquiry is valid for a support ticket',
  parameters: {
    type: 'object',
    properties: {
      isValid: {
        type: 'boolean',
        description: 'Whether the inquiry is valid for a support ticket'
      },
      reason: {
        type: 'string',
        description: 'Explanation of why the inquiry is valid or invalid'
      }
    },
    required: ['isValid', 'reason']
  }
} as const

// Define the coordinator's state schema using Zod
const CoordinatorStateSchema = z.object({
  analysisId: z.string().uuid().describe('Unique identifier for this analysis session'),
  startTime: z.string().datetime().describe('ISO timestamp when analysis started'),
  customerInquiry: z.object({
    content: z.string().describe('The original customer inquiry text'),
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
  functions: [coordinatorFunctionSchema],
  function_call: { name: 'update_analysis_state' }
})

// Create the coordinator agent prompt with state management
const coordinatorPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are the coordinator agent responsible for managing the ticket analysis process.
Your role is to:
1. Maintain a complete state of the analysis using the provided state schema
2. Coordinate with specialized agents (language, validity, error) to gather information
3. Make decisions based on the collected information
4. Ensure all timestamps and IDs are properly recorded
5. Handle any errors gracefully and maintain state consistency

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

// Update the serve function to use both agents
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Received request body:', body)

    const { customerInquiry } = body

    if (!customerInquiry) {
      throw new Error('Missing required parameter: customerInquiry')
    }

    // Initialize analysis state
    const initialState: z.infer<typeof CoordinatorStateSchema> = {
      analysisId: crypto.randomUUID(),
      startTime: new Date().toISOString(),
      customerInquiry: {
        content: customerInquiry,
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

    // Update state with language analysis
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
      }
    }

    // Pass the updated state to the coordinator
    const finalState = await coordinatorChain.invoke({
      input: JSON.stringify(updatedState),
      agent_scratchpad: []
    })

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