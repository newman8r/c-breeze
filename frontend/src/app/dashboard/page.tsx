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

// Add new interface for ticket creation form
interface CreateTicketForm {
  title: string
  description: string
  customer_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  due_date?: string
  is_internal: boolean
}

// Add ticket type definition
interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  customer: {
    id: string
    name: string
    email: string
  }
  assigned_employee: {
    id: string
    first_name: string
    last_name: string
  } | null
  ticket_tags: {
    tag: {
      id: string
      name: string
      color: string
    }
  }[]
}

// Add new interface for selected ticket state
interface SelectedTicket {
  id: string;
  isOpen: boolean;
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

  // Add ticket fetching effect
  useEffect(() => {
    loadTickets()
  }, [user, organizationId])

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

  // Add new component for full-screen ticket view
  const FullScreenTicket = ({ ticket, onClose }: { ticket: any; onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState('details');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [isSnoozing, setIsSnoozing] = useState(false);

    const handleStatusClick = useCallback(() => {
      setIsStatusOpen(prev => !prev);
    }, []);

    const handleStatusChange = useCallback((newStatus: string) => {
      // TODO: Implement status change logic
      console.log('Changing status to:', newStatus);
      setIsStatusOpen(false); // Close the panel after selection
    }, []);

    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'open':
          return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
        case 'in_progress':
          return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' };
        case 'resolved':
          return { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' };
        case 'closed':
          return { bg: 'bg-neutral-100', text: 'text-neutral-800', dot: 'bg-neutral-700' };
        default:
          return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400' };
      }
    };

    const statusOptions = [
      { id: 'open', label: 'Open' },
      { id: 'in_progress', label: 'In Progress' },
      { id: 'resolved', label: 'Resolved' },
      { id: 'closed', label: 'Closed' }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50/95 to-white/95 backdrop-blur-sm overflow-y-auto"
      >
        {/* Bauhaus-inspired decorative elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        {/* Header */}
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {/* Ticket ID and Title */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#4A5568] bg-white/50 px-2 py-1 rounded w-fit">
                  #{ticket.id}
                </span>
                <h2 className="text-2xl font-bold text-[#2C5282]">{ticket.title}</h2>
              </div>
              
              {/* Status Pills */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium
                  ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' : 
                    ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-blue-100 text-blue-800'}`}
                >
                  {ticket.priority}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium
                  ${ticket.status === 'urgent' ? 'bg-red-100 text-red-800' :
                    ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'}`}
                >
                  {ticket.status}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  {ticket.category}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Details and Activity */}
            <div className="col-span-2 space-y-6">
              {/* Tabs */}
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative
                    ${activeTab === 'details' ? 'text-[#2C5282]' : 'text-gray-500 hover:text-[#2C5282]'}`}
                >
                  Details
                  {activeTab === 'details' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C5282]"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative
                    ${activeTab === 'activity' ? 'text-[#2C5282]' : 'text-gray-500 hover:text-[#2C5282]'}`}
                >
                  Activity
                  {activeTab === 'activity' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C5282]"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative
                    ${activeTab === 'attachments' ? 'text-[#2C5282]' : 'text-gray-500 hover:text-[#2C5282]'}`}
                >
                  Attachments
                  {activeTab === 'attachments' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C5282]"
                    />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Description */}
                    <div className="bg-white/50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-[#2C5282] mb-4">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white/50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-[#2C5282] mb-4">Timeline</h3>
                      <div className="space-y-4">
                        {/* Sample timeline items */}
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            📝
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#2C5282]">Ticket Created</p>
                            <p className="text-sm text-gray-600">{new Date(ticket.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        {ticket.status_changes?.map((change: any, index: number) => (
                          <div key={index} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                              🔄
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#2C5282]">Status Changed to {change.new_status}</p>
                              <p className="text-sm text-gray-600">{new Date(change.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Activity Feed */}
                    <div className="bg-white/50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-[#2C5282] mb-4">Activity Feed</h3>
                      <div className="space-y-4">
                        {ticket.activities?.map((activity: any, index: number) => (
                          <div key={index} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              👤
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#2C5282]">{activity.user}</p>
                              <p className="text-sm text-gray-700">{activity.action}</p>
                              <p className="text-xs text-gray-600">{new Date(activity.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'attachments' && (
                  <motion.div
                    key="attachments"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Attachments */}
                    <div className="bg-white/50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-[#2C5282] mb-4">Attachments</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {ticket.attachments?.map((attachment: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                              📎
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#2C5282] truncate">{attachment.name}</p>
                              <p className="text-xs text-gray-600">{attachment.size}</p>
                            </div>
                            <button className="p-2 hover:bg-gray-100 rounded-full">
                              ⬇️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column - Actions and Info */}
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="bg-white/50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-[#2C5282] mb-4">Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {/* Handle reply */}}
                    className="flex items-center justify-center gap-2 p-2 bg-[#4A90E2] text-white rounded-lg hover:bg-[#2C5282] transition-colors"
                  >
                    <span>↩️</span>
                    <span>Reply</span>
                  </button>
                  <button
                    onClick={() => {/* Handle internal note */}}
                    className="flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <span>📝</span>
                    <span>Note</span>
                  </button>
                  <button
                    onClick={() => {/* Handle forward */}}
                    className="flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <span>↗️</span>
                    <span>Forward</span>
                  </button>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <span>👤</span>
                    <span>Assign</span>
                  </button>
                </div>
              </div>

              {/* Status Controls */}
              <div className="bg-white/50 rounded-lg p-6">
                <button 
                  type="button"
                  onClick={handleStatusClick}
                  className="w-full flex items-center group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent rounded-lg transition-all duration-300 ease-in-out p-2"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-[#2C5282]">Status</h3>
                    <div className="flex items-center">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium 
                        ${getStatusColor(ticket.status).bg} ${getStatusColor(ticket.status).text}
                        group-hover:shadow-sm group-hover:scale-[1.02] transition-all duration-300 ease-in-out`}
                      >
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status).dot}`}></span>
                        {ticket.status}
                      </div>
                      <motion.span
                        animate={{ rotate: isStatusOpen ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="text-[#4A5568] ml-2 opacity-75 group-hover:opacity-100"
                      >
                        ▼
                      </motion.span>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isStatusOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-4">
                        {/* Status Options */}
                        <div className="grid grid-cols-1 gap-2">
                          {statusOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleStatusChange(option.id)}
                              className={`p-3 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-between
                                ${ticket.status === option.id 
                                  ? `${getStatusColor(option.id).bg} ${getStatusColor(option.id).text} font-medium shadow-sm scale-[1.02]` 
                                  : 'bg-white/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent hover:scale-[1.02] hover:shadow-sm text-[#4A5568]'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${getStatusColor(option.id).dot} transition-all duration-300`}></span>
                                <span>{option.label}</span>
                              </div>
                              {ticket.status === option.id && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  ✓
                                </motion.span>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Additional Controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                          <button 
                            type="button"
                            className="text-sm text-[#4A90E2] hover:text-[#2C5282] transition-all duration-300 ease-in-out opacity-75 hover:opacity-100"
                          >
                            View Status History
                          </button>
                          <button 
                            type="button"
                            className="text-sm text-[#4A90E2] hover:text-[#2C5282] transition-all duration-300 ease-in-out opacity-75 hover:opacity-100"
                          >
                            Add Note
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Requester Information */}
              <div className="bg-white/50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-[#2C5282] mb-4">Requester</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      👤
                    </div>
                    <div>
                      <p className="font-medium text-[#2C5282]">{ticket.customer?.name}</p>
                      <p className="text-sm text-gray-600">{ticket.customer?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Company</p>
                      <p className="font-medium text-[#2C5282]">{ticket.customer?.company || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium text-[#2C5282]">{ticket.customer?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment Information */}
              <div className="bg-white/50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-[#2C5282] mb-4">Assignment</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Assigned To</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                        👤
                      </div>
                      <p className="font-medium text-[#2C5282]">
                        {ticket.assigned_employee ? 
                          `${ticket.assigned_employee.first_name} ${ticket.assigned_employee.last_name}` : 
                          'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Team</p>
                    <p className="font-medium text-[#2C5282]">{ticket.team || 'N/A'}</p>
                  </div>
                  {ticket.due_date && (
                    <div>
                      <p className="text-sm text-gray-600">Due Date</p>
                      <p className="font-medium text-[#2C5282]">
                        {new Date(ticket.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            {/* Add assign modal content */}
          </div>
        )}

        {showMergeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            {/* Add merge modal content */}
          </div>
        )}

        {showSplitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            {/* Add split modal content */}
          </div>
        )}

        {isSnoozing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            {/* Add snooze modal content */}
          </div>
        )}
      </motion.div>
    );
  };

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
                className="wave-button px-4 py-2"
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
                  {tickets.length} tickets
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
            <div className={`relative ${zoomLevel === 3 ? 'overflow-visible' : 'overflow-hidden'}`}>
              <div className={`${zoomLevel === 3 ? 'overflow-visible' : 'max-h-[600px] overflow-y-auto pr-2'}`}>
                {ticketsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A90E2]"></div>
                  </div>
                ) : (
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
                    {tickets.map((ticket, index) => (
                      <motion.div
                        key={`ticket-${ticket.id}-zoom-${zoomLevel}`}
                        layout={false}
                        variants={getZoomStyles(zoomLevel).variants.item}
                        initial="exit"
                        animate="enter"
                        exit="exit"
                        className={`${getZoomStyles(zoomLevel).padding} rounded-md cursor-pointer relative
                          ${zoomLevel === 3 ? getTicketColor(ticket.priority, ticket.status, true) : getTicketColor(ticket.priority, ticket.status)}
                          ${expandedTickets[ticket.id] && isExpandedView(zoomLevel) ? (zoomLevel === 1 ? 'col-span-full' : 'col-span-2 row-span-2') : ''}
                          ${zoomLevel === 1 ? 'w-full' : ''}
                          ${zoomLevel === 3 ? 'w-6 h-6 group hover:z-10 shrink-0' : ''}
                          min-h-[${zoomLevel === 1 ? '120px' : zoomLevel === 2 ? '80px' : '24px'}]
                          flex flex-col`}
                        onClick={() => {
                          setSelectedTicket({ id: ticket.id, isOpen: true });
                          isExpandedView(zoomLevel) && toggleTicketExpansion(ticket.id);
                        }}
                      >
                        {zoomLevel === 3 ? (
                          <>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <StatusIndicator status={ticket.status} isHeatmap={true} />
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-white rounded-lg shadow-lg text-xs transition-opacity duration-200 pointer-events-none">
                              <h4 className="font-medium text-[#2C5282] mb-1 truncate">{ticket.title}</h4>
                              <p className="text-[#4A5568] text-[10px] mb-1 truncate">{ticket.description}</p>
                              <div className="flex flex-col gap-1 text-[10px] text-[#4A5568]">
                                <div className="flex justify-between items-center">
                                  <span>{new Date(ticket.created_at).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1">
                                    <span>Status:</span>
                                    <span className="capitalize">{ticket.status}</span>
                                    <div className="w-2 h-2 rounded-full" style={{ 
                                      backgroundColor: ticket.status === 'urgent' ? '#FF4242' :
                                                     ticket.status === 'in_progress' ? '#4A90E2' :
                                                     ticket.status === 'resolved' ? '#50C878' :
                                                     ticket.status === 'closed' ? '#718096' : '#FFB347'
                                    }} />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>Priority:</span>
                                    <span className="capitalize">{ticket.priority}</span>
                                    <div className="w-2 h-2 rounded-full" style={{ 
                                      backgroundColor: ticket.priority === 'urgent' ? '#FFE4E4' :
                                                     ticket.priority === 'high' ? '#FFD4D4' :
                                                     ticket.priority === 'low' ? '#E3F0FF' : '#FFE8CC'
                                    }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <motion.div 
                            key={`content-${ticket.id}-zoom-${zoomLevel}`}
                            className="flex flex-col h-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <h3 className={`font-medium text-[#2C5282] ${getZoomStyles(zoomLevel).text} leading-tight truncate mb-1`}>
                              {ticket.title}
                            </h3>
                            {(zoomLevel === 1 || (!expandedTickets[ticket.id] && zoomLevel === 2)) && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center justify-between mt-auto space-x-2"
                              >
                                <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate flex-shrink-0`}>
                                  {new Date(ticket.created_at).toLocaleString()}
                                </span>
                                {zoomLevel === 1 && (
                                  <>
                                    <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate`}>{ticket.status}</span>
                                    <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate`}>
                                      {ticket.ticket_tags[0]?.tag.name || 'Uncategorized'}
                                    </span>
                                  </>
                                )}
                                {zoomLevel === 2 && (
                                  <span className={`${getZoomStyles(zoomLevel).text} text-[#4A5568] truncate`}>
                                    {ticket.ticket_tags[0]?.tag.name || 'Uncategorized'}
                                  </span>
                                )}
                              </motion.div>
                            )}
                            {expandedTickets[ticket.id] && isExpandedView(zoomLevel) && (
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
                                    <p className="truncate">{ticket.customer.name} ({ticket.customer.email})</p>
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="font-medium text-[#4A5568]">Status</p>
                                    <p className="truncate">{ticket.status}</p>
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="font-medium text-[#4A5568]">Assignee</p>
                                    <p className="truncate">{ticket.assigned_employee?.first_name} {ticket.assigned_employee?.last_name}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
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
                  className="wave-button px-4 py-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Screen Ticket */}
        {selectedTicket.isOpen && (
          <FullScreenTicket
            ticket={tickets.find(t => t.id === selectedTicket.id)}
            onClose={() => setSelectedTicket({ id: '', isOpen: false })}
          />
        )}
      </div>
    </div>
  )
} 