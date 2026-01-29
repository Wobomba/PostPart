import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export function useNotifications(parentId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['notifications', parentId, limit],
    queryFn: async () => {
      if (!parentId) return [];
      
      const { data, error } = await supabase
        .from('parent_notifications')
        .select(`
          id,
          is_read,
          created_at,
          notifications (
            id,
            title,
            message,
            created_at
          )
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Transform the data to flatten the notification structure
      return (data || []).map((item: any) => ({
        id: item.id,
        title: item.notifications?.title || '',
        message: item.notifications?.message || '',
        created_at: item.notifications?.created_at || item.created_at,
        is_read: item.is_read,
      })) as Notification[];
    },
    enabled: !!parentId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useUnreadNotificationCount(parentId: string | null) {
  return useQuery({
    queryKey: ['notifications', 'unread-count', parentId],
    queryFn: async () => {
      if (!parentId) return 0;
      
      const { count, error } = await supabase
        .from('parent_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', parentId)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!parentId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ notificationId, parentId }: { notificationId: string; parentId: string }) => {
      const { error } = await supabase
        .from('parent_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('parent_id', parentId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.parentId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', variables.parentId] });
    },
  });
}

