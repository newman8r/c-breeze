'use client';

import InvitationForm from './InvitationForm';
import { useEffect } from 'react';

export default function InvitationPage() {
  useEffect(() => {
    // Set the title and description client-side
    document.title = 'Join Organization - Invitation';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Accept your invitation and join the organization');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Accept your invitation and join the organization';
      document.head.appendChild(meta);
    }
  }, []);

  return <InvitationForm />;
} 