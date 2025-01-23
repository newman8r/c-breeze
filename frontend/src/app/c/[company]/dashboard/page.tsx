import { Metadata } from 'next';
import CustomerDashboard from './CustomerDashboard';
import { createClient } from '@/utils/supabase';

export const metadata: Metadata = {
  title: 'Your Support Dashboard',
  description: 'View and manage your support tickets',
};

// This is required for static exports
export const generateStaticParams = async () => {
  const supabase = createClient();
  const { data: organizations } = await supabase
    .from('organizations')
    .select('slug')
    .not('slug', 'is', null);

  return (organizations ?? []).map(org => ({
    company: org.slug
  }));
};

export default function CustomerDashboardPage({ params }: { params: { company: string } }) {
  return <CustomerDashboard company={params.company} />;
} 