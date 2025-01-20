'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Types for our data
interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

// Mock data for demo purposes
const mockStats = {
  leads: {
    total: 156,
    new: 23,
    qualified: 45,
    conversion: 68
  },
  deals: {
    total: 42,
    value: 850000,
    avgSize: 20238,
    winRate: 65
  },
  activities: {
    today: 28,
    upcoming: 15,
    overdue: 7
  },
  performance: {
    meetings: 12,
    emails: 145,
    calls: 34
  },
  clients: [
    { name: 'Tech Corp', status: 'active', value: 125000, lastContact: '2h ago' },
    { name: 'Acme Inc', status: 'pending', value: 75000, lastContact: '1d ago' },
    { name: 'Global Systems', status: 'active', value: 250000, lastContact: '4h ago' },
    { name: 'Startup Labs', status: 'inactive', value: 50000, lastContact: '5d ago' },
  ],
  aiChat: [
    { role: 'assistant', message: 'Hi! I can help you manage your deals and suggest next actions. What would you like to know?' },
    { role: 'user', message: 'Show me priority tasks for today' },
    { role: 'assistant', message: 'You have 3 high-priority tasks:\n1. Follow up with Tech Corp proposal\n2. Schedule demo with Acme Inc\n3. Review Global Systems contract' }
  ]
}

// Decorative shape component
const BauhausShape = ({ color, type }: { color: string, type: 'circle' | 'triangle' | 'rectangle' }) => {
  switch (type) {
    case 'circle':
      return <div className="absolute w-16 h-16 rounded-full opacity-10" style={{ backgroundColor: color }} />
    case 'triangle':
      return (
        <div className="absolute w-0 h-0 opacity-10"
             style={{ 
               borderLeft: '30px solid transparent',
               borderRight: '30px solid transparent',
               borderBottom: `52px solid ${color}`
             }} />
      )
    case 'rectangle':
      return <div className="absolute w-20 h-12 opacity-10" style={{ backgroundColor: color }} />
    default:
      return null
  }
}

/**
 * Dashboard Page Component
 * 
 * Displays user profile information and statistics.
 * Protected route - redirects to home if not authenticated.
 */
