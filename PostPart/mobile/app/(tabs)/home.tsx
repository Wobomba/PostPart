import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NotificationsModal } from '../../components/NotificationsModal';
import { Screen } from '../../components/Screen';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    centersVisited: 0,
    totalCheckIns: 0,
    unreadNotifications: 0,
  });
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [frequentCenters, setFrequentCenters] = useState<any[]>([]);
  const [featuredCenters, setFeaturedCenters] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

      return () => {
        supabase.removeChannel(notificationChannel);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserName('Guest');
        return;
      }

      // Load profile - with proper fallback hierarchy
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (!profileError && profile && profile.full_name) {
          // Priority 1: Use full_name from profiles table
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

      // Load recent check-ins - with error handling
      try {
        const { data: recentCheckInsData, error: checkInsError } = await supabase
          .from('checkins')
          .select(`
            id,
            check_in_time,
            child_id,
            children (name),
            centers (id, name, city)
          `)
          .eq('parent_id', user.id)
          .order('check_in_time', { ascending: false })
          .limit(3);
        if (!checkInsError) {
          setRecentCheckIns(recentCheckInsData || []);
        }
      } catch (err) {
        // Silently handle - table may not exist yet
        setRecentCheckIns([]);
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
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationBadge}
            onPress={() => setNotificationsVisible(true)}
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
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search centers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  router.push(`/(tabs)/centers?q=${encodeURIComponent(searchQuery)}`);
                } else {
                  router.push('/(tabs)/centers');
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

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

        {/* Quick Check-In Card */}
        <Card variant="elevated" padding="large" style={styles.quickActionCard}>
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
        </Card>

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
              recentCheckIns.map((checkIn) => (
                <Card
                  key={checkIn.id}
                  variant="outlined"
                  padding="medium"
                  style={styles.activityCard}
                >
                  <View style={styles.activityContent}>
                    <View style={[styles.activityIcon, { backgroundColor: Colors.success + '15' }]}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{checkIn.centers?.name}</Text>
                      <Text style={styles.activitySubtitle}>
                        {checkIn.children?.name} • {new Date(checkIn.check_in_time).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  searchBarContainer: {
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    padding: 0,
  },
  clearButton: {
    padding: Spacing.xs,
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
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
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
  activityTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
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
