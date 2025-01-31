'use client';

import { useEffect, useState } from 'react';
import CustomerDashboard from './CustomerDashboard';
import type { DashboardURLParams } from './types';

export default function CustomerDashboardPage() {
  const [company, setCompany] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const companyParam = params.get('company');
      
      // Clean up any invalid pendingTicket parameter
      const pendingTicket = params.get('pendingTicket');
      if (pendingTicket && pendingTicket !== 'true' && pendingTicket !== 'false') {
        params.delete('pendingTicket');
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
      
      setCompany(companyParam);
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!company) {
    return <div>Company parameter is required</div>;
  }

  return <CustomerDashboard company={company} />;
} 