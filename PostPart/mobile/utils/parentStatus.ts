// Utility to check parent status and handle accordingly
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export interface ParentStatus {
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended';
  message?: string;
}

/**
 * Check if the current parent is active and can use the service
 * @returns ParentStatus object with status details
 */
export async function checkParentStatus(): Promise<ParentStatus> {
  try {
    // Try to get user, but don't fail immediately on 403
    // We'll try to check the profile using the session first
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    let userId: string | null = null;
    
    // Handle 403 Forbidden - try to refresh session first
    if (getUserError) {
      if (getUserError.status === 403 || getUserError.message?.includes('403') || getUserError.message?.includes('Forbidden')) {
        console.warn('403 Forbidden in checkParentStatus, attempting to refresh session');
        
        // Try to refresh the session instead of immediately failing
        try {
          const { data: { session }, error: refreshError } = await supabase.auth.getSession();
          if (session?.user && !refreshError) {
            userId = session.user.id;
            console.log('Session refreshed successfully, using user ID from session');
          } else {
            // Session truly invalid, sign out
            console.warn('Session refresh failed, signing out');
            await supabase.auth.signOut().catch(() => {});
            return {
              isActive: false,
              status: 'inactive',
              message: 'Session expired. Please sign in again.',
            };
          }
        } catch (refreshErr) {
          console.error('Error refreshing session:', refreshErr);
          await supabase.auth.signOut().catch(() => {});
          return {
            isActive: false,
            status: 'inactive',
            message: 'Session expired. Please sign in again.',
          };
        }
      } else {
        // Other error from getUser, but we might still have a session
        console.warn('getUser error (non-403):', getUserError);
        // Try to get user ID from session as fallback
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            userId = session.user.id;
          }
        } catch (sessionErr) {
          // Ignore session error, will handle below
        }
      }
    } else if (user) {
      userId = user.id;
    }
    
    // If we still don't have a user ID, try one more time from session
    if (!userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
        } else {
          return {
            isActive: false,
            status: 'inactive',
            message: 'Not authenticated',
          };
        }
      } catch (sessionErr) {
        return {
          isActive: false,
          status: 'inactive',
          message: 'Not authenticated',
        };
      }
    }

    // Now try to get the profile using the user ID
    // Retry logic for network issues in production builds
    // Try with organization join first, fallback to simple query if that fails
    let profile: any = null;
    let error: any = null;
    let retries = 0;
    const maxRetries = 3;
    
    // First attempt: try with organization join
    while (retries < maxRetries) {
      const result = await supabase
        .from('profiles')
        .select('status, full_name, organization_id, organizations(id, name, status)')
        .eq('id', userId)
        .maybeSingle();
      
      profile = result.data;
      error = result.error;
      
      // If successful or non-network error, break
      if (!error || (error.code !== 'PGRST116' && !error.message?.includes('network') && !error.message?.includes('fetch') && !error.message?.includes('Network request failed'))) {
        break;
      }
      
      // Network error - retry with exponential backoff
      if (error && (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Network request failed'))) {
        retries++;
        if (retries < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000); // Max 5 seconds
          console.warn(`Network error fetching profile (attempt ${retries}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else {
        break;
      }
    }
    
    // If we still have an error and it's a network issue, try a simpler query without organization join
    if (error && (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Network request failed'))) {
      console.log('🔄 Trying simpler query without organization join...');
      try {
        const simpleResult = await supabase
          .from('profiles')
          .select('status, organization_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (simpleResult.data && !simpleResult.error) {
          profile = simpleResult.data;
          error = null;
          console.log('✅ Got profile data with simple query (will fetch org separately if needed)');
          
          // If we have organization_id, try to fetch org status separately
          if (profile.organization_id) {
            try {
              const orgResult = await supabase
                .from('organizations')
                .select('id, name, status')
                .eq('id', profile.organization_id)
                .maybeSingle();
              
              if (orgResult.data) {
                profile.organizations = orgResult.data;
              }
            } catch (orgErr) {
              console.warn('Could not fetch organization separately, continuing without org status');
            }
          }
        }
      } catch (simpleErr) {
        console.warn('Simple query also failed:', simpleErr);
      }
    }

    // Log the raw profile data for debugging
    if (profile) {
      console.log('Profile data:', {
        status: profile.status,
        organization_id: profile.organization_id,
        organizations: profile.organizations,
      });
    }

    // Handle error cases
    if (error) {
      // PGRST116 means "no rows found" - profile doesn't exist yet, which is OK
      if (error.code === 'PGRST116') {
        console.log('Profile not found yet, user may need to complete registration');
        return {
          isActive: false,
          status: 'inactive',
          message: 'Profile not found. Please complete your registration.',
        };
      }
      
      // If we still have a network error after all retries and fallbacks, fail open
      // This prevents false negatives in production where network might be unreliable
      if (error && (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Network request failed'))) {
        console.warn('Network error after all retries, assuming active to prevent false negatives');
        return {
          isActive: true, // Assume active if we can't verify (fail open)
          status: 'active',
          message: undefined,
        };
      }
    }

    // Profile doesn't exist yet
    if (!profile) {
      return {
        isActive: false,
        status: 'inactive',
        message: 'Profile not found. Please complete your registration.',
      };
    }

    // Check both parent status and organization status
    // Organization status takes precedence: if organization is inactive/suspended, parent is automatically inactive/suspended
    const organization = profile.organizations as any;
    const orgStatus = organization?.status;
    const parentStatus = profile.status as 'active' | 'inactive' | 'suspended' | null | undefined;
    
    // Log for debugging
    console.log('Status check:', {
      parentStatus,
      orgStatus,
      organizationId: profile.organization_id,
      hasOrganization: !!organization,
    });
    
    // Determine effective status: organization status takes precedence if it's inactive/suspended
    // If organization is active (or null), use parent's individual status
    // IMPORTANT: Be conservative - only mark as inactive if we're certain
    let effectiveStatus: 'active' | 'inactive' | 'suspended';
    
    // If organization exists and is inactive/suspended, use that
    if (orgStatus && (orgStatus === 'inactive' || orgStatus === 'suspended')) {
      effectiveStatus = orgStatus;
    } else if (parentStatus === 'active') {
      // Parent is explicitly active - use that
      effectiveStatus = 'active';
    } else if (parentStatus === 'suspended') {
      // Parent is suspended
      effectiveStatus = 'suspended';
    } else if (parentStatus === 'inactive') {
      // Parent is explicitly inactive - only mark inactive if explicitly set
      effectiveStatus = 'inactive';
    } else if (orgStatus === 'active') {
      // Organization is active and parent status is null/undefined - assume active
      // This handles cases where admin activated but status wasn't set
      console.log('Organization is active, parent status is null/undefined - assuming active');
      effectiveStatus = 'active';
    } else if (profile.organization_id) {
      // If user has an organization_id but we couldn't fetch org status,
      // and parent status is null/undefined, assume active (fail open)
      // This prevents false negatives when org data isn't available
      console.log('User has organization_id but org status unavailable, parent status null/undefined - assuming active');
      effectiveStatus = 'active';
    } else {
      // If parent status is null/undefined and no org, default to inactive
      // This handles cases where status column might not be set
      // BUT: Only do this if we're certain (not on network errors)
      console.warn('Parent status is null/undefined and no org status, defaulting to inactive');
      effectiveStatus = 'inactive';
    }
    
    const isActive = effectiveStatus === 'active';
    
    // Log final determination for debugging
    console.log('Final status determination:', {
      effectiveStatus,
      isActive,
      parentStatus,
      orgStatus,
    });

    return {
      isActive,
      status: effectiveStatus,
      message: !isActive ? getStatusMessage(effectiveStatus) : undefined,
    };
  } catch (error) {
    console.error('Error checking parent status:', error);
    return {
      isActive: false,
      status: 'inactive',
      message: 'An error occurred while checking account status',
    };
  }
}

/**
 * Get user-friendly message based on status
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'inactive':
      return 'Your account is currently inactive. Please contact your organization administrator for assistance.';
    case 'suspended':
      return 'Your account has been suspended. Please contact PostPart support for more information.';
    default:
      return 'Your account is not active. Please contact support.';
  }
}

/**
 * Show status alert if account is not active
 * @param status ParentStatus object
 * @param onClose Optional callback when alert is closed
 */
export function showStatusAlert(status: ParentStatus, onClose?: () => void) {
  if (status.isActive) return;

  const title = status.status === 'suspended' 
    ? '⛔ Account Suspended' 
    : '⚠️ Account Inactive';

  Alert.alert(
    title,
    status.message || 'Your account is not currently active.',
    [
      {
        text: 'OK',
        onPress: onClose,
      },
    ]
  );
}

/**
 * Verify parent can check in (used before QR scan/check-in)
 * @returns true if parent can proceed, false otherwise
 */
export async function verifyCanCheckIn(): Promise<boolean> {
  const status = await checkParentStatus();
  
  if (!status.isActive) {
    showStatusAlert(status);
    return false;
  }
  
  return true;
}

