import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Warning: Supabase credentials not found in environment variables');
}

// Server-side Supabase client with service role key
// This bypasses Row Level Security (RLS) - use with caution
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to get Supabase client
export function getSupabaseClient() {
  return supabase;
}
