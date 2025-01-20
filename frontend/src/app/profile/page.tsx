'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    async function loadProfile() {
      try {
        if (!user) return

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) throw error

        setProfile(data)
        setDisplayName(data.display_name || '')
        setBio(data.bio || '')
      } catch (error) {
        console.error('Error loading profile:', error)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      if (!user) throw new Error('Not authenticated')

      const updates = {
        user_id: user.id,
        display_name: displayName,
        bio,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)

      if (error) throw error

      setSuccess('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (userLoading || isLoading) {
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

  if (!user) {
    return null // Router will handle redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
      <div className="max-w-md mx-auto">
        <div className="ocean-card">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-[#2C5282]">Edit Profile</h1>
            <Link href="/" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
              Back to Home
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-[#2C5282] mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0F2F7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                placeholder="Enter your display name"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-[#2C5282] mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[#E0F2F7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                placeholder="Tell us about yourself"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-500 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="wave-button w-full"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 