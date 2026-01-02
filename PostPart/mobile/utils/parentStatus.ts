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
      .select('status, full_name, organization_id, organizations(name)')
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

    const isActive = profile.status === 'active';

    return {
      isActive,
      status: profile.status as 'active' | 'inactive' | 'suspended',
      message: !isActive ? getStatusMessage(profile.status) : undefined,
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

