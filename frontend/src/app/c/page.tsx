'use client';

import { useSearchParams, redirect } from 'next/navigation';

export default function CompanyRedirect() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company');

  if (company) {
    redirect(`/c/portal?company=${company}`);
  }

  return <div>Company parameter is required</div>;
}
