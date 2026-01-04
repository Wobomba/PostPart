import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://etajqqnejfolsmslbsom.supabase.co';
const supabaseAnonKey = 'sb_publishable_cYiDAK6i1o8iwn5nOtHezw_5x0QwZzb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Set up global error handler for refresh token errors
supabase.auth.onAuthStateChange(async (event, session) => {
  // Handle token refresh errors
  if (event === 'SIGNED_OUT' && !session) {
    // This might be due to a refresh token error
    console.log('User signed out');
  }
});

/**
 * Safely get user with refresh token error handling
 */
export async function safeGetUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Check for refresh token errors
      if (error.message?.includes('Refresh Token') || 
          error.message?.includes('refresh_token') ||
          error.message?.includes('Invalid Refresh Token')) {
        console.warn('Invalid refresh token detected, clearing session:', error.message);
        await supabase.auth.signOut().catch(() => {});
        return { user: null, error };
      }
    }
    
    return { user, error };
  } catch (err: any) {
    // Check for refresh token errors in catch block
    if (err?.message?.includes('Refresh Token') || 
        err?.message?.includes('refresh_token') ||
        err?.message?.includes('Invalid Refresh Token')) {
      console.warn('Refresh token error in safeGetUser, clearing session:', err.message);
      await supabase.auth.signOut().catch(() => {});
    }
    return { user: null, error: err };
  }
}

