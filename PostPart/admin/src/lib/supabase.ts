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

// Set up global error handler for refresh token errors
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    // Handle token refresh errors
    if (event === 'SIGNED_OUT' && !session) {
      // This might be due to a refresh token error
      console.log('User signed out');
    }
    
    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED') {
      // Token was successfully refreshed
      console.log('Token refreshed successfully');
    }
  });
}

/**
 * Safely get user with refresh token error handling
 */
export async function safeGetUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Check for 403 Forbidden (invalid/expired session)
      if (error.status === 403 || error.message?.includes('403') || error.message?.includes('Forbidden')) {
        console.warn('403 Forbidden - Session invalid, clearing session:', error.message);
        await supabase.auth.signOut().catch(() => {});
        return { user: null, error };
      }
      
      // Check for refresh token errors
      if (error.message?.includes('Refresh Token') || 
          error.message?.includes('refresh_token') ||
          error.message?.includes('Invalid Refresh Token') ||
          error.message?.includes('refresh token not found')) {
        console.warn('Invalid refresh token detected, clearing session:', error.message);
        await supabase.auth.signOut().catch(() => {});
        return { user: null, error };
      }
    }
    
    return { user, error };
  } catch (err: any) {
    // Check for 403 Forbidden in catch block
    if (err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('Forbidden')) {
      console.warn('403 Forbidden in safeGetUser, clearing session:', err.message);
      await supabase.auth.signOut().catch(() => {});
      return { user: null, error: err };
    }
    
    // Check for refresh token errors in catch block
    if (err?.message?.includes('Refresh Token') || 
        err?.message?.includes('refresh_token') ||
        err?.message?.includes('Invalid Refresh Token') ||
        err?.message?.toLowerCase().includes('refresh token not found')) {
      console.warn('Refresh token error in safeGetUser, clearing session:', err.message);
      await supabase.auth.signOut().catch(() => {});
    }
    return { user: null, error: err };
  }
}


