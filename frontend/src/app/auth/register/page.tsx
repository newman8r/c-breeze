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

// Helper function to wait for database trigger completion
async function waitForTriggerCompletion(
  supabase: any,
  userId: string,
  orgId: string,
  maxAttempts = 10,
  delayMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    // Try direct database access first
    const { data: directData, error: directError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single()

    if (directData?.id) {
      return true
    }

    // If direct access fails, try the security definer function
    const { data: roleData } = await supabase
      .rpc('get_user_role', {
        _user_id: userId,
        _org_id: orgId
      })

    if (roleData === 'admin') {
      return true
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs))

    // Refresh session every other attempt
    if (i % 2 === 0) {
      await supabase.auth.refreshSession()
    }
  }
  return false
}

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
      const serviceClient = createClient()
      console.log('Starting registration process...')

      // 1. Sign up without setting session
      console.log('Creating user account...')
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            org_name: orgName
          }
        }
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('No user data returned')
      console.log('User account created successfully')

      // 2. Create organization with service role client
      console.log('Creating organization...')
      const { data: orgData, error: orgError } = await serviceClient
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
      console.log('Organization created successfully')

      // Log organization creation
      console.log('Logging organization creation...')
      const { error: orgAuditError } = await serviceClient.functions.invoke('audit-logger', {
        body: {
          organization_id: orgData.id,
          actor_id: authData.user.id,
          actor_type: 'employee',
          action_type: 'create',
          resource_type: 'organization',
          resource_id: orgData.id,
          action_description: 'New organization created during registration',
          action_meta: {
            org_name: orgName,
            created_by: authData.user.id
          },
          severity: 'info',
          status: 'success'
        }
      })

      if (orgAuditError) {
        console.error('Failed to log organization creation:', orgAuditError)
        // Don't throw, continue with registration
      }

      // 3. Wait for trigger completion
      console.log('Waiting for database triggers to complete...')
      const triggerCompleted = await waitForTriggerCompletion(
        serviceClient,
        authData.user.id,
        orgData.id
      )

      if (!triggerCompleted) {
        throw new Error('Failed to verify employee record creation')
      }
      console.log('Database triggers completed successfully')

      // 4. Verify employee record exists
      console.log('Verifying employee record...')
      const { data: employeeCheck, error: employeeError } = await serviceClient
        .from('employees')
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('organization_id', orgData.id)
        .single()

      if (employeeError || !employeeCheck) {
        throw new Error('Failed to verify employee record')
      }
      console.log('Employee record verified successfully')

      // Log employee creation
      console.log('Logging employee creation...')
      const { error: empAuditError } = await serviceClient.functions.invoke('audit-logger', {
        body: {
          organization_id: orgData.id,
          actor_id: authData.user.id,
          actor_type: 'employee',
          action_type: 'create',
          resource_type: 'employee',
          resource_id: employeeCheck.id,
          action_description: 'New root employee registered',
          action_meta: {
            user_email: email,
            is_root_user: true
          },
          severity: 'info',
          status: 'success'
        }
      })

      if (empAuditError) {
        console.error('Failed to log employee creation:', empAuditError)
        // Don't throw, continue with registration
      }

      // 5. Only now sign in to get session
      console.log('Signing in user...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError
      if (!signInData.session) throw new Error('No session returned from sign in')
      console.log('User signed in successfully')

      // 6. Redirect to dashboard
      console.log('Registration complete, redirecting to dashboard...')
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
                  name="organization"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="Your Company Name"
                  autoComplete="organization"
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
                  placeholder="8+ characters"
                  minLength={8}
                  autoComplete="new-password"
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