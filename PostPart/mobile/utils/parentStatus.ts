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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        isActive: false,
        status: 'inactive',
        message: 'Not authenticated',
      };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status, full_name, organization_id, organizations(id, name, status)')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('Error fetching profile:', error);
      return {
        isActive: false,
        status: 'inactive',
        message: 'Failed to verify account status',
      };
    }

    // Check both parent status and organization status
    // Organization status takes precedence: if organization is inactive/suspended, parent is automatically inactive/suspended
    const organization = profile.organizations as any;
    const orgStatus = organization?.status;
    const parentStatus = profile.status as 'active' | 'inactive' | 'suspended';
    
    // Determine effective status: organization status takes precedence if it's inactive/suspended
    // If organization is active, use parent's individual status
    let effectiveStatus: 'active' | 'inactive' | 'suspended';
    if (orgStatus && (orgStatus === 'inactive' || orgStatus === 'suspended')) {
      // Organization is inactive/suspended, so parent is automatically inactive/suspended
      effectiveStatus = orgStatus;
    } else {
      // Organization is active (or null), so use parent's individual status
      effectiveStatus = parentStatus;
    }
    
    const isActive = effectiveStatus === 'active';

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

