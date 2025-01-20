'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Types for our data
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

/**
 * Dashboard Page Component
 * 
 * Displays user profile information and statistics.
 * Protected route - redirects to home if not authenticated.
 */
export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  // Fetch user data and stats
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
    router.push('/')
  }

  // Show loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
        <div className="max-w-md mx-auto">
          <div className="ocean-card">
            <p className="text-center">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Protect route
  if (!user) {
    return null // Router will handle redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
      <div className="max-w-md mx-auto">
        <div className="ocean-card">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[#2C5282]">
            Dashboard
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
            <div className="text-lg text-[#4A90E2]">
              <p>Welcome, {userProfile?.display_name || user.email}</p>
              <button
                onClick={handleSignOut}
                className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-300 mt-4"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="ocean-card mt-6">
          <h2 className="text-2xl font-semibold mb-4">Statistics</h2>
          <div className="text-lg text-[#4A90E2] mb-4">
            Total users: {totalUsers}
          </div>
          <div className="flex flex-col gap-4">
            <Link 
              href="/profile" 
              className="wave-button text-center"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 