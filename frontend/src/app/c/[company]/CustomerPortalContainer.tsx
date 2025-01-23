'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerPortal from './CustomerPortal';

interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
}

interface CustomerPortalContainerProps {
  params: {
    company: string;
  };
}

export default function CustomerPortalContainer({ params }: CustomerPortalContainerProps) {
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
            slug: params.company,
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
  }, [params.company, router]);

  const handleSubmitTicket = async (email: string, description: string) => {
    if (!organization) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Call our edge function to create customer and ticket
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-customer-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          description,
          organization_id: organization.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create ticket');
      }

      const result = await response.json();

      // Redirect to the dashboard
      router.push(`/c/${params.company}/dashboard`);
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