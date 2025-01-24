'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function CompanyRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const company = params.get('company');

    if (!company) {
      // Show error message in UI instead of returning JSX
      document.body.innerHTML = '<div>Company parameter is required</div>';
      return;
    }

    // Redirect using window.location for static export compatibility
    window.location.href = `/c/portal?company=${company}`;
  }, []);

  // Return loading state
  return <div>Redirecting...</div>;
}
