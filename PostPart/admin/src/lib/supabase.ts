import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etajqqnejfolsmslbsom.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YWpxcW5lamZvbHNtc2xic29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2NDk1OTYsImV4cCI6MjA0OTIyNTU5Nn0.jmpcaOiRbT8SzXj30oJdgXQ9mNYi4cZNuPwLlGWmqwo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Handle refresh token errors gracefully
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});


