'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface KnowledgeBaseEntry {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  updated_at: string
  ai_usage_count: number
  views: number
  author: {
    name: string
    avatar?: string
  }
}

interface FullScreenKnowledgeBaseProps {
  onClose: () => void
}

export const FullScreenKnowledgeBase = ({ onClose }: FullScreenKnowledgeBaseProps) => {
  const [activeTab, setActiveTab] = useState('documents')
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data - replace with real data later
  const mockEntries: KnowledgeBaseEntry[] = [
    {
      id: '1',
      title: 'Getting Started Guide',
      content: 'This is a comprehensive guide to getting started...',
      category: 'Guides',
      created_at: '2024-01-20T12:00:00Z',
      updated_at: '2024-01-22T15:30:00Z',
      ai_usage_count: 156,
      views: 1200,
      author: {
        name: 'John Doe',
        avatar: '👨‍💼'
      }
    },
    {
      id: '2',
      title: 'API Documentation',
      content: 'Complete API reference and integration guides...',
      category: 'Technical',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-20T14:20:00Z',
      ai_usage_count: 89,
      views: 3400,
      author: {
        name: 'Jane Smith',
        avatar: '👩‍💼'
      }
    },
    {
      id: '3',
      title: 'Troubleshooting Guide',
      content: 'Common issues and their solutions...',
      category: 'Support',
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-17T11:45:00Z',
      ai_usage_count: 234,
      views: 2800,
      author: {
        name: 'Mike Johnson',
        avatar: '👨‍💻'
      }
    }
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-50/95 to-white/95 backdrop-blur-sm overflow-y-auto">
      {/* Bauhaus-inspired decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Content */}
      <div className="relative z-[105] max-w-6xl mx-auto p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#2C5282]">Knowledge Base</h2>
            <p className="text-[#4A5568] mt-2">Centralized documentation and AI-powered resources</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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
          <div className="bg-white/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#4A5568] font-medium">Total Views</span>
              <span className="text-2xl">👁️</span>
            </div>
            <p className="text-2xl font-bold text-[#2C5282]">7.4k</p>
            <p className="text-sm text-[#4A5568]">Last 30 days</p>
          </div>
          <div className="bg-white/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#4A5568] font-medium">Contributors</span>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-2xl font-bold text-[#2C5282]">8</p>
            <p className="text-sm text-[#4A5568]">Active members</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Documents and Categories */}
          <div className="col-span-2 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search knowledge base..."
                className="w-full px-4 py-2 pl-10 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative
                  ${activeTab === 'documents' ? 'text-[#2C5282]' : 'text-gray-500 hover:text-[#2C5282]'}`}
              >
                Documents
                {activeTab === 'documents' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C5282]"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative
                  ${activeTab === 'categories' ? 'text-[#2C5282]' : 'text-gray-500 hover:text-[#2C5282]'}`}
              >
                Categories
                {activeTab === 'categories' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C5282]"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative
                  ${activeTab === 'analytics' ? 'text-[#2C5282]' : 'text-gray-500 hover:text-[#2C5282]'}`}
              >
                Analytics
                {activeTab === 'analytics' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C5282]"
                  />
                )}
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'documents' && (
                <motion.div
                  key="documents"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {mockEntries.map((entry) => (
                    <div key={entry.id} className="bg-white/50 rounded-lg p-4 hover:bg-white/70 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-[#2C5282]">{entry.title}</h3>
                          <p className="text-sm text-[#4A5568] mt-1">{entry.content.substring(0, 100)}...</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{entry.category === 'Guides' ? '📘' : entry.category === 'Technical' ? '📗' : '📙'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-sm text-[#4A5568]">
                        <div className="flex items-center gap-2">
                          <span>{entry.author.avatar}</span>
                          <span>{entry.author.name}</span>
                        </div>
                        <span>•</span>
                        <span>Updated {new Date(entry.updated_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{entry.views} views</span>
                        <span>•</span>
                        <span>Used in {entry.ai_usage_count} AI responses</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'categories' && (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📘</span>
                      <div>
                        <h3 className="font-medium text-[#2C5282]">Guides</h3>
                        <p className="text-sm text-[#4A5568]">8 documents</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-[#4A5568]">Most viewed: Getting Started Guide</div>
                      <div className="text-sm text-[#4A5568]">Most used by AI: Installation Guide</div>
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📗</span>
                      <div>
                        <h3 className="font-medium text-[#2C5282]">Technical</h3>
                        <p className="text-sm text-[#4A5568]">12 documents</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-[#4A5568]">Most viewed: API Documentation</div>
                      <div className="text-sm text-[#4A5568]">Most used by AI: Error Codes</div>
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📙</span>
                      <div>
                        <h3 className="font-medium text-[#2C5282]">Support</h3>
                        <p className="text-sm text-[#4A5568]">6 documents</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-[#4A5568]">Most viewed: Troubleshooting Guide</div>
                      <div className="text-sm text-[#4A5568]">Most used by AI: Common Issues</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-white/50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">AI Usage Analytics</h3>
                    <div className="h-48 bg-[#4A90E2]/5 rounded-lg flex items-center justify-center">
                      [AI Usage Chart Placeholder]
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-[#2C5282] mb-4">Document Performance</h3>
                    <div className="h-48 bg-[#4A90E2]/5 rounded-lg flex items-center justify-center">
                      [Performance Metrics Chart Placeholder]
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Actions and Quick Stats */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="bg-white/50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-[#2C5282] mb-4">Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 p-2 bg-[#4A90E2] text-white rounded-lg hover:bg-[#2C5282] transition-colors">
                  <span>📝</span>
                  <span>New Doc</span>
                </button>
                <button className="flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <span>📤</span>
                  <span>Import</span>
                </button>
                <button className="flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <span>🔄</span>
                  <span>Sync</span>
                </button>
                <button className="flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <span>📊</span>
                  <span>Report</span>
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-[#2C5282] mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#4A5568]">Most Viewed Today</p>
                  <p className="font-medium text-[#2C5282]">Getting Started Guide</p>
                  <p className="text-xs text-[#4A5568]">156 views</p>
                </div>
                <div>
                  <p className="text-sm text-[#4A5568]">Most Used by AI</p>
                  <p className="font-medium text-[#2C5282]">API Documentation</p>
                  <p className="text-xs text-[#4A5568]">89 responses</p>
                </div>
                <div>
                  <p className="text-sm text-[#4A5568]">Recently Updated</p>
                  <p className="font-medium text-[#2C5282]">Troubleshooting Guide</p>
                  <p className="text-xs text-[#4A5568]">2 hours ago</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-[#2C5282] mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4A90E2]/10 flex items-center justify-center">
                    👩‍💼
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C5282]">Jane updated API docs</p>
                    <p className="text-xs text-[#4A5568]">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4A90E2]/10 flex items-center justify-center">
                    👨‍💻
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C5282]">Mike added new guide</p>
                    <p className="text-xs text-[#4A5568]">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4A90E2]/10 flex items-center justify-center">
                    🤖
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C5282]">AI training completed</p>
                    <p className="text-xs text-[#4A5568]">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FullScreenKnowledgeBase 