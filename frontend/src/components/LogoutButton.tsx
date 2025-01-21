'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/utils/supabase'

export function LogoutButton() {
  const router = useRouter()

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    console.log('LogoutButton: Handling sign out click')
    try {
      await signOut()
      console.log('LogoutButton: Sign out completed')
    } catch (error) {
      console.error('LogoutButton: Sign out error:', error)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-gray-600 hover:text-gray-900"
    >
      Sign Out
    </button>
  )
} 