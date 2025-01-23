'use client';

import { useState } from 'react';
import styles from './CustomerPortal.module.css';

const demoKnowledgeBase = [
  { id: 1, title: 'Getting Started Guide', category: 'Basics' },
  { id: 2, title: 'Frequently Asked Questions', category: 'General' },
  { id: 3, title: 'Account Management', category: 'Account' },
  { id: 4, title: 'Troubleshooting Common Issues', category: 'Support' },
];

interface CustomerPortalProps {
  company: string;
  onSubmit: (email: string, description: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export default function CustomerPortal({ 
  company, 
  onSubmit,
  isSubmitting,
  error 
}: CustomerPortalProps) {
  const [ticketQuery, setTicketQuery] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketQuery.trim() && email.trim()) {
      await onSubmit(email.trim(), ticketQuery.trim());
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
        <h1>Welcome to {company} Support</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.ticketSection}>
          <h2>How can we help you today? 🌊</h2>
          <form onSubmit={handleSubmit}>
            <textarea
              className={styles.ticketTextarea}
              placeholder="Type your question here... We'll help you right away! ✨"
              value={ticketQuery}
              onChange={(e) => setTicketQuery(e.target.value)}
              required
            />
            <input
              type="email"
              className={styles.emailInput}
              placeholder="Enter your email to receive updates ✉️"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Ticket...' : 'Get Help Now 🌟'}
            </button>
          </form>
        </section>

        <section className={styles.knowledgeBaseSection}>
          <h2>Find Quick Answers 🔍</h2>
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search our knowledge base..."
            />
          </div>

          <div className={styles.articlesGrid}>
            {demoKnowledgeBase.map((article) => (
              <div key={article.id} className={styles.articleCard}>
                <span className={styles.category}>{article.category}</span>
                <h3>{article.title}</h3>
                <button className={styles.readMoreButton}>
                  Read More →
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
} 