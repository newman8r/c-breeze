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
}

export default function CustomerPortal({ company }: CustomerPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketQuery, setTicketQuery] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div className={styles.container}>
      {/* Bauhaus-inspired decorative elements */}
      <div className={styles.decorativeCircle} />
      <div className={styles.decorativeSquare} />
      <div className={styles.decorativeTriangle} />
      
      <header className={styles.header}>
        <h1>Welcome to {company} Support</h1>
        <button className={styles.loginButton}>
          Sign In with Email 📧
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.ticketSection}>
          <h2>How can we help you today? 🌊</h2>
          <textarea
            className={styles.ticketTextarea}
            placeholder="Type your question here... We'll help you right away! ✨"
            value={ticketQuery}
            onChange={(e) => setTicketQuery(e.target.value)}
          />
          <input
            type="email"
            className={styles.emailInput}
            placeholder="Enter your email to receive updates ✉️"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className={styles.submitButton}>
            Get Help Now 🌟
          </button>
        </section>

        <section className={styles.knowledgeBaseSection}>
          <h2>Find Quick Answers 🔍</h2>
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search our knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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