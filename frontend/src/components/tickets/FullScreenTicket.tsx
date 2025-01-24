'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar?: string
}

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  category?: string
  customer?: {
    name: string
    email: string
    company?: string
    phone?: string
  }
  assigned_employee?: {
    id: string
    first_name: string
    last_name: string
  } | null
  team?: string
  due_date?: string
  status_changes?: Array<{
    new_status: string
    timestamp: string
  }>
  activities?: Array<{
    user: string
    action: string
    timestamp: string
  }>
  attachments?: Array<{
    name: string
    size: string
  }>
}

interface TicketMessage {
  id: string
  content: string
  created_at: string
  is_private: boolean
  sender_id: string
  sender_type: 'employee' | 'customer' | 'system' | 'ai'
  metadata: {
    attachments?: Array<{ name: string, size: number }>
  }
  responding_to_id?: string
}

interface FullScreenTicketProps {
  ticket: Ticket
  onClose: () => void
}

// Mock data for organization users (to be replaced with real data later)
const mockOrgUsers = [
  { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', avatar: '👨‍💼' },
  { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', avatar: '👩‍💼' },
  { id: '3', first_name: 'Mike', last_name: 'Johnson', email: 'mike@example.com', avatar: '👨‍💻' },
  { id: '4', first_name: 'Sarah', last_name: 'Wilson', email: 'sarah@example.com', avatar: '👩‍💻' },
  { id: '5', first_name: 'Alex', last_name: 'Brown', email: 'alex@example.com', avatar: '🧑‍💼' },
]

// Mock data for keywords suggestions (to be replaced with real data later)
const mockKeywordSuggestions = [
  'bug', 'feature', 'enhancement', 'documentation', 'ui/ux',
  'backend', 'frontend', 'database', 'security', 'performance',
  'mobile', 'desktop', 'testing', 'deployment', 'api'
];

async function modifyTicket(updates: {
  ticket_id: string
  status?: string
  priority?: string
  assigned_employee_id?: string | null
}) {
  try {
    console.log('Sending request with updates:', updates)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Auth session:', session)

    if (!session?.access_token) {
      throw new Error('No access token available')
    }

    const response = await fetch('http://localhost:54321/functions/v1/modify-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(updates)
    })

    const data = await response.json()
    console.log('Response data:', data)

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Failed to modify ticket')
    }

    return data
  } catch (error) {
    console.error('Error modifying ticket:', error)
    throw error
  }
}

