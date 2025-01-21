import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../lib/database.types'

let browserClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const createClient = () => {
  if (browserClient) return browserClient
  
  browserClient = createClientComponentClient<Database>()
  return browserClient
}

export const signOut = async () => {
  console.log('Starting sign out process...')
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    console.log('Supabase sign out successful')
    
    // Clear all storage in one go
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
    
    // Force reload without using router
    window.location.href = '/'
    
  } catch (error) {
    console.error('Sign out error:', error)
    window.location.href = '/'
  }
} 