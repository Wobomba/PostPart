/**
 * useAdminAuth Hook
 * 
 * Custom hook for verifying admin authentication and authorization
 * in React components.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { UserRole } from '../../shared/types';

interface UseAdminAuthReturn {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRole: UserRole | null;
  loading: boolean;
  checkingAuth: boolean;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, signing out');
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserRole(null);
        router.push('/auth/login');
        return;
      }
      
      if (!session) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserRole(null);
        router.push('/auth/login');
      } else {
        checkAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function checkAuth() {
    try {
      setCheckingAuth(true);

      // Check if user is authenticated
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      // Handle refresh token errors
      if (getUserError) {
        // If it's a refresh token error, clear the session
        if (getUserError.message?.includes('Refresh Token') || getUserError.message?.includes('refresh_token')) {
          console.warn('Invalid refresh token, clearing session:', getUserError.message);
          await supabase.auth.signOut();
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUserRole(null);
          setCheckingAuth(false);
          setLoading(false);
          router.push('/auth/login');
          return;
        }
        // For other errors, still redirect to login
        throw getUserError;
      }

      if (!user) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserRole(null);
        setCheckingAuth(false);
        setLoading(false);
        router.push('/auth/login');
        return;
      }

      setIsAuthenticated(true);

      // Check user role
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

      // If error occurred (not just "no rows")
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user role:', error);
        await supabase.auth.signOut();
        setIsAdmin(false);
        setUserRole(null);
        setCheckingAuth(false);
        setLoading(false);
        router.push('/auth/unauthorized');
        return;
      }

      // If no role found or user is not admin
      if (!roleData || roleData.role !== 'admin') {
        // Sign out the user since they're not authorized
        await supabase.auth.signOut();
        setIsAdmin(false);
        setUserRole(null);
        setCheckingAuth(false);
        setLoading(false);
        router.push('/auth/unauthorized');
        return;
      }

      // User is admin
      const role = roleData.role as UserRole;
      setUserRole(role);
      setIsAdmin(true);

      setCheckingAuth(false);
      setLoading(false);
    } catch (error) {
      console.error('Error in checkAuth:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserRole(null);
      setCheckingAuth(false);
      setLoading(false);
      router.push('/auth/login');
    }
  }

  return {
    isAuthenticated,
    isAdmin,
    userRole,
    loading,
    checkingAuth,
  };
}

/**
 * Hook for checking if current user has a specific role
 */
export function useHasRole(requiredRole: UserRole): boolean {
  const { userRole } = useAdminAuth();
  return userRole === requiredRole;
}

/**
 * Hook for checking if current user has any of the specified roles
 */
export function useHasAnyRole(requiredRoles: UserRole[]): boolean {
  const { userRole } = useAdminAuth();
  return userRole ? requiredRoles.includes(userRole) : false;
}


