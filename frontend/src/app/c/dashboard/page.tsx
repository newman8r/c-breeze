'use client';

import { useEffect, useState } from 'react';
import CustomerDashboard from './CustomerDashboard';

export default function CustomerDashboardPage() {
  const [company, setCompany] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const companyParam = params.get('company');
    setCompany(companyParam);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!company) {
    return <div>Company parameter is required</div>;
  }

  return <CustomerDashboard company={company} />;
} 