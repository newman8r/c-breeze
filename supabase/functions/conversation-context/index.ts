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
          first_name: string;
          last_name: string;
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
  organizationId: z.string().uuid(),
  customerId: z.string().uuid()
})

// Define response schema
const ResponseSchema = z.object({
  messageHistory: z.array(z.object({
    id: z.string().uuid(),
    content: z.string(),
    sender_type: z.enum(['employee', 'customer', 'system', 'ai']),
    created_at: z.string(),
    metadata: z.record(z.any()).optional().nullable()
  })).default([]),
  ticketAnalysis: z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'processing', 'completed', 'error']),
    vector_search_results: z.record(z.any()).optional().nullable(),
    processing_results: z.record(z.any()).optional().nullable(),
    response_generation_results: z.record(z.any()).optional().nullable()
  }).nullable(),
  employees: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    role: z.string().min(1)
  })).default([])
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify service role key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Service role key is required')
    }
    const serviceKey = authHeader.replace('Bearer ', '')
    if (serviceKey !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      throw new Error('Invalid service role key')
    }

    // Get and validate request body
    const body = await req.json()
    const validatedInput = RequestSchema.parse(body)

    // Get ticket messages
    const { data: messages, error: messagesError } = await supabase
      .from('ticket_messages')
      .select('id, content, sender_type, created_at, metadata')
      .eq('ticket_id', validatedInput.ticketId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }

    // Get latest ticket analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('ticket_analysis')
      .select('*')
      .eq('ticket_id', validatedInput.ticketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (analysisError && analysisError.code !== 'PGRST116') { // Ignore not found error
      throw new Error(`Failed to fetch analysis: ${analysisError.message}`)
    }

    // Get employees for the organization
    console.log('Fetching employees for organization:', validatedInput.organizationId)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, role')
      .eq('organization_id', validatedInput.organizationId)

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      throw new Error(`Failed to fetch employees: ${employeesError.message}`)
    }

    console.log('Raw employees data:', employees)

    // Filter out invalid employees before validation
    const validEmployees = (employees || [])
      .filter(emp => {
        console.log('Checking employee validity:', emp)
        const isValid = emp && emp.id && (emp.first_name || emp.last_name) && emp.role
        console.log('Is valid?', isValid, 'id:', emp?.id, 'first_name:', emp?.first_name, 'last_name:', emp?.last_name, 'role:', emp?.role)
        return isValid
      })
      .map(emp => ({
        id: emp.id,
        name: [emp.first_name, emp.last_name].filter(Boolean).join(' ') || 'Unknown',
        role: emp.role
      }))

    console.log('Valid employees after filtering:', validEmployees)

    return new Response(
      JSON.stringify({
        messageHistory: messages,
        ticketAnalysis: analysis || null,
        employees: validEmployees
      }),
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
        status: error.message.includes('service role key') ? 403 : 500
      }
    )
  }
}) 
