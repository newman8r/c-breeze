import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './database.types'

let browserClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return createClientComponentClient<Database>()
  }

  if (!browserClient) {
    console.log('Creating new Supabase browser client')
    browserClient = createClientComponentClient<Database>()
  }

  return browserClient
}