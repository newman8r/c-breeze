'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Ticket, SelectedTicket } from '@/types/ticket'
import { useEffect, useRef } from 'react'

interface TicketFeedProps {
  tickets: Ticket[]
  ticketsLoading: boolean
  zoomLevel: 1 | 2 | 3
  setZoomLevel: (level: 1 | 2 | 3) => void
  expandedTickets: { [key: string]: boolean }
  toggleTicketExpansion: (ticketId: string) => void
  setSelectedTicket: (ticket: SelectedTicket) => void
}

const getTicketColor = (priority: string, status: string, isHeatmap: boolean = false, zoomLevel?: 1 | 2 | 3) => {
  if (isHeatmap) {
    switch (priority) {
      case 'urgent':
        return 'bg-[#FFE4E4]'
      case 'high':
        return 'bg-[#FFD4D4]'
      case 'medium':
        return 'bg-[#FFE8CC]'
      case 'low':
        return 'bg-[#E3F0FF]'
      default:
        return 'bg-gray-100'
    }
  }

  // Apply priority-specific background colors
  switch (priority) {
    case 'urgent':
      return zoomLevel === 2 ? 'bg-[#FF4242]/20 hover:bg-[#FF4242]/30' : 'bg-white/70 hover:bg-white/90 border-l-4 border-[#FF4242]'
    case 'high':
      return zoomLevel === 2 ? 'bg-[#FF7676]/20 hover:bg-[#FF7676]/30' : 'bg-white/70 hover:bg-white/90 border-l-4 border-[#FF7676]'
    case 'medium':
      return zoomLevel === 2 ? 'bg-[#FFB347]/20 hover:bg-[#FFB347]/30' : 'bg-white/70 hover:bg-white/90 border-l-4 border-[#FFB347]'
    case 'low':
      return zoomLevel === 2 ? 'bg-[#4A90E2]/20 hover:bg-[#4A90E2]/30' : 'bg-white/70 hover:bg-white/90 border-l-4 border-[#4A90E2]'
    default:
      return 'bg-white/70 hover:bg-white/90'
  }
}

const isExpandedView = (zoom: 1 | 2 | 3) => zoom === 1 || zoom === 2

const getZoomStyles = (zoom: 1 | 2 | 3) => {
  switch (zoom) {
    case 1:
      return {
        grid: 'grid-cols-1',
        padding: 'p-4',
        text: 'text-sm',
        variants: {
          container: {
            enter: { transition: { staggerChildren: 0.05 } },
            exit: { transition: { staggerChildren: 0.05 } }
          },
          item: {
            enter: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 20 }
          }
        }
      }
    case 2:
      return {
        grid: 'grid-cols-4',
        padding: 'p-2',
        text: 'text-xs',
        variants: {
          container: {
            enter: { transition: { staggerChildren: 0.03 } },
            exit: { transition: { staggerChildren: 0.03 } }
          },
          item: {
            enter: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.95 }
          }
        }
      }
    case 3:
      return {
        grid: 'grid-cols-7',
        padding: 'p-0',
        text: 'text-[10px]',
        variants: {
          container: {
            enter: { transition: { staggerChildren: 0.01 } },
            exit: { transition: { staggerChildren: 0.01 } }
          },
          item: {
            enter: { opacity: 1 },
            exit: { opacity: 0 }
          }
        }
      }
  }
}

export default function TicketFeed({
  tickets,
  ticketsLoading,
  zoomLevel,
  setZoomLevel,
  expandedTickets,
  toggleTicketExpansion,
  setSelectedTicket
}: TicketFeedProps) {
  const previousTickets = useRef<string[]>([]);
  const newTicketIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentTicketIds = tickets.map(t => t.id);
    const prevTicketIds = previousTickets.current;
    
    // Find new tickets by comparing with previous tickets
    const newIds = currentTicketIds.filter(id => !prevTicketIds.includes(id));
    newIds.forEach(id => newTicketIds.current.add(id));
    
    // Clear highlight after animation
    if (newIds.length > 0) {
      setTimeout(() => {
        newTicketIds.current = new Set();
      }, 2000); // Slightly longer than animation duration
    }
    
    previousTickets.current = currentTicketIds;
  }, [tickets]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/70 backdrop-blur-sm rounded-lg border border-[#4A90E2]/20 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-center mb-6 relative z-10 p-6">
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
      <div className={`relative ${zoomLevel === 3 ? 'overflow-visible' : 'overflow-hidden'} px-6 pb-6`}>
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
              {tickets.map((ticket) => (
                <motion.div
                  key={`ticket-${ticket.id}-zoom-${zoomLevel}`}
                  layout={false}
                  initial="exit"
                  animate={newTicketIds.current.has(ticket.id) ? ["enter", "highlight"] : "enter"}
                  exit="exit"
                  whileHover={{ scale: zoomLevel === 3 ? 1.2 : 1.02 }}
                  variants={{
                    ...getZoomStyles(zoomLevel).variants.item,
                    exit: { opacity: 0, scale: 0.95 },
                    enter: { opacity: 1, scale: 1 },
                    highlight: {
                      boxShadow: [
                        "0 0 0 4px rgba(255, 140, 66, 0.4)",
                        "0 0 0 4px rgba(255, 140, 66, 0)",
                      ],
                      transition: {
                        duration: 1.5,
                        ease: "easeOut",
                        delay: 0.2
                      }
                    }
                  }}
                  className={`${getZoomStyles(zoomLevel).padding} rounded-md cursor-pointer relative
                    ${zoomLevel === 3 ? getTicketColor(ticket.priority, ticket.status, true) : getTicketColor(ticket.priority, ticket.status, false, zoomLevel)}
                    ${expandedTickets[ticket.id] && isExpandedView(zoomLevel) ? (zoomLevel === 1 ? 'col-span-full' : 'col-span-2 row-span-2') : ''}
                    ${zoomLevel === 1 ? 'w-full' : ''}
                    ${zoomLevel === 3 ? 'w-6 h-6 group hover:z-10 shrink-0' : ''}
                    min-h-[${zoomLevel === 1 ? '120px' : zoomLevel === 2 ? '80px' : '24px'}]
                    flex flex-col
                    transition-[transform,box-shadow]
                    hover:shadow-lg`}
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
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIndicator status={ticket.status} />
                        <h3 className="font-medium text-[#2C5282] text-xs leading-tight truncate flex-1">
                          {ticket.title}
                        </h3>
                      </div>
                      <p className="text-[10px] text-[#4A5568] line-clamp-2 flex-1">
                        {ticket.description}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
} 