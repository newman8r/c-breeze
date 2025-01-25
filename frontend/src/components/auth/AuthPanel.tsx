'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface AuthError {
  message: string
}

export default function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ocean-card mt-6">
      <h2 className="text-2xl font-semibold mb-4 text-center text-ocean-deep">
        {isLogin ? 'Login' : 'Register'}
      </h2>
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ocean-deep mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-ocean-light rounded-md focus:outline-none focus:ring-2 focus:ring-ocean"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ocean-deep mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-ocean-light rounded-md focus:outline-none focus:ring-2 focus:ring-ocean"
            required
          />
        </div>
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="wave-button w-full"
        >
          {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-4 text-ocean hover:text-ocean-deep text-sm w-full text-center"
      >
        {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </div>
  )
} 