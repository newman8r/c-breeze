'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRole } from '@/contexts/RoleContext'
import { signOut } from '@/utils/supabase'

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

interface Activity {
  type: 'ticket' | 'response' | 'chat' | 'automation'
  title: string
  description: string
  time: string
  status: string
  source?: string
  contact?: string
  contactEmail?: string
  company?: string
  priority?: 'high' | 'medium' | 'low'
  category?: string
  assignee?: string | null
  duration?: string
  satisfaction?: number
  accuracy?: string
  categories?: string[]
  aiConfidence?: 'high' | 'medium' | 'low'
}

interface Category {
  name: string
  count: number
  trend: 'up' | 'down' | 'stable'
}

interface ChatMessage {
  role: 'assistant' | 'user'
  message: string
}

interface MockStats {
  tickets: {
    total: number
    new: number
    unassigned: number
    urgent: number
  }
  support: {
    avgResponseTime: string
    satisfaction: number
    resolvedToday: number
    openTickets: number
  }
  activities: {
    today: number
    upcoming: number
    overdue: number
    recent: Activity[]
  }
  performance: {
    resolvedTickets: number
    avgResolutionTime: string
    customerSatisfaction: number
    automationRate: number
  }
  categories: Category[]
  aiStats: {
    categorizedTickets: number
    autoResolved: number
    suggestedResponses: number
    accuracy: number
  }
  aiChat: ChatMessage[]
  trends: {
    topics: Array<{
      topic: string
      count: number
      trend: 'up' | 'down' | 'stable'
      sentiment: 'positive' | 'negative' | 'neutral'
      keywords: string[]
      timeframe: string
    }>
  }
}

// Add new interface for expanded state tracking
interface ExpandedStates {
  [key: string]: boolean;
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

// Add new geometric divider component
const GeometricDivider = () => (
  <div className="flex items-center justify-center py-2 opacity-30">
    <div className="w-2 h-2 bg-[#4A90E2] rotate-45" />
    <div className="w-1 h-1 bg-[#FFB347] rounded-full mx-2" />
    <div className="w-2 h-2 bg-[#FF7676] rotate-45" />
  </div>
);

// Add status indicator component
const StatusIndicator = ({ status }: { status: string }) => {
  const statusColors = {
    urgent: '#FF7676',
    in_progress: '#4A90E2',
    resolved: '#50C878',
    open: '#FFB347',
  };
  
  const statusShapes = {
    urgent: 'triangle',
    in_progress: 'circle',
    resolved: 'rectangle',
    open: 'circle',
  };

  return (
    <div className="relative">
      {statusShapes[status as keyof typeof statusShapes] === 'triangle' && (
        <div
          className="w-3 h-3 transform rotate-45"
          style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }}
        />
      )}
      {statusShapes[status as keyof typeof statusShapes] === 'circle' && (
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }}
        />
      )}
      {statusShapes[status as keyof typeof statusShapes] === 'rectangle' && (
        <div
          className="w-3 h-3"
          style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }}
        />
      )}
    </div>
  );
};

