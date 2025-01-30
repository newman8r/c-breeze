'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getFunctionUrl } from '@/lib/supabase';
import styles from './CustomerDashboard.module.css';
import TicketRating from '@/components/tickets/TicketRating'
import { RealtimeChannel } from '@supabase/supabase-js';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  satisfaction_rating: number | null;
  ticket_messages: Array<{
    id: string;
    content: string;
    sender_type: string;
    created_at: string;
  }>;
}

interface TicketAnalysisPayload {
  new: {
    id: string;
    ticket_id: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    response_generation_results?: {
      response: string;
      [key: string]: any;
    };
    created_at: string;
    updated_at: string;
  };
}

interface AnalysisPayload {
  new: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    ticket_id: string;
  };
}

interface AnalysisRecord {
  status: 'pending' | 'processing' | 'completed' | 'error';
  ticket_id: string;
}

interface CustomerDashboardProps {
  company: string;
}

export default function CustomerDashboard({ company }: CustomerDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<Record<string, string>>({});
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasPendingTicket, setHasPendingTicket] = useState(false);
  const [typingIndicators, setTypingIndicators] = useState<Record<string, boolean>>({});
  
  // Create a single Supabase client instance using the browser client
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Check URL for pending ticket parameter
    const urlParams = new URLSearchParams(window.location.search);
    const pendingTicket = urlParams.get('pendingTicket') === 'true';
    setHasPendingTicket(pendingTicket);

    // Remove the parameter from URL
    if (pendingTicket) {
      urlParams.delete('pendingTicket');
      window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    }
  }, []);

  useEffect(() => {
    async function fetchTickets() {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        
        setUserEmail(session.user.email || null);

        // Call our edge function to get tickets
        const response = await fetch(getFunctionUrl('get-customer-tickets'), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }

        const data = await response.json();
        setTickets(data.tickets);
        
        // Initially expand all open tickets
        const initialExpandedState = data.tickets.reduce((acc: Record<string, boolean>, ticket: Ticket) => ({
          ...acc,
          [ticket.id]: ticket.status === 'open'
        }), {});
        setExpandedTickets(initialExpandedState);

        // Set up realtime subscription for tickets and messages
        const channel = supabase
          .channel('customer-tickets')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'tickets'
            },
            async (payload) => {
              console.log('New ticket received:', payload);
              // Refresh tickets to get the latest data
              const refreshResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setTickets(refreshData.tickets);
                // Clear pending state if we have the new ticket
                if (hasPendingTicket) {
                  setHasPendingTicket(false);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tickets'
            },
            async (payload) => {
              console.log('Ticket update received:', payload);
              // Update ticket in the UI without a full refresh
              setTickets(currentTickets => 
                currentTickets.map(ticket => 
                  ticket.id === payload.new.id 
                    ? { ...ticket, ...payload.new }
                    : ticket
                )
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ticket_messages'
            },
            async (payload) => {
              console.log('New message received:', payload);
              // Refresh tickets to get the latest messages
              const refreshResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setTickets(refreshData.tickets);
              }
            }
          )
          .subscribe();

        setLoading(false);

        // Cleanup subscription on unmount
        return () => {
          void supabase.removeChannel(channel);
        };

      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  const handleSendMessage = async (ticketId: string) => {
    try {
      if (!newMessage[ticketId]?.trim()) {
        setError('Message cannot be empty');
        return;
      }

      // Show typing indicator immediately when sending message
      setTypingIndicators(prev => ({ ...prev, [ticketId]: true }));

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getFunctionUrl('create_ticket_message'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          content: newMessage[ticketId],
          is_private: false,
          origin: 'ticket'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log('Message sent successfully:', data);

      // Clear message input
      setNewMessage({ ...newMessage, [ticketId]: '' });
      setError(null);

      // Trigger conversation analysis
      const analysisResponse = await supabase.functions.invoke('conversation-analysis-coordinator', {
        body: {
          ticketId,
          organizationId: data.message.organization_id,
          newMessageId: data.message.id
        }
      });

      if (analysisResponse.error) {
        console.error('Analysis error:', analysisResponse.error);
      }

      // Refresh tickets to get the latest messages
      const refreshResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setTickets(refreshData.tickets);
      }

      // Clear typing indicator after a delay to simulate response time
      setTimeout(() => {
        setTypingIndicators(prev => ({ ...prev, [ticketId]: false }));
      }, 2000);

    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Clear typing indicator in case of error
      setTypingIndicators(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleCreateTicket = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getFunctionUrl('create-customer-ticket'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: newTicketTitle,
          description: newTicketMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      // Refresh tickets
      const ticketsResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!ticketsResponse.ok) {
        throw new Error('Failed to refresh tickets');
      }

      const data = await ticketsResponse.json();
      setTickets(data.tickets);
    setShowNewTicketForm(false);
    setNewTicketTitle('');
    setNewTicketMessage('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getFunctionUrl('modify-ticket'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          status: 'closed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to close ticket');
      }

      // Refresh tickets
      const ticketsResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!ticketsResponse.ok) {
        throw new Error('Failed to refresh tickets');
      }

      const data = await ticketsResponse.json();
      setTickets(data.tickets);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close ticket');
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getFunctionUrl('modify-ticket'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          status: 'open',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reopen ticket');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen ticket');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Redirect to the customer portal page with the company slug
      window.location.href = `/c?company=${company}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const toggleTicket = (ticketId: string) => {
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  const handleFileUpload = async (ticketId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement file upload functionality
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('Files selected:', files);
    }
  };

  const refreshTickets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const ticketsResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-customer-tickets`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!ticketsResponse.ok) {
        throw new Error('Failed to refresh tickets')
      }

      const data = await ticketsResponse.json()
      setTickets(data.tickets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh tickets')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.decorativeWave} />
      <div className={styles.decorativeCircle} />
      <div className={styles.decorativeDots} />
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerDecorative} />
          <h1>Welcome to {company} Support 🌊</h1>
          <p className={styles.welcomeText}>How can we help you today?</p>
        </div>
        
        <div className={styles.headerControls}>
          {userEmail && <span className={styles.userEmail}>{userEmail}</span>}
          <button 
            className={styles.newTicketButton}
            onClick={() => setShowNewTicketForm(true)}
          >
            New Support Ticket ✨
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {hasPendingTicket && (
          <div className={styles.pendingTicket}>
            <div className={styles.pendingMessage}>
              <h3>🤖 AI Agent Processing Your Request</h3>
              <p>Our AI agent is analyzing your inquiry and preparing a response. This usually takes less than a minute.</p>
              <div className={styles.loadingSpinner}></div>
            </div>
          </div>
        )}

        {showNewTicketForm && (
          <div className={styles.newTicketForm}>
            <h2>Create New Ticket 🎫</h2>
            <input
              type="text"
              placeholder="What's your question about?"
              value={newTicketTitle}
              onChange={(e) => setNewTicketTitle(e.target.value)}
              className={styles.titleInput}
            />
            <textarea
              placeholder="Describe your question or issue..."
              value={newTicketMessage}
              onChange={(e) => setNewTicketMessage(e.target.value)}
              className={styles.messageInput}
            />
            <div className={styles.formControls}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowNewTicketForm(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.submitButton}
                onClick={handleCreateTicket}
              >
                Create Ticket 🚀
              </button>
            </div>
          </div>
        )}

        <div className={styles.ticketsList}>
          {tickets.map((ticket) => (
            <div key={ticket.id} className={styles.ticketCard}>
              <div 
                className={styles.ticketHeader}
                onClick={() => toggleTicket(ticket.id)}
              >
                <div className={styles.ticketHeaderMain}>
                  <span className={styles.expandIcon}>
                    {expandedTickets[ticket.id] ? '▼' : '▶'}
                  </span>
                  <h2>{ticket.title}</h2>
                  <span className={`${styles.ticketStatus} ${styles[ticket.status]}`}>
                    {ticket.status === 'open' ? '🟢 Open' : 
                     ticket.status === 'in_progress' ? '🔵 In Progress' :
                     ticket.status === 'resolved' ? '✅ Resolved' : '⚫ Closed'}
                  </span>
                </div>
                <div className={styles.ticketControls}>
                  <span className={styles.ticketDate}>
                    Created {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                  {ticket.status === 'open' && (
                    <button
                      className={styles.closeTicketButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTicket(ticket.id);
                      }}
                    >
                      Close Ticket
                    </button>
                  )}
                  {ticket.status === 'closed' && (
                    <button
                      className={`${styles.reopenTicketButton} bg-white/50 hover:bg-white/80 text-[#4A90E2] px-4 py-2 rounded-lg 
                        border border-[#4A90E2]/20 transition-all duration-200 ease-in-out flex items-center gap-2
                        hover:shadow-md hover:translate-y-[-1px]`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReopenTicket(ticket.id);
                      }}
                    >
                      <span className="text-lg">🌊</span> Reopen Ticket
                    </button>
                  )}
                </div>
              </div>

              {expandedTickets[ticket.id] && (
                <>
                  <div 
                    className={styles.messagesList}
                    ref={(el) => {
                      // Auto scroll to bottom when messages update
                      if (el) {
                        el.scrollTop = el.scrollHeight;
                      }
                    }}
                  >
                    {ticket.ticket_messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${styles.message} ${
                          message.sender_type === 'customer' ? styles.customerMessage : styles.agentMessage
                        }`}
                      >
                        <div className={styles.messageAvatar}>
                          {message.sender_type === 'customer' ? '👤' : '💼'}
                        </div>
                        <div className={styles.messageContentWrapper}>
                          <div className={styles.messageSender}>
                            {message.sender_type === 'customer' ? 'You' : 'Support Agent'}
                          </div>
                          <div className={styles.messageContent}>
                            {message.content}
                          </div>
                          <div className={styles.messageTime}>
                            {new Date(message.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {typingIndicators[ticket.id] && (
                      <div className={`${styles.message} ${styles.agentMessage}`}>
                        <div className={styles.messageAvatar}>
                          🤖
                        </div>
                        <div className={styles.messageContentWrapper}>
                          <div className={styles.messageSender}>AI Assistant</div>
                          <div className={styles.messageContent}>
                            <div className={styles.typingIndicator}>
                              <span>•</span><span>•</span><span>•</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {ticket.status === 'open' && (
                    <div className={styles.replyBox}>
                      <div className={styles.replyControls}>
                        <textarea
                          placeholder="Type your reply..."
                          value={newMessage[ticket.id] || ''}
                          onChange={(e) => setNewMessage({
                            ...newMessage,
                            [ticket.id]: e.target.value
                          })}
                          className={styles.replyInput}
                        />
                        <div className={styles.replyActions}>
                          <label className={styles.attachmentButton}>
                            📎
                            <input
                              type="file"
                              multiple
                              onChange={(e) => handleFileUpload(ticket.id, e)}
                              className={styles.fileInput}
                            />
                          </label>
                          <button
                            className={styles.sendButton}
                            onClick={() => handleSendMessage(ticket.id)}
                          >
                            Send 📤
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {ticket.status === 'closed' && (
                    <div className="mt-4 border-t pt-4">
                      <TicketRating 
                        ticketId={ticket.id} 
                        currentRating={ticket.satisfaction_rating}
                        onRatingSubmit={() => {
                          // Optionally refresh the tickets list after rating
                          refreshTickets()
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 