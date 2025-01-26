'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRole } from '@/contexts/RoleContext'
import { signOut } from '@/utils/supabase'
import { Activity, mockTickets } from '@/mocks/ticketData'
import { getRecentOrganizationTickets, createClient } from '@/utils/supabase'
import FullScreenTicket from '@/components/tickets/FullScreenTicket'
import styles from './dashboard.module.css'
import TicketFeed from '@/components/tickets/TicketFeed'
import { Ticket, SelectedTicket, CreateTicketForm } from '@/types/ticket'
import { FullScreenKnowledgeBase } from '@/components/knowledge/FullScreenKnowledgeBase'

// Types for our data
interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
  organization_id: string
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

interface SatisfactionStats {
  last24Hours: number | null
  lastWeek: number | null
  resolvedLastWeek: number
  messagesLastWeek: number
}

// Add new interface for expanded state tracking
interface ExpandedStates {
  [key: string]: boolean;
}

// Update the ZoomLevel type definition
type ZoomLevel = 1 | 2 | 3;

const isExpandedView = (zoom: ZoomLevel) => zoom === 1 || zoom === 2;

const getZoomStyles = (zoom: ZoomLevel) => {
  switch (zoom) {
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

// Update the mockStats object to use the imported data
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
    recent: mockTickets
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

// Update color mapping for ticket backgrounds
const getTicketColor = (priority: string | undefined, status: string, isHeatmap: boolean = false) => {
  // For heatmap view (level 3), use pastel colors
  if (isHeatmap) {
    switch (priority) {
      case 'urgent':
        return 'bg-[#FFE4E4]'; // Pastel red for urgent
      case 'high':
        return 'bg-[#FFD4D4]'; // Light pastel red for high
      case 'medium':
        return 'bg-[#FFE8CC]'; // Pastel orange for medium
      case 'low':
        return 'bg-[#E3F0FF]'; // Pastel blue for low
      default:
        return 'bg-[#FFE8CC]'; // Default to medium priority color
    }
  }

  // For non-heatmap views, keep existing behavior
  if (status === 'resolved') return 'bg-[#50C878]/20 hover:bg-[#50C878]/30';
  
  switch (priority) {
    case 'urgent':
      return 'bg-[#FF4242]/20 hover:bg-[#FF4242]/30';
    case 'high':
      return 'bg-[#FF7676]/20 hover:bg-[#FF7676]/30';
    case 'medium':
      return 'bg-[#FFB347]/20 hover:bg-[#FFB347]/30';
    case 'low':
      return 'bg-[#4A90E2]/20 hover:bg-[#4A90E2]/30';
    default:
      return 'bg-[#FFB347]/20 hover:bg-[#FFB347]/30';
  }
};

// Update status indicator component
const StatusIndicator = ({ status, isHeatmap = false }: { status: string, isHeatmap?: boolean }) => {
  const statusColors = {
    open: isHeatmap ? '#FF4242' : '#FFB347', // Red for open in heatmap, orange otherwise
    in_progress: '#4A90E2',
    resolved: '#50C878',
    closed: '#718096'
  };

  // Treat 'urgent' status as 'open'
  const normalizedStatus = status === 'urgent' ? 'open' : status;

  return (
    <div className="relative">
      <div
        className={`w-3 h-3 rounded-full ${isHeatmap ? 'bg-white' : ''}`}
        style={{ 
          backgroundColor: statusColors[normalizedStatus as keyof typeof statusColors] || statusColors.open,
          opacity: isHeatmap ? 0.9 : 1
        }}
      />
    </div>
  );
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
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
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [isCopilotMinimized, setIsCopilotMinimized] = useState(false)
  const { role, isRootAdmin, organizationId } = useRole()
  const [expandedTickets, setExpandedTickets] = useState<ExpandedStates>({});
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(2);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false)
  const [createTicketForm, setCreateTicketForm] = useState<CreateTicketForm>({
    title: '',
    description: '',
    priority: 'medium',
    is_internal: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SelectedTicket>({ id: '', isOpen: false });
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [satisfactionStats, setSatisfactionStats] = useState<SatisfactionStats>({
    last24Hours: null,
    lastWeek: null,
    resolvedLastWeek: 0,
    messagesLastWeek: 0
  });

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
        const supabase = createClient()
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

  // Add ticket fetching
  const loadTickets = async () => {
    if (!user || !organizationId) {
      setTicketsLoading(false)
      return
    }

    try {
      const tickets = await getRecentOrganizationTickets(organizationId)
      setTickets(tickets || [])
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setTicketsLoading(false)
    }
  }

  // Add function to load satisfaction stats as useCallback to avoid recreating it
  const loadSatisfactionStats = useCallback(async () => {
    if (!organizationId) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-satisfaction-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ organization_id: organizationId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch satisfaction stats');
      }

      const stats = await response.json();
      setSatisfactionStats(stats);
    } catch (error) {
      console.error('Error loading satisfaction stats:', error);
    }
  }, [organizationId]);

  // Add effect to load satisfaction stats and refresh every 5 minutes
  useEffect(() => {
    loadSatisfactionStats();
    const interval = setInterval(loadSatisfactionStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadSatisfactionStats]);

  useEffect(() => {
    loadTickets()

    // Set up realtime subscription
    const supabase = createClient()
    const channel = supabase.channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          // Refresh tickets and stats when a new ticket is added
          loadTickets()
          loadSatisfactionStats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          // Update ticket with all fields from the payload while preserving existing fields
          setTickets(currentTickets => 
            currentTickets.map(ticket => 
              ticket.id === payload.new.id 
                ? { 
                    ...ticket,
                    ...payload.new,
                    // Ensure these nested objects are preserved
                    customer: ticket.customer,
                    assigned_employee: ticket.assigned_employee,
                    ticket_tags: ticket.ticket_tags,
                    status_changes: ticket.status_changes,
                    activities: ticket.activities,
                    attachments: ticket.attachments
                  }
                : ticket
            )
          )
          // Refresh stats when a ticket is updated
          loadSatisfactionStats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages'
        },
        () => {
          // Refresh tickets when a new message is added
          loadTickets()
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, organizationId, loadSatisfactionStats])

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  // Add createTicket function
  const createTicket = async () => {
    try {
      setIsSubmitting(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(createTicketForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create ticket')
      }

      // Reset form and close modal
      setCreateTicketForm({
        title: '',
        description: '',
        priority: 'medium',
        is_internal: false
      })
      setIsCreateTicketOpen(false)

      // Refresh tickets list
      await loadTickets()

    } catch (error) {
      console.error('Error creating ticket:', error)
      // Could add an error toast here
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state
  if (userLoading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.contentWrapper}>
          <div className={styles.oceanCard}>
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
    <div className={styles.dashboardContainer}>
      <div className={styles.contentWrapper}>
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${styles.oceanCard} ${styles.welcomeCard}`}
          >
            <h1 className={styles.welcomeText}>
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
              <p className="text-3xl font-bold text-[#2C5282]">
                {tickets.filter(t => t.status === 'open').length}
              </p>
              <p className="text-sm text-[#FF7676]">
                {tickets.filter(t => t.priority === 'urgent' && t.status === 'open').length} urgent
              </p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#4A90E2" type="triangle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Total Messages</h3>
              <p className="text-3xl font-bold text-[#2C5282]">
                {satisfactionStats.messagesLastWeek}
              </p>
              <p className="text-sm text-[#4A90E2]">Last 7 days</p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#50C878" type="rectangle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Resolved This Week</h3>
              <p className="text-3xl font-bold text-[#2C5282]">
                {satisfactionStats.resolvedLastWeek || 0}
              </p>
              <p className="text-sm text-[#50C878]">
                {satisfactionStats.resolvedLastWeek > 0 ? 'Last 7 days' : 'No tickets resolved'}
              </p>
            </div>
          </div>
          
          <div className="ocean-card relative overflow-hidden">
            <BauhausShape color="#FFB347" type="circle" />
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-[#4A5568]">Satisfaction</h3>
              <p className="text-3xl font-bold text-[#2C5282]">
                {satisfactionStats.last24Hours ?? '-'}%
              </p>
              <p className="text-sm text-[#FFB347]">
                {satisfactionStats.lastWeek !== null ? `${satisfactionStats.lastWeek}% this week` : 'No ratings this week'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Add Create Ticket Card after Quick Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ocean-card relative overflow-hidden"
        >
          <BauhausShape color="#4A90E2" type="circle" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#2C5282]">Create New Ticket</h2>
              <button
                onClick={() => setIsCreateTicketOpen(true)}
                className={`${styles.waveButton} px-4 py-2`}
              >
                Create Ticket
              </button>
            </div>
            <p className="text-sm text-[#4A5568]">
              Create internal tickets or customer support tickets directly from the dashboard.
            </p>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Feed */}
          <div className="lg:col-span-2">
            <TicketFeed
              tickets={tickets}
              ticketsLoading={ticketsLoading}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              expandedTickets={expandedTickets}
              toggleTicketExpansion={toggleTicketExpansion}
              setSelectedTicket={setSelectedTicket}
            />
          </div>

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

          {/* Knowledge Base Card */}
          <motion.div
            className="ocean-card col-span-2"
            variants={cardVariants}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#2C5282] mb-2">Knowledge Base</h3>
                <p className="text-[#4A5568]">AI-powered documentation and resources</p>
              </div>
              <button 
                onClick={() => setShowKnowledgeBase(true)}
                className={`${styles.waveButton} px-4 py-2`}
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#4A5568] font-medium">Total Documents</span>
                  <span className="text-2xl">📄</span>
                </div>
                <p className="text-2xl font-bold text-[#2C5282]">24</p>
                <p className="text-sm text-[#4A5568]">Across 5 categories</p>
              </div>
              <div className="bg-white/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#4A5568] font-medium">AI Usage</span>
                  <span className="text-2xl">🤖</span>
                </div>
                <p className="text-2xl font-bold text-[#2C5282]">89%</p>
                <p className="text-sm text-[#4A5568]">Response accuracy</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📘</span>
                  <div>
                    <p className="font-medium text-[#2C5282]">Getting Started Guide</p>
                    <p className="text-sm text-[#4A5568]">Used in 156 AI responses</p>
                  </div>
                </div>
                <div className="text-sm text-[#4A5568]">Updated 2d ago</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📗</span>
                  <div>
                    <p className="font-medium text-[#2C5282]">API Documentation</p>
                    <p className="text-sm text-[#4A5568]">Used in 89 AI responses</p>
                  </div>
                </div>
                <div className="text-sm text-[#4A5568]">Updated 5d ago</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📙</span>
                  <div>
                    <p className="font-medium text-[#2C5282]">Troubleshooting Guide</p>
                    <p className="text-sm text-[#4A5568]">Used in 234 AI responses</p>
                  </div>
                </div>
                <div className="text-sm text-[#4A5568]">Updated 1w ago</div>
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
                <button className={`${styles.waveButton} px-4 py-2`}>
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Add Create Ticket Modal */}
        {isCreateTicketOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ocean-card w-full max-w-2xl mx-4"
            >
              <h2 className="text-xl font-bold text-[#2C5282] mb-6">Create New Ticket</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={createTicketForm.title}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                    placeholder="Enter ticket title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1">
                    Description
                  </label>
                  <textarea
                    value={createTicketForm.description}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 min-h-[100px]"
                    placeholder="Enter ticket description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-1">
                      Priority
                    </label>
                    <select
                      value={createTicketForm.priority}
                      onChange={(e) => setCreateTicketForm(prev => ({ 
                        ...prev, 
                        priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                      }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={createTicketForm.category || ''}
                      onChange={(e) => setCreateTicketForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      placeholder="Enter category"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={createTicketForm.due_date || ''}
                      onChange={(e) => setCreateTicketForm(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center text-sm font-medium text-[#4A5568] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createTicketForm.is_internal}
                        onChange={(e) => setCreateTicketForm(prev => ({ 
                          ...prev, 
                          is_internal: e.target.checked,
                          customer_id: e.target.checked ? undefined : prev.customer_id
                        }))}
                        className="mr-2 rounded border-[#4A90E2]/20 text-[#4A90E2] focus:ring-[#4A90E2]/40"
                      />
                      Internal Ticket
                    </label>
                  </div>
                </div>

                {!createTicketForm.is_internal && (
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-1">
                      Customer ID
                    </label>
                    <input
                      type="text"
                      value={createTicketForm.customer_id || ''}
                      onChange={(e) => setCreateTicketForm(prev => ({ ...prev, customer_id: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                      placeholder="Enter customer ID"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setIsCreateTicketOpen(false)}
                  className="px-4 py-2 text-[#4A5568] hover:text-[#2C5282] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTicket}
                  disabled={isSubmitting}
                  className={`${styles.waveButton} px-4 py-2 disabled:opacity-50`}
                >
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Screen Ticket */}
        {selectedTicket.isOpen && (() => {
          const foundTicket = tickets.find(t => t.id === selectedTicket.id);
          return foundTicket ? (
            <FullScreenTicket
              ticket={foundTicket}
              onClose={() => setSelectedTicket({ id: '', isOpen: false })}
            />
          ) : null;
        })()}

        {/* Knowledge Base Modal */}
        <AnimatePresence>
          {showKnowledgeBase && (
            <FullScreenKnowledgeBase onClose={() => setShowKnowledgeBase(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 