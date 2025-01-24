import { createClient } from '@/utils/supabase';
import CustomerPortalContainer from './CustomerPortalContainer';

export async function generateStaticParams() {
    const supabase = createClient()
    
    // Fetch all organization slugs from the database
    const { data: organizations } = await supabase
      .from('organizations')
      .select('slug')
    
    // Return an array of params objects
    return (organizations ?? []).map((org) => ({
      company: org.slug
    }))
  }

export default function CustomerPortalPage({ params }: { params: { company: string } }) {
  return <CustomerPortalContainer params={params} />;
} 