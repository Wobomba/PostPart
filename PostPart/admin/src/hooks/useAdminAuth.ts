/**
 * useAdminAuth Hook
 * 
 * Custom hook for verifying admin authentication and authorization
 * in React components.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, safeGetUser } from '../../lib/supabase';
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
        await supabase.auth.signOut().catch(() => {});
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserRole(null);
        router.push('/auth/login');
        return;
      }
      
      // Handle SIGNED_OUT event (could be due to refresh token error)
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserRole(null);
        if (event === 'SIGNED_OUT') {
          router.push('/auth/login');
        }
        return;
      }
      
      // Session exists, verify auth
      if (session) {
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

      // Check if user is authenticated using safeGetUser for refresh token error handling
      const { user, error: getUserError } = await safeGetUser();

      // Handle refresh token errors (safeGetUser already handles these, but check anyway)
      if (getUserError) {
        // safeGetUser already cleared the session for refresh token errors
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserRole(null);
        setCheckingAuth(false);
        setLoading(false);
        router.push('/auth/login');
        return;
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


