import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { OpenAI } from 'https://deno.land/x/openai@v4.24.0/mod.ts'

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
})

// Create the system prompt template
const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context.
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know. Don't try to make up an answer.

Context:
{context}

Question: {question}

Answer in a helpful and friendly tone. If the context contains relevant information, make sure to base your answer on it.`

async function getOrganizationId(authHeader: string, providedOrgId?: string): Promise<string> {
  // If organization_id is provided directly, use it
  if (providedOrgId) {
    return providedOrgId
  }

  // Otherwise try to get it from user's auth context
  const userClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } }
    }
  )

  const { data: employeeData, error: employeeError } = await userClient
    .from('employees')
    .select('organization_id')
    .single()

  if (employeeError || !employeeData) {
    throw new Error('Could not determine organization. Please provide organization_id parameter.')
  }

  return employeeData.organization_id
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the query from the request
    const { query } = await req.json()
    if (!query) {
      throw new Error('Query is required')
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Get organization ID
    const orgId = await getOrganizationId(authHeader)
    console.log('Using organization ID:', orgId)

    // Call our search endpoint with the user's auth header
    const response = await fetch(`${supabaseUrl}/functions/v1/search-rag-documents`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 5,
        organization_id: orgId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch search results')
    }

    const { results } = await response.json()
    
    // Format the context from search results
    const context = results
      .map((r: any) => `${r.content}\nSource: ${r.document.name}`)
      .join('\n\n')

    // Call OpenAI with the context and query
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT.replace('{context}', context).replace('{question}', query) },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
    })

    const answer = completion.choices[0].message.content

    return new Response(
      JSON.stringify({ answer }),
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
