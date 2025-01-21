'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRole } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import { useUser } from '@/contexts/UserContext'

// Tab type definition
type Tab = 'users' | 'employees' | 'ticketing' | 'automation' | 'billing'

interface ApiError {
  error: string
}

export default function AdminPanel() {
  const router = useRouter()
  const { role, isRootAdmin, loading: roleLoading } = useRole()
  const { user, supabase } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [showInviteCard, setShowInviteCard] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'employee' as 'admin' | 'employee'
  })
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Protect route
  useEffect(() => {
    if (!roleLoading && role !== 'admin' && !isRootAdmin) {
      router.push('/dashboard')
    }
  }, [role, isRootAdmin, roleLoading, router])

  // Test function
  const testSession = async () => {
    console.log('=== Testing Session State ===')
    
    // 1. Check user state from context
    console.log('1. User from context:', {
      exists: !!user,
      id: user?.id,
      email: user?.email
    })

    // 2. Direct session check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('2. Direct session check:', {
      exists: !!session,
      error: sessionError?.message,
      token: session?.access_token ? 'present' : 'missing',
      userId: session?.user?.id
    })

    // 3. Check local storage
    const localStorageKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('sb-'))
    console.log('3. Local storage keys:', localStorageKeys)

    // 4. Try to get user directly
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('4. Direct user check:', {
      exists: !!userData?.user,
      error: userError?.message,
      id: userData?.user?.id
    })
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('=== Starting Invite Submission ===')
    setInviteError(null)
    setInviteSuccess(false)

    try {
      if (!user) {
        throw new Error('You must be logged in to send invitations')
      }

      // Get the current session instead of stored token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.access_token) {
        throw new Error('No active session found')
      }

      console.log('Using session token:', {
        hasAccessToken: !!session.access_token,
        tokenLength: session.access_token.length
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create_invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          invitee_email: inviteForm.email,
          invitee_name: inviteForm.name,
          role: inviteForm.role
        })
      })

      const data = await response.json()
      console.log('Invitation response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setInviteSuccess(true)
      setInviteForm({ name: '', email: '', role: 'employee' })
    } catch (err) {
      console.error('Invitation error:', err)
      if (err instanceof Error) {
        setInviteError(err.message)
      } else {
        setInviteError('An unexpected error occurred')
      }
    }
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="ocean-card">
            <p className="text-center">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'employees', label: 'Employees' },
    { id: 'ticketing', label: 'Ticketing' },
    { id: 'automation', label: 'Automation' },
    { id: 'billing', label: 'Billing' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Test Button */}
        <div className="ocean-card">
          <h2 className="text-xl font-bold text-[#2C5282] mb-4">Debug Tools</h2>
          <button
            onClick={testSession}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Session State
          </button>
        </div>

        {/* Back to Dashboard */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-[#2C5282] hover:text-[#4A90E2] transition-colors group"
          >
            <svg 
              className="w-6 h-6 mr-2 transform group-hover:-translate-x-1 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            <span className="text-lg font-medium">Back to Dashboard</span>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ocean-card"
        >
          <h1 className="text-2xl font-bold text-[#2C5282] mb-4">Admin Panel</h1>
          <p className="text-[#4A5568]">Manage your organization's settings and configurations.</p>
        </motion.div>

        {/* Tabs */}
        <div className="ocean-card p-0 overflow-hidden">
          <div className="border-b border-[#4A90E2]/20">
            <div className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium transition-colors relative
                    ${activeTab === tab.id
                      ? 'text-[#2C5282] bg-white/50'
                      : 'text-[#4A5568] hover:text-[#2C5282] hover:bg-white/30'
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A90E2]"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#2C5282]">User Management</h2>
                  <button 
                    className="wave-button px-4 py-2"
                    onClick={() => setShowInviteCard(true)}
                  >
                    Add User
                  </button>
                </div>

                {/* Invite User Card */}
                {showInviteCard && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ocean-card bg-white/50"
                  >
                    {inviteSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-gradient-to-r from-[#E0F7F6] to-[#F0F9F8] rounded-lg shadow-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#4A90E2]/20 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#2C5282]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-[#2C5282] font-medium">Invitation Sent Successfully! 🌊</h3>
                            <p className="text-[#4A5568] text-sm mt-1">
                              We've sent an email invitation to join your team.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => {
                              setShowInviteCard(false)
                              setInviteSuccess(false)
                            }}
                            className="text-sm text-[#4A90E2] hover:text-[#2C5282] transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-medium text-[#2C5282]">Invite New User</h3>
                        <button 
                          onClick={() => setShowInviteCard(false)}
                          className="text-[#4A5568] hover:text-[#2C5282]"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#4A5568] mb-1">Name</label>
                        <input
                          type="text"
                          value={inviteForm.name}
                          onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 rounded border border-[#4A90E2]/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-[#4A5568] mb-1">Email</label>
                        <input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 rounded border border-[#4A90E2]/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-[#4A5568] mb-1">Role</label>
                        <select
                          value={inviteForm.role}
                          onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'employee' }))}
                          className="w-full px-3 py-2 rounded border border-[#4A90E2]/20"
                          required
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {inviteError && (
                        <div className="text-[#FF7676] text-sm">{inviteError}</div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowInviteCard(false)}
                          className="px-4 py-2 text-[#4A5568] hover:text-[#2C5282]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="wave-button px-4 py-2"
                        >
                          Send Invitation
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                <div className="bg-white/50 rounded-lg p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[#4A5568]">
                        <th className="py-2">Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[#4A90E2]/10">
                        <td className="py-3">John Doe</td>
                        <td>john@example.com</td>
                        <td>
                          <span className="px-2 py-1 bg-[#50C878]/10 text-[#50C878] rounded-full text-sm">
                            Active
                          </span>
                        </td>
                        <td>
                          <button className="text-[#4A90E2] hover:text-[#2C5282]">Edit</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'employees' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#2C5282]">Employee Management</h2>
                  <button className="wave-button px-4 py-2">Add Employee</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="ocean-card bg-white/50">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Roles & Permissions</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 hover:bg-white/50 rounded">
                        <span>Admin Access</span>
                        <input type="checkbox" className="form-checkbox" />
                      </div>
                      <div className="flex items-center justify-between p-2 hover:bg-white/50 rounded">
                        <span>Ticket Management</span>
                        <input type="checkbox" className="form-checkbox" checked readOnly />
                      </div>
                    </div>
                  </div>
                  <div className="ocean-card bg-white/50">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Team Structure</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2">
                        <span>Support Team</span>
                        <span className="text-[#4A5568]">12 members</span>
                      </div>
                      <div className="flex items-center justify-between p-2">
                        <span>Admin Team</span>
                        <span className="text-[#4A5568]">3 members</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ticketing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#2C5282]">Ticketing Settings</h2>
                  <button className="wave-button px-4 py-2">Save Changes</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="ocean-card bg-white/50">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Categories</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="Add category" className="flex-1 px-3 py-2 rounded border border-[#4A90E2]/20" />
                        <button className="wave-button px-3 py-2">Add</button>
                      </div>
                      <div className="p-2 hover:bg-white/50 rounded flex justify-between items-center">
                        <span>Technical Support</span>
                        <button className="text-[#FF7676]">Remove</button>
                      </div>
                    </div>
                  </div>
                  <div className="ocean-card bg-white/50">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">SLA Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#4A5568] mb-1">Response Time (hours)</label>
                        <input type="number" defaultValue={4} className="px-3 py-2 rounded border border-[#4A90E2]/20" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#4A5568] mb-1">Resolution Time (hours)</label>
                        <input type="number" defaultValue={24} className="px-3 py-2 rounded border border-[#4A90E2]/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'automation' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#2C5282]">Automation Rules</h2>
                  <button className="wave-button px-4 py-2">Create Rule</button>
                </div>
                <div className="ocean-card bg-white/50">
                  <h3 className="text-lg font-medium text-[#2C5282] mb-4">Active Rules</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/30 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-[#2C5282]">Auto-assign Technical Issues</h4>
                          <p className="text-sm text-[#4A5568] mt-1">
                            Automatically assign technical support tickets to available team members
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-[#50C878]/10 text-[#50C878] rounded-full text-sm">Active</span>
                          <button className="text-[#4A90E2] hover:text-[#2C5282]">Edit</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#2C5282]">Billing Settings</h2>
                  <button className="wave-button px-4 py-2">Update Plan</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="ocean-card bg-white/50">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Current Plan</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2">
                        <span>Plan Type</span>
                        <span className="font-medium text-[#2C5282]">Professional</span>
                      </div>
                      <div className="flex justify-between items-center p-2">
                        <span>Users</span>
                        <span>25/50</span>
                      </div>
                      <div className="flex justify-between items-center p-2">
                        <span>Storage</span>
                        <span>75% used</span>
                      </div>
                    </div>
                  </div>
                  <div className="ocean-card bg-white/50">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Payment Method</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2">
                        <span>••••</span>
                        <span>••••</span>
                        <span>••••</span>
                        <span>4242</span>
                        <span className="ml-auto">Edit</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 