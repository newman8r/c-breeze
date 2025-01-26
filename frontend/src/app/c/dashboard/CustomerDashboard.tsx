'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getFunctionUrl } from '@/lib/supabase';
import styles from './CustomerDashboard.module.css';
import TicketRating from '@/components/tickets/TicketRating'

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
  
  // Create a single Supabase client instance using the browser client
  const supabase = getSupabaseBrowserClient();

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

        // Set up realtime subscription for ticket messages
        const channel = supabase
          .channel('customer-tickets')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'tickets'
            },
            async () => {
              console.log('New ticket received');
              // Refresh tickets to get the latest data
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
                    ? { ...ticket, ...payload.new }  // Preserve all fields from the update
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

        // Cleanup subscription on unmount
        return () => {
          supabase.removeChannel(channel);
        };
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  useEffect(() => {
    const fetchCustomerTickets = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session available');
          return;
        }

        console.log('Fetching customer tickets...');
        const response = await fetch(getFunctionUrl('get-customer-tickets'), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tickets: ${response.status}`);
        }

        const data = await response.json();
        console.log('Customer tickets response:', data);
        
      } catch (error) {
        console.error('Error fetching customer tickets:', error);
      }
    };

    fetchCustomerTickets();
  }, []); // Run once on mount

  const handleSendMessage = async (ticketId: string) => {
    try {
      if (!newMessage[ticketId]?.trim()) {
        setError('Message cannot be empty');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Sending message for ticket:', ticketId);
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

      // Refresh tickets to show new message
      console.log('Refreshing tickets...');
      const ticketsResponse = await fetch(getFunctionUrl('get-customer-tickets'), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!ticketsResponse.ok) {
        const errorData = await ticketsResponse.json();
        console.error('Error refreshing tickets:', errorData);
        throw new Error('Failed to refresh tickets');
      }

      const ticketsData = await ticketsResponse.json();
      console.log('Tickets refreshed:', ticketsData);
      setTickets(ticketsData.tickets);
      setNewMessage({ ...newMessage, [ticketId]: '' });
      setError(null); // Clear any existing errors
      
    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
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