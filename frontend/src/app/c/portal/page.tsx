'use client';

import { useSearchParams } from 'next/navigation';
import CustomerPortalContainer from './CustomerPortalContainer';

export default function CustomerPortalPage() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company');

  if (!company) {
    return <div>Company parameter is required</div>;
  }

  return <CustomerPortalContainer company={company} />;
} 