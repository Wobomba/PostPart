'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Cache, CacheKeys } from '../utils/cache';

interface DashboardStats {
  totalOrganizations: number;
  totalParents: number;
  totalCenters: number;
  totalCheckins: number;
  recentCheckins: any[];
  todayCheckins: number;
  todayNewParents: number;
  activeCentersToday: number;
  weeklyCheckins: number;
  lastWeekCheckins: number;
  unverifiedCenters: number;
  unassociatedParents: number;
  topCenters: any[];
  recentNotifications: any[];
}

interface ActivityEvent {
  id: string;
  type: string;
  organizationId?: string;
  organizationName?: string;
  parentName: string;
  message: string;
  timestamp: string;
}

interface AdminDataContextType {
  // Dashboard data
  dashboardStats: DashboardStats | null;
  activityTimeline: ActivityEvent[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  
  // Actions
  refreshDashboardStats: () => Promise<void>;
  refreshActivityTimeline: () => Promise<void>;
  refreshAll: () => Promise<void>;
  clearCache: () => void;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activityTimeline, setActivityTimeline] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load cached data immediately for instant display
  const loadCachedData = useCallback(() => {
    try {
      const cachedStats = Cache.get<DashboardStats>(CacheKeys.DASHBOARD_STATS);
      const cachedActivity = Cache.get<ActivityEvent[]>(CacheKeys.DASHBOARD_ACTIVITY);

      if (cachedStats) setDashboardStats(cachedStats);
      if (cachedActivity) setActivityTimeline(cachedActivity);
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }, []);

  // Load fresh dashboard stats
  const loadFreshStats = useCallback(async (skipCache = false) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Load all counts in parallel
      const [
        { count: orgCount },
        { count: parentCount },
        { count: centerCount },
        { count: checkinCount },
        { count: todayCheckinCount },
        { count: todayNewParentCount },
        { count: weeklyCheckinCount },
        { count: lastWeekCheckinCount },
        { count: unverifiedCenterCount },
        { count: unassociatedParentCount },
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('centers').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', today.toISOString())
          .lte('check_in_time', todayEnd.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())
          .lte('created_at', todayEnd.toISOString()),
        supabase.from('checkins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', weekAgo.toISOString()),
        supabase.from('checkins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', twoWeeksAgo.toISOString())
          .lt('check_in_time', weekAgo.toISOString()),
        supabase.from('centers').select('*', { count: 'exact', head: true })
          .eq('is_verified', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .is('organization_id', null),
      ]);

      // Load recent check-ins, top centers, and notifications in parallel
      const [recentDataResult, topCentersResult, notificationsResult, todayCheckinsResult] = await Promise.all([
        supabase
          .from('checkins')
          .select(`
            *,
            center:centers(name),
            parent:profiles(full_name),
            child:children(first_name, last_name)
          `)
          .order('check_in_time', { ascending: false })
          .limit(5),
        supabase
          .from('checkins')
          .select(`
            center_id,
            centers!inner (name, is_verified)
          `)
          .gte('check_in_time', new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('checkins')
          .select('center_id')
          .gte('check_in_time', today.toISOString())
          .lte('check_in_time', todayEnd.toISOString()),
      ]);

      const recentData = recentDataResult.data || [];
      const topCentersData = topCentersResult.data || [];
      const notificationsData = notificationsResult.data || [];
      const todayCheckins = todayCheckinsResult.data || [];
      const uniqueCentersToday = new Set(todayCheckins.map(c => c.center_id).filter(Boolean));

      // Aggregate top centers
      const centerCounts: { [key: string]: { name: string; count: number; is_verified: boolean } } = {};
      topCentersData.forEach((checkin: any) => {
        if (checkin.center_id && checkin.centers) {
          const id = checkin.center_id;
          if (!centerCounts[id]) {
            centerCounts[id] = { 
              name: checkin.centers.name, 
              count: 0, 
              is_verified: checkin.centers.is_verified 
            };
          }
          centerCounts[id].count += 1;
        }
      });
      
      const topCenters = Object.values(centerCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const stats: DashboardStats = {
        totalOrganizations: orgCount || 0,
        totalParents: parentCount || 0,
        totalCenters: centerCount || 0,
        totalCheckins: checkinCount || 0,
        recentCheckins: recentData,
        todayCheckins: todayCheckinCount || 0,
        todayNewParents: todayNewParentCount || 0,
        activeCentersToday: uniqueCentersToday.size,
        weeklyCheckins: weeklyCheckinCount || 0,
        lastWeekCheckins: lastWeekCheckinCount || 0,
        unverifiedCenters: unverifiedCenterCount || 0,
        unassociatedParents: unassociatedParentCount || 0,
        topCenters: topCenters,
        recentNotifications: notificationsData,
      };

      setDashboardStats(stats);
      if (!skipCache) Cache.set(CacheKeys.DASHBOARD_STATS, stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }, []);

  // Load fresh activity timeline
  const loadFreshActivity = useCallback(async (skipCache = false) => {
    try {
      const events: ActivityEvent[] = [];

      // Load activity logs and recent check-ins in parallel
      const [activityLogsResult, recentCheckInsResult] = await Promise.all([
        supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('checkins')
          .select(`
            id,
            check_in_time,
            check_out_time,
            parent_id,
            profiles!inner(
              organization_id,
              full_name,
              organizations(id, name)
            )
          `)
          .order('check_in_time', { ascending: false })
          .limit(20),
      ]);

      const activityLogs = activityLogsResult.data || [];
      const recentCheckIns = recentCheckInsResult.data || [];

      // Process activity logs
      activityLogs.forEach((log: any) => {
        events.push({
          id: log.id,
          type: log.activity_type,
          organizationId: log.related_entity_type === 'organisation' ? log.related_entity_id : undefined,
          organizationName: log.related_entity_type === 'organisation' ? log.related_entity_name : undefined,
          parentName: log.entity_type === 'parent' ? log.entity_name : log.related_entity_name || 'System',
          message: log.description,
          timestamp: log.created_at,
        });
      });

      // Process check-ins
      recentCheckIns.forEach((checkin: any) => {
        const profile = Array.isArray(checkin.profiles) ? checkin.profiles[0] : checkin.profiles;
        const org = Array.isArray(profile?.organizations) ? profile.organizations[0] : profile?.organizations;
        
        if (profile) {
          events.push({
            id: `checkin-${checkin.id}`,
            type: 'checkin',
            organizationId: org?.id,
            organizationName: org?.name,
            parentName: profile.full_name,
            message: checkin.check_out_time ? `Check-in and check-out completed` : `Check-in completed`,
            timestamp: checkin.check_in_time,
          });
          
          if (checkin.check_out_time) {
            events.push({
              id: `checkout-${checkin.id}`,
              type: 'checkout',
              organizationId: org?.id,
              organizationName: org?.name,
              parentName: profile.full_name,
              message: `Check-out completed`,
              timestamp: checkin.check_out_time,
            });
          }
        }
      });

      // Sort by timestamp (most recent first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const timeline = events.slice(0, 10);
      setActivityTimeline(timeline);
      if (!skipCache) Cache.set(CacheKeys.DASHBOARD_ACTIVITY, timeline);
    } catch (error) {
      console.error('Error loading activity timeline:', error);
      setActivityTimeline([]);
    }
  }, []);

  // Initial load: cache first, then fresh data
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      // Load cached data first for instant display
      loadCachedData();

      // Load fresh data in background
      await Promise.all([
        loadFreshStats(),
        loadFreshActivity(),
      ]);
      
      setLoading(false);
    };

    initialize();
  }, [loadCachedData, loadFreshStats, loadFreshActivity]);

