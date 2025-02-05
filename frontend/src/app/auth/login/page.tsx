'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'
import Link from 'next/link'

// Decorative shape component
const BauhausDecoration = ({ className = '' }: { className?: string }) => (
  <div className={`absolute ${className}`}>
    {/* Circle */}
    <div className="absolute w-24 h-24 rounded-full bg-[#4A90E2]/10 -top-12 -left-12" />
    {/* Triangle */}
    <div className="absolute w-0 h-0 border-l-[50px] border-r-[50px] border-b-[86.6px] 
                    border-l-transparent border-r-transparent border-b-[#FF7676]/10 
                    top-20 -right-12 rotate-45" />
    {/* Rectangle */}
    <div className="absolute w-32 h-16 bg-[#50C878]/10 -bottom-8 left-12 rotate-12" />
  </div>
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    const serviceClient = createClient()
    console.log('Starting login process...')

    let signInError: Error | null = null

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        signInError = error
        // Log failed login attempt
        await serviceClient.functions.invoke('audit-logger', {
          body: {
            organization_id: 'system', // We don't know the org yet
            actor_type: 'system',
            action_type: 'execute',
            resource_type: 'system',
            action_description: 'Failed login attempt',
            action_meta: {
              email,
              error: error.message
            },
            severity: 'warning',
            status: 'failure',
            error_message: error.message
          }
        })
        throw error
      }

      console.log('Sign in successful:', data?.session?.user?.id)

      if (data?.session) {
        // Set session first
        await supabase.auth.setSession(data.session)
        
        // Wait for session to be set
        await new Promise(resolve => setTimeout(resolve, 100))

        // Get user's organization
        const { data: employeeData } = await serviceClient
          .from('employees')
          .select('organization_id')
          .eq('user_id', data.session.user.id)
          .single()

        // Log successful login
        if (employeeData?.organization_id) {
          await serviceClient.functions.invoke('audit-logger', {
            body: {
              organization_id: employeeData.organization_id,
              actor_id: data.session.user.id,
              actor_type: 'employee',
              action_type: 'execute',
              resource_type: 'system',
              action_description: 'Successful login',
              action_meta: {
                email: data.session.user.email
              },
              severity: 'info',
              status: 'success'
            }
          })
        }
        
        // Force a router refresh to update navigation state
        router.refresh()
        
        // Use replace instead of push to prevent back button issues
        router.replace('/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Invalid email or password')

      // Log unexpected errors if it's not the same as the sign-in error we already logged
      if (!(err === signInError)) {
        await serviceClient.functions.invoke('audit-logger', {
          body: {
            organization_id: 'system', // We don't know the org yet
            actor_type: 'system',
            action_type: 'execute',
            resource_type: 'system',
            action_description: 'Unexpected error during login',
            action_meta: {
              email,
              error: err instanceof Error ? err.message : 'Unknown error'
            },
            severity: 'error',
            status: 'failure',
            error_message: err instanceof Error ? err.message : 'Unknown error'
          }
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
      <div className="max-w-md mx-auto pt-12">
        <motion.div 
          className="ocean-card relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative Bauhaus elements */}
          <BauhausDecoration />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-8 text-center text-[#2C5282]">
              Welcome Back
            </h1>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-[#2C5282] mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="you@company.com"
                  autoComplete="username email"
                />
              </div>

              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-[#2C5282] mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full wave-button py-3 text-lg relative overflow-hidden"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-6 h-6 border-2 border-t-transparent border-white rounded-full"
                    />
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center text-sm text-[#4A5568]">
                Don't have an account?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-[#4A90E2] hover:text-[#2C5282] transition-colors duration-300"
                >
                  Sign up
                </Link>
                <div className="mt-2">
                  <Link
                    href="/auth/reset-password"
                    className="text-[#4A90E2] hover:text-[#2C5282] transition-colors duration-300"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 