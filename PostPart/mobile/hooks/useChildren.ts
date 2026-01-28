import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  allergies?: string;
  notes?: string;
}

export function useChildren(parentId: string | null) {
  return useQuery({
    queryKey: ['children', parentId],
    queryFn: async () => {
      if (!parentId) {
        console.log('[useChildren] No parentId provided');
        return [];
      }
      
      console.log('[useChildren] Fetching children for parentId:', parentId);
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useChildren] Auth error:', authError);
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name, date_of_birth, allergies, notes')
        .eq('parent_id', parentId)
        .order('date_of_birth', { ascending: false });
      
      if (error) {
        console.error('[useChildren] Supabase error:', error);
        throw error;
      }
      
      console.log('[useChildren] Children data:', data?.length || 0, 'children');
      return (data || []) as Child[];
    },
    enabled: !!parentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      console.log('[useChildren] Retry attempt:', failureCount, error);
      return failureCount < 2;
    },
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (child: Omit<Child, 'id'> & { parent_id: string }) => {
      const { data, error } = await supabase
        .from('children')
        .insert(child)
        .select('id, first_name, last_name, date_of_birth, allergies, notes')
        .single();
      
      if (error) throw error;
      return data as Child;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['children', variables.parent_id] });
    },
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ childId, updates, parentId }: { childId: string; updates: Partial<Child>; parentId: string }) => {
      const { data, error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', childId)
        .select('id, first_name, last_name, date_of_birth, allergies, notes')
        .single();
      
      if (error) throw error;
      return data as Child;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['children', variables.parentId] });
    },
  });
}

