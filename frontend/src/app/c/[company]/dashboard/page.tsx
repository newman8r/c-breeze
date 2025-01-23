import { Metadata } from 'next';
import CustomerDashboard from './CustomerDashboard';

export const metadata: Metadata = {
  title: 'Your Support Dashboard',
  description: 'View and manage your support tickets',
};

// This is required for static exports
export async function generateStaticParams() {
  // TODO: Replace with actual company list from Supabase
  return [
    { company: 'demo' },
    { company: 'acme' },
    { company: 'test' },
    { company: 'splooco' },
  ];
}

export default function CustomerDashboardPage({ params }: { params: { company: string } }) {
  return <CustomerDashboard company={params.company} />;
} 