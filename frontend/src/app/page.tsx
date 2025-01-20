'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthPanel from '@/components/auth/AuthPanel'
import { useUser } from '@/contexts/UserContext'

interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

interface UserStats {
  total_users: number
}

export default function Home() {
  const { user, loading: userLoading } = useUser()
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function checkConnection() {
      try {
        // Check connection and get total users
        const { data: statsData, error: statsError } = await supabase
          .from('user_statistics')
          .select('total_users')
          .single()
        
        if (statsError) throw statsError
        setTotalUsers(statsData?.total_users || 0)
        setIsConnected(true)

        // If user is logged in, get their profile
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (profileError) throw profileError
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('Error:', error)
        setIsConnected(false)
      }
    }

    checkConnection()
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-[#E0F2F7]/20">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[#2C5282]">
            ZenBreeze AI Tool
          </h1>
          <div className="flex flex-col items-center gap-4">
            <div className="text-xl text-center">
              Connection Status: {' '}
              {isConnected === null ? (
                'Checking...'
              ) : isConnected ? (
                <span className="text-[#FF7676] font-semibold">Connected</span>
              ) : (
                <span className="text-red-500">Not Connected</span>
              )}
            </div>
            {!userLoading && (
              <div className="text-lg text-[#4A90E2]">
                {user ? (
                  <>
                    <p>Welcome, {userProfile?.display_name || user.email}</p>
                    <button
                      onClick={handleSignOut}
                      className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-300 mt-4"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <p>Please sign in to continue</p>
                )}
              </div>
            )}
          </div>
        </div>

        {!user && <AuthPanel />}

        {user && (
          <div className="ocean-card mt-6">
            <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
            <div className="text-lg text-[#4A90E2]">
              Total users: {totalUsers}
            </div>
            <button className="wave-button w-full mt-4">
              Get Started
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 