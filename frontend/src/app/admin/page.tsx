'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRole } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getFunctionUrl } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { useUser } from '@/contexts/UserContext'
import styles from './ApiKeys.module.css'
import RagPanel from './RagPanel'

// Tab type definition
type Tab = 'customers' | 'employees' | 'ticketing' | 'automation' | 'billing' | 'audit-logs' | 'api-keys' | 'rag-system'

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

interface ApiKey {
  id: string
  description: string
  key: string
  created_at: string
  last_used_at: string | null
  status: 'active' | 'revoked'
}

interface NewApiKey {
  id: string;
  description: string;
  key: string;
  key_last_four: string;
  created_at: string;
  status: 'active' | 'revoked';
}

const maskApiKey = (key: string) => {
  if (!key) return '';
  const lastFour = key.slice(-4);
  return `••••••••${lastFour}`;
};

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
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingApiKeys, setLoadingApiKeys] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [newKeyData, setNewKeyData] = useState<NewApiKey | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [createKeyError, setCreateKeyError] = useState<string | null>(null)
  const [isRevokingKey, setIsRevokingKey] = useState<string | null>(null)
  const [revokeKeyError, setRevokeKeyError] = useState<string | null>(null)

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

  // Add effect to fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (activeTab === 'customers') {
        setLoadingCustomers(true)
        setCustomerError(null)
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !session) {
            throw new Error('No active session')
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/list-customers`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          setCustomers(data.customers)
        } catch (err) {
          console.error('Error fetching customers:', err)
          setCustomerError(err instanceof Error ? err.message : 'Failed to load customers')
        } finally {
          setLoadingCustomers(false)
        }
      }
    }

    fetchCustomers()
  }, [activeTab, supabase])

  // Add copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Add key creation function
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingKey(true)
    setCreateKeyError(null)
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-api-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          description: newKeyDescription,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setNewKeyData(data.api_key)
      setShowNewKeyForm(false)
      setNewKeyDescription('')
    } catch (err) {
      console.error('Create key error:', err)
      setCreateKeyError(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setIsCreatingKey(false)
    }
  }

  // Fetch API keys
  const fetchApiKeys = async () => {
    setLoadingApiKeys(true)
    setApiKeyError(null)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        throw new Error('No session')
      }

      const response = await fetch(getFunctionUrl('list-api-keys'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch API keys')
      }

      const data = await response.json()
      setApiKeys(data.api_keys.map((key: any) => ({
        ...key,
        key: key.key_last_four // We only get the last 4 digits from the server
      })))
    } catch (error: any) {
      setApiKeyError(error.message)
    } finally {
      setLoadingApiKeys(false)
    }
  }

  // Load API keys when tab is active
  useEffect(() => {
    if (activeTab === 'api-keys') {
      fetchApiKeys()
    }
  }, [activeTab])

  // Handle key revocation
  const handleRevokeKey = async (keyId: string) => {
    setIsRevokingKey(keyId)
    setRevokeKeyError(null)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No active session')
      }

      const response = await fetch(getFunctionUrl('revoke-api-key'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key_id: keyId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke API key')
      }

      // Refresh the API keys list
      await fetchApiKeys()
    } catch (error: any) {
      setRevokeKeyError(error.message)
      console.error('Failed to revoke API key:', error)
    } finally {
      setIsRevokingKey(null)
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
    { id: 'customers', label: 'Customers' },
    { id: 'employees', label: 'Employees' },
    { id: 'ticketing', label: 'Ticketing' },
    { id: 'automation', label: 'Automation' },
    { id: 'billing', label: 'Billing' },
    { id: 'audit-logs', label: '🔍 Audit Logs' },
    { id: 'api-keys', label: 'API Keys' },
    { id: 'rag-system', label: 'RAG System' }
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
                    }[log.action_type as 'create' | 'update' | 'delete' | 'execute' | 'read' | 'other'] || 'text-gray-600';

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
                    }[log.resource_type as 'organization' | 'employee' | 'customer' | 'ticket' | 'tag' | 'invitation' | 'profile' | 'user_settings' | 'system'] || '📄';

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
            {activeTab === 'customers' && (
              <motion.div
                key="customers-tab-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-[#2C5282] mb-2">Customer Management</h2>
                    <p className="text-[#4A5568] text-sm">View and manage your organization's customers 🤝</p>
                  </div>
                </div>

                {customerError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <p>{customerError}</p>
                    </div>
                  </motion.div>
                )}

                {loadingCustomers ? (
                  <div className="ocean-card bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center justify-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-[#4A90E2]/20 border-t-[#4A90E2] rounded-full"
                      />
                      <p className="text-[#4A5568] mt-4">Loading customers... 🌊</p>
                    </div>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="ocean-card bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <span className="text-4xl mb-4">🏝️</span>
                      <h3 className="text-lg font-medium text-[#2C5282] mb-2">No Customers Found</h3>
                      <p className="text-[#4A5568] max-w-md">
                        Your organization doesn't have any customers yet.
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
                              Customer
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2C5282] uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2C5282] uppercase tracking-wider">
                              Joined
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2C5282] uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#4A90E2]/10">
                          {customers.map((customer, index) => (
                            <motion.tr 
                              key={`customer-${customer.id}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="group hover:bg-[#4A90E2]/5 transition-colors duration-200"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-[#4A90E2]/20 to-[#50C878]/20 rounded-full flex items-center justify-center">
                                    <span className="text-[#2C5282] font-medium text-sm">
                                      {(customer.name?.[0] || customer.email[0]).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-[#2C5282] group-hover:text-[#4A90E2] transition-colors">
                                      {customer.name || 'Unnamed Customer'}
                                    </div>
                                    <div className="text-sm text-[#4A5568]">
                                      {customer.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`
                                  px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                  ${customer.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : customer.status === 'pending_verification'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'}
                                `}>
                                  {customer.status === 'active' ? '✅ Active' 
                                    : customer.status === 'pending_verification' ? '⏳ Pending'
                                    : '❓ Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A5568]">
                                {new Date(customer.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4A5568]">
                                <button className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                                  View Details
                                </button>
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
                  <button 
                    className="wave-button px-4 py-2"
                    onClick={() => setShowInviteCard(true)}
                  >
                    Invite Employee ✨
                  </button>
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

                {/* Invite Employee Modal */}
                {showInviteCard && (
                  <motion.div
                    key="invite-user-form"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ocean-card bg-white/50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-[#2C5282]">Invite New Employee</h3>
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

            {activeTab === 'api-keys' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#2C5282]">🔑 API Keys</h2>
                  <button 
                    className={`${styles['wave-button']} px-4 py-2`}
                    onClick={() => setShowNewKeyForm(true)}
                  >
                    <span className="mr-2">✨</span> Create New Key
                  </button>
                </div>

                {showNewKeyForm && (
                  <motion.div
                    key="new-key-form"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles['ocean-card']}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-[#2C5282]">Create New API Key</h3>
                      <button 
                        onClick={() => setShowNewKeyForm(false)}
                        className="text-[#4A5568] hover:text-[#2C5282]"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCreateKey} className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#4A5568] mb-1">Description</label>
                        <input
                          type="text"
                          value={newKeyDescription}
                          onChange={(e) => setNewKeyDescription(e.target.value)}
                          className="w-full px-3 py-2 rounded border border-[#4A90E2]/20 focus:ring-2 focus:ring-[#4A90E2]/40 focus:border-transparent"
                          placeholder="e.g., Production API Key"
                          required
                        />
                      </div>

                      {createKeyError && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                          {createKeyError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewKeyForm(false)}
                          className="px-4 py-2 text-[#4A5568] hover:text-[#2C5282]"
                          disabled={isCreatingKey}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={styles['wave-button']}
                          disabled={isCreatingKey}
                        >
                          {isCreatingKey ? (
                            <span className="flex items-center">
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="mr-2"
                              >
                                🌀
                              </motion.span>
                              Creating...
                            </span>
                          ) : (
                            <>
                              <span className="mr-2">✨</span> Create Key
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* New Key Display */}
                <AnimatePresence>
                  {newKeyData && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`${styles['ocean-card']} border-2 border-[#4A90E2]/20 bg-[#4A90E2]/5`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-[#2C5282] flex items-center">
                            <span className="mr-2">✨</span> New API Key Created
                          </h3>
                          <p className="text-sm text-[#4A5568] mt-1">
                            Make sure to copy your API key now. You won't be able to see it again!
                          </p>
                        </div>
                        <button
                          onClick={() => setNewKeyData(null)}
                          className="text-[#4A5568] hover:text-[#2C5282]"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-[#4A5568] mb-1">API Key</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 font-mono text-sm bg-white/50 p-3 rounded border border-[#4A90E2]/20">
                              {newKeyData.key}
                            </code>
                            <button
                              onClick={() => copyToClipboard(newKeyData.key)}
                              className={`${styles['wave-button']} px-4 py-3`}
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-800">
                            <span className="text-xl">⚠️</span>
                            <div>
                              <p className="font-medium">Important Security Notice</p>
                              <p className="text-sm mt-1">
                                This API key will only be shown once. Please store it securely.
                                You can always create a new key if you lose this one.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-[#4A5568]">
                          <div className="flex items-center gap-2">
                            <span>Description:</span>
                            <span className="font-medium text-[#2C5282]">{newKeyData.description}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span>Created:</span>
                            <span>{new Date(newKeyData.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {loadingApiKeys ? (
                  <div className={styles['ocean-card']}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className={styles['loading-wave']} />
                      <p className="text-[#4A5568] mt-4">Loading API keys...</p>
                    </div>
                  </div>
                ) : apiKeyError ? (
                  <div className={styles['ocean-card']}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <span className="text-4xl mb-4">🌊</span>
                      <h3 className="text-lg font-medium text-[#2C5282] mb-2">Oops! Something went wrong</h3>
                      <p className="text-[#4A5568] max-w-md">
                        {apiKeyError}
                      </p>
                    </div>
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className={styles['ocean-card']}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <span className="text-4xl mb-4">🏝️</span>
                      <h3 className="text-lg font-medium text-[#2C5282] mb-2">No API keys yet</h3>
                      <p className="text-[#4A5568] max-w-md">
                        Create your first API key to get started with our API.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles['ocean-card']}>
                    <div className="overflow-x-auto">
                      <table className={styles['key-table']}>
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Key</th>
                            <th>Created</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiKeys.map((key, index) => (
                            <motion.tr 
                              key={key.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <span className="text-sm text-[#2D3748]">{key.description}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <code className={`${styles['key-value']} ${styles['key-value-masked']}`}>
                                    {maskApiKey(key.key)}
                                  </code>
                                  <button
                                    className="text-[#4A90E2] hover:text-[#2C5282] text-sm"
                                    onClick={() => {/* Copy to clipboard */}}
                                  >
                                    📋
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-[#4A5568]">
                                  {new Date(key.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={styles[`key-status-${key.status}`]}>
                                  {key.status === 'active' ? '🟢 Active' : '⚫ Revoked'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  {key.status === 'active' ? (
                                    <button
                                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                      onClick={() => handleRevokeKey(key.id)}
                                      disabled={isRevokingKey === key.id}
                                    >
                                      {isRevokingKey === key.id ? (
                                        <span className="flex items-center">
                                          <motion.span
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="mr-2"
                                          >
                                            🌀
                                          </motion.span>
                                          Revoking...
                                        </span>
                                      ) : (
                                        'Revoke'
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-sm text-[#4A5568]">Revoked</span>
                                  )}
                                  {revokeKeyError && isRevokingKey === key.id && (
                                    <span className="text-sm text-red-600">{revokeKeyError}</span>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* API Guide Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8"
                >
                  <div className={`${styles['ocean-card']} overflow-hidden`}>
                    <h3 className="text-xl font-semibold mb-4 text-[#2D3748] flex items-center gap-2">
                      <span>🌊</span> Quick API Guide
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Base URL Section */}
                      <div className="space-y-2">
                        <h4 className="text-[#4A90E2] font-medium flex items-center gap-2">
                          <span>🔗</span> Base URL
                        </h4>
                        <div className="bg-white/50 rounded-lg p-4">
                          <p className="text-sm text-[#4A5568] mb-2">All API endpoints are prefixed with:</p>
                          <code className="block text-sm bg-white/80 p-3 rounded-md overflow-x-auto">
                            {process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1
                          </code>
                        </div>
                      </div>

                      {/* Create Ticket Example */}
                      <div className="space-y-2">
                        <h4 className="text-[#4A90E2] font-medium flex items-center gap-2">
                          <span>📝</span> Create a Ticket
                        </h4>
                        <div className="bg-white/50 rounded-lg p-4 space-y-2">
                          <code className="block text-sm bg-white/80 p-3 rounded-md overflow-x-auto">
                            POST ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-create-ticket
                          </code>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-[#4A5568] mb-2">Request:</p>
                              <pre className="bg-white/80 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "email": "customer@example.com",
  "subject": "Need help with...",
  "description": "Issue details...",
  "priority": "medium"
}`}
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm text-[#4A5568] mb-2">Response:</p>
                              <pre className="bg-white/80 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "success": true,
  "ticket_id": "uuid",
  "status": "open"
}`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add Message Example */}
                      <div className="space-y-2">
                        <h4 className="text-[#4A90E2] font-medium flex items-center gap-2">
                          <span>💭</span> Add Message to Ticket
                        </h4>
                        <div className="bg-white/50 rounded-lg p-4 space-y-2">
                          <code className="block text-sm bg-white/80 p-3 rounded-md overflow-x-auto">
                            POST ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-add-ticket-message
                          </code>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-[#4A5568] mb-2">Request:</p>
                              <pre className="bg-white/80 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "ticket_id": "uuid",
  "message": "Update on the issue..."
}`}
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm text-[#4A5568] mb-2">Response:</p>
                              <pre className="bg-white/80 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "success": true,
  "message_id": "uuid"
}`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Get Ticket Example */}
                      <div className="space-y-2">
                        <h4 className="text-[#4A90E2] font-medium flex items-center gap-2">
                          <span>🎫</span> Get Ticket Details
                        </h4>
                        <div className="bg-white/50 rounded-lg p-4">
                          <code className="block text-sm bg-white/80 p-3 rounded-md overflow-x-auto">
                            GET ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-get-ticket?ticket_id=uuid
                          </code>
                        </div>
                      </div>

                      {/* List Customer Tickets Example */}
                      <div className="space-y-2">
                        <h4 className="text-[#4A90E2] font-medium flex items-center gap-2">
                          <span>📋</span> List Customer Tickets
                        </h4>
                        <div className="bg-white/50 rounded-lg p-4">
                          <code className="block text-sm bg-white/80 p-3 rounded-md overflow-x-auto">
                            GET ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-get-customer-tickets?email=customer@example.com
                          </code>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-[#4A5568] mb-2">Response:</p>
                              <pre className="bg-white/80 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "success": true,
  "customer": {
    "id": "uuid",
    "name": "Customer Name"
  },
  "tickets": [{
    "id": "uuid",
    "title": "Issue Title",
    "status": "open",
    "created_at": "timestamp",
    "messages": [...]
  }]
}`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Update Ticket Status Example */}
                      <div className="space-y-2">
                        <h4 className="text-[#4A90E2] font-medium flex items-center gap-2">
                          <span>🔄</span> Update Ticket Status
                        </h4>
                        <div className="bg-white/50 rounded-lg p-4 space-y-2">
                          <code className="block text-sm bg-white/80 p-3 rounded-md overflow-x-auto">
                            POST ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-update-ticket-status
                          </code>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-[#4A5568] mb-2">Request:</p>
                              <pre className="bg-white/80 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "ticket_id": "uuid",
  "status": "resolved"  // open, resolved, closed
}`}
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm text-[#4A5568] mb-2">Response:</p>
                              <pre className="bg-white/80 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "success": true,
  "ticket": {
    "id": "uuid",
    "status": "resolved",
    "updated_at": "timestamp"
  }
}`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Authentication Note */}
                      <div className="mt-6 bg-[#4A90E2]/10 p-4 rounded-lg">
                        <p className="text-sm text-[#2D3748] flex items-center gap-2">
                          <span>💡</span> Remember to include your API key in the headers:
                        </p>
                        <pre className="bg-white/80 mt-2 p-3 rounded-md text-sm overflow-x-auto">
{`{
  "Content-Type": "application/json",
  "apikey": "your-api-key"
}`}
                        </pre>
                      </div>

                      {/* Documentation Link */}
                      <div className="text-center pt-4">
                        <a
                          href="/docs/api"
                          className="inline-flex items-center gap-2 text-[#4A90E2] hover:text-[#2C5282] transition-colors"
                        >
                          <span>📚</span> View Full API Documentation
                          <span className="text-xl">→</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'rag-system' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full"
              >
                <RagPanel />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 