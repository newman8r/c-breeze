import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../lib/database.types'

export const createClient = () => {
  return createClientComponentClient<Database>()
}

export const signOut = async () => {
  const supabase = createClient()
  
  // Sign out from Supabase auth
  await supabase.auth.signOut()
  
  // Clear any auth-related local storage items
  const localStorageKeys = Object.keys(localStorage)
    .filter(key => key.startsWith('sb-'))
  localStorageKeys.forEach(key => localStorage.removeItem(key))
  
  // Clear any auth-related session storage items
  const sessionStorageKeys = Object.keys(sessionStorage)
    .filter(key => key.startsWith('sb-'))
  sessionStorageKeys.forEach(key => sessionStorage.removeItem(key))
  
  // Force clear any remaining cookies
  document.cookie.split(';').forEach(cookie => {
    const [name] = cookie.split('=')
    if (name.trim().startsWith('sb-')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
    }
  })
} 