// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Follow Deno's module system
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from './_shared/cors.ts'
import { SendEmailRequest, SendEmailResponse, ErrorResponse, InviteEmployeeTemplate } from './_shared/types.ts'
import { generateInviteEmployeeEmail } from './emails/templates/invite-employee.ts'

console.log("Hello from Functions!")

// Get environment variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Ocean Breeze Team <team@breeze.help>'

if (!RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY environment variable')
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY')
    }

    const { to, template, data } = await req.json() as SendEmailRequest

    // Generate email content based on template
    let emailContent
    switch (template) {
      case 'invite-employee':
        if (!data) {
          throw new Error('Missing data for invite-employee template')
        }
        // Validate required fields before type casting
        if (!data.organizationName || !data.inviterName || !data.role || !data.inviteLink) {
          throw new Error('Missing required fields for invite-employee template')
        }
        // Type cast after validation
        const templateData: InviteEmployeeTemplate = {
          organizationName: String(data.organizationName),
          inviterName: String(data.inviterName),
          role: data.role as 'admin' | 'employee',
          inviteLink: String(data.inviteLink)
        }
        emailContent = generateInviteEmployeeEmail(templateData)
        break
      default:
        throw new Error(`Unknown template: ${template}`)
    }

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    })

    const resData = await res.json()

    if (!res.ok) {
      throw new Error(resData.message || 'Failed to send email')
    }

    const response: SendEmailResponse = {
      success: true,
      messageId: resData.id,
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: error.message,
      details: error.details || undefined,
    }

    return new Response(
      JSON.stringify(errorResponse),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send_email' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