// Mock data for demo purposes
const mockStats: MockStats = {
  tickets: {
    total: 156,
    new: 23,
    unassigned: 12,
    urgent: 5
  },
  support: {
    avgResponseTime: '2.5h',
    satisfaction: 95,
    resolvedToday: 42,
    openTickets: 38
  },
  activities: {
    today: 28,
    upcoming: 15,
    overdue: 7,
    recent: [
      {
        type: 'ticket',
        title: 'Login Authentication Issue',
        description: 'User unable to access dashboard after password reset',
        time: '10 min ago',
        status: 'urgent',
        source: 'Email',
        contact: 'Sarah Chen',
        contactEmail: 'sarah.chen@techcorp.com',
        company: 'Tech Corp',
        priority: 'high',
        category: 'Authentication',
        assignee: 'Michael Wong'
      },
      {
        type: 'response',
        title: 'API Integration Support',
        description: 'Provided documentation for webhook setup',
        time: '1 hour ago',
        status: 'resolved',
        duration: '15 min',
        source: 'Support Portal',
        contact: 'John Smith',
        contactEmail: 'j.smith@acme.com',
        company: 'Acme Inc',
        priority: 'medium',
        category: 'API Support',
        satisfaction: 5
      },
      {
        type: 'chat',
        title: 'Billing Inquiry',
        description: 'Question about enterprise plan pricing',
        time: '2 hours ago',
        status: 'in_progress',
        source: 'Live Chat',
        contact: 'Lisa Park',
        company: 'Startup Labs',
        priority: 'medium',
        category: 'Billing',
        assignee: 'Alex Johnson'
      },
      {
        type: 'automation',
        title: 'Auto-categorized Tickets',
        description: 'AI categorized 15 new support tickets',
        time: '3 hours ago',
        status: 'completed',
        accuracy: '95%',
        categories: ['Bug Report', 'Feature Request', 'Account Issues'],
        aiConfidence: 'high'
      },
      {
        type: 'ticket',
        title: 'Data Export Not Working',
        description: 'Export to CSV feature throwing 500 error',
        time: '4 hours ago',
        status: 'open',
        source: 'API Monitor',
        contact: 'Dev Team',
        company: 'Global Systems',
        priority: 'high',
        category: 'Bug',
        assignee: 'Technical Support'
      },
      {
        type: 'ticket',
        title: 'Mobile App Crash on Startup',
        description: 'iOS app crashes immediately after splash screen',
        time: '5 hours ago',
        status: 'urgent',
        source: 'Crash Report',
        contact: 'iOS Team',
        company: 'Internal',
        priority: 'high',
        category: 'Mobile App',
        assignee: 'Mobile Support'
      },
      {
        type: 'ticket',
        title: 'Payment Processing Delay',
        description: 'Customer payments taking longer than usual to process',
        time: '6 hours ago',
        status: 'in_progress',
        source: 'Email',
        contact: 'Finance Team',
        company: 'Payment Corp',
        priority: 'high',
        category: 'Billing',
        assignee: 'Payment Support'
      },
      {
        type: 'ticket',
        title: 'Account Verification Issue',
        description: 'Email verification links not working for new signups',
        time: '7 hours ago',
        status: 'open',
        source: 'Support Portal',
        contact: 'User Operations',
        company: 'Internal',
        priority: 'medium',
        category: 'Authentication',
        assignee: null
      },
      {
        type: 'ticket',
        title: 'API Rate Limiting',
        description: 'Hitting rate limits too frequently on standard plan',
        time: '8 hours ago',
        status: 'in_progress',
        source: 'API Monitor',
        contact: 'David Kim',
        company: 'Tech Solutions',
        priority: 'medium',
        category: 'API',
        assignee: 'API Support'
      },
      {
        type: 'ticket',
        title: 'Dashboard Loading Slow',
        description: 'Performance issues with analytics dashboard',
        time: '9 hours ago',
        status: 'open',
        source: 'Live Chat',
        contact: 'Maria Garcia',
        company: 'Data Analytics Inc',
        priority: 'medium',
        category: 'Performance',
        assignee: null
      },
      {
        type: 'ticket',
        title: 'Custom Integration Failed',
        description: 'Webhook integration failing for Salesforce sync',
        time: '10 hours ago',
        status: 'in_progress',
        source: 'Email',
        contact: 'Integration Team',
        company: 'Sales Masters',
        priority: 'high',
        category: 'Integration',
        assignee: 'Integration Support'
      },
      {
        type: 'ticket',
        title: 'SSO Configuration Error',
        description: 'Unable to set up SAML SSO with Okta',
        time: '11 hours ago',
        status: 'open',
        source: 'Support Portal',
        contact: 'IT Admin',
        company: 'Enterprise Co',
        priority: 'medium',
        category: 'Authentication',
        assignee: null
      },
      {
        type: 'ticket',
        title: 'Data Export Timeout',
        description: 'Large data exports failing to complete',
        time: '12 hours ago',
        status: 'in_progress',
        source: 'Support Portal',
        contact: 'Data Team',
        company: 'Big Data Corp',
        priority: 'medium',
        category: 'Performance',
        assignee: 'Data Support'
      },
      {
        type: 'ticket',
        title: 'Database Replication Lag',
        description: 'Read replicas showing increased lag time',
        time: '13 hours ago',
        status: 'urgent',
        source: 'Monitoring Alert',
        contact: 'DBA Team',
        company: 'Internal',
        priority: 'high',
        category: 'Infrastructure',
        assignee: 'Database Team'
      },
      {
        type: 'ticket',
        title: 'Password Reset Email Delay',
        description: 'Users reporting 10+ minute delays for reset emails',
        time: '14 hours ago',
        status: 'in_progress',
        source: 'Support Portal',
        contact: 'Auth Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Email',
        assignee: 'Email Service Team'
      },
      {
        type: 'ticket',
        title: 'Search Indexing Failed',
        description: 'Product search not updating with new items',
        time: '15 hours ago',
        status: 'resolved',
        source: 'Internal Monitor',
        contact: 'Search Team',
        company: 'Internal',
        priority: 'high',
        category: 'Search',
        assignee: 'Search Ops'
      },
      {
        type: 'ticket',
        title: 'API Documentation Error',
        description: 'Incorrect endpoint parameters listed',
        time: '16 hours ago',
        status: 'resolved',
        source: 'Customer Feedback',
        contact: 'Developer Relations',
        company: 'External',
        priority: 'low',
        category: 'Documentation',
        assignee: 'Doc Team'
      },
      {
        type: 'ticket',
        title: 'CDN Cache Issues',
        description: 'Static assets not updating after deploy',
        time: '17 hours ago',
        status: 'resolved',
        source: 'DevOps Monitor',
        contact: 'Frontend Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Infrastructure',
        assignee: 'CDN Team'
      },
      {
        type: 'ticket',
        title: 'OAuth Integration Failure',
        description: 'Google SSO login flow broken',
        time: '18 hours ago',
        status: 'in_progress',
        source: 'Error Logs',
        contact: 'Auth Team',
        company: 'Internal',
        priority: 'high',
        category: 'Authentication',
        assignee: 'SSO Team'
      },
      {
        type: 'ticket',
        title: 'Payment Gateway Timeout',
        description: 'Stripe webhook responses delayed',
        time: '19 hours ago',
        status: 'resolved',
        source: 'Payment Monitor',
        contact: 'Finance Ops',
        company: 'Internal',
        priority: 'high',
        category: 'Payments',
        assignee: 'Payment Systems'
      },
      {
        type: 'ticket',
        title: 'Mobile Push Notifications',
        description: 'Android notifications not delivering',
        time: '20 hours ago',
        status: 'in_progress',
        source: 'App Monitor',
        contact: 'Mobile Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Mobile',
        assignee: 'Push Notifications Team'
      },
      {
        type: 'ticket',
        title: 'Report Generation Failed',
        description: 'Weekly analytics reports not sending',
        time: '21 hours ago',
        status: 'resolved',
        source: 'Automated Alert',
        contact: 'Analytics Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Analytics',
        assignee: 'Reports Team'
      },
      {
        type: 'ticket',
        title: 'Rate Limit Exceeded',
        description: 'Multiple enterprise customers hitting limits',
        time: '22 hours ago',
        status: 'urgent',
        source: 'System Alert',
        contact: 'Platform Team',
        company: 'Internal',
        priority: 'high',
        category: 'API',
        assignee: 'Platform Ops'
      },
      {
        type: 'ticket',
        title: 'Data Migration Stuck',
        description: 'Legacy data import process halted',
        time: '23 hours ago',
        status: 'in_progress',
        source: 'Migration Tool',
        contact: 'Data Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Data',
        assignee: 'Migration Team'
      },
      {
        type: 'ticket',
        title: 'SSL Certificate Expiring',
        description: 'Production certificate expires in 48h',
        time: '24 hours ago',
        status: 'resolved',
        source: 'Security Scan',
        contact: 'Security Team',
        company: 'Internal',
        priority: 'high',
        category: 'Security',
        assignee: 'Security Ops'
      }
    ]
  },
  performance: {
    resolvedTickets: 145,
    avgResolutionTime: '3.2h',
    customerSatisfaction: 4.8,
    automationRate: 35
  },
  categories: [
    { name: 'Authentication', count: 45, trend: 'up' },
    { name: 'API Support', count: 32, trend: 'stable' },
    { name: 'Billing', count: 28, trend: 'down' },
    { name: 'Bug Reports', count: 51, trend: 'up' },
  ],
  aiStats: {
    categorizedTickets: 234,
    autoResolved: 89,
    suggestedResponses: 156,
    accuracy: 94
  },
  aiChat: [
    { role: 'assistant', message: 'Hi! I can help you manage your support tickets and suggest solutions. What would you like to know?' },
    { role: 'user', message: 'Show me urgent tickets' },
    { role: 'assistant', message: 'You have 5 urgent tickets:\n1. Login Authentication Issue\n2. Data Export Error\n3. Payment Gateway Down' }
  ],
  trends: {
    topics: [
      {
        topic: 'Login Issues',
        count: 28,
        trend: 'up',
        sentiment: 'negative',
        keywords: ['password reset', '2FA', 'authentication'],
        timeframe: 'Last 2h'
      },
      {
        topic: 'Mobile App Crashes',
        count: 15,
        trend: 'up',
        sentiment: 'negative',
        keywords: ['iOS 17', 'startup', 'black screen'],
        timeframe: 'Last 1h'
      },
      {
        topic: 'API Performance',
        count: 12,
        trend: 'stable',
        sentiment: 'neutral',
        keywords: ['timeout', 'latency', 'response time'],
        timeframe: 'Last 3h'
      },
      {
        topic: 'New Dashboard',
        count: 8,
        trend: 'down',
        sentiment: 'positive',
        keywords: ['UI', 'analytics', 'export'],
        timeframe: 'Last 4h'
      }
    ]
  }
}

