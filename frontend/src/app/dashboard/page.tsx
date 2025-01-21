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

// Update the ZoomLevel type definition
type ZoomLevel = 1 | 2 | 3;

const getZoomStyles = (zoomLevel: ZoomLevel) => {
  switch (zoomLevel) {
    case 1: // Full detail view
      return {
        grid: 'grid-cols-1',
        padding: 'p-4',
        text: 'text-sm',
        description: 'line-clamp-3',
        showExtra: true,
        variants: {
          container: {
            enter: { opacity: 1, transition: { staggerChildren: 0.1 } },
            exit: { opacity: 0, transition: { staggerChildren: 0.05 } }
          },
          item: {
            enter: { 
              opacity: 1, 
              scale: 1, 
              width: '100%',
              transition: { type: "spring", stiffness: 300, damping: 25 } 
            },
            exit: { 
              opacity: 0, 
              scale: 0.95,
              width: '100%',
              transition: { type: "spring", stiffness: 300, damping: 25 } 
            }
          }
        }
      };
    case 2: // Current square view
      return {
        grid: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        padding: 'p-3',
        text: 'text-xs',
        description: 'line-clamp-1',
        showExtra: false,
        variants: {
          container: {
            enter: { opacity: 1, transition: { staggerChildren: 0.05 } },
            exit: { opacity: 0, transition: { staggerChildren: 0.02 } }
          },
          item: {
            enter: { 
              opacity: 1, 
              scale: 1,
              transition: { type: "spring", stiffness: 400, damping: 30 } 
            },
            exit: { 
              opacity: 0, 
              scale: 0.9,
              transition: { type: "spring", stiffness: 400, damping: 30 } 
            }
          }
        }
      };
    case 3: // Heat map view
      return {
        grid: 'grid grid-cols-8 md:grid-cols-10 lg:grid-cols-12 auto-rows-[24px] [grid-auto-columns:24px]',
        padding: 'p-0',
        text: 'text-[10px]',
        description: 'hidden',
        showExtra: false,
        variants: {
          container: {
            enter: { opacity: 1, transition: { staggerChildren: 0.01 } },
            exit: { opacity: 0, transition: { staggerChildren: 0.01 } }
          },
          item: {
            enter: { 
              opacity: 1, 
              scale: 1,
              transition: { type: "spring", stiffness: 500, damping: 35 } 
            },
            exit: { 
              opacity: 0, 
              scale: 0.85,
              transition: { type: "spring", stiffness: 500, damping: 35 } 
            }
          }
        }
      };
  }
};

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
      },
      {
        type: 'ticket',
        title: 'Memory Leak Investigation',
        description: 'Production servers showing increased memory usage',
        time: '25 hours ago',
        status: 'urgent',
        source: 'Monitoring',
        contact: 'DevOps Team',
        company: 'Internal',
        priority: 'high',
        category: 'Infrastructure',
        assignee: 'Performance Team'
      },
      {
        type: 'ticket',
        title: 'User Session Sync Issues',
        description: 'Multiple sessions not syncing properly',
        time: '26 hours ago',
        status: 'in_progress',
        source: 'Support Portal',
        contact: 'Auth Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Authentication',
        assignee: 'Session Management'
      },
      {
        type: 'ticket',
        title: 'Database Backup Failure',
        description: 'Nightly backup job failed to complete',
        time: '27 hours ago',
        status: 'resolved',
        source: 'Automated Alert',
        contact: 'DBA Team',
        company: 'Internal',
        priority: 'high',
        category: 'Database',
        assignee: 'Backup Team'
      },
      {
        type: 'ticket',
        title: 'API Rate Limit Increase',
        description: 'Customer requesting higher API limits',
        time: '28 hours ago',
        status: 'open',
        source: 'Email',
        contact: 'Enterprise Support',
        company: 'BigCorp Inc',
        priority: 'low',
        category: 'API',
        assignee: null
      },
      {
        type: 'ticket',
        title: 'Mobile App Crash Reports',
        description: 'Spike in crash reports after latest release',
        time: '29 hours ago',
        status: 'urgent',
        source: 'Crash Reporter',
        contact: 'Mobile Team',
        company: 'Internal',
        priority: 'high',
        category: 'Mobile',
        assignee: 'Mobile Support'
      },
      {
        type: 'ticket',
        title: 'Payment Gateway Integration',
        description: 'New payment provider setup needed',
        time: '30 hours ago',
        status: 'in_progress',
        source: 'Project Management',
        contact: 'Finance Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Integration',
        assignee: 'Payment Systems'
      },
      {
        type: 'ticket',
        title: 'Customer Data Export',
        description: 'GDPR data export request',
        time: '31 hours ago',
        status: 'open',
        source: 'Legal',
        contact: 'Privacy Team',
        company: 'Internal',
        priority: 'high',
        category: 'Compliance',
        assignee: 'Data Protection'
      },
      {
        type: 'ticket',
        title: 'Search Index Optimization',
        description: 'Search results showing high latency',
        time: '32 hours ago',
        status: 'in_progress',
        source: 'Performance Monitor',
        contact: 'Search Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Performance',
        assignee: 'Search Ops'
      },
      {
        type: 'ticket',
        title: 'SSL Certificate Renewal',
        description: 'Multiple domains need certificate updates',
        time: '33 hours ago',
        status: 'resolved',
        source: 'Security Scanner',
        contact: 'Security Team',
        company: 'Internal',
        priority: 'high',
        category: 'Security',
        assignee: 'Security Ops'
      },
      {
        type: 'ticket',
        title: 'Load Balancer Configuration',
        description: 'New region traffic routing setup',
        time: '34 hours ago',
        status: 'open',
        source: 'Infrastructure',
        contact: 'Network Team',
        company: 'Internal',
        priority: 'medium',
        category: 'Infrastructure',
        assignee: 'Network Ops'
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
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(2);

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
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-[#2C5282]">Ticket Feed</h2>
                <p className="text-sm text-[#4A5568]">
                  {mockStats.activities.recent.filter(activity => activity.type === 'ticket').length} tickets
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white/50 rounded-lg p-1">
                  <button
                    onClick={() => setZoomLevel(1)}
                    className={`p-2 rounded-lg transition-colors ${zoomLevel === 1 ? 'bg-white' : 'hover:bg-white/50'}`}
                    title="Detail View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setZoomLevel(2)}
                    className={`p-2 rounded-lg transition-colors ${zoomLevel === 2 ? 'bg-white' : 'hover:bg-white/50'}`}
                    title="Grid View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setZoomLevel(3)}
                    className={`p-2 rounded-lg transition-colors ${zoomLevel === 3 ? 'bg-white' : 'hover:bg-white/50'}`}
                    title="Heat Map View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4V4z M8 4v16 M12 4v16 M16 4v16 M4 8h16 M4 12h16 M4 16h16" />
                    </svg>
                  </button>
                </div>
                <Link href="/tickets" className="text-[#4A90E2] hover:text-[#2C5282] transition-colors">
                  View All →
                </Link>
              </div>
            </div>
            <div className="max-h-[600px] overflow-visible">
              <motion.div 
                key={`container-zoom-${zoomLevel}`}
                layout={false}
                initial="exit"
                animate="enter"
                exit="exit"
                variants={getZoomStyles(zoomLevel).variants.container}
                className={`grid ${getZoomStyles(zoomLevel).grid} ${zoomLevel === 1 ? 'gap-3' : zoomLevel === 2 ? 'gap-2' : 'gap-0'} 
                  ${zoomLevel === 3 ? 'w-fit mx-auto bg-gray-50/50 p-2 rounded-lg relative' : ''}`}
              >
                {mockStats.activities.recent
                  .filter(activity => activity.type === 'ticket')
                  .map((ticket, index) => (
                    <motion.div
                      key={`ticket-${index}-zoom-${zoomLevel}`}
                      layout={false}
                      variants={getZoomStyles(zoomLevel).variants.item}
                      initial="exit"
                      animate="enter"
                      exit="exit"
                      className={`${getZoomStyles(zoomLevel).padding} rounded-md cursor-pointer relative
                        ${getTicketColor(ticket.priority, ticket.status)}
                        ${expandedTickets[`ticket-${index}`] && zoomLevel !== 3 ? (zoomLevel === 1 ? 'col-span-full' : 'col-span-2 row-span-2') : ''}
                        ${zoomLevel === 1 ? 'w-full' : ''}
                        ${zoomLevel === 3 ? 'w-6 h-6 group hover:z-10 shrink-0' : ''}
                        min-h-[${zoomLevel === 1 ? '120px' : zoomLevel === 2 ? '80px' : '24px'}]
                        flex flex-col`}
                      onClick={() => zoomLevel !== 3 && toggleTicketExpansion(`ticket-${index}`)}
                    >
                      {zoomLevel === 3 ? (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <StatusIndicator status={ticket.status} />
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-white rounded-lg shadow-lg text-xs transition-opacity duration-200 pointer-events-none">
                            <h4 className="font-medium text-[#2C5282] mb-1 truncate">{ticket.title}</h4>
                            <p className="text-[#4A5568] text-[10px] mb-1 truncate">{ticket.description}</p>
                            <div className="flex justify-between text-[10px] text-[#4A5568]">
                              <span>{ticket.time}</span>
                              <span className="capitalize">{ticket.status}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <motion.div 
                          key={`content-${index}-zoom-${zoomLevel}`}
                          className="flex flex-col h-full"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <h3 className={`font-medium text-[#2C5282] ${getZoomStyles(zoomLevel).text} leading-tight truncate mb-1`}>
                            {ticket.title}
                          </h3>
                          {(zoomLevel === 1 || (!expandedTickets[`ticket-${index}`] && zoomLevel === 2)) && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                              className="flex items-center justify-between mt-auto space-x-2"
                            >
                              <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate flex-shrink-0`}>{ticket.time}</span>
                              {zoomLevel === 1 && (
                                <>
                                  <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate`}>{ticket.status}</span>
                                  <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate`}>{ticket.category}</span>
                                </>
                              )}
                              {zoomLevel === 2 && (
                                <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate`}>{ticket.category}</span>
                              )}
                            </motion.div>
                          )}
                          {zoomLevel === 1 && (
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className={`text-[#4A5568] mt-1 ${getZoomStyles(zoomLevel).description} text-xs`}
                            >
                              {ticket.description}
                            </motion.p>
                          )}
                          {expandedTickets[`ticket-${index}`] && zoomLevel !== 3 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className="mt-2 space-y-2"
                            >
                              <p className="text-xs text-[#4A5568] line-clamp-2">{ticket.description}</p>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="overflow-hidden">
                                  <p className="font-medium text-[#4A5568]">Contact</p>
                                  <p className="truncate">{ticket.contact}</p>
                                </div>
                                <div className="overflow-hidden">
                                  <p className="font-medium text-[#4A5568]">Company</p>
                                  <p className="truncate">{ticket.company}</p>
                                </div>
                                <div className="overflow-hidden">
                                  <p className="font-medium text-[#4A5568]">Status</p>
                                  <p className="truncate">{ticket.status}</p>
                                </div>
                                <div className="overflow-hidden">
                                  <p className="font-medium text-[#4A5568]">Assignee</p>
                                  <p className="truncate">{ticket.assignee || 'Unassigned'}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
              </motion.div>
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