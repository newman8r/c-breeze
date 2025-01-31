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
  organization_id: string;
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
            Authorization: `Bearer ${session.access_token}`
          }
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
              console.log('New ticket created - payload:', payload);
              
              // Hide the processing card
              setHasPendingTicket(false);
              
              // Refresh tickets list
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const refreshResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
                  headers: {
                    Authorization: `Bearer ${session.access_token}`
                  }
                });
                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  setTickets(refreshData.tickets);
                  
                  // Automatically expand the new ticket
                  setExpandedTickets(prev => ({
                    ...prev,
                    [payload.new.id]: true
                  }));
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
              console.log('Ticket updated:', payload);
              // Refresh tickets to get the latest data
              const refreshResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
                headers: {
                  Authorization: `Bearer ${session.access_token}`
                }
              });
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setTickets(refreshData.tickets);
              }
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
              
              // Also hide the processing card here as a fallback
              setHasPendingTicket(false);
              
              // Refresh tickets to get the latest data
              const refreshResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
                headers: {
                  Authorization: `Bearer ${session.access_token}`
                }
              });
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setTickets(refreshData.tickets);
                // Only clear typing indicator if it's an AI message
                if (payload.new.sender_type === 'ai') {
                  setTypingIndicators(prev => ({
                    ...prev,
                    [payload.new.ticket_id]: false
                  }));
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ticket_analysis'
            },
            (payload: TicketAnalysisPayload) => {
              console.log('Analysis update received:', payload);
              // Show typing indicator for AI response
              if (payload.new.status === 'processing') {
                setTypingIndicators(prev => ({
                  ...prev,
                  [payload.new.ticket_id]: true
                }));
              }
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
          });

        // Cleanup function
        return () => {
          console.log('Cleaning up subscription');
          channel.unsubscribe();
        };
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [supabase]);

  const handleSubmitMessage = async (ticketId: string) => {
    try {
      const message = newMessage[ticketId];
      if (!message?.trim()) return;

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Find the ticket to get its organization_id
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Create the message
      const { data: messageData, error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          content: message,
          sender_type: 'customer',
          organization_id: ticket.organization_id
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Clear the input
      setNewMessage(prev => ({
        ...prev,
        [ticketId]: ''
      }));

      // Show typing indicator
      setTypingIndicators(prev => ({
        ...prev,
        [ticketId]: true
      }));

      // Trigger conversation analysis
      const analysisResponse = await supabase.functions.invoke('conversation-analysis-coordinator', {
        body: {
          ticketId,
          organizationId: ticket.organization_id,
          newMessageId: messageData.id
        }
      });

      if (analysisResponse.error) {
        console.error('Analysis error:', analysisResponse.error);
        // Clear typing indicator if there's an error
        setTypingIndicators(prev => ({
          ...prev,
          [ticketId]: false
        }));
      }

      // Refresh tickets to get the latest data
      const ticketsResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!ticketsResponse.ok) {
        throw new Error('Failed to refresh tickets');
      }

      const ticketsData = await ticketsResponse.json();
      setTickets(ticketsData.tickets);
    } catch (err) {
      console.error('Error submitting message:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Show pending state
      setHasPendingTicket(true);
      setShowNewTicketForm(false);

      // Get organization ID from an existing ticket or fetch it from the user's profile
      let organizationId;
      if (tickets.length > 0) {
        organizationId = tickets[0].organization_id;
      } else {
        const { data: customer } = await supabase
          .from('customers')
          .select('organization_id')
          .eq('email', session.user.email)
          .single();
        
        if (!customer) {
          throw new Error('Could not determine organization');
        }
        organizationId = customer.organization_id;
      }

      // Call ticket-analysis function
      const analysisResponse = await supabase.functions.invoke('ticket-analysis', {
        body: {
          customerInquiry: newTicketMessage,
          customerEmail: session.user.email,
          customerName: session.user.email?.split('@')[0], // Use email prefix as name
          organizationId
        }
      });

      if (analysisResponse.error) {
        throw new Error(analysisResponse.error.message || 'Failed to create ticket');
      }

      // Clear form
      setNewTicketMessage('');
      
      // Refresh tickets to get the new ticket
      const ticketsResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!ticketsResponse.ok) {
        throw new Error('Failed to refresh tickets');
      }

      const ticketsData = await ticketsResponse.json();
      setTickets(ticketsData.tickets);

    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Reset all states on error
      setHasPendingTicket(false);
      setShowNewTicketForm(false);
      setNewTicketMessage('');
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
          Authorization: `Bearer ${session.access_token}`
        }
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
          <div className={styles.ticketCard}>
            <div className={styles.processingCard}>
              <div className={styles.robotAnimation}>
                <div className={styles.robotHead}></div>
                <div className={styles.robotBody}>
                  <div className={styles.processingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
              <h3>Processing Your Request</h3>
              <p>Our AI assistant is analyzing your inquiry. You'll see a new ticket appear here in less than a minute.</p>
            </div>
          </div>
        )}

        {showNewTicketForm && (
          <div className={styles.newTicketForm}>
            <h2>Create New Support Ticket 🎫</h2>
            <p className={styles.formDescription}>
              Describe your question or issue below. Our AI assistant will respond in less than a minute.
            </p>
            <textarea
              placeholder="How can we help you today?"
              value={newTicketMessage}
              onChange={(e) => setNewTicketMessage(e.target.value)}
              className={styles.messageInput}
              rows={4}
            />
            <div className={styles.formControls}>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setShowNewTicketForm(false);
                  setNewTicketMessage('');
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.submitButton}
                onClick={handleCreateTicket}
                disabled={!newTicketMessage.trim()}
              >
                Submit Inquiry 🚀
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
                            onClick={() => handleSubmitMessage(ticket.id)}
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