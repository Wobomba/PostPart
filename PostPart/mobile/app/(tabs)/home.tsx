import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AnimatedCard } from '../../components/AnimatedCard';
import { NotificationsModal } from '../../components/NotificationsModal';
import { OrganizationSelectionModal } from '../../components/OrganizationSelectionModal';
import { Screen } from '../../components/Screen';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { HapticFeedback } from '../../utils/effects';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    centersVisited: 0,
    totalCheckIns: 0,
    unreadNotifications: 0,
  });
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [activeCheckIn, setActiveCheckIn] = useState<any | null>(null);
  const [frequentCenters, setFrequentCenters] = useState<any[]>([]);
  const [featuredCenters, setFeaturedCenters] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [organizationModalVisible, setOrganizationModalVisible] = useState(false);

  // Refresh data when screen comes into focus (e.g., after checkout)
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  useEffect(() => {
    loadUserData();
    
    // Set up realtime subscription for instant notification updates
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to parent_notifications for this user
      const notificationChannel = supabase
        .channel('parent-notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'parent_notifications',
            filter: `parent_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification change detected:', payload);
            // Reload notification count
            loadNotificationCount();
          }
        )
        .subscribe();

      // Subscribe to check-ins for this user to update active check-in status
      const checkInsChannel = supabase
        .channel('home-checkins-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'checkins',
            filter: `parent_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Check-in change detected:', payload);
            // Reload user data to update active check-in and recent check-ins
            loadUserData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notificationChannel);
        supabase.removeChannel(checkInsChannel);
      };
    };

    const cleanup = setupRealtimeSubscription();

    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, []);

  const loadNotificationCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load unread notification count
      const { data: notifications, error: notificationsError } = await supabase
        .from('parent_notifications')
        .select('id')
        .eq('parent_id', user.id)
        .eq('is_read', false);

      if (!notificationsError) {
        setStats(prev => ({
          ...prev,
          unreadNotifications: notifications?.length || 0,
        }));
      }
    } catch (err) {
      console.error('Error loading notification count:', err);
    }
  };

  const loadUserData = async () => {
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      
      // Handle refresh token errors
      if (getUserError) {
        if (getUserError.message?.includes('Refresh Token') || 
            getUserError.message?.includes('refresh_token') ||
            getUserError.message?.includes('Invalid Refresh Token')) {
          console.warn('Invalid refresh token, clearing session:', getUserError.message);
          await supabase.auth.signOut();
          router.replace('/(auth)/welcome');
          return;
        }
        // For other errors, continue but set guest name
        setUserName('Guest');
        return;
      }
      
      if (!user) {
        setUserName('Guest');
        return;
      }

      // Store user ID for the organization modal
      setUserId(user.id);

      // Load profile - with proper fallback hierarchy
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, organization_id')
          .eq('id', user.id)
          .single();
        
        if (!profileError && profile) {
          // Check if user has no organization set - show modal
          if (!profile.organization_id) {
            setOrganizationModalVisible(true);
          }
          
          // Set user name
          if (profile.full_name) {
            setUserName(profile.full_name);
          } else {
            // Priority 2: Use display name from auth metadata
            const authDisplayName = user.user_metadata?.full_name || user.user_metadata?.name;
            if (authDisplayName) {
              setUserName(authDisplayName);
            } else {
              // Priority 3: Last resort - use "Parent"
              setUserName('Parent');
            }
          }
        } else {
          // Priority 2: Use display name from auth metadata
          const authDisplayName = user.user_metadata?.full_name || user.user_metadata?.name;
          if (authDisplayName) {
            setUserName(authDisplayName);
          } else {
            // Priority 3: Last resort - use "Parent"
            setUserName('Parent');
          }
        }
      } catch (err) {
        // Silently handle - tables may not exist yet
        const authDisplayName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (authDisplayName) {
          setUserName(authDisplayName);
        } else {
          setUserName('Parent');
        }
      }

      // Load children - with error handling
      try {
        const { data: childrenData, error: childrenError } = await supabase
          .from('children')
          .select('*')
          .eq('parent_id', user.id)
          .order('date_of_birth', { ascending: false })
          .limit(3);
        if (!childrenError) {
          setChildren(childrenData || []);
        }
      } catch (err) {
        // Silently handle - table may not exist yet
        setChildren([]);
      }

      // Load recent check-ins - with error handling (max 5)
      try {
        const { data: recentCheckInsData, error: checkInsError } = await supabase
          .from('checkins')
          .select(`
            id,
            check_in_time,
            check_out_time,
            child_id,
            children (name),
            centers (id, name, city)
          `)
          .eq('parent_id', user.id)
          .order('check_in_time', { ascending: false })
          .limit(5);
        if (!checkInsError) {
          setRecentCheckIns(recentCheckInsData || []);
        }
      } catch (err) {
        // Silently handle - table may not exist yet
        setRecentCheckIns([]);
      }

      // Load active check-in (check-in without check-out) - get the most recent one
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
          .eq('parent_id', user.id)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (activeCheckInError) {
          console.error('Error loading active check-in:', activeCheckInError);
          setActiveCheckIn(null);
        } else {
          // Only set if there's actually an active check-in (no check_out_time)
          if (activeCheckInData && !activeCheckInData.check_out_time) {
            setActiveCheckIn(activeCheckInData);
          } else {
            setActiveCheckIn(null);
          }
        }
      } catch (err) {
        console.error('Error in active check-in load:', err);
        setActiveCheckIn(null);
      }

      // Load all check-ins for stats - with error handling
      try {
        const { data: allCheckIns, error: allCheckInsError } = await supabase
          .from('checkins')
          .select('center_id')
          .eq('parent_id', user.id);

        if (!allCheckInsError && allCheckIns) {
          const uniqueCenters = new Set(allCheckIns.map(c => c.center_id) || []);
          
          // Calculate most frequent centers
          const centerCounts = allCheckIns.reduce((acc: any, checkIn) => {
            acc[checkIn.center_id] = (acc[checkIn.center_id] || 0) + 1;
            return acc;
          }, {});

          if (centerCounts && Object.keys(centerCounts).length > 0) {
            const topCenterIds = Object.entries(centerCounts)
              .sort(([, a]: any, [, b]: any) => b - a)
              .slice(0, 3)
              .map(([centerId]) => centerId);

            try {
              const { data: topCentersData } = await supabase
                .from('centers')
                .select('id, name, city, address')
                .in('id', topCenterIds);

              // Add visit counts to centers
              const centersWithCounts = topCentersData?.map(center => ({
                ...center,
                visitCount: centerCounts[center.id],
              })) || [];

              setFrequentCenters(centersWithCounts);
            } catch (err) {
              // Silently handle - table may not exist yet
              setFrequentCenters([]);
            }
          }

          setStats(prev => ({
            ...prev,
            centersVisited: uniqueCenters.size,
            totalCheckIns: allCheckIns.length,
          }));
        }
      } catch (err) {
        // Silently handle - table may not exist yet
        setStats(prev => ({
          ...prev,
          centersVisited: 0,
          totalCheckIns: 0,
        }));
      }

      // Load unread notifications count
      await loadNotificationCount();

      // Load featured centers (2 centers for home screen)
      try {
        const { data: centersData, error: centersError } = await supabase
          .from('centers')
          .select('*')
          .eq('is_verified', true)
          .order('name')
          .limit(2);

        if (!centersError) {
          setFeaturedCenters(centersData || []);
        }
      } catch (err) {
        // Silently handle - table may not exist yet
        setFeaturedCenters([]);
      }
    } catch (error) {
      // Silently handle - show default values
      setUserName('Parent');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{userName || 'Loading...'}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              HapticFeedback.light();
              router.push('/(tabs)/profile');
            }}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationBadge}
            onPress={() => {
              HapticFeedback.light();
              setNotificationsVisible(true);
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            {stats.unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Spacing.xxxl + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Access Icons */}
        <View style={styles.quickAccessContainer}>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push('/(tabs)/centers')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="business" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Browse Centers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push('/children')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: Colors.accent + '15' }]}>
              <Ionicons name="people" size={28} color={Colors.accent} />
            </View>
            <Text style={styles.quickAccessLabel}>My Children</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push('/access-logs')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: Colors.info + '15' }]}>
              <Ionicons name="time" size={28} color={Colors.info} />
            </View>
            <Text style={styles.quickAccessLabel}>Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Active Check-Out Card */}
        {activeCheckIn && (
          <AnimatedCard variant="elevated" padding="large" style={[styles.quickActionCard, { borderLeftWidth: 4, borderLeftColor: Colors.warning }]} delay={0}>
            <View style={styles.quickActionContent}>
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.warning + '15' }]}>
                <Ionicons name="log-out" size={32} color={Colors.warning} />
              </View>
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>Active Check-In</Text>
                <Text style={styles.quickActionSubtitle}>
                  {activeCheckIn.children?.first_name} {activeCheckIn.children?.last_name} at {activeCheckIn.centers?.name}
                </Text>
                <Text style={styles.checkInTime}>
                  Checked in: {new Date(activeCheckIn.check_in_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            <Button
              title="Check Out"
              onPress={() => router.push({
                pathname: '/check-out',
                params: { checkInId: activeCheckIn.id }
              })}
              icon="log-out"
              size="medium"
              fullWidth
              variant="primary"
            />
          </AnimatedCard>
        )}

        {/* Quick Check-In Card */}
        <AnimatedCard variant="elevated" padding="large" style={styles.quickActionCard} delay={activeCheckIn ? 100 : 0}>
          <View style={styles.quickActionContent}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="qr-code" size={32} color={Colors.primary} />
            </View>
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Quick Check-In</Text>
              <Text style={styles.quickActionSubtitle}>Scan QR code at daycare</Text>
            </View>
          </View>
          <Button
            title="Scan Now"
            onPress={() => router.push('/scan')}
            icon="scan"
            size="medium"
            fullWidth
          />
        </AnimatedCard>

        {/* Browse Centers Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Browse Centers</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/centers')}>
                <Text style={styles.seeAllText}>View More</Text>
              </TouchableOpacity>
            </View>

            {featuredCenters.length > 0 ? (
              featuredCenters.map((center) => (
                <Card
                  key={center.id}
                  variant="outlined"
                  padding="medium"
                  onPress={() => router.push(`/center-detail?id=${center.id}`)}
                  style={styles.centerCard}
                >
                  <View style={styles.centerContent}>
                    <View style={[styles.centerIconSmall, { backgroundColor: Colors.primary + '15' }]}>
                      <Ionicons name="business" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.centerInfo}>
                      <Text style={styles.centerName}>{center.name}</Text>
                      {center.city && (
                        <Text style={styles.centerLocation}>
                          <Ionicons name="location" size={12} color={Colors.textLight} /> {center.city}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </View>
                </Card>
              ))
            ) : (
              <Card variant="outlined" padding="medium" style={styles.centerCard}>
                <Text style={styles.emptyText}>No centers available</Text>
              </Card>
            )}
          </View>

          {/* My Children Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Children</Text>
              <TouchableOpacity onPress={() => router.push('/children')}>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {children.length > 0 ? (
              children.map((child) => (
                <Card
                  key={child.id}
                  variant="outlined"
                  padding="medium"
                  onPress={() => router.push('/children')}
                  style={styles.childCard}
                >
                  <View style={styles.childCardContent}>
                    <View style={[styles.childIconSmall, { backgroundColor: Colors.accent + '15' }]}>
                      <Ionicons name="person" size={20} color={Colors.accent} />
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{child.name || `${child.first_name} ${child.last_name}`}</Text>
                      <Text style={styles.childAge}>
                        {new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()} years old
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </View>
                </Card>
              ))
            ) : (
              <Card variant="outlined" padding="medium" onPress={() => router.push('/children/add')} style={styles.emptyCard}>
                <View style={styles.emptyCardContent}>
                  <Ionicons name="add-circle-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyCardText}>Add your first child</Text>
                </View>
              </Card>
            )}
          </View>

          {/* Activity Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Activity</Text>
              <TouchableOpacity onPress={() => router.push('/access-logs')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentCheckIns.length > 0 ? (
              recentCheckIns.map((checkIn) => {
                const isActive = !checkIn.check_out_time;
                return (
                  <Card
                    key={checkIn.id}
                    variant="outlined"
                    padding="medium"
                    style={styles.activityCard}
                  >
                    <View style={styles.activityContent}>
                      <View style={[
                        styles.activityIcon, 
                        { backgroundColor: isActive ? Colors.warning + '15' : Colors.success + '15' }
                      ]}>
                        <Ionicons 
                          name={isActive ? "time" : "checkmark-circle"} 
                          size={20} 
                          color={isActive ? Colors.warning : Colors.success} 
                        />
                      </View>
                      <View style={styles.activityInfo}>
                        <View style={styles.activityHeader}>
                          <Text style={styles.activityTitle}>{checkIn.centers?.name}</Text>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: isActive ? Colors.warning + '20' : Colors.success + '20' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: isActive ? Colors.warning : Colors.success }
                            ]}>
                              {isActive ? 'Active' : 'Completed'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.activitySubtitle}>
                          {checkIn.children?.name} • {new Date(checkIn.check_in_time).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </Text>
                        {checkIn.check_out_time && (
                          <Text style={styles.activitySubtitle}>
                            Checked out: {new Date(checkIn.check_out_time).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })
            ) : (
              <Card variant="outlined" padding="medium" style={styles.emptyCard}>
                <Text style={styles.emptyText}>No recent activity</Text>
              </Card>
            )}
          </View>

          {/* Frequent Centers (if any) */}
          {frequentCenters.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Favorite Centers</Text>
              </View>

              {frequentCenters.map((center) => (
                <Card
                  key={center.id}
                  variant="outlined"
                  padding="medium"
                  onPress={() => router.push(`/center-detail?id=${center.id}`)}
                  style={styles.centerCard}
                >
                  <View style={styles.centerContent}>
                    <View style={[styles.centerIconSmall, { backgroundColor: Colors.primary + '15' }]}>
                      <Ionicons name="business" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.centerInfo}>
                      <Text style={styles.centerName}>{center.name}</Text>
                      <Text style={styles.centerLocation}>
                        <Ionicons name="location" size={12} color={Colors.textLight} /> {center.city}
                      </Text>
                    </View>
                    <View style={styles.visitBadge}>
                      <Text style={styles.visitCount}>{center.visitCount}</Text>
                      <Text style={styles.visitLabel}>visits</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
      </ScrollView>

      {/* Notifications Modal */}
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onNotificationCountChange={(count) => {
          setStats(prev => ({ ...prev, unreadNotifications: count }));
        }}
      />

      {/* Organization Selection Modal */}
      {userId && (
        <OrganizationSelectionModal
          visible={organizationModalVisible}
          onClose={() => setOrganizationModalVisible(false)}
          userId={userId}
          onOrganizationSelected={() => {
            setOrganizationModalVisible(false);
            loadUserData(); // Reload data after organization is selected
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  quickAccessItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickAccessIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickAccessLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  userName: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  notificationBadge: {
    position: 'relative',
    padding: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.round,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  checkInTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  quickActionCard: {
    marginBottom: Spacing.lg,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  quickActionSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  linkCard: {
    marginBottom: Spacing.sm,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  linkText: {
    flex: 1,
  },
  linkTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  // Children section
  childCard: {
    marginBottom: Spacing.sm,
  },
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childIconSmall: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  childAge: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  // Recent activity
  activityCard: {
    marginBottom: Spacing.sm,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  activitySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  // Frequent centers
  centerCard: {
    marginBottom: Spacing.sm,
  },
  centerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerIconSmall: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  centerInfo: {
    flex: 1,
  },
  centerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  centerLocation: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  visitBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  visitCount: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  visitLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  emptyCard: {
    marginBottom: Spacing.sm,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  emptyCardText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
