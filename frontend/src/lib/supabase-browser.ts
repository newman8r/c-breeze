import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

let browserClient: ReturnType<typeof createClientComponentClient<any>> | null = null

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return createClientComponentClient<any>()
  }

  if (!browserClient) {
    console.log('Creating new Supabase browser client')
    browserClient = createClientComponentClient<any>()
  }

  return browserClient
}