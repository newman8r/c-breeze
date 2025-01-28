import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'npm:zod@3.22.4'
import { zodToJsonSchema } from 'npm:zod-to-json-schema@3.22.3'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'

// Initialize LangChain chat model
const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0
})

// Define schema for the relevance evaluation result
const RelevanceSchema = z.object({
  isRelevant: z.boolean().describe('Whether the chunk is relevant to the inquiry'),
  confidence: z.number().min(0).max(1).describe('Confidence score of the relevance assessment'),
  reason: z.string().describe('Explanation of why the chunk is or is not relevant'),
  keyMatches: z.array(z.string()).describe('Key terms or concepts that match between the chunk and inquiry')
}).describe('Result of evaluating a document chunk\'s relevance to an inquiry')

// Create the function schema
const relevanceFunctionSchema = {
  name: 'evaluate_relevance',
  description: 'Evaluate if a document chunk is relevant to a customer inquiry',
  parameters: zodToJsonSchema(RelevanceSchema)
} as const

// Initialize model with function calling
const relevanceModel = model.bind({
  functions: [relevanceFunctionSchema],
  function_call: { name: 'evaluate_relevance' }
})

// Create the prompt
const relevancePrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are a relevance evaluation specialist that determines if documentation chunks are helpful for customer inquiries.
Your role is to:
1. Analyze the relationship between the inquiry and document chunk
2. Determine if the chunk would be helpful in addressing the inquiry
3. Identify key matching terms and concepts
4. Explain your reasoning clearly

Guidelines for relevance:
- Consider both direct and indirect relevance
- Look for technical concept matches
- Consider if the chunk provides context or background
- Evaluate if the chunk helps solve the user's problem
- Check for version or platform compatibility

Confidence scoring:
- 0.9-1.0: Direct answer or solution
- 0.7-0.9: Strong relevance, clear connection
- 0.5-0.7: Moderate relevance, partial match
- 0.3-0.5: Weak relevance, tangential
- 0.0-0.3: Not relevant

Be thorough in your analysis but lean towards including relevant content rather than excluding it.`],
  ['human', `Please evaluate this document chunk for relevance:
Inquiry: {inquiry}
Document Chunk: {chunk}`]
])

// Create the relevance chain
const relevanceChain = RunnableSequence.from([
  relevancePrompt,
  relevanceModel,
  // Extract the function call arguments and parse them
  (response) => {
    if (!response.additional_kwargs?.function_call?.arguments) {
      throw new Error('No function call arguments found in response')
    }
    return JSON.parse(response.additional_kwargs.function_call.arguments)
  }
])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chunk, inquiry } = await req.json()
    
    if (!chunk || !inquiry) {
      throw new Error('Both chunk and inquiry are required')
    }

    console.log('Evaluating chunk relevance:', { chunk, inquiry })
    const result = await relevanceChain.invoke({
      chunk: chunk.content,
      inquiry
    })
    console.log('Relevance evaluation result:', result)

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
