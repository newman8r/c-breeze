'use client';

import './globals.css'
import { UserProvider } from '@/contexts/UserContext'
import { RoleProvider } from '@/contexts/RoleContext'
import { SessionProvider } from '@/components/SessionProvider'
import { useEffect } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    document.title = 'Ocean Breeze Demo';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'A peaceful, ocean-themed demo app');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'A peaceful, ocean-themed demo app';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="A peaceful, ocean-themed demo app" />
      </head>
      <body>
        <SessionProvider>
          <UserProvider>
            <RoleProvider>
              {children}
            </RoleProvider>
          </UserProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
