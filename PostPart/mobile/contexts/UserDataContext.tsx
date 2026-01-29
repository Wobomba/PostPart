import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { Cache, CacheKeys } from '../utils/cache';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';

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
    console.log('🔄 Loading fresh data for user:', userId);
    try {
      // Load profile and user name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, organization_id, status, id')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to handle case where profile doesn't exist yet
      
      console.log('📋 Profile query result:', { profileData, profileError: profileError?.message });

      // Check if user is active before loading data
      const isActive = profileData?.status === 'active';
      if (!isActive && profileData) {
        console.log('⚠️ User is not active, skipping data load. Status:', profileData.status);
        // Still set profile and userName, but don't load other data
        if (profileData) {
          const profile: UserProfile = {
            id: profileData.id,
            full_name: profileData.full_name || '',
            organization_id: profileData.organization_id,
            status: profileData.status,
          };
          setProfile(profile);
          if (profileData.full_name?.trim()) {
            setUserName(profileData.full_name.trim());
          }
        }
        return; // Exit early if user is not active
      }

      if (profileError) {
        // PGRST116 means "no rows found" - profile doesn't exist yet, which is OK
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found yet, using auth metadata as fallback');
          // Try to get name from auth metadata as fallback
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const authName = user.user_metadata?.full_name || user.user_metadata?.name;
              if (authName && authName.trim() !== '') {
                setUserName(authName.trim());
              } else {
                // Use email username as last resort
                const emailName = user.email?.split('@')[0] || 'Parent';
                setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
              }
            }
          } catch (authError) {
            // Ignore auth errors, use default
            setUserName('Parent');
          }
          // Don't return - continue loading other data even if profile doesn't exist
        } else {
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
            // Don't return - continue loading other data
          } else {
            // For other errors, log but don't throw - use fallback
            console.error('Error fetching profile:', profileError);
            // Try to get name from auth metadata as fallback
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const authName = user.user_metadata?.full_name || user.user_metadata?.name;
                if (authName && authName.trim() !== '') {
                  setUserName(authName.trim());
                } else {
                  const emailName = user.email?.split('@')[0] || 'Parent';
                  setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
                }
              }
            } catch (authError) {
              setUserName('Parent');
            }
            // Don't return - continue loading other data
          }
        }
      }

      if (profileData) {
        const profile: UserProfile = {
          id: profileData.id,
          full_name: profileData.full_name || '',
          organization_id: profileData.organization_id,
          status: profileData.status,
        };
        setProfile(profile);
        // Set userName from profile - always use profile.full_name if it exists and is not empty
        const profileName = profileData.full_name?.trim();
        if (profileName && profileName !== '') {
          // Always update userName if profile has a valid full_name
          setUserName(profileName);
        } else {
          // Profile doesn't have full_name or it's empty - AGGRESSIVELY sync from auth metadata
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const authName = user?.user_metadata?.full_name || user?.user_metadata?.name;
            if (authName && authName.trim() !== '') {
              // Set userName from auth metadata immediately
              setUserName(authName.trim());
              
              // ALWAYS sync to profile if profile name is empty (even if it was just set)
              // This ensures the database is updated
              const { syncAuthToProfile } = await import('../utils/profile');
              const syncResult = await syncAuthToProfile(userId).catch(err => {
                console.warn('Error syncing name to profile in UserDataContext:', err);
                return { success: false, error: err.message };
              });
              
              // If sync succeeded, reload profile data to get the updated name
              if (syncResult.success) {
                console.log('Successfully synced name to profile, reloading...');
                // Reload profile to get the synced name
                const { data: updatedProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', userId)
                  .maybeSingle();
                
                if (updatedProfile?.full_name?.trim()) {
                  setUserName(updatedProfile.full_name.trim());
                }
              }
            } else if (userName === 'Parent') {
              // Keep 'Parent' if we don't have any name
              setUserName('Parent');
            }
          } catch (authError) {
            // Ignore auth errors, keep existing userName
            console.warn('Error getting auth user in UserDataContext:', authError);
          }
        }
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

        console.log('👶 Children query result:', { count: childrenData?.length || 0, error: childrenError?.message });

        if (childrenError && !childrenError.message?.includes('network') && !childrenError.message?.includes('fetch')) {
          throw childrenError;
        }

        if (childrenData) {
          setChildren(childrenData);
          if (!skipCache) await Cache.set(CacheKeys.USER_CHILDREN, childrenData);
          console.log('✅ Children loaded:', childrenData.length);
        }
      } catch (error: any) {
        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          console.warn('⚠️ Network error loading children, using cached data:', error.message);
        } else {
          console.error('❌ Error loading children:', error);
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

        console.log('📋 Recent check-ins query result:', { count: recentCheckInsData?.length || 0, error: checkInsError?.message });

        if (checkInsError) {
          console.error('❌ Check-ins query error details:', {
            message: checkInsError.message,
            code: checkInsError.code,
            details: checkInsError.details,
            hint: checkInsError.hint,
          });
          
          if (checkInsError.message?.includes('network') || checkInsError.message?.includes('fetch')) {
            console.warn('⚠️ Network error loading check-ins, using cached data:', checkInsError.message);
          } else {
            console.error('❌ Error loading check-ins (non-network):', checkInsError);
        }
        } else if (recentCheckInsData) {
          setRecentCheckIns(recentCheckInsData);
          console.log('✅ Recent check-ins loaded:', recentCheckInsData.length);
          if (!skipCache) await Cache.set(CacheKeys.RECENT_CHECKINS, recentCheckInsData);
        } else {
          console.log('ℹ️ No recent check-ins data returned (empty array or null)');
        }
      } catch (error: any) {
        console.error('❌ Exception loading check-ins:', error);
        // Don't rethrow - continue loading other data
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
        console.log('📊 Stats loaded:', newStats);
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
      try {
        const { data: centersData, error: centersError } = await supabase
        .from('centers')
        .select('*')
        .eq('is_verified', true)
        .order('name')
        .limit(2);

        console.log('🏢 Featured centers query result:', { count: centersData?.length || 0, error: centersError?.message });

        if (centersError) {
          if (centersError.message?.includes('network') || centersError.message?.includes('fetch')) {
            console.warn('⚠️ Network error loading featured centers, using cached data:', centersError.message);
          } else {
            console.error('❌ Error loading featured centers:', centersError);
          }
        } else if (centersData) {
        setFeaturedCenters(centersData);
          console.log('✅ Featured centers loaded:', centersData.length);
        if (!skipCache) await Cache.set(CacheKeys.FEATURED_CENTERS, centersData);
        }
      } catch (error: any) {
        console.error('❌ Exception loading featured centers:', error);
      }
    } catch (error) {
      console.error('❌ Error loading fresh data:', error);
      // Even if there's an error, try to load at least some data
      // This ensures partial data is available even if some queries fail
      console.log('🔄 Attempting to load data individually after error...');
      
      // Try to load centers independently
      try {
        const { data: centersData } = await supabase
          .from('centers')
          .select('*')
          .eq('is_verified', true)
          .order('name')
          .limit(2);
        if (centersData && centersData.length > 0) {
          setFeaturedCenters(centersData);
          console.log('✅ Loaded centers after error:', centersData.length);
        }
      } catch (centerError) {
        console.error('❌ Failed to load centers after error:', centerError);
      }
    }
  }, []);

  const getUserId = useCallback(async () => {
    if (user?.id) return user.id;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email });
        return authUser.id;
      }
    } catch (error) {
      console.error('Error getting auth user for refresh:', error);
    }
    return null;
  }, [user]);

  // Initial load: cache first, then fresh data
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      // Load cached data first for instant display
      await loadCachedData();

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          // Check for 403 Forbidden (invalid/expired session)
          if (error.status === 403 || error.message?.includes('403') || error.message?.includes('Forbidden')) {
            console.warn('403 Forbidden - Session invalid, clearing session:', error.message);
            await supabase.auth.signOut().catch(() => {});
            setLoading(false);
            return;
          }
          
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
        
        // Register for push notifications
        try {
          await registerForPushNotificationsAsync();
        } catch (error) {
          console.error('Error registering for push notifications:', error);
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

  // Listen for auth state changes (especially SIGNED_OUT)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session ? 'has session' : 'no session');
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('🚪 User signed out, clearing user state and data');
        // Clear all user-related state
        setUser(null);
        setProfile(null);
        setUserName('Parent');
        setChildren([]);
        setStats({
          centersVisited: 0,
          totalCheckIns: 0,
          unreadNotifications: 0,
        });
        setRecentCheckIns([]);
        setActiveCheckIn(null);
        setFeaturedCenters([]);
        setFrequentCenters([]);
        // Clear cache
        try {
          await Cache.clear();
        } catch (error) {
          console.error('Error clearing cache on logout:', error);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // User signed in - set user state
        setUser({ id: session.user.id, email: session.user.email });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const setupSubscriptions = async () => {
      // Verify user is still authenticated before setting up subscriptions
      try {
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !currentUser || currentUser.id !== user.id) {
          console.log('⚠️ User not authenticated, skipping subscription setup');
          return;
        }
      } catch (error) {
        console.warn('⚠️ Error verifying auth before subscriptions:', error);
        return;
      }

      // Subscribe to check-ins
      let checkInsChannel: any = null;
      try {
        checkInsChannel = supabase
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
              // Verify user is still authenticated before refreshing
              supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
                if (currentUser && currentUser.id === user.id) {
                  loadFreshData(user.id, true);
                }
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Check-ins subscription active');
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ Check-ins subscription error (non-critical, will use polling fallback)');
            }
          });
      } catch (error) {
        console.warn('⚠️ Error setting up check-ins subscription:', error);
      }

      // Subscribe to notifications
      let notificationsChannel: any = null;
      try {
        notificationsChannel = supabase
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
              // Verify user is still authenticated before refreshing
              supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
                if (currentUser && currentUser.id === user.id) {
                  refreshStats();
                }
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Notifications subscription active');
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ Notifications subscription error (non-critical, will use polling fallback)');
            }
          });
      } catch (error) {
        console.warn('⚠️ Error setting up notifications subscription:', error);
      }

      // Subscribe to profile changes (for when account is activated/updated/suspended)
      let profileChannel: any = null;
      try {
        profileChannel = supabase
          .channel('user-profile-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            async (payload) => {
              // Verify user is still authenticated before processing
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (!currentUser || currentUser.id !== user.id) {
                return;
              }
              
              // Refresh profile data when profile is updated (e.g., account activated, status changed)
              console.log('🔄 Profile updated, refreshing data:', payload);
              console.log('📝 Status changed:', payload.new?.status, '→', payload.old?.status);
              console.log('🏢 Organization ID changed:', payload.new?.organization_id, '→', payload.old?.organization_id);
              
              // Check if account was just activated (status changed from inactive/null to active)
              const wasInactive = !payload.old?.status || payload.old?.status === 'inactive';
              const isNowActive = payload.new?.status === 'active';
              const justActivated = wasInactive && isNowActive;
              
              if (justActivated) {
                console.log('✅ Account just activated! Forcing immediate data refresh...');
                // Force immediate refresh of all data when account is activated
                // The profile state update will trigger useEffect hooks in components
                await loadFreshData(user.id, true);
              } else {
                // For other updates, refresh data normally
                loadFreshData(user.id, true);
              }
              
              // If organization_id changed, we need to re-subscribe to the new organization
              if (payload.new?.organization_id !== payload.old?.organization_id) {
                console.log('🔄 Organization ID changed, will re-subscribe on next profile load');
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Profile subscription active');
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ Profile subscription error (non-critical, will use polling fallback)');
              // If subscription fails, the periodic refresh will still work
            }
          });
      } catch (error) {
        console.warn('⚠️ Error setting up profile subscription:', error);
      }

      // Subscribe to organization changes (for when organization status changes)
      // We need to get the organization_id first, then subscribe
      let orgChannel: any = null;
      
      const setupOrgSubscription = async () => {
        try {
          // Clean up existing org subscription if any
          if (orgChannel) {
            console.log('🧹 Cleaning up existing organization subscription');
            supabase.removeChannel(orgChannel);
            orgChannel = null;
          }

          const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profileData?.organization_id) {
            console.log('🔔 Setting up organization subscription for org:', profileData.organization_id);
            try {
              orgChannel = supabase
                .channel(`user-organization-changes-${user.id}`)
                .on(
                  'postgres_changes',
                  {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'organizations',
                    filter: `id=eq.${profileData.organization_id}`,
                  },
                  async (payload) => {
                    // Verify user is still authenticated before processing
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    if (!currentUser || currentUser.id !== user.id) {
                      return;
                    }
                    
                    // Organization status changed - refresh all data
                    console.log('🏢 Organization updated, refreshing data:', payload);
                    console.log('📝 Organization status changed:', payload.new?.status, '→', payload.old?.status);
                    // Force refresh all data including profile and status
                    loadFreshData(user.id, true);
                  }
                )
                .subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                    console.log('✅ Organization subscription active');
                  } else if (status === 'CHANNEL_ERROR') {
                    console.warn('⚠️ Organization subscription error (non-critical, will use polling fallback)');
                  }
                });
            } catch (error) {
              console.warn('⚠️ Error setting up organization subscription:', error);
            }
          } else {
            console.log('ℹ️ No organization_id found, skipping organization subscription');
          }
        } catch (error) {
          console.error('Error setting up organization subscription:', error);
        }
      };

      // Set up organization subscription initially
      setupOrgSubscription();
      
      // Re-subscribe when profile changes (in case organization_id changes)
      // We'll set up a listener that re-runs setupOrgSubscription when profile.organization_id changes
      // This is handled by the profile subscription above triggering loadFreshData

      return () => {
        console.log('🧹 Cleaning up subscriptions');
        try {
          if (checkInsChannel) {
            supabase.removeChannel(checkInsChannel);
          }
          if (notificationsChannel) {
            supabase.removeChannel(notificationsChannel);
          }
          if (profileChannel) {
            supabase.removeChannel(profileChannel);
          }
          if (orgChannel) {
            supabase.removeChannel(orgChannel);
          }
        } catch (error) {
          console.warn('⚠️ Error cleaning up subscriptions:', error);
        }
      };
    };

    const cleanup = setupSubscriptions();
    return () => {
      cleanup.then(fn => fn && fn()).catch(err => {
        console.warn('⚠️ Error in subscription cleanup:', err);
      });
    };
  }, [user, loadFreshData]);

  // Monitor app state and refresh data when app comes to foreground
  // This ensures updates are picked up even if real-time subscriptions fail
  useEffect(() => {
    if (!user) return;

    let appState = AppState.currentState;
    let refreshInterval: NodeJS.Timeout | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground - refresh data immediately
        console.log('📱 App came to foreground, refreshing data...');
        loadFreshData(user.id, true).catch(err => {
          console.error('Error refreshing data on foreground:', err);
        });
      }
      appState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic refresh when app is active (every 30 seconds)
    // This acts as a fallback if real-time subscriptions fail
    const startPeriodicRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      refreshInterval = setInterval(() => {
        if (AppState.currentState === 'active') {
          console.log('🔄 Periodic data refresh (fallback)...');
          loadFreshData(user.id, true).catch(err => {
            console.error('Error in periodic refresh:', err);
          });
        }
      }, 30000); // Refresh every 30 seconds
    };

    startPeriodicRefresh();

    return () => {
      subscription.remove();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [user, loadFreshData]);

  const refreshData = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    setRefreshing(true);
    await loadFreshData(userId, true); // Skip cache on manual refresh
    setRefreshing(false);
  }, [getUserId, loadFreshData]);

  const refreshChildren = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', userId)
        .order('date_of_birth', { ascending: false });
      if (error) {
        console.error('Error refreshing children:', error);
        return;
      }
      if (data) {
        setChildren(data);
        await Cache.set(CacheKeys.USER_CHILDREN, data);
      }
    } catch (error) {
      console.error('Error refreshing children (exception):', error);
    }
  }, [getUserId]);

  const refreshCheckIns = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    await loadFreshData(userId, true);
  }, [getUserId, loadFreshData]);

  const refreshStats = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const [checkInsResult, notificationsResult] = await Promise.all([
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
  }, [getUserId]);

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

