import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// Helper function to get the correct API URL
export const getApiUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }
  return `${baseUrl}/functions/v1/${path}`;
};

export const getFunctionUrl = (functionName: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  return `${baseUrl}/functions/v1/${functionName}`;
};

// Example usage in your API calls:
export const fetchCustomerTickets = async () => {
  try {
    const response = await fetch(
      getApiUrl('get-customer-tickets'),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include any necessary auth headers
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching customer tickets:', error);
    throw error;
  }
}; 