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
    <div className="absolute w-24 h-24 rounded-full bg-[#FF7676]/10 -top-12 -left-12" />
    {/* Triangle */}
    <div className="absolute w-0 h-0 border-l-[50px] border-r-[50px] border-b-[86.6px] 
                    border-l-transparent border-r-transparent border-b-[#4A90E2]/10 
                    top-20 -right-12 rotate-45" />
    {/* Rectangle */}
    <div className="absolute w-32 h-16 bg-[#50C878]/10 -bottom-8 left-12 rotate-12" />
  </div>
)

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // 1. Create user account and get session
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            org_name: orgName // Store org name in user metadata
          }
        }
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('No user data returned')

      // 2. Ensure we have a session
      if (!authData.session) {
        throw new Error('No session returned from signup')
      }

      // Set the session immediately
      await supabase.auth.setSession(authData.session)

      // 3. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: orgName,
            contact_info: { email },
            settings: {},
            created_by: authData.user.id
          }
        ])
        .select()
        .single()

      if (orgError) throw orgError

      // 4. Wait for employee record to be created by trigger and verify
      let employeeData = null
      let retries = 0
      while (!employeeData && retries < 5) {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', authData.user.id)
          .single()
        
        if (data) {
          employeeData = data
          break
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
        retries++
      }

      if (!employeeData) {
        throw new Error('Employee record not created after multiple attempts')
      }

      // 5. Force refresh auth state
      await supabase.auth.refreshSession()
      
      // 6. Redirect to dashboard
      router.refresh()
      router.replace('/dashboard')
      
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during registration')
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
              Create Your Account
            </h1>

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label 
                  htmlFor="orgName" 
                  className="block text-sm font-medium text-[#2C5282] mb-2"
                >
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-[#2C5282] mb-2"
                >
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="you@company.com"
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="8+ characters"
                  minLength={8}
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
                  'Create Account'
                )}
              </button>

              <div className="text-center text-sm text-[#4A5568]">
                Already have an account?{' '}
                <Link 
                  href="/auth/login" 
                  className="text-[#4A90E2] hover:text-[#2C5282] transition-colors duration-300"
                >
                  Log in
                </Link>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 