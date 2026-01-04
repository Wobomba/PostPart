/**
 * Role Management Utilities
 * 
 * Provides functions for checking and managing user roles
 * in the PostPart admin dashboard.
 */

import { supabase } from '../../lib/supabase';
import { UserRole, UserWithRole } from '../../../shared/types';

/**
 * Check if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    // Handle refresh token errors
    if (getUserError) {
      if (getUserError.message?.includes('Refresh Token') || getUserError.message?.includes('refresh_token')) {
        console.warn('Invalid refresh token in isAdmin, clearing session');
        await supabase.auth.signOut();
        return false;
      }
      console.error('Error getting user in isAdmin:', getUserError);
      return false;
    }
    
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }

    return data?.role === 'admin';
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return false;
  }
}

/**
 * Get the current user's role
 */
export async function getUserRole(): Promise<UserRole | null> {
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    // Handle refresh token errors
    if (getUserError) {
      if (getUserError.message?.includes('Refresh Token') || getUserError.message?.includes('refresh_token')) {
        console.warn('Invalid refresh token in getUserRole, clearing session');
        await supabase.auth.signOut();
        return null;
      }
      console.error('Error getting user in getUserRole:', getUserError);
      return null;
    }
    
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.role || null;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}

/**
 * Get all users with their roles
 */
export async function getAllUsersWithRoles(): Promise<UserWithRole[]> {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching users:', errorData.error);
      return [];
    }

    const usersWithRoles = await response.json();
    return usersWithRoles as UserWithRole[];
  } catch (error) {
    console.error('Error in getAllUsersWithRoles:', error);
    return [];
  }
}

/**
 * Assign or update a user's role
 */
export async function assignUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to assign role' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in assignUserRole:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Create a new user
 * Note: This requires service role key access via API
 * User will receive email verification and password set link
 */
export async function createAdminUser(
  email: string,
  role: UserRole = 'parent'
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create user' };
    }

    if (data.error) {
      // User created but role assignment failed
      return { success: false, error: data.error };
    }

    return { success: true, userId: data.userId };
  } catch (error: any) {
    console.error('Error in createAdminUser:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete a user (requires careful consideration)
 */
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete user' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteUser:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get role display label
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    parent: 'Parent',
    support: 'Support Staff',
  };
  return labels[role];
}

/**
 * Get role color for UI
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: '#E91E63', // Pink
    parent: '#2196F3', // Blue
    support: '#FF9800', // Orange
  };
  return colors[role];
}

/**
 * Check if a role change is allowed
 */
export function canChangeRole(
  currentUserRole: UserRole,
  targetUserRole: UserRole,
  newRole: UserRole
): boolean {
  // Only admins can change roles
  if (currentUserRole !== 'admin') return false;

  // Can't demote yourself from admin if you're the only admin
  // (This check would need to query the database to verify)
  
  return true;
}


