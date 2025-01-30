import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { z } from "zod"
import { Database } from "../../../types/database.types.ts"

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Define request schema
const RequestSchema = z.object({
  ticketId: z.string().uuid(),
  organizationId: z.string().uuid()
})

// Define response schema
const ResponseSchema = z.object({
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create a Supabase client with the user's JWT
    const userClient = createClient<Database>(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Get user data
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { ticketId, organizationId } = await req.json()
    
    // Validate request
    const validatedInput = RequestSchema.parse({ ticketId, organizationId })

    // Verify user has access to the ticket
    const { data: ticket, error: ticketError } = await userClient
      .from('tickets')
      .select('id, customer_id')
      .eq('id', validatedInput.ticketId)
      .eq('organization_id', validatedInput.organizationId)
      .single()

    if (ticketError || !ticket) {
      throw new Error('Ticket not found or access denied')
    }

    // Get message history
    const { data: messages, error: messagesError } = await userClient
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', validatedInput.ticketId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }

    // Get ticket analysis
    const { data: analysis, error: analysisError } = await userClient
      .from('ticket_analysis')
      .select('*')
      .eq('ticket_id', validatedInput.ticketId)
      .single()

    if (analysisError && analysisError.code !== 'PGRST116') { // Ignore not found error
      throw new Error(`Failed to fetch analysis: ${analysisError.message}`)
    }

    // Get employees
    const { data: employees, error: employeesError } = await userClient
      .from('employees')
      .select('id, name, role')
      .eq('organization_id', validatedInput.organizationId)
      .eq('status', 'active')

    if (employeesError) {
      throw new Error(`Failed to fetch employees: ${employeesError.message}`)
    }

    // Validate and return response
    const response = ResponseSchema.parse({
      messageHistory: messages,
      ticketAnalysis: analysis,
      employees: employees
    })

    return new Response(
      JSON.stringify(response),
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
