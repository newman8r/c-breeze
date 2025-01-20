'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRole } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Tab type definition
type Tab = 'users' | 'employees' | 'ticketing' | 'automation' | 'billing'

export default function AdminPanel() {
  const router = useRouter()
  const { role, isRootAdmin, loading } = useRole()
  const [activeTab, setActiveTab] = useState<Tab>('users')

  // Protect route
  useEffect(() => {
    if (!loading && role !== 'admin' && !isRootAdmin) {
      router.push('/dashboard')
    }
  }, [role, isRootAdmin, loading, router])

  if (loading) {
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
                  <button className="wave-button px-4 py-2">Add User</button>
                </div>
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