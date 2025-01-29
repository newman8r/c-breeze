'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerPortal from './CustomerPortal';
import { createClient } from '@/utils/supabase';

interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
}

interface CustomerPortalContainerProps {
  company: string;
}

export default function CustomerPortalContainer({ company }: CustomerPortalContainerProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOrganization = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-organization`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            slug: company,
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.push('/404');
            return;
          }
          throw new Error('Failed to load organization');
        }

        const { organization } = await response.json();
        setOrganization(organization);
      } catch (err) {
        setError('Failed to load organization details');
        console.error('Error loading organization:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganization();
  }, [company, router]);

  const handleSubmitTicket = async (email: string, password: string, description: string) => {
    if (!organization) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient()
      
      // 1. Sign up without setting session
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            organization_id: organization.id
          }
        }
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('No user data returned')

      // 2. Sign in to get session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError
      if (!signInData.session) throw new Error('No session returned from sign in')

      // 3. Call ticket analysis agent
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ticket-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signInData.session.access_token}`,
        },
        body: JSON.stringify({
          customerInquiry: description,
          customerEmail: email,
          customerName: email.split('@')[0], // Use email prefix as name for now
          organizationId: organization.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create ticket');
      }

      // 4. Redirect to dashboard with pending state
      router.push(`/c/dashboard?company=${organization.slug}&pendingTicket=true`);
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.message || 'Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>; // TODO: Add proper loading state
  }

  if (!organization) {
    return null; // We'll be redirected by the useEffect
  }

  return (
    <CustomerPortal 
      company={organization.name}
      onSubmit={handleSubmitTicket}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
} 