'use client';

import { useSearchParams } from 'next/navigation';
import CustomerDashboard from './CustomerDashboard';

export default function CustomerDashboardPage() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company');

  if (!company) {
    return <div>Company parameter is required</div>;
  }

  return <CustomerDashboard company={company} />;
} 