import { supabase } from '../lib/supabase';

/**
 * Updates user profile in both profiles table AND auth metadata
 * This ensures consistency between database and authentication system
 */
export const updateUserProfile = async (userId: string, updates: {
  full_name?: string;
  phone?: string;
  organization_id?: string;
}) => {
  try {
    // 1. Update profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        organization_id: updates.organization_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      throw new Error(`Profile update failed: ${profileError.message}`);
    }

    // 2. Update auth metadata (if full_name is being updated)
    if (updates.full_name) {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          name: updates.full_name, // Some systems use 'name' instead
        },
      });

      if (authError) {
        console.warn('Auth metadata update failed:', authError.message);
        // Don't throw error here - profile table update succeeded
      }
    }

    return { success: true, data: profileData };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gets user's display name with proper fallback hierarchy:
 * 1. profiles.full_name (database)
 * 2. auth.user_metadata.full_name (auth metadata)
 * 3. auth.user_metadata.name (alternative auth field)
 * 4. "Parent" (last resort)
 */
export const getUserDisplayName = async (userId: string): Promise<string> => {
  try {
    // Try to get from profiles table first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (!profileError && profile?.full_name) {
      return profile.full_name;
    }

    // Fallback to auth metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const authDisplayName = user.user_metadata?.full_name || user.user_metadata?.name;
      if (authDisplayName) {
        return authDisplayName;
      }
    }

    // Last resort
    return 'Parent';
  } catch (error) {
    console.error('Error getting display name:', error);
    return 'Parent';
  }
};

/**
 * Syncs auth metadata to profiles table
 * Useful when profile is created after registration
 */
export const syncAuthToProfile = async (userId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No user found' };

    const authName = user.user_metadata?.full_name || user.user_metadata?.name;
    const authEmail = user.email;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      // Update existing profile with auth data
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: authName || null,
          email: authEmail || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Create profile from auth data
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: authName || null,
          email: authEmail || null,
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error syncing auth to profile:', error);
    return { success: false, error: error.message };
  }
};

