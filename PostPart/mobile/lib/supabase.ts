import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://etajqqnejfolsmslbsom.supabase.co';
const supabaseAnonKey = 'sb_publishable_cYiDAK6i1o8iwn5nOtHezw_5x0QwZzb';

// Platform-specific storage
const getStorage = () => {
  if (Platform.OS === 'web') {
    // Use localStorage for web
    return {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          return Promise.resolve(localStorage.getItem(key));
        }
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
        return Promise.resolve();
      },
    };
  }
  // Use AsyncStorage for mobile
  return AsyncStorage;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
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
  
  // Handle token refresh errors
  if (event === 'TOKEN_REFRESHED') {
    // Token was successfully refreshed
    console.log('Token refreshed successfully');
  }
});

// Note: Refresh token errors are handled gracefully throughout the app
// If you see "refresh token not found" errors in LogBox, they are being caught
// and the user will be signed out automatically to allow re-authentication

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
          error.message?.includes('Invalid Refresh Token')) {
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
        err?.message?.includes('Invalid Refresh Token')) {
      console.warn('Refresh token error in safeGetUser, clearing session:', err.message);
      await supabase.auth.signOut().catch(() => {});
    }
    return { user: null, error: err };
  }
}

