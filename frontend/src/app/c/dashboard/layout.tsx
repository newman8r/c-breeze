'use client';

import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = 'Dashboard - Customer Portal';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Customer dashboard for managing tickets and resources');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Customer dashboard for managing tickets and resources';
      document.head.appendChild(meta);
    }
  }, []);

  return <>{children}</>;
} 