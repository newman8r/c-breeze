'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRole } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Database } from '@/lib/database.types'
import { useUser } from '@/contexts/UserContext'

// Tab type definition
type Tab = 'users' | 'employees' | 'ticketing' | 'automation' | 'billing' | 'audit-logs'

interface ApiError {
  error: string
}

interface OrgUser {
  id: string
  role: string
  user_id: string
  is_root_admin: boolean
  users: {
    id: string
    email: string
    raw_user_meta_data: {
      name?: string
    }
  }
}

export default function AdminPanel() {
  const router = useRouter()
  const { role, isRootAdmin, loading: roleLoading } = useRole()
  const { user } = useUser()
  const supabase = getSupabaseBrowserClient()
  
  // All state declarations grouped together at the top
  const [activeTab, setActiveTab] = useState<Tab>('employees')
  const [showInviteCard, setShowInviteCard] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'employee' as 'admin' | 'employee'
  })
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})

  // Protect route
  useEffect(() => {
    if (!roleLoading && role !== 'admin' && !isRootAdmin) {
      router.push('/dashboard')
    }
  }, [role, isRootAdmin, roleLoading, router])

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        router.push('/auth/signin')
      }
    }
    checkAuth()
  }, [router, supabase])

  // Fetch organization users
  useEffect(() => {
    const fetchOrgUsers = async () => {
      if (activeTab === 'employees') {
        setLoadingUsers(true)
        setUserError(null)
        try {
          // Get fresh session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !session) {
            throw new Error('No active session')
          }

          // Log auth state for debugging
          console.log('Fetching with token:', session.access_token?.slice(0, 10) + '...')
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/list_org_users`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          setOrgUsers(data.users)
        } catch (err) {
          console.error('Error fetching users:', err)
          setUserError(err instanceof Error ? err.message : 'Failed to load users')
        } finally {
          setLoadingUsers(false)
        }
      }
    }

    fetchOrgUsers()
  }, [activeTab, supabase])

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (activeTab === 'audit-logs') {
        setLoadingAuditLogs(true)
        setAuditLogsError(null)
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !session) {
            throw new Error('No active session')
          }

          const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

          if (error) throw error
          setAuditLogs(data || [])
        } catch (err) {
          console.error('Error fetching audit logs:', err)
          setAuditLogsError(err instanceof Error ? err.message : 'Failed to load audit logs')
        } finally {
          setLoadingAuditLogs(false)
        }
      }
    }

    fetchAuditLogs()
  }, [activeTab, supabase])

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No active session found')
      }

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

      // Log the invitation creation
      const { error: auditError } = await supabase.functions.invoke('audit-logger', {
        body: {
          organization_id: data.invitation.organization_id,
          actor_id: user?.id,
          actor_type: 'employee',
          action_type: 'create',
          resource_type: 'invitation',
          resource_id: data.invitation.id,
          action_description: 'Created new employee invitation',
          action_meta: {
            invitee_email: inviteForm.email,
            invitee_name: inviteForm.name,
            role: inviteForm.role
          },
          severity: 'info',
          status: 'success'
        }
      })

      if (auditError) {
        console.error('Failed to log invitation creation:', auditError)
        // Don't throw, continue with success flow
      }

      setInviteSuccess(true)
      setInviteForm({ name: '', email: '', role: 'employee' })
      setTimeout(() => setShowInviteCard(false), 2000)
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

  // Define tabs
  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'employees', label: 'Employees' },
    { id: 'ticketing', label: 'Ticketing' },
    { id: 'automation', label: 'Automation' },
    { id: 'billing', label: 'Billing' },
    { id: 'audit-logs', label: '🔍 Audit Logs' }
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
          key="back-to-dashboard-link"
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
          key="admin-panel-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ocean-card"
        >
          <h1 className="text-2xl font-bold text-[#2C5282] mb-4">Admin Panel</h1>
          <p className="text-[#4A5568]">Manage your organization's settings and configurations.</p>
        </motion.div>

        {/* Tabs */}
        <div className="ocean-card overflow-hidden">
          <div className="flex space-x-1 mb-6 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-white/50 hover:bg-white/80'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Audit Logs Panel */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#2C5282]">System Activity Log</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">
                    Filter
                  </button>
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">
                    Export
                  </button>
                </div>
              </div>

              {loadingAuditLogs ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="animate-pulse text-blue-500">Loading audit logs...</div>
                </div>
              ) : auditLogsError ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="text-red-500">
                    <p>Failed to load audit logs</p>
                    <p className="text-sm">{auditLogsError}</p>
                  </div>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="text-gray-500">
                    <p>No audit logs found</p>
                    <p className="text-sm">System activity will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {auditLogs.map((log, index) => {
                    // Determine action color based on type
                    const actionColor = {
                      create: 'text-emerald-600',
                      update: 'text-blue-600',
                      delete: 'text-red-600',
                      execute: 'text-purple-600',
                      read: 'text-gray-600',
                      other: 'text-gray-600'
                    }[log.action_type] || 'text-gray-600';

                    // Determine resource icon based on type
                    const resourceIcon = {
                      organization: '🏢',
                      employee: '👤',
                      customer: '🤝',
                      ticket: '🎫',
                      tag: '🏷️',
                      invitation: '✉️',
                      profile: '📝',
                      user_settings: '⚙️',
                      system: '🔧'
                    }[log.resource_type] || '📄';

                    const logKey = log.id || `${log.created_at}-${index}`;
                    const isExpanded = expandedLogs[logKey] || false;

                    return (
                      <motion.div
                        key={`audit-log-${logKey}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setExpandedLogs(prev => ({
                          ...prev,
                          [logKey]: !prev[logKey]
                        }))}
                        className={`cursor-pointer group transition-all duration-200 rounded-lg
                          ${isExpanded ? 'bg-white shadow-lg p-4' : 'hover:bg-white/50 p-2'}
                          ${log.severity === 'error' ? 'border-l-2 border-red-500' :
                            log.severity === 'warning' ? 'border-l-2 border-yellow-500' :
                            log.severity === 'critical' ? 'border-l-2 border-red-700' :
                            'border-l-2 border-transparent'}`}
                      >
                        {/* Compact View */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Left section with timestamp */}
                          <div className="flex-shrink-0 w-32 text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>

                          {/* Center section with main info */}
                          <div className="flex-grow flex items-center gap-2 min-w-0">
                            <span className="flex-shrink-0">{resourceIcon}</span>
                            <span className={`${actionColor} font-medium`}>
                              {log.action_type}
                            </span>
                            <span className="truncate text-gray-600">
                              {log.action_description}
                            </span>
                          </div>

                          {/* Right section with metadata */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {log.duration_ms && (
                              <span className="text-xs text-gray-500">
                                {log.duration_ms}ms
                              </span>
                            )}
                            {log.status === 'failure' && (
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            )}
                            <motion.span
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              className="text-gray-400 group-hover:text-gray-600"
                            >
                              ▼
                            </motion.span>
                          </div>
                        </div>

                        {/* Expanded View */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 space-y-3 text-sm"
                          >
                            {/* Actor Information */}
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <h4 className="text-xs uppercase text-gray-500 mb-1">Actor</h4>
                                <p className="text-gray-700">
                                  {log.actor_type} {log.actor_id && `(${log.actor_id})`}
                                </p>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xs uppercase text-gray-500 mb-1">Resource</h4>
                                <p className="text-gray-700">
                                  {log.resource_type} {log.resource_id && `(${log.resource_id})`}
                                </p>
                              </div>
                            </div>

                            {/* Technical Details */}
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <h4 className="text-xs uppercase text-gray-500 mb-1">Client Info</h4>
                                <p className="text-gray-700">
                                  {log.ip_address && <span className="mr-2">IP: {log.ip_address}</span>}
                                  {log.session_id && <span>Session: {log.session_id}</span>}
                                </p>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xs uppercase text-gray-500 mb-1">Performance</h4>
                                <p className="text-gray-700">
                                  {log.duration_ms ? `${log.duration_ms}ms` : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {/* Metadata Sections */}
                            {(log.action_meta || log.details_before || log.details_after) && (
                              <div className="space-y-2">
                                {log.action_meta && (
                                  <div>
                                    <h4 className="text-xs uppercase text-gray-500 mb-1">Metadata</h4>
                                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(log.action_meta, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {(log.details_before || log.details_after) && (
                                  <div className="grid grid-cols-2 gap-4">
                                    {log.details_before && (
                                      <div>
                                        <h4 className="text-xs uppercase text-gray-500 mb-1">Before</h4>
                                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                          {JSON.stringify(log.details_before, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {log.details_after && (
                                      <div>
                                        <h4 className="text-xs uppercase text-gray-500 mb-1">After</h4>
                                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                          {JSON.stringify(log.details_after, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Error Information */}
                            {log.status === 'failure' && (
                              <div className="bg-red-50 p-3 rounded">
                                <h4 className="text-xs uppercase text-red-700 mb-1">Error Details</h4>
                                {log.error_code && (
                                  <p className="text-red-600 font-mono">{log.error_code}</p>
                                )}
                                {log.error_message && (
                                  <p className="text-red-700 mt-1">{log.error_message}</p>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && (
              <motion.div
                key="users-tab-panel"
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
                    key="invite-user-form"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ocean-card bg-white/50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-[#2C5282]">Invite New User</h3>
                      <button 
                        onClick={() => setShowInviteCard(false)}
                        className="text-[#4A5568] hover:text-[#2C5282]"
                      >
                        ✕
                      </button>
                    </div>

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

                      {inviteSuccess && (
                        <div className="text-[#50C878] text-sm">Invitation sent successfully!</div>
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
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#2C5282] mb-2">Organization Members</h2>
                    <p className="text-[#4A5568] text-sm">Manage your team members and their roles 🏖️</p>
                  </div>
                </div>

                {userError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <p>{userError}</p>
                    </div>
                  </motion.div>
                )}

                {loadingUsers ? (
                  <div className="ocean-card bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center justify-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-[#4A90E2]/20 border-t-[#4A90E2] rounded-full"
                      />
                      <p className="text-[#4A5568] mt-4">Loading team members... 🌊</p>
                    </div>
                  </div>
                ) : orgUsers.length === 0 ? (
                  <div className="ocean-card bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <span className="text-4xl mb-4">🏝️</span>
                      <h3 className="text-lg font-medium text-[#2C5282] mb-2">No Team Members Found</h3>
                      <p className="text-[#4A5568] max-w-md">
                        Looks like your organization is waiting for its first members to join!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="ocean-card overflow-hidden p-0 bg-white/40 backdrop-blur-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#4A90E2]/10">
                        <thead className="bg-[#4A90E2]/5">
                          <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2C5282] uppercase tracking-wider">
                              Team Member
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2C5282] uppercase tracking-wider">
                              Role & Status
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2C5282] uppercase tracking-wider">
                              Member Since
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#4A90E2]/10">
                          {orgUsers.map((user, index) => (
                            <motion.tr 
                              key={`team-member-${user.id}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="group hover:bg-[#4A90E2]/5 transition-colors duration-200"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-[#4A90E2]/20 to-[#50C878]/20 rounded-full flex items-center justify-center">
                                    <span className="text-[#2C5282] font-medium text-sm">
                                      {(user.users.raw_user_meta_data?.name?.[0] || user.users.email[0]).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-[#2C5282] group-hover:text-[#4A90E2] transition-colors">
                                      {user.users.raw_user_meta_data?.name || 'Unnamed Member'}
                                    </div>
                                    <div className="text-sm text-[#4A5568]">
                                      {user.users.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <span className={`
                                    px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                    ${user.role === 'admin' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-teal-100 text-teal-800'}
                                  `}>
                                    {user.role === 'admin' ? '👑 Admin' : '👤 Member'}
                                  </span>
                                  {user.is_root_admin && (
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                      🌟 Root Admin
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A5568]">
                                <div className="flex items-center">
                                  <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                                  Active
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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