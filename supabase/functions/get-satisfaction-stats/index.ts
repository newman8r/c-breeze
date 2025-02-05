import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface SatisfactionStats {
  last24Hours: number | null
  lastWeek: number | null
  resolvedLastWeek: number
  messagesLastWeek: number
}

// Helper function to convert rating to percentage
function calculateSatisfactionPercentage(ratings: number[]): number | null {
  if (ratings.length === 0) return null
  
  const totalScore = ratings.reduce((acc, rating) => {
    switch (rating) {
      case 5: return acc + 100
      case 4: return acc + 90
      case 3: return acc + 50
      case 2: return acc + 10
      case 1: return acc + 0
      default: return acc
    }
  }, 0)
  
  return Math.round(totalScore / ratings.length)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    // Get organization_id from request
    const { organization_id } = await req.json()
    if (!organization_id) {
      throw new Error('organization_id is required')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current timestamp and timestamps for 24 hours and 1 week ago
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch tickets with satisfaction ratings for the last 24 hours
    const { data: last24HoursData, error: last24HoursError } = await supabaseClient
      .from('tickets')
      .select('satisfaction_rating')
      .eq('organization_id', organization_id)
      .gte('updated_at', last24Hours.toISOString())
      .not('satisfaction_rating', 'is', null)

    if (last24HoursError) throw last24HoursError

    // Fetch tickets with satisfaction ratings for the last week
    const { data: lastWeekData, error: lastWeekError } = await supabaseClient
      .from('tickets')
      .select('satisfaction_rating')
      .eq('organization_id', organization_id)
      .gte('updated_at', lastWeek.toISOString())
      .not('satisfaction_rating', 'is', null)

    if (lastWeekError) throw lastWeekError

    // Fetch resolved tickets from last week
    const { data: resolvedData, error: resolvedError } = await supabaseClient
      .from('tickets')
      .select('id')
      .eq('organization_id', organization_id)
      .gte('updated_at', lastWeek.toISOString())
      .in('status', ['resolved', 'closed'])

    if (resolvedError) throw resolvedError

    // Fetch total messages from last week
    const { data: messagesData, error: messagesError } = await supabaseClient
      .from('tickets')
      .select('id, ticket_messages!inner(*)')
      .eq('organization_id', organization_id)
      .gte('ticket_messages.created_at', lastWeek.toISOString())

    if (messagesError) throw messagesError

    // Count total messages by flattening the ticket_messages arrays
    const totalMessages = messagesData.reduce((acc, ticket) => acc + ticket.ticket_messages.length, 0)

    // Calculate satisfaction percentages and counts
    const stats: SatisfactionStats = {
      last24Hours: calculateSatisfactionPercentage(last24HoursData.map(t => t.satisfaction_rating!)),
      lastWeek: calculateSatisfactionPercentage(lastWeekData.map(t => t.satisfaction_rating!)),
      resolvedLastWeek: resolvedData.length,
      messagesLastWeek: totalMessages
    }

    return new Response(
      JSON.stringify(stats),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 400,
      }
    )
  }
}) 