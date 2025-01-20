// @deno-types="https://deno.land/x/types/index.d.ts"

import { corsHeaders, handleCors } from '../../_shared/cors'
import { SendEmailRequest, SendEmailResponse, ErrorResponse, InviteEmployeeTemplate } from '../../_shared/types'
import { generateInviteEmployeeEmail } from '../templates/invite-employee'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'notifications@oceanbreeze.com'

async function handler(req: Request): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

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
        emailContent = generateInviteEmployeeEmail(data as InviteEmployeeTemplate)
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
}

Deno.serve(handler) 