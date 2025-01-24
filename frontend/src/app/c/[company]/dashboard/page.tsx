import { Metadata } from 'next';
import CustomerDashboard from './CustomerDashboard';
import { createClient } from '@/utils/supabase';

export const metadata: Metadata = {
  title: 'Your Support Dashboard',
  description: 'View and manage your support tickets',
};

// This is required for static exports
export async function generateStaticParams() {
    const supabase = createClient()
    
    // Fetch all organization slugs from the database
    const { data: organizations } = await supabase
      .from('organizations')
      .select('slug')
    
    // Return array of params objects where 'company' matches the [company] route parameter
    return (organizations ?? []).map((org) => ({
      company: org.slug
    }))
  }

export default function CustomerDashboardPage({ params }: { params: { company: string } }) {
  return <CustomerDashboard company={params.company} />;
} 