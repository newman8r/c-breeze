import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { ChatOpenAI } from "@langchain/openai"
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

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
  cleanupPrompt,
  cleanupModel,
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
    const { inquiry } = await req.json()
    console.log('Processing inquiry:', inquiry)

    const result = await cleanupChain.invoke({
      inquiry
    })

    console.log('Extracted search phrases:', result)

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
