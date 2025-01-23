'use client';

import { useState } from 'react';
import styles from './CustomerDashboard.module.css';

// Demo data based on our database schema
const demoTickets = [
  {
    id: '1',
    title: 'Need help with login',
    status: 'open',
    priority: 'medium',
    created_at: '2024-01-27T10:00:00Z',
    messages: [
      {
        id: '1',
        content: 'Hi, I\'m having trouble logging into my account. Can you help?',
        sender_type: 'customer',
        created_at: '2024-01-27T10:00:00Z',
      },
      {
        id: '2',
        content: 'Of course! Can you tell me what happens when you try to log in?',
        sender_type: 'employee',
        created_at: '2024-01-27T10:05:00Z',
      },
    ],
  },
  {
    id: '2',
    title: 'Feature request',
    status: 'open',
    priority: 'low',
    created_at: '2024-01-26T15:30:00Z',
    messages: [
      {
        id: '3',
        content: 'Would it be possible to add dark mode to the application?',
        sender_type: 'customer',
        created_at: '2024-01-26T15:30:00Z',
      },
    ],
  },
  {
    id: '3',
    title: 'Billing question resolved',
    status: 'resolved',
    priority: 'high',
    created_at: '2024-01-25T09:00:00Z',
    messages: [
      {
        id: '4',
        content: 'I was charged twice for my subscription this month.',
        sender_type: 'customer',
        created_at: '2024-01-25T09:00:00Z',
      },
      {
        id: '5',
        content: 'I apologize for the inconvenience. I can see the duplicate charge and have initiated a refund.',
        sender_type: 'employee',
        created_at: '2024-01-25T09:15:00Z',
      },
      {
        id: '6',
        content: 'Thank you! I see the refund pending now.',
        sender_type: 'customer',
        created_at: '2024-01-25T10:00:00Z',
      },
    ],
  },
  {
    id: '4',
    title: 'Account deletion request',
    status: 'closed',
    priority: 'medium',
    created_at: '2024-01-24T14:20:00Z',
    messages: [
      {
        id: '7',
        content: 'Please delete my account and all associated data.',
        sender_type: 'customer',
        created_at: '2024-01-24T14:20:00Z',
      },
      {
        id: '8',
        content: 'Your account has been successfully deleted. All data has been removed as per our privacy policy.',
        sender_type: 'employee',
        created_at: '2024-01-24T14:45:00Z',
      },
    ],
  },
];

interface CustomerDashboardProps {
  company: string;
}

export default function CustomerDashboard({ company }: CustomerDashboardProps) {
  const [newMessage, setNewMessage] = useState<Record<string, string>>({});
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>(
    // Initially expand only open tickets
    demoTickets.reduce((acc, ticket) => ({
      ...acc,
      [ticket.id]: ticket.status === 'open'
    }), {})
  );

  const handleSendMessage = (ticketId: string) => {
    // TODO: Implement sending message
    setNewMessage({ ...newMessage, [ticketId]: '' });
  };

  const handleCreateTicket = () => {
    // TODO: Implement ticket creation
    setShowNewTicketForm(false);
    setNewTicketTitle('');
    setNewTicketMessage('');
  };

  const handleCloseTicket = (ticketId: string) => {
    // TODO: Implement ticket closing
  };

  const toggleTicket = (ticketId: string) => {
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  const handleFileUpload = (ticketId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement file upload
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('Files selected:', files);
    }
  };

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
          {demoTickets.map((ticket) => (
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
                    {ticket.messages.map((message) => (
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