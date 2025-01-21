'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('SessionProvider: Auth state changed:', event)
      
      if (event === 'SIGNED_OUT') {
        // Force clear everything on sign out
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/'
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
} 