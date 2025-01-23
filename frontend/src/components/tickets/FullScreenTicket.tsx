'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

export const FullScreenTicket = ({ ticket, onClose }: FullScreenTicketProps) => {
  const [activeTab, setActiveTab] = useState('details');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleStatusChange = (newStatus: string) => {
    console.log('Changing status to:', newStatus);
    setIsStatusOpen(false);
  };

  const handlePriorityChange = (newPriority: string) => {
    console.log('Changing priority to:', newPriority);
    setIsPriorityOpen(false);
  };

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
                  {/* Activity Feed */}
                  <div className="bg-white/50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Activity Feed</h3>
                    <div className="space-y-4">
                      {ticket.activities?.map((activity, index) => (
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
                        `${ticket.assigned_employee.first_name[0]}${ticket.assigned_employee.last_name[0]}` : 
                        '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2C5282] truncate">
                        {ticket.assigned_employee ? 
                          `${ticket.assigned_employee.first_name} ${ticket.assigned_employee.last_name}` : 
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
                      {mockOrgUsers
                        .filter(user => 
                          `${user.first_name} ${user.last_name} ${user.email}`
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map(user => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                            onClick={() => {
                              // Assignment logic will go here
                              setShowAssignModal(false)
                            }}
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