export const FullScreenTicket = ({ ticket, onClose }: FullScreenTicketProps) => {
  const [activeTab, setActiveTab] = useState('details');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [orgUsers, setOrgUsers] = useState<Employee[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [messageContent, setMessageContent] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string, size: number }>>([]);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setIsStatusOpen(false);
        setIsPriorityOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch organization users
  useEffect(() => {
    const fetchOrgUsers = async () => {
      try {
        setIsLoadingUsers(true)
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('No access token available')
        }

        const response = await fetch('http://localhost:54321/functions/v1/list_org_users', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch users')
        }

        // Transform the data to include a default avatar
        const usersWithAvatars = data.users.map((user: Employee) => ({
          ...user,
          avatar: '👤' // Using a single avatar for all users as requested
        }))

        setOrgUsers(usersWithAvatars)
      } catch (error) {
        console.error('Error fetching org users:', error)
        setAssignmentError('Failed to load users')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchOrgUsers()
  }, [])

  const handleStatusChange = async (newStatus: string) => {
    try {
      await modifyTicket({
        ticket_id: ticket.id,
        status: newStatus
      })
      // Optimistically update the UI
      ticket.status = newStatus
      setIsStatusOpen(false)
    } catch (error) {
      console.error('Failed to update status:', error)
      // You might want to show an error message to the user here
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await modifyTicket({
        ticket_id: ticket.id,
        priority: newPriority
      })
      // Optimistically update the UI
      ticket.priority = newPriority
      setIsPriorityOpen(false)
    } catch (error) {
      console.error('Failed to update priority:', error)
      // You might want to show an error message to the user here
    }
  }

  const handleAssignUser = async (userId: string | null) => {
    try {
      setAssignmentError(null)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('http://localhost:54321/functions/v1/modify-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ticket_id: ticket.id,
          assigned_to: userId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign user')
      }

      // Update the local ticket state with the new assignment
      ticket.assigned_employee = userId ? orgUsers.find(user => user.id === userId) || null : null
      setShowAssignModal(false)
    } catch (error) {
      console.error('Error assigning user:', error)
      setAssignmentError('Failed to assign user')
    }
  }

  const statusOptions = [
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' }
  ];

  const priorityOptions = [
    { id: 'urgent', label: 'Urgent' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' }
  ];

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

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return { bg: 'bg-[#FF4242]/20', text: 'text-[#FF4242]', dot: 'bg-[#FF4242]' };
      case 'high':
        return { bg: 'bg-[#FF7676]/20', text: 'text-[#FF7676]', dot: 'bg-[#FF7676]' };
      case 'medium':
        return { bg: 'bg-[#FFB347]/20', text: 'text-[#FFB347]', dot: 'bg-[#FFB347]' };
      case 'low':
        return { bg: 'bg-[#4A90E2]/20', text: 'text-[#4A90E2]', dot: 'bg-[#4A90E2]' };
      default:
        return { bg: 'bg-[#FFB347]/20', text: 'text-[#FFB347]', dot: 'bg-[#FFB347]' };
    }
  };

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        size: file.size
      }));
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoadingMessages(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`http://localhost:54321/functions/v1/list_ticket_messages?ticket_id=${ticket.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages')
      }

      setMessages(data.messages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [ticket.id])

  // Fetch messages
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Set up realtime subscription
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel(`ticket-messages-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        async () => {
          // Refresh messages
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) return

          const response = await fetch(`http://localhost:54321/functions/v1/list_ticket_messages?ticket_id=${ticket.id}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            setMessages(data.messages)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket.id])

  const handleSendMessage = async () => {
    try {
      setMessageError(null)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('http://localhost:54321/functions/v1/create_ticket_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ticket_id: ticket.id,
          content: messageContent,
          is_private: isPrivateNote,
          metadata: {
            attachments: attachments.map(file => ({
              name: file.name,
              size: file.size
            }))
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Clear the form
      setMessageContent('')
      setAttachments([])
      setIsPrivateNote(false)
      setMessageError(null)

      // Fetch updated messages
      await fetchMessages()

    } catch (error: any) {
      console.error('Error sending message:', error)
      setMessageError(error.message || 'Failed to send message')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-50/95 to-white/95 backdrop-blur-sm overflow-y-auto">
      {/* Bauhaus-inspired decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Content */}
      <div className="relative z-[105] max-w-6xl mx-auto">
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
            <div className="flex items-center gap-3 mt-4">
              {/* Priority Dropdown */}
              <div className="relative" data-dropdown>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPriorityOpen(!isPriorityOpen);
                    setIsStatusOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${getPriorityColor(ticket.priority).bg} ${getPriorityColor(ticket.priority).text}
                    hover:shadow-sm hover:scale-[1.02]`}
                >
                  <span className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority).dot}`} />
                  {ticket.priority}
                  <svg
                    className={`w-4 h-4 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isPriorityOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[200]">
                    <div className="p-2">
                      {priorityOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePriorityChange(option.id);
                          }}
                          className={`w-full p-2 rounded-lg transition-colors flex items-center justify-between
                            ${ticket.priority === option.id 
                              ? `${getPriorityColor(option.id).bg} ${getPriorityColor(option.id).text} font-medium` 
                              : 'hover:bg-blue-50/50 text-[#4A5568]'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getPriorityColor(option.id).dot}`} />
                            <span>{option.label}</span>
                          </div>
                          {ticket.priority === option.id && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Dropdown */}
              <div className="relative" data-dropdown>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStatusOpen(!isStatusOpen);
                    setIsPriorityOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${getStatusColor(ticket.status).bg} ${getStatusColor(ticket.status).text}
                    hover:shadow-sm hover:scale-[1.02]`}
                >
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status).dot}`} />
                  {ticket.status}
                  <svg
                    className={`w-4 h-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isStatusOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[200]">
                    <div className="p-2">
                      {statusOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(option.id);
                          }}
                          className={`w-full p-2 rounded-lg transition-colors flex items-center justify-between
                            ${ticket.status === option.id 
                              ? `${getStatusColor(option.id).bg} ${getStatusColor(option.id).text} font-medium` 
                              : 'hover:bg-blue-50/50 text-[#4A5568]'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(option.id).dot}`} />
                            <span>{option.label}</span>
                          </div>
                          {ticket.status === option.id && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {ticket.category}
              </span>
            </div>
          </div>

          {/* Close Button */}
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
                      {ticket.status_changes?.map((change, index) => (
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
                  {/* Message Editor */}
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-[#2C5282]">Add Response</h3>
                      <div className="flex items-center gap-2">
                        <button 
                          className="text-sm text-gray-600 hover:text-[#2C5282] transition-colors flex items-center gap-1"
                          onClick={() => setIsPrivateNote(!isPrivateNote)}
                        >
                          {isPrivateNote ? '🔒' : '👥'} {isPrivateNote ? 'Private Note' : 'Public Response'}
                        </button>
                      </div>
                    </div>

                    {/* Editor Toolbar */}
                    <div className="flex items-center gap-2 p-2 bg-white/30 rounded-lg border border-gray-100">
                      <button className="p-2 hover:bg-white/50 rounded transition-colors" title="Bold">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 000-8H6v8zm0 0h8a4 4 0 010 8H6v-8z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-white/50 rounded transition-colors" title="Italic">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4h-8M8 16h8" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-white/50 rounded transition-colors" title="Underline">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-10 4h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <div className="w-px h-6 bg-gray-200 mx-2" />
                      <button className="p-2 hover:bg-white/50 rounded transition-colors" title="Bullet List">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-white/50 rounded transition-colors" title="Numbered List">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h12M9 12h12M9 17h12M5 7v.01M5 12v.01M5 17v.01" />
                        </svg>
                      </button>
                    </div>

                    {/* Editor Area */}
                    <div className="relative">
                      {messageError && (
                        <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-lg text-sm">
                          {messageError}
                        </div>
                      )}
                      <textarea
                        placeholder={isPrivateNote ? "Add a private note (only visible to team members)..." : "Type your response..."}
                        className="w-full min-h-[150px] p-4 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40 resize-y"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                      />
                      
                      {/* Attachment Area */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/70 rounded-full text-sm text-gray-700"
                          >
                            <span>📎</span>
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button 
                              onClick={() => removeAttachment(index)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => document.getElementById('file-input')?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white/80 rounded-lg text-gray-600 text-sm transition-colors"
                        >
                          📎 Attach Files
                        </button>
                        <input
                          id="file-input"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileAttachment}
                        />
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white/80 rounded-lg text-gray-600 text-sm transition-colors">
                          🎨 Template
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white/80 rounded-lg text-gray-600 text-sm transition-colors">
                          🤖 AI Assist
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setMessageContent('')
                            setAttachments([])
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSendMessage}
                          disabled={!messageContent.trim() && attachments.length === 0}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                            messageContent.trim() || attachments.length > 0
                              ? 'bg-[#4A90E2] hover:bg-[#2C5282] text-white'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isPrivateNote ? 'Add Note' : 'Send Response'} {isPrivateNote ? '🔒' : '↗️'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Message Thread */}
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Message History</h3>
                    <div className="space-y-6">
                      {/* Loading State */}
                      {isLoadingMessages && (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A90E2]"></div>
                        </div>
                      )}

                      {/* Message List */}
                      {!isLoadingMessages && messages.map((message) => {
                        // Find the sender in orgUsers if it's an employee
                        const sender = message.sender_type === 'employee' 
                          ? orgUsers.find(user => user.id === message.sender_id)
                          : null;

                        return (
                          <div key={message.id} className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                {message.sender_type === 'employee' && sender
                                  ? `${sender.first_name[0]}${sender.last_name[0]}`
                                  : message.sender_type === 'system' 
                                    ? '🤖'
                                    : '👤'}
                              </div>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <div>
                                  <span className="font-medium text-[#2C5282]">
                                    {message.sender_type === 'employee' && sender
                                      ? `${sender.first_name} ${sender.last_name}`
                                      : message.sender_type === 'system'
                                        ? 'System'
                                        : 'Customer'}
                                  </span>
                                  {message.is_private && (
                                    <span className="text-sm text-amber-600 ml-2">Private Note 🔒</span>
                                  )}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {new Date(message.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-white/70 rounded-lg p-4">
                                <div className="text-gray-700 whitespace-pre-wrap">
                                  {message.content}
                                </div>
                                {message.metadata?.attachments && message.metadata.attachments.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-sm text-gray-500 mb-2">Attachments:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {message.metadata.attachments.map((file, index) => (
                                        <div 
                                          key={index}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-sm text-gray-700"
                                        >
                                          <span>📎</span>
                                          <span className="truncate max-w-[150px]">{file.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <button className="text-gray-500 hover:text-[#2C5282] transition-colors">
                                  Reply
                                </button>
                                <span className="text-gray-300">•</span>
                                <button className="text-gray-500 hover:text-[#2C5282] transition-colors">
                                  Copy Link
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Initial Ticket Message */}
                      <div className="flex gap-4 relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4A90E2] to-[#2C5282] rounded-full" />
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[#4A90E2]/10 border-2 border-[#4A90E2] flex items-center justify-center">
                            {ticket.customer?.name?.[0] || '👤'}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#2C5282]">{ticket.customer?.name}</span>
                              <span className="text-sm text-gray-500">reported via web</span>
                              <span className="px-2 py-0.5 bg-[#4A90E2]/10 text-[#2C5282] rounded-full text-xs font-medium">
                                Original Ticket 🎫
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(ticket.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-gradient-to-br from-white/80 to-[#4A90E2]/5 rounded-lg p-4 space-y-3 border border-[#4A90E2]/10">
                            <h4 className="font-medium text-[#2C5282]">{ticket.title}</h4>
                            <div className="text-gray-700 whitespace-pre-wrap">
                              {ticket.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <button className="text-gray-500 hover:text-[#2C5282] transition-colors">
                              Reply
                            </button>
                            <span className="text-gray-300">•</span>
                            <button className="text-gray-500 hover:text-[#2C5282] transition-colors">
                              Copy Link
                            </button>
                          </div>
                        </div>
                      </div>
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
                      {ticket.attachments?.map((attachment, index) => (
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

            {/* Keywords Section */}
            <div className="bg-white/50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-[#2C5282] mb-4">Keywords</h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-3 py-1 bg-[#4A90E2]/10 text-[#2C5282] rounded-full text-sm"
                    >
                      <span>{keyword}</span>
                      <button
                        onClick={() => setKeywords(keywords.filter((_, i) => i !== index))}
                        className="text-[#2C5282]/60 hover:text-[#2C5282] ml-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Add keyword..."
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                    value={keywordInput}
                    onChange={(e) => {
                      setKeywordInput(e.target.value);
                      setShowKeywordSuggestions(true);
                    }}
                    onFocus={() => setShowKeywordSuggestions(true)}
                  />
                  {showKeywordSuggestions && keywordInput && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto z-[100]">
                      {mockKeywordSuggestions
                        .filter(suggestion => 
                          suggestion.toLowerCase().includes(keywordInput.toLowerCase()) &&
                          !keywords.includes(suggestion)
                        )
                        .map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              if (!keywords.includes(suggestion)) {
                                setKeywords([...keywords, suggestion]);
                              }
                              setKeywordInput('');
                              setShowKeywordSuggestions(false);
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
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
                <div className="relative">
                  <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                  <div 
                    onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-2 p-2 bg-white/50 rounded-lg cursor-pointer hover:bg-white/80 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                      {ticket.assigned_employee ? 
                        `${(ticket.assigned_employee.first_name || '')[0] || ''}${(ticket.assigned_employee.last_name || '')[0] || ''}` || '👤' : 
                        '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2C5282] truncate">
                        {ticket.assigned_employee ? 
                          (() => {
                            const assignedUser = orgUsers.find(user => user.id === ticket.assigned_employee?.id);
                            return assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : 'Unassigned';
                          })() : 
                          'Unassigned'}
                      </p>
                      <p className="text-xs text-gray-500">Click to assign</p>
                    </div>
                    <span className="text-gray-400 group-hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
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

            {/* Assignment Modal */}
            {showAssignModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" onClick={() => setShowAssignModal(false)}>
                <div className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-[#2C5282]">Assign Ticket</h3>
                      <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {assignmentError && (
                      <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-lg text-sm">
                        {assignmentError}
                      </div>
                    )}
                    <div className="relative mb-4">
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                      <svg className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A90E2]"></div>
                        </div>
                      ) : (
                        <>
                          {/* Unassign option */}
                          <div
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                            onClick={() => handleAssignUser(null)}
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                              ❌
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#2C5282] truncate">Unassign</p>
                              <p className="text-sm text-gray-500 truncate">Remove current assignment</p>
                            </div>
                          </div>
                          {/* User list */}
                          {orgUsers
                            .filter(user => 
                              `${user.first_name} ${user.last_name} ${user.email}`
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase())
                            )
                            .map(user => (
                              <div
                                key={user.id}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                onClick={() => handleAssignUser(user.id)}
                              >
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                                  {user.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[#2C5282] truncate">
                                    {user.first_name} {user.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                </div>
                                {ticket.assigned_employee?.id === user.id && (
                                  <span className="text-[#4A90E2]">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenTicket; 