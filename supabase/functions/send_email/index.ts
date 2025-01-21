// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Follow Deno's module system
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { SendEmailRequest, SendEmailResponse, ErrorResponse, InviteEmployeeTemplate } from '../_shared/types.ts'
import { generateInviteEmployeeEmail } from './templates/invite-employee.ts'

console.log("=== Send Email Function Starting ===")

// Get environment variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
// Update the FROM_EMAIL to use your verified domain
const FROM_EMAIL = 'notifications@breeze.help'  // Hardcode the verified email

console.log("Environment check:", {
  hasResendKey: !!RESEND_API_KEY,
  fromEmail: FROM_EMAIL
})

serve(async (req) => {
  console.log("=== New Request ===")
  console.log("Method:", req.method)
  console.log("Headers:", Object.fromEntries(req.headers.entries()))

  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight")
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify method
  if (req.method !== 'POST') {
    console.log("Invalid method:", req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (!RESEND_API_KEY) {
      console.log("Missing RESEND_API_KEY")
      throw new Error('Missing RESEND_API_KEY')
    }

    const { to, template, data } = await req.json() as SendEmailRequest

    // Generate email content based on template
    console.log("Generating email content for template:", template)
    let emailContent
    switch (template) {
      case 'invite-employee':
        if (!data) {
          console.log("Missing template data")
          throw new Error('Missing data for invite-employee template')
        }
        console.log("Template data:", data)
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

    console.log('Sending email with:', {
      from: FROM_EMAIL,
      to,
      subject: emailContent.subject
    })

    // Send email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      })
    })

    const result = await response.json()
    console.log('Resend API response:', result)

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send email error:', error)
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
