import { createClient } from '@/utils/supabase';
import CustomerPortalContainer from './CustomerPortalContainer';

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

export default function CustomerPortalPage({ params }: { params: { company: string } }) {
  return <CustomerPortalContainer params={params} />;
} 