  // Set up realtime subscriptions
  useEffect(() => {
    const setupSubscriptions = () => {
      // Subscribe to check-ins
      const checkinsChannel = supabase
        .channel('admin-checkins-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checkins',
          },
          () => {
            // Refresh stats when changes occur
            loadFreshStats(true);
          }
        )
        .subscribe();

      // Subscribe to activity log
      const activityChannel = supabase
        .channel('admin-activity-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activity_log',
          },
          () => {
            // Refresh activity timeline
            loadFreshActivity(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(checkinsChannel);
        supabase.removeChannel(activityChannel);
      };
    };

    const cleanup = setupSubscriptions();
    return cleanup;
  }, [loadFreshStats, loadFreshActivity]);

  const refreshDashboardStats = useCallback(async () => {
    setRefreshing(true);
    await loadFreshStats(true); // Skip cache on manual refresh
    setRefreshing(false);
  }, [loadFreshStats]);

  const refreshActivityTimeline = useCallback(async () => {
    await loadFreshActivity(true); // Skip cache on manual refresh
  }, [loadFreshActivity]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadFreshStats(true),
      loadFreshActivity(true),
    ]);
    setRefreshing(false);
  }, [loadFreshStats, loadFreshActivity]);

  const clearCache = useCallback(() => {
    Cache.clear();
  }, []);

  const value: AdminDataContextType = {
    dashboardStats,
    activityTimeline,
    loading,
    refreshing,
    refreshDashboardStats,
    refreshActivityTimeline,
    refreshAll,
    clearCache,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}


