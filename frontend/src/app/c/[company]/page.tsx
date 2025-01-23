import { Metadata } from 'next';
import CustomerPortal from './CustomerPortal';

export const metadata: Metadata = {
  title: 'Customer Support Portal',
  description: 'Get help, create tickets, and find answers in our knowledge base',
};

// This is required for static exports
export async function generateStaticParams() {
  // TODO: Replace with actual company list from Supabase
  // For now, we'll include demo companies and known test companies
  return [
    { company: 'demo' },
    { company: 'acme' },
    { company: 'test' },
    { company: 'splooco' },
  ];
}

export default function CustomerPortalPage({ params }: { params: { company: string } }) {
  return <CustomerPortal company={params.company} />;
} 