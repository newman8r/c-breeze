'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

type UserContextType = {
  user: User | null
  loading: boolean
  refreshSession: () => Promise<void>
  supabase: ReturnType<typeof getSupabaseBrowserClient>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshSession: async () => {},
  supabase: null as any
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [cachedSession, setCachedSession] = useState<Session | null>(null)
  const supabase = getSupabaseBrowserClient()

  const refreshSession = async () => {
    console.log('UserContext: Starting session refresh')
    console.log('UserContext: Client instance:', supabase ? 'exists' : 'missing')
    console.log('UserContext: Cached session:', cachedSession ? 'exists' : 'missing')
    
    try {
      if (cachedSession) {
        console.log('UserContext: Using cached session')
        setUser(cachedSession.user)
        return
      }

      // First try to get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('UserContext: Initial session check:', {
        hasSession: !!session,
        error: sessionError?.message,
        userId: session?.user?.id
      })

      if (session) {
        setUser(session.user)
        setCachedSession(session)
        console.log('UserContext: Using existing session')
        return
      }

      // If no session, try to refresh
      console.log('UserContext: No session, attempting refresh')
      const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession()
      console.log('UserContext: Refresh result:', {
        hasSession: !!refreshResult.session,
        error: refreshError?.message,
        userId: refreshResult.session?.user?.id
      })

      if (refreshResult.session) {
        setUser(refreshResult.session.user)
        setCachedSession(refreshResult.session)
        console.log('UserContext: Session refreshed successfully')
      } else {
        setUser(null)
        setCachedSession(null)
        console.log('UserContext: Failed to refresh session')
      }
    } catch (error) {
      console.error('UserContext: Error during session refresh:', error)
      setUser(null)
      setCachedSession(null)
    }
  }

  useEffect(() => {
    console.log('UserContext: Initial setup')
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('UserContext: Initial session:', {
          hasSession: !!session,
          userId: session?.user?.id
        })

        if (session && mounted) {
          setUser(session.user)
          setCachedSession(session)
        } else if (mounted) {
          await refreshSession()
        }
      } catch (error) {
        console.error('UserContext: Error during initialization:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('UserContext: Auth state changed:', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id
      })
      
      if (mounted) {
        if (session) {
          setUser(session.user)
          setCachedSession(session)
        } else {
          setUser(null)
          setCachedSession(null)
          await refreshSession()
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, refreshSession, supabase }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext) 