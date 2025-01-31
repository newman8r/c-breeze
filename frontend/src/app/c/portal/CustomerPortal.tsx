'use client';

import { useState } from 'react';
import styles from './CustomerPortal.module.css';
import { fetchCustomerTickets } from '@/lib/supabase';

const demoKnowledgeBase = [
  { id: 1, title: 'Getting Started Guide', category: 'Basics' },
  { id: 2, title: 'Frequently Asked Questions', category: 'General' },
  { id: 3, title: 'Account Management', category: 'Account' },
  { id: 4, title: 'Troubleshooting Common Issues', category: 'Support' },
];

interface CustomerPortalProps {
  company: string;
  onSubmit: (email: string, password: string, description: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

// Add loading overlay component
const LoadingOverlay = () => (
  <div className={styles.loadingOverlay}>
    <div className={styles.loadingContent}>
      <div className={styles.waveAnimation}>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
      </div>
      <h2>Creating Your Support Ticket</h2>
      <p>Our AI assistant is analyzing your inquiry</p>
      <div className={styles.estimateTime}>Expected wait time: &lt; 1 minute</div>
    </div>
  </div>
);

export default function CustomerPortal({ 
  company, 
  onSubmit,
  isSubmitting,
  error 
}: CustomerPortalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, description);
  };

  const fetchTickets = async () => {
    try {
      const tickets = await fetchCustomerTickets();
      // Handle the response
    } catch (error) {
      console.error('Error fetching customer tickets:', error);
      // Handle the error
    }
  };

  return (
    <div className={styles.container}>
      {/* Show loading overlay when submitting */}
      {isSubmitting && <LoadingOverlay />}
      
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            <input
              type="password"
              className={styles.emailInput}
              placeholder="Choose a password for your account 🔒"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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