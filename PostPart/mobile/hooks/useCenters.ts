import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface Center {
  id: string;
  name: string;
  city?: string;
  address?: string;
  services_offered?: string[];
  is_verified: boolean;
}

const CENTERS_PAGE_SIZE = 20;

export function useCenters(filters?: { verified?: boolean; search?: string }) {
  return useInfiniteQuery({
    queryKey: ['centers', filters],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('[useCenters] Fetching centers, page:', pageParam, 'filters:', filters);
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useCenters] Auth error:', authError);
        throw new Error('Not authenticated');
      }
      
      let query = supabase
        .from('centers')
        .select('id, name, city, address, services_offered, is_verified', { count: 'exact' });
      
      if (filters?.verified !== undefined) {
        query = query.eq('is_verified', filters.verified);
      }
      
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(pageParam * CENTERS_PAGE_SIZE, (pageParam + 1) * CENTERS_PAGE_SIZE - 1);
      
      if (error) {
        console.error('[useCenters] Supabase error:', error);
        throw error;
      }
      
      const hasMore = count ? (pageParam + 1) * CENTERS_PAGE_SIZE < count : false;
      
      console.log('[useCenters] Centers data:', data?.length || 0, 'centers, hasMore:', hasMore);
      
      return {
        data: (data || []) as Center[],
        nextPage: hasMore ? pageParam + 1 : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 10, // 10 minutes - centers don't change often
    retry: (failureCount, error: any) => {
      console.log('[useCenters] Retry attempt:', failureCount, error);
      return failureCount < 2;
    },
  });
}

export function useFeaturedCenters(limit = 2) {
  return useQuery({
    queryKey: ['centers', 'featured', limit],
    queryFn: async () => {
      console.log('[useFeaturedCenters] Fetching featured centers, limit:', limit);
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useFeaturedCenters] Auth error:', authError);
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('centers')
        .select('id, name, city, address')
        .eq('is_verified', true)
        .order('name')
        .limit(limit);
      
      if (error) {
        console.error('[useFeaturedCenters] Supabase error:', error);
        throw error;
      }
      
      console.log('[useFeaturedCenters] Featured centers data:', data?.length || 0, 'centers');
      return (data || []) as Center[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error: any) => {
      console.log('[useFeaturedCenters] Retry attempt:', failureCount, error);
      return failureCount < 2;
    },
  });
}

export function useCenter(centerId: string | null) {
  return useQuery({
    queryKey: ['centers', centerId],
    queryFn: async () => {
      if (!centerId) return null;
      
      const { data, error } = await supabase
        .from('centers')
        .select('id, name, city, address, services_offered, is_verified')
        .eq('id', centerId)
        .single();
      
      if (error) throw error;
      return data as Center;
    },
    enabled: !!centerId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFrequentCenters(parentId: string | null, limit = 3) {
  return useQuery({
    queryKey: ['centers', 'frequent', parentId, limit],
    queryFn: async () => {
      if (!parentId) return [];
      
      // Get all check-ins for this parent
      const { data: checkIns, error: checkInsError } = await supabase
        .from('checkins')
        .select('center_id')
        .eq('parent_id', parentId);
      
      if (checkInsError) throw checkInsError;
      
      // Count visits per center
      const centerCounts = (checkIns || []).reduce((acc: Record<string, number>, checkIn) => {
        acc[checkIn.center_id] = (acc[checkIn.center_id] || 0) + 1;
        return acc;
      }, {});
      
      // Get top center IDs
      const topCenterIds = Object.entries(centerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([centerId]) => centerId);
      
      if (topCenterIds.length === 0) return [];
      
      // Fetch center details
      const { data: centers, error: centersError } = await supabase
        .from('centers')
        .select('id, name, city, address')
        .in('id', topCenterIds);
      
      if (centersError) throw centersError;
      
      // Add visit count and sort
      return (centers || []).map(center => ({
        ...center,
        visitCount: centerCounts[center.id],
      })) as (Center & { visitCount: number })[];
    },
    enabled: !!parentId,
    staleTime: 1000 * 60 * 5,
  });
}

