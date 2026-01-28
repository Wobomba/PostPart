import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface CheckIn {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  child_id: string;
  parent_id: string;
  center_id: string;
  children?: { first_name: string; last_name: string; name?: string };
  centers?: { id: string; name: string; city?: string };
}

const CHECKINS_PAGE_SIZE = 20;

export function useRecentCheckIns(parentId: string | null, limit = 5) {
  return useQuery({
    queryKey: ['checkins', 'recent', parentId, limit],
    queryFn: async () => {
      if (!parentId) {
        console.log('[useRecentCheckIns] No parentId provided');
        return [];
      }
      
      console.log('[useRecentCheckIns] Fetching recent check-ins for parentId:', parentId);
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useRecentCheckIns] Auth error:', authError);
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('checkins')
        .select(`
          id,
          check_in_time,
          check_out_time,
          child_id,
          center_id,
          children (first_name, last_name, name),
          centers (id, name, city)
        `)
        .eq('parent_id', parentId)
        .order('check_in_time', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('[useRecentCheckIns] Supabase error:', error);
        throw error;
      }
      
      console.log('[useRecentCheckIns] Check-ins data:', data?.length || 0, 'check-ins');
      return (data || []) as CheckIn[];
    },
    enabled: !!parentId,
    staleTime: 1000 * 60 * 2, // 2 minutes - check-ins change frequently
    retry: (failureCount, error: any) => {
      console.log('[useRecentCheckIns] Retry attempt:', failureCount, error);
      return failureCount < 2;
    },
  });
}

export function useCheckInsInfinite(parentId: string | null) {
  return useInfiniteQuery({
    queryKey: ['checkins', 'infinite', parentId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!parentId) return { data: [], nextPage: null };
      
      const { data, error, count } = await supabase
        .from('checkins')
        .select(`
          id,
          check_in_time,
          check_out_time,
          child_id,
          center_id,
          children (first_name, last_name, name),
          centers (id, name, city)
        `, { count: 'exact' })
        .eq('parent_id', parentId)
        .order('check_in_time', { ascending: false })
        .range(pageParam * CHECKINS_PAGE_SIZE, (pageParam + 1) * CHECKINS_PAGE_SIZE - 1);
      
      if (error) throw error;
      
      const hasMore = count ? (pageParam + 1) * CHECKINS_PAGE_SIZE < count : false;
      
      return {
        data: (data || []) as CheckIn[],
        nextPage: hasMore ? pageParam + 1 : null,
      };
    },
    enabled: !!parentId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveCheckIn(parentId: string | null) {
  return useQuery({
    queryKey: ['checkins', 'active', parentId],
    queryFn: async () => {
      if (!parentId) return null;
      
      const { data, error } = await supabase
        .from('checkins')
        .select(`
          id,
          check_in_time,
          check_out_time,
          child_id,
          children (first_name, last_name),
          centers (id, name)
        `)
        .eq('parent_id', parentId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as CheckIn | null;
    },
    enabled: !!parentId,
    staleTime: 1000 * 30, // 30 seconds - active check-in changes frequently
    refetchInterval: 1000 * 30, // Poll every 30 seconds
  });
}

export function useCheckInStats(parentId: string | null) {
  return useQuery({
    queryKey: ['checkins', 'stats', parentId],
    queryFn: async () => {
      if (!parentId) {
        console.log('[useCheckInStats] No parentId provided');
        return { centersVisited: 0, totalCheckIns: 0 };
      }
      
      console.log('[useCheckInStats] Fetching check-in stats for parentId:', parentId);
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useCheckInStats] Auth error:', authError);
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('checkins')
        .select('center_id')
        .eq('parent_id', parentId);
      
      if (error) {
        console.error('[useCheckInStats] Supabase error:', error);
        throw error;
      }
      
      const uniqueCenters = new Set((data || []).map(c => c.center_id));
      const stats = {
        centersVisited: uniqueCenters.size,
        totalCheckIns: data?.length || 0,
      };
      
      console.log('[useCheckInStats] Stats:', stats);
      return stats;
    },
    enabled: !!parentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      console.log('[useCheckInStats] Retry attempt:', failureCount, error);
      return failureCount < 2;
    },
  });
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (checkIn: Omit<CheckIn, 'id' | 'check_out_time'>) => {
      const { data, error } = await supabase
        .from('checkins')
        .insert(checkIn)
        .select()
        .single();
      
      if (error) throw error;
      return data as CheckIn;
    },
    onSuccess: (data) => {
      // Invalidate all check-in related queries
      queryClient.invalidateQueries({ queryKey: ['checkins', data.parent_id] });
      queryClient.invalidateQueries({ queryKey: ['checkins', 'stats', data.parent_id] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checkInId, checkOutTime, parentId }: { checkInId: string; checkOutTime: string; parentId: string }) => {
      const { data, error } = await supabase
        .from('checkins')
        .update({ check_out_time: checkOutTime })
        .eq('id', checkInId)
        .select()
        .single();
      
      if (error) throw error;
      return data as CheckIn;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checkins', variables.parentId] });
      queryClient.invalidateQueries({ queryKey: ['checkins', 'stats', variables.parentId] });
    },
  });
}