export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [isCopilotMinimized, setIsCopilotMinimized] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  // Fetch user data
  useEffect(() => {
    async function loadProfile() {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        setUserProfile(profile)
      }
    }
    loadProfile()
  }, [user])

  // Show loading state
  if (userLoading) {
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

  // Protect route
  if (!user) {
    return null // Router will handle redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="ocean-card py-4 px-6 inline-flex items-center gap-4"
          >
            <h1 className="text-2xl font-bold text-[#2C5282]">
              Welcome, {userProfile?.display_name || user.email}
            </h1>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-4"
          >
            <Link href="/profile" className="wave-button px-4 py-2">
              Profile Settings
            </Link>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </motion.div>
        </div>

        {/* Quick Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#FF7676" type="circle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Total Leads</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.leads.total}</p>
              <p className="text-sm text-[#FF7676]">+{mockStats.leads.new} new this week</p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#4A90E2" type="triangle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Active Deals</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.deals.total}</p>
              <p className="text-sm text-[#4A90E2]">${mockStats.deals.value.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#50C878" type="rectangle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Today's Tasks</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.activities.today}</p>
              <p className="text-sm text-[#50C878]">{mockStats.activities.upcoming} upcoming</p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#FFB347" type="circle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Win Rate</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.deals.winRate}%</p>
              <p className="text-sm text-[#FFB347]">Last 30 days</p>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="ocean-card col-span-2"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Pipeline Overview</h2>
              <Link href="/pipeline" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View Full Pipeline →
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              {['Lead', 'Meeting', 'Proposal', 'Won'].map((stage, index) => (
                <div key={stage} className="relative">
                  <div className="h-2 bg-[#4A90E2]/20 rounded-full mb-2">
                    <div 
                      className="h-full bg-[#4A90E2] rounded-full"
                      style={{ width: `${85 - (index * 20)}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-[#4A5568]">{stage}</p>
                  <p className="text-lg font-bold text-[#2C5282]">
                    {mockStats.leads.total - (index * 12)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="ocean-card"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Recent Activity</h2>
              <Link href="/activities" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { type: 'email', text: 'Sent proposal to Tech Corp' },
                { type: 'meeting', text: 'Call with John from Acme Inc' },
                { type: 'task', text: 'Follow up with new leads' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-lg">{
                    activity.type === 'email' ? '📧' :
                    activity.type === 'meeting' ? '📞' : '✅'
                  }</span>
                  <p className="text-[#4A5568]">{activity.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Client List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="ocean-card col-span-2"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Key Clients</h2>
              <Link href="/clients" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View All Clients →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-[#4A5568]">
                    <th className="pb-4">Client</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Value</th>
                    <th className="pb-4">Last Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4A90E2]/10">
                  {mockStats.clients.map((client, index) => (
                    <tr key={index} className="group hover:bg-white/30 transition-colors">
                      <td className="py-3 font-medium text-[#2C5282]">{client.name}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${client.status === 'active' ? 'bg-[#50C878]/10 text-[#50C878]' :
                            client.status === 'pending' ? 'bg-[#FFB347]/10 text-[#FFB347]' :
                            'bg-[#4A5568]/10 text-[#4A5568]'}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#4A5568]">${client.value.toLocaleString()}</td>
                      <td className="py-3 text-sm text-[#4A5568]">{client.lastContact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* AI Insights */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="ocean-card col-span-2"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">AI Insights</h2>
              <Link href="/insights" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View All Insights →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/50 rounded-lg">
                <h3 className="text-[#FF7676] font-medium mb-2">High Priority</h3>
                <p className="text-[#4A5568]">3 leads haven't been contacted in 7 days</p>
              </div>
              <div className="p-4 bg-white/50 rounded-lg">
                <h3 className="text-[#50C878] font-medium mb-2">Opportunity</h3>
                <p className="text-[#4A5568]">Tech Corp showing high engagement signals</p>
              </div>
            </div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="ocean-card"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Performance</h2>
              <Link href="/performance" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                Full Report →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#4A5568]">Meetings Scheduled</span>
                <span className="text-[#2C5282] font-bold">{mockStats.performance.meetings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#4A5568]">Emails Sent</span>
                <span className="text-[#2C5282] font-bold">{mockStats.performance.emails}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#4A5568]">Calls Made</span>
                <span className="text-[#2C5282] font-bold">{mockStats.performance.calls}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* AI Copilot Chat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <motion.div
            className={`ocean-card transition-all duration-300 ease-in-out bg-gradient-to-r from-[#E0F2F7] to-[#F7F3E3] ${
              isCopilotMinimized ? 'py-2 px-4' : 'w-96'
            }`}
            animate={{
              height: isCopilotMinimized ? '40px' : '400px',
              width: isCopilotMinimized ? '180px' : '384px',
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          >
            <div className={`flex justify-between items-center ${!isCopilotMinimized && 'mb-4'}`}>
              <motion.div 
                className="flex items-center gap-2"
                animate={{ 
                  width: isCopilotMinimized ? 'auto' : '100%'
                }}
              >
                <span className="text-xl">🤖</span>
                <h3 className="text-[#2C5282] whitespace-nowrap flex items-center">
                  <span className={isCopilotMinimized ? 'text-sm font-medium' : 'text-lg font-bold'}>
                    AI Copilot
                  </span>
                  {isCopilotMinimized && (
                    <span className="ml-2 text-xs font-normal text-[#4A5568] opacity-75">
                      Ready
                    </span>
                  )}
                </h3>
              </motion.div>
              <button 
                onClick={() => setIsCopilotMinimized(!isCopilotMinimized)}
                className="text-[#4A5568] hover:text-[#2C5282] transition-colors p-1 rounded-full hover:bg-white/50"
              >
                <span className="sr-only">
                  {isCopilotMinimized ? 'Expand' : 'Minimize'}
                </span>
                <motion.svg 
                  className={`${isCopilotMinimized ? 'w-4 h-4' : 'w-5 h-5'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ 
                    rotate: isCopilotMinimized ? 180 : 0 
                  }}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 9l-7 7-7-7" 
                  />
                </motion.svg>
              </button>
            </div>
            
            <motion.div
              animate={{
                height: isCopilotMinimized ? 0 : 'auto',
                opacity: isCopilotMinimized ? 0 : 1
              }}
              transition={{
                duration: 0.2,
                opacity: { duration: 0.15 }
              }}
              className="overflow-hidden"
            >
              <div className="h-64 overflow-y-auto mb-4 space-y-4">
                {mockStats.aiChat.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-[#4A90E2] text-white ml-4' 
                        : 'bg-white/60 text-[#4A5568] mr-4'
                    }`}>
                      <p className="whitespace-pre-line">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask anything..."
                  className="flex-1 px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                />
                <button className="wave-button px-4 py-2">
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
} 