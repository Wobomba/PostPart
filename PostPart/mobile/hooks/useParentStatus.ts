import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { checkParentStatus, ParentStatus } from '../utils/parentStatus';

/**
 * Hook to check parent status and block navigation if inactive
 * @param blockNavigation - If true, redirects to home if inactive. Default: true
 * @returns ParentStatus object and loading state
 */
export function useParentStatus(blockNavigation: boolean = true) {
  const router = useRouter();
  const [status, setStatus] = useState<ParentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      const parentStatus = await checkParentStatus();
      setStatus(parentStatus);
      
      if (blockNavigation && !parentStatus.isActive) {
        // Redirect to home if inactive
        router.replace('/(tabs)/home');
      }
      
      setLoading(false);
    };

    checkStatus();
  }, [blockNavigation]);

  return { status, loading, isActive: status?.isActive ?? false };
}

