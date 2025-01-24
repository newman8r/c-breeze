'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import styles from './CustomerDashboard.module.css';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
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

  useEffect(() => {
    async function fetchTickets() {
      try {
        const supabase = createClient();
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        
        setUserEmail(session.user.email || null);

        // Call our edge function to get tickets
        const response = await fetch('http://127.0.0.1:54321/functions/v1/get-customer-tickets', {
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
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session available');
          return;
        }

        console.log('Fetching customer tickets...');
        const response = await fetch('http://127.0.0.1:54321/functions/v1/get-customer-tickets', {
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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://127.0.0.1:54321/functions/v1/create_ticket_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          content: newMessage[ticketId],
          is_private: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Refresh tickets to show new message
      const ticketsResponse = await fetch('http://127.0.0.1:54321/functions/v1/get-customer-tickets', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!ticketsResponse.ok) {
        throw new Error('Failed to refresh tickets');
      }

      const data = await ticketsResponse.json();
      setTickets(data.tickets);
      setNewMessage({ ...newMessage, [ticketId]: '' });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleCreateTicket = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://127.0.0.1:54321/functions/v1/create-customer-ticket', {
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
      const ticketsResponse = await fetch('http://127.0.0.1:54321/functions/v1/get-customer-tickets', {
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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://127.0.0.1:54321/functions/v1/modify-ticket', {
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
      const ticketsResponse = await fetch('http://127.0.0.1:54321/functions/v1/get-customer-tickets', {
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
      {/* Bauhaus-inspired decorative elements */}
      <div className={styles.decorativeWave} />
      <div className={styles.decorativeCircle} />
      <div className={styles.decorativeDots} />
      
      <header className={styles.header}>
        <div className={styles.headerDecorative} />
        <h1>Your Support Dashboard</h1>
        <div className={styles.headerControls}>
          <span className={styles.userEmail}>
            {userEmail ? `Logged in as: ${userEmail}` : 'Not logged in'}
          </span>
          <button 
            className={styles.newTicketButton}
            onClick={() => setShowNewTicketForm(true)}
          >
            New Ticket ✨
          </button>
          <button className={styles.logoutButton}>
            Sign Out 👋
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
                </div>
              </div>

              {expandedTickets[ticket.id] && (
                <>
                  <div className={styles.messagesList}>
                    {ticket.ticket_messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${styles.message} ${
                          message.sender_type === 'customer' ? styles.customerMessage : styles.agentMessage
                        }`}
                      >
                        <div className={styles.messageContent}>
                          {message.content}
                        </div>
                        <div className={styles.messageTime}>
                          {new Date(message.created_at).toLocaleTimeString()}
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
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 