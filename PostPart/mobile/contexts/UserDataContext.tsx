import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Cache, CacheKeys } from '../utils/cache';

interface UserProfile {
  id: string;
  full_name: string;
  organization_id: string | null;
  status: string;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  name?: string;
  date_of_birth: string;
  allergies?: string;
  notes?: string;
}

interface UserStats {
  centersVisited: number;
  totalCheckIns: number;
  unreadNotifications: number;
}

interface RecentCheckIn {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  child_id: string;
  children: { name: string } | { first_name: string; last_name: string };
  centers: { id: string; name: string; city?: string };
}

interface ActiveCheckIn {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  child_id: string;
  children: { first_name: string; last_name: string };
  centers: { id: string; name: string };
}

interface Center {
  id: string;
  name: string;
  city?: string;
  address?: string;
  visitCount?: number;
}

interface UserDataContextType {
  // User info
  user: { id: string; email: string | undefined } | null;
  profile: UserProfile | null;
  userName: string;
  
  // Data
  children: Child[];
  stats: UserStats;
  recentCheckIns: RecentCheckIn[];
  activeCheckIn: ActiveCheckIn | null;
  featuredCenters: Center[];
  frequentCenters: Center[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshChildren: () => Promise<void>;
  refreshCheckIns: () => Promise<void>;
  refreshStats: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children: propsChildren }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userName, setUserName] = useState('Parent');
  const [children, setChildren] = useState<Child[]>([]);
  const [stats, setStats] = useState<UserStats>({
    centersVisited: 0,
    totalCheckIns: 0,
    unreadNotifications: 0,
  });
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [activeCheckIn, setActiveCheckIn] = useState<ActiveCheckIn | null>(null);
  const [featuredCenters, setFeaturedCenters] = useState<Center[]>([]);
  const [frequentCenters, setFrequentCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load cached data immediately for instant display
  const loadCachedData = useCallback(async () => {
    try {
      const [cachedProfile, cachedChildren, cachedStats, cachedRecentCheckIns, cachedActiveCheckIn] = await Promise.all([
        Cache.get<UserProfile>(CacheKeys.USER_PROFILE),
        Cache.get<Child[]>(CacheKeys.USER_CHILDREN),
        Cache.get<UserStats>(CacheKeys.USER_STATS),
        Cache.get<RecentCheckIn[]>(CacheKeys.RECENT_CHECKINS),
        Cache.get<ActiveCheckIn>(CacheKeys.ACTIVE_CHECKIN),
      ]);

      if (cachedProfile) {
        setProfile(cachedProfile);
        setUserName(cachedProfile.full_name || 'Parent');
      }
      if (cachedChildren) setChildren(cachedChildren);
      if (cachedStats) setStats(cachedStats);
      if (cachedRecentCheckIns) setRecentCheckIns(cachedRecentCheckIns);
      if (cachedActiveCheckIn) setActiveCheckIn(cachedActiveCheckIn);
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }, []);

  // Load fresh data from Supabase
  const loadFreshData = useCallback(async (userId: string, skipCache = false) => {
    try {
      // Load profile and user name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, organization_id, status, id')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Handle network errors gracefully
        if (profileError.message?.includes('network') || profileError.message?.includes('fetch') || profileError.message?.includes('Network request failed')) {
          console.warn('Network error loading profile, using cached data:', profileError.message);
          // Try to get name from auth metadata as fallback
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const authName = user.user_metadata?.full_name || user.user_metadata?.name;
              if (authName && userName === 'Parent') {
                setUserName(authName);
              }
            }
          } catch (authError) {
            // Ignore auth errors
          }
          return; // Use cached data instead
        }
        throw profileError;
      }

      if (profileData) {
        const profile: UserProfile = {
          id: profileData.id,
          full_name: profileData.full_name || '',
          organization_id: profileData.organization_id,
          status: profileData.status,
        };
        setProfile(profile);
        // Set userName from profile, or fallback to auth metadata, or keep existing userName, or 'Parent'
        let nameToUse = profileData.full_name?.trim();
        if (!nameToUse || nameToUse === '') {
          // Try to get from auth metadata as fallback
          try {
            const { data: { user } } = await supabase.auth.getUser();
            nameToUse = user?.user_metadata?.full_name || user?.user_metadata?.name;
          } catch (authError) {
            // Ignore auth errors
          }
          // If still no name, keep existing userName if it's not 'Parent', otherwise use 'Parent'
          if (!nameToUse || nameToUse === '') {
            nameToUse = userName && userName !== 'Parent' ? userName : 'Parent';
          }
        }
        setUserName(nameToUse);
        if (!skipCache) await Cache.set(CacheKeys.USER_PROFILE, profile);
      } else {
        // If no profile data, try to get name from auth metadata
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const authName = user.user_metadata?.full_name || user.user_metadata?.name;
            if (authName) {
              setUserName(authName);
            }
          }
        } catch (authError) {
          // Ignore auth errors
        }
      }

      // Load children
      try {
        const { data: childrenData, error: childrenError } = await supabase
          .from('children')
          .select('*')
          .eq('parent_id', userId)
          .order('date_of_birth', { ascending: false });

        if (childrenError && !childrenError.message?.includes('network') && !childrenError.message?.includes('fetch')) {
          throw childrenError;
        }

        if (childrenData) {
          setChildren(childrenData);
          if (!skipCache) await Cache.set(CacheKeys.USER_CHILDREN, childrenData);
        }
      } catch (error: any) {
        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          console.warn('Network error loading children, using cached data:', error.message);
        } else {
          console.error('Error loading children:', error);
        }
      }

      // Load recent check-ins (last 5)
      try {
        const { data: recentCheckInsData, error: checkInsError } = await supabase
          .from('checkins')
          .select(`
            id,
            check_in_time,
            check_out_time,
            child_id,
            children (first_name, last_name, name),
            centers (id, name, city)
          `)
          .eq('parent_id', userId)
          .order('check_in_time', { ascending: false })
          .limit(5);

        if (checkInsError && !checkInsError.message?.includes('network') && !checkInsError.message?.includes('fetch')) {
          throw checkInsError;
        }

        if (recentCheckInsData) {
          setRecentCheckIns(recentCheckInsData);
          if (!skipCache) await Cache.set(CacheKeys.RECENT_CHECKINS, recentCheckInsData);
        }
      } catch (error: any) {
        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          console.warn('Network error loading check-ins, using cached data:', error.message);
        } else {
          console.error('Error loading check-ins:', error);
        }
      }

      // Load active check-in
      try {
        const { data: activeCheckInData, error: activeCheckInError } = await supabase
          .from('checkins')
          .select(`
            id,
            check_in_time,
            check_out_time,
            child_id,
            children (first_name, last_name),
            centers (id, name)
          `)
          .eq('parent_id', userId)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeCheckInError && !activeCheckInError.message?.includes('network') && !activeCheckInError.message?.includes('fetch')) {
          throw activeCheckInError;
        }

        if (activeCheckInData && !activeCheckInData.check_out_time) {
          setActiveCheckIn(activeCheckInData);
          if (!skipCache) await Cache.set(CacheKeys.ACTIVE_CHECKIN, activeCheckInData);
        } else {
          setActiveCheckIn(null);
          if (!skipCache) await Cache.remove(CacheKeys.ACTIVE_CHECKIN);
        }
      } catch (error: any) {
        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          console.warn('Network error loading active check-in, using cached data:', error.message);
        } else {
          console.error('Error loading active check-in:', error);
        }
      }

      // Load stats in parallel and frequent centers
      let allCheckIns: any[] = [];
      try {
        const [allCheckInsResult, notificationsResult] = await Promise.all([
          supabase
            .from('checkins')
            .select('center_id')
            .eq('parent_id', userId),
          supabase
            .from('parent_notifications')
            .select('id')
            .eq('parent_id', userId)
            .eq('is_read', false),
        ]);

        // Check for network errors
        if (allCheckInsResult.error && !allCheckInsResult.error.message?.includes('network') && !allCheckInsResult.error.message?.includes('fetch')) {
          throw allCheckInsResult.error;
        }
        if (notificationsResult.error && !notificationsResult.error.message?.includes('network') && !notificationsResult.error.message?.includes('fetch')) {
          throw notificationsResult.error;
        }

        allCheckIns = allCheckInsResult.data || [];
        const uniqueCenters = new Set(allCheckIns.map(c => c.center_id));
        const unreadNotifications = notificationsResult.data?.length || 0;

        const newStats: UserStats = {
          centersVisited: uniqueCenters.size,
          totalCheckIns: allCheckIns.length,
          unreadNotifications,
        };
        setStats(newStats);
        if (!skipCache) await Cache.set(CacheKeys.USER_STATS, newStats);
      } catch (error: any) {
        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          console.warn('Network error loading stats, using cached data:', error.message);
        } else {
          console.error('Error loading stats:', error);
        }
      }

      // Load frequent centers (using allCheckIns from above)
      if (allCheckIns.length > 0) {
        try {
          const centerCounts = allCheckIns.reduce((acc: any, checkIn) => {
            acc[checkIn.center_id] = (acc[checkIn.center_id] || 0) + 1;
            return acc;
          }, {});

          if (Object.keys(centerCounts).length > 0) {
            const topCenterIds = Object.entries(centerCounts)
              .sort(([, a]: any, [, b]: any) => b - a)
              .slice(0, 3)
              .map(([centerId]) => centerId);

            const { data: topCentersData, error: topCentersError } = await supabase
              .from('centers')
              .select('id, name, city, address')
              .in('id', topCenterIds);

            if (topCentersError && !topCentersError.message?.includes('network') && !topCentersError.message?.includes('fetch')) {
              throw topCentersError;
            }

            if (topCentersData) {
              const centersWithCounts = topCentersData.map(center => ({
                ...center,
                visitCount: centerCounts[center.id],
              }));
              setFrequentCenters(centersWithCounts);
              if (!skipCache) await Cache.set(CacheKeys.FREQUENT_CENTERS, centersWithCounts);
            }
          }
        } catch (error: any) {
          if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
            console.warn('Network error loading frequent centers, using cached data:', error.message);
          } else {
            console.error('Error loading frequent centers:', error);
          }
        }
      }

      // Load featured centers
      const { data: centersData } = await supabase
        .from('centers')
        .select('*')
        .eq('is_verified', true)
        .order('name')
        .limit(2);

      if (centersData) {
        setFeaturedCenters(centersData);
        if (!skipCache) await Cache.set(CacheKeys.FEATURED_CENTERS, centersData);
      }
    } catch (error) {
      console.error('Error loading fresh data:', error);
    }
  }, []);

  // Initial load: cache first, then fresh data
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      // Load cached data first for instant display
      await loadCachedData();

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          // Check for refresh token errors
          if (error.message?.includes('refresh token') || 
              error.message?.includes('Refresh Token') ||
              error.message?.includes('refresh_token') ||
              error.message?.toLowerCase().includes('refresh token not found')) {
            console.warn('Refresh token error, clearing session:', error.message);
            // Clear invalid session
            await supabase.auth.signOut().catch(() => {});
          }
          setLoading(false);
          return;
        }
        
        if (!user) {
          setLoading(false);
          return;
        }

        setUser({ id: user.id, email: user.email });
        
        // Set userName from auth metadata as fallback if profile not loaded yet
        const authName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (authName && (userName === 'Parent' || !userName)) {
          setUserName(authName);
        }
        
        // Load fresh data in background (this will update userName from profile if available)
        await loadFreshData(user.id);
      } catch (error: any) {
        // Check for refresh token errors in catch block
        if (error?.message?.includes('refresh token') || 
            error?.message?.includes('Refresh Token') ||
            error?.message?.includes('refresh_token') ||
            error?.message?.toLowerCase().includes('refresh token not found')) {
          console.warn('Refresh token error in initialization, clearing session:', error.message);
          await supabase.auth.signOut().catch(() => {});
        } else {
          console.error('Error initializing user data:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [loadCachedData, loadFreshData]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const setupSubscriptions = async () => {
      // Subscribe to check-ins
      const checkInsChannel = supabase
        .channel('user-checkins-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checkins',
            filter: `parent_id=eq.${user.id}`,
          },
          () => {
            // Refresh check-ins and stats when changes occur
            loadFreshData(user.id, true);
          }
        )
        .subscribe();

      // Subscribe to notifications
      const notificationsChannel = supabase
        .channel('user-notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'parent_notifications',
            filter: `parent_id=eq.${user.id}`,
          },
          () => {
            // Refresh notification count
            refreshStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(checkInsChannel);
        supabase.removeChannel(notificationsChannel);
      };
    };

    const cleanup = setupSubscriptions();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [user, loadFreshData]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadFreshData(user.id, true); // Skip cache on manual refresh
    setRefreshing(false);
  }, [user, loadFreshData]);

  const refreshChildren = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', user.id)
      .order('date_of_birth', { ascending: false });
    if (data) {
      setChildren(data);
      await Cache.set(CacheKeys.USER_CHILDREN, data);
    }
  }, [user]);

  const refreshCheckIns = useCallback(async () => {
    if (!user) return;
    await loadFreshData(user.id, true);
  }, [user, loadFreshData]);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    const [checkInsResult, notificationsResult] = await Promise.all([
      supabase
        .from('checkins')
        .select('center_id')
        .eq('parent_id', user.id),
      supabase
        .from('parent_notifications')
        .select('id')
        .eq('parent_id', user.id)
        .eq('is_read', false),
    ]);

    const allCheckIns = checkInsResult.data || [];
    const uniqueCenters = new Set(allCheckIns.map(c => c.center_id));
    const unreadNotifications = notificationsResult.data?.length || 0;

    const newStats: UserStats = {
      centersVisited: uniqueCenters.size,
      totalCheckIns: allCheckIns.length,
      unreadNotifications,
    };
    setStats(newStats);
    await Cache.set(CacheKeys.USER_STATS, newStats);
  }, [user]);

  const clearCache = useCallback(async () => {
    await Cache.clear();
  }, []);

  const value: UserDataContextType = {
    user,
    profile,
    userName,
    children,
    stats,
    recentCheckIns,
    activeCheckIn,
    featuredCenters,
    frequentCenters,
    loading,
    refreshing,
    refreshData,
    refreshChildren,
    refreshCheckIns,
    refreshStats,
    clearCache,
  };

  return <UserDataContext.Provider value={value}>{propsChildren}</UserDataContext.Provider>;
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

