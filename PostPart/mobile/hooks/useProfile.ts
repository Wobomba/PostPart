import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  organization_id: string | null;
  status: string;
}

export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        console.log('[useProfile] No userId provided');
        return null;
      }
      
      console.log('[useProfile] Fetching profile for userId:', userId);
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useProfile] Auth error:', authError);
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, organization_id, status')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('[useProfile] Supabase error:', error);
        throw error;
      }
      
      console.log('[useProfile] Profile data:', data);
      return data as Profile | null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      console.log('[useProfile] Retry attempt:', failureCount, error);
      return failureCount < 2;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('id, full_name, organization_id, status')
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] });
    },
  });
}