// Add new color mapping for ticket backgrounds
const getTicketColor = (priority: string | undefined, status: string) => {
  // Four distinct states with their colors
  if (status === 'resolved') return 'bg-[#50C878]/20 hover:bg-[#50C878]/30';
  if (status === 'in_progress') return 'bg-[#4A90E2]/20 hover:bg-[#4A90E2]/30';
  if (status === 'urgent' || priority === 'high') return 'bg-[#FF7676]/20 hover:bg-[#FF7676]/30';
  return 'bg-[#FFB347]/20 hover:bg-[#FFB347]/30'; // default/open state
};

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
  const { role, isRootAdmin } = useRole()
  const [expandedTickets, setExpandedTickets] = useState<ExpandedStates>({});

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

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

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
            <div className="flex justify-end gap-4 mb-6">
              {(role === 'admin' || isRootAdmin) && (
                <Link
                  href="/admin"
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Panel
                </Link>
              )}
              <Link href="/profile" className="wave-button px-4 py-2">
                Profile Settings
              </Link>
              <button
                onClick={async () => {
                  await signOut()
                  router.push('/')
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
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
              <h3 className="text-lg font-medium text-[#4A5568]">Open Tickets</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.support.openTickets}</p>
              <p className="text-sm text-[#FF7676]">{mockStats.tickets.urgent} urgent</p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#4A90E2" type="triangle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Avg Response Time</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.support.avgResponseTime}</p>
              <p className="text-sm text-[#4A90E2]">Target: 3h</p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#50C878" type="rectangle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Resolved Today</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.support.resolvedToday}</p>
              <p className="text-sm text-[#50C878]">{mockStats.performance.automationRate}% automated</p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#FFB347" type="circle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Satisfaction</h3>
              <p className="text-3xl font-bold text-[#2C5282]">{mockStats.support.satisfaction}%</p>
              <p className="text-sm text-[#FFB347]">Last 24 hours</p>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Feed */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="ocean-card col-span-2"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Ticket Feed</h2>
              <Link href="/tickets" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View All Tickets →
              </Link>
            </div>
            <div className="max-h-[600px] overflow-y-auto pr-2">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {mockStats.activities.recent
                  .filter(activity => activity.type === 'ticket')
                  .map((ticket, index) => (
                    <motion.div
                      key={index}
                      className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                        ${getTicketColor(ticket.priority, ticket.status)}
                        ${expandedTickets[`ticket-${index}`] ? 'col-span-2 row-span-2 z-10' : ''}`}
                      onClick={() => toggleTicketExpansion(`ticket-${index}`)}
                      layout
                    >
                      <div className="flex flex-col min-h-0">
                        <h3 className="font-medium text-[#2C5282] text-xs leading-tight truncate">
                          {ticket.title}
                        </h3>
                        {!expandedTickets[`ticket-${index}`] ? (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-[#4A5568]">{ticket.time}</span>
                            <span className="text-[10px] text-[#4A5568]">{ticket.category}</span>
                          </div>
                        ) : (
                          <motion.div
                            initial={false}
                            animate={{ opacity: 1 }}
                            className="mt-1 text-xs"
                          >
                            <p className="text-[#4A5568] mb-2">{ticket.description}</p>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <div>
                                <p className="font-medium text-[#4A5568]">Contact</p>
                                <p className="truncate">{ticket.contact}</p>
                              </div>
                              <div>
                                <p className="font-medium text-[#4A5568]">Company</p>
                                <p className="truncate">{ticket.company}</p>
                              </div>
                              <div>
                                <p className="font-medium text-[#4A5568]">Status</p>
                                <p>{ticket.status}</p>
                              </div>
                              <div>
                                <p className="font-medium text-[#4A5568]">Assignee</p>
                                <p className="truncate">{ticket.assignee || 'Unassigned'}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.div>

          {/* Chat Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="ocean-card"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Active Chats</h2>
              <Link href="/chats" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {mockStats.activities.recent
                .filter(activity => activity.type === 'chat')
                .map((chat, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-[#50C878]" />
                    <div className="flex-1">
                      <p className="font-medium text-[#2C5282]">{chat.contact}</p>
                      <p className="text-sm text-[#4A5568]">{chat.description}</p>
                    </div>
                    <span className="text-xs text-[#4A5568]">{chat.time}</span>
                  </div>
                ))}
            </div>
          </motion.div>

          {/* Social Feed */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="ocean-card"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Social Mentions</h2>
              <Link href="/social" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#1DA1F2]">𝕏</span>
                  <span className="text-sm font-medium text-[#4A5568]">@techuser</span>
                </div>
                <p className="text-sm text-[#4A5568]">Having issues with the latest update. Support team please help!</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[#4A5568]">
                  <span>2m ago</span>
                  <span>•</span>
                  <span className="text-[#4A90E2]">Reply</span>
                </div>
              </div>
              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#4267B2]">f</span>
                  <span className="text-sm font-medium text-[#4A5568]">Sarah Miller</span>
                </div>
                <p className="text-sm text-[#4A5568]">Great customer service experience today!</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[#4A5568]">
                  <span>15m ago</span>
                  <span>•</span>
                  <span className="text-[#4A90E2]">Reply</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Knowledge Base */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="ocean-card"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Knowledge Base</h2>
              <Link href="/kb" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                <h3 className="font-medium text-[#2C5282]">Getting Started Guide</h3>
                <p className="text-sm text-[#4A5568] mt-1">Basic setup and configuration steps</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[#4A5568]">
                  <span>Updated 2d ago</span>
                  <span>•</span>
                  <span>Views: 1.2k</span>
                </div>
              </div>
              <div className="p-4 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                <h3 className="font-medium text-[#2C5282]">API Documentation</h3>
                <p className="text-sm text-[#4A5568] mt-1">Integration guides and endpoints</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[#4A5568]">
                  <span>Updated 1w ago</span>
                  <span>•</span>
                  <span>Views: 3.4k</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trending Topics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="ocean-card col-span-2"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">Trending Topics</h2>
              <Link href="/trends" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                View Analysis →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {mockStats.trends.topics.map((topic, index) => (
                <div key={index} className="p-4 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#2C5282]">{topic.topic}</h3>
                      {topic.trend === 'up' && (
                        <span className="text-[#FF7676]">↑</span>
                      )}
                      {topic.trend === 'down' && (
                        <span className="text-[#50C878]">↓</span>
                      )}
                      {topic.trend === 'stable' && (
                        <span className="text-[#4A90E2]">→</span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${topic.sentiment === 'positive' ? 'bg-[#50C878]/10 text-[#50C878]' :
                        topic.sentiment === 'negative' ? 'bg-[#FF7676]/10 text-[#FF7676]' :
                        'bg-[#4A90E2]/10 text-[#4A90E2]'}`}
                    >
                      {topic.count} issues
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {topic.keywords.map((keyword, kidx) => (
                      <span 
                        key={kidx}
                        className="px-2 py-1 bg-white/50 rounded-full text-xs text-[#4A5568]"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-[#4A5568] mt-2">
                    Trending {topic.timeframe}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Agents */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="ocean-card col-span-2"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2C5282]">AI Support Agents</h2>
              <Link href="/ai-agents" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                Manage Agents →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#4A90E2]/20 flex items-center justify-center">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-medium text-[#2C5282]">Technical Support AI</h3>
                    <p className="text-xs text-[#4A5568]">Active</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4A5568]">Tickets Handled</span>
                    <span className="text-[#2C5282] font-medium">127</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4A5568]">Avg Response Time</span>
                    <span className="text-[#2C5282] font-medium">30s</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#50C878]/20 flex items-center justify-center">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-medium text-[#2C5282]">Billing Support AI</h3>
                    <p className="text-xs text-[#4A5568]">Active</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4A5568]">Tickets Handled</span>
                    <span className="text-[#2C5282] font-medium">89</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4A5568]">Avg Response Time</span>
                    <span className="text-[#2C5282] font-medium">45s</span>
                  </div>
                </div>
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
                {mockStats.aiChat.map((message: ChatMessage, index: number) => (
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