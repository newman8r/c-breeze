import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { z } from "zod"

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
          metadata?: Record<string, any>;
        };
      };
      ticket_analysis: {
        Row: {
          id: string;
          ticket_id: string;
          status: 'pending' | 'processing' | 'completed' | 'error';
          vector_search_results?: Record<string, any>;
          processing_results?: Record<string, any>;
          response_generation_results?: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
      };
      employees: {
        Row: {
          id: string;
          name: string;
          role: string;
        };
      };
    };
  };
}

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

    // Extract the JWT (remove 'Bearer ' if present)
    const jwt = authHeader.replace('Bearer ', '')

    // Create a Supabase client with the user's JWT
    const userClient = createClient<Database>(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      }
    )

    // Get user data
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

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

    const { ticketId, organizationId } = await req.json()
    
    // Validate request
    const validatedInput = RequestSchema.parse({ ticketId, organizationId })

    console.log('Checking ticket access:', {
      ticketId: validatedInput.ticketId,
      organizationId: validatedInput.organizationId,
      customerId: customerData.id,
      customerOrgId: customerData.organization_id
    })

    // Verify user has access to the ticket using service role client
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

    // Get message history using service role client
    const { data: messages, error: messagesError } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', validatedInput.ticketId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }

    // Get ticket analysis using service role client
    const { data: analysis, error: analysisError } = await supabase
      .from('ticket_analysis')
      .select('*')
      .eq('ticket_id', validatedInput.ticketId)
      .single()

    if (analysisError && analysisError.code !== 'PGRST116') { // Ignore not found error
      throw new Error(`Failed to fetch analysis: ${analysisError.message}`)
    }

    // Get employees using service role client
    const { data: employees, error: employeesError } = await supabase
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
