import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface Tag {
  id: string
  name: string
  description: string
  color: string
  type: 'system' | 'custom'
}

interface TicketTag {
  ticket_id: string
  tag_id: string
  created_by: string
  created_at: string
}

interface ManageTagsRequest {
  ticket_id: string
  tag_ids: string[]
  action: 'add' | 'remove'
}

console.log('Loading manage-ticket-tags function...')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { ticket_id, tag_ids, action } = await req.json() as ManageTagsRequest

    // Validate request
    if (!ticket_id || !tag_ids || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is an employee with access to this ticket
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has access to this ticket's organization
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: 'User is not an employee' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify ticket exists and belongs to employee's organization
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('organization_id')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (ticket.organization_id !== employee.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Ticket does not belong to your organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result
    if (action === 'add') {
      // For each tag name, create a new tag if it doesn't exist
      const tagPromises = tag_ids.map(async (tagName) => {
        // Try to find existing tag first
        const { data: existingTags } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .eq('organization_id', employee.organization_id)
          .single()

        if (existingTags) {
          return existingTags.id
        }

        // Create new tag if it doesn't exist
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({
            name: tagName,
            organization_id: employee.organization_id,
            color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color
            type: 'custom',
            created_by: user.id
          })
          .select('id')
          .single()

        if (createError) {
          throw createError
        }

        return newTag.id
      })

      try {
        const tagIds = await Promise.all(tagPromises)

        // Add tags to ticket
        const tagsToAdd = tagIds.map(tag_id => ({
          ticket_id,
          tag_id,
          created_by: user.id
        }))

        result = await supabase
          .from('ticket_tags')
          .upsert(tagsToAdd, { onConflict: 'ticket_id,tag_id' })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: `Error creating tags: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Remove tags
      result = await supabase
        .from('ticket_tags')
        .delete()
        .eq('ticket_id', ticket_id)
        .in('tag_id', tag_ids)
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: `Error ${action}ing tags: ${result.error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        message: `Successfully ${action}ed tags`,
        affected_rows: result.data?.length || 0
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 
