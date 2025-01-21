import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './database.types'

let browserClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    console.log('Creating new Supabase browser client')
    browserClient = createClientComponentClient<Database>()

    // Try to initialize from stored token
    const storedToken = localStorage.getItem('sb-127-auth-token')
    if (storedToken) {
      try {
        const session = JSON.parse(storedToken)
        console.log('Found stored session:', {
          hasAccessToken: !!session?.access_token,
          hasRefreshToken: !!session?.refresh_token,
          expiresAt: session?.expires_at
        })

        // Try to set the session
        browserClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
      } catch (e) {
        console.error('Error parsing stored token:', e)
      }
    }
  } else {
    console.log('Reusing existing Supabase browser client')
  }
  return browserClient
} 