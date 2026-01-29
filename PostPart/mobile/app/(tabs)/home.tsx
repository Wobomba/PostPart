import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
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
import { checkParentStatus, ParentStatus } from '../../utils/parentStatus';
import { useProfile } from '../../hooks/useProfile';
import { useChildren } from '../../hooks/useChildren';
import { useRecentCheckIns, useActiveCheckIn, useCheckInStats } from '../../hooks/useCheckIns';
import { useFrequentCenters, useFeaturedCenters } from '../../hooks/useCenters';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { calculateAge } from '../../utils/age';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [parentStatus, setParentStatus] = useState<ParentStatus | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [organizationModalVisible, setOrganizationModalVisible] = useState(false);
  
  // Get user
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null);
  
  // Initialize user and listen for auth state changes
  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { id: user.id, email: user.email } : null);
    });
    
    // Listen for auth state changes (especially SIGNED_OUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        console.log('🚪 User signed out in home screen, clearing state');
        setUser(null);
        setParentStatus(null); // Clear parent status immediately
        setOrganizationModalVisible(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const userId = user?.id || null;
  
  // Use React Query hooks
  const { data: profile } = useProfile(userId);
  const { data: children = [] } = useChildren(userId);
  const { data: recentCheckIns = [] } = useRecentCheckIns(userId, 5);
  const { data: activeCheckIn } = useActiveCheckIn(userId);
  const { data: checkInStats } = useCheckInStats(userId);
  const { data: frequentCenters = [] } = useFrequentCenters(userId, 3);
  const { data: featuredCenters = [] } = useFeaturedCenters(2);
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount(userId);
  
  // Compute stats from check-in data
  const stats = {
    centersVisited: checkInStats?.centersVisited || 0,
    totalCheckIns: checkInStats?.totalCheckIns || 0,
    unreadNotifications,
  };
  
  // Get user name from profile
  const userName = profile?.full_name || 'Parent';
  
  // Refresh function
  const refreshData = async () => {
    if (userId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['children', userId] }),
        queryClient.invalidateQueries({ queryKey: ['checkins', userId] }),
        queryClient.invalidateQueries({ queryKey: ['centers'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
      ]);
    }
  };
  
  const refreshing = false; // React Query handles loading states

  // Refresh data when screen comes into focus (e.g., after checkout)
  useFocusEffect(
    React.useCallback(() => {
      // Don't refresh if user is logged out
      if (!user || !userId) {
        setParentStatus(null);
        return;
      }
      
      console.log('📱 Home screen focused, refreshing data and checking status...');
      const refresh = async () => {
        // Double-check user is still logged in before proceeding
        if (!user || !userId) {
          setParentStatus(null);
          return;
        }
        
        await refreshData();
        await checkStatus();
        // Only do delayed refresh if parent status is active
        if (parentStatus?.isActive && profile?.status === 'active') {
          setTimeout(async () => {
            // Triple-check user is still logged in before delayed refresh
            if (!user || !userId) {
              setParentStatus(null);
              return;
            }
            await refreshData();
            await checkStatus();
          }, 1000);
        }
      };
      refresh();
    }, [user, userId, profile?.status])
  );

  const checkStatus = async () => {
    // Don't check status if user is logged out - check multiple times for safety
    if (!user || !userId) {
      setParentStatus(null);
      return;
    }
    
    try {
      // Double-check user is still logged in before making the async call
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || currentUser.id !== userId) {
        // User signed out during the check
        setParentStatus(null);
        return;
      }
      
      const status = await checkParentStatus();
      
      // Triple-check user is still logged in after the async call
      const { data: { user: finalUser } } = await supabase.auth.getUser();
      if (!finalUser || finalUser.id !== userId) {
        // User signed out during the status check
        setParentStatus(null);
        return;
      }
      
      console.log('Home screen - Status check result:', {
        isActive: status.isActive,
        status: status.status,
        message: status.message,
      });
      setParentStatus(status);
    } catch (error) {
      console.error('Error checking status in home screen:', error);
      // Don't set status on error - keep previous state, but clear if user is logged out
      const { data: { user: errorUser } } = await supabase.auth.getUser();
      if (!errorUser || errorUser.id !== userId) {
        setParentStatus(null);
      }
    }
  };

  // Check parent status on mount and when profile changes
  useEffect(() => {
    // Clear status if user is logged out - do this FIRST before any async operations
    if (!user || !userId) {
      setParentStatus(null);
      setOrganizationModalVisible(false);
      return;
    }
    
    // Only check status if we have a valid user
    checkStatus();
    // Show organization modal if needed
    if (profile && !profile.organization_id && parentStatus?.isActive) {
      setOrganizationModalVisible(true);
    }
  }, [user, userId, profile, parentStatus]);

  // Re-check status when profile data changes (e.g., after admin activation)
  useEffect(() => {
    // Don't check if user is logged out
    if (!user || !userId) {
      setParentStatus(null);
      return;
    }
    
    if (profile) {
      console.log('🔄 Profile data changed, re-checking status:', {
        status: profile.status,
        organization_id: profile.organization_id,
      });
      
      checkStatus();
      
      if (profile.status === 'active') {
        console.log('✅ Profile is active, ensuring data is fresh...');
        refreshData().then(() => {
          // Check user is still logged in before checking status
          if (user && userId) {
            checkStatus();
          }
        });
      }
    }
  }, [user, userId, profile?.status, profile?.organization_id]);

  const onRefresh = async () => {
    await refreshData();
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
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              if (parentStatus?.isActive) {
                HapticFeedback.light();
                router.push('/(tabs)/profile');
              }
            }}
            disabled={!parentStatus?.isActive}
            activeOpacity={parentStatus?.isActive ? 0.7 : 1}
          >
            <Ionicons 
              name="settings-outline" 
              size={24} 
              color={parentStatus?.isActive ? Colors.text : Colors.textMuted} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationBadge}
            onPress={() => {
              if (parentStatus?.isActive) {
                HapticFeedback.light();
                setNotificationsVisible(true);
              }
            }}
            disabled={!parentStatus?.isActive}
            activeOpacity={parentStatus?.isActive ? 0.7 : 1}
          >
            <Ionicons 
              name="notifications-outline" 
              size={24} 
              color={parentStatus?.isActive ? Colors.text : Colors.textMuted} 
            />
            {parentStatus?.isActive && stats.unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={[
          styles.scrollView,
          parentStatus && !parentStatus.isActive && styles.disabledScrollView
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Spacing.xxxl + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshData} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={parentStatus?.isActive !== false}
      >
        {/* Quick Access Icons - Show for all users, but disabled for inactive */}
        <View style={[
          styles.quickAccessContainer,
          parentStatus && !parentStatus.isActive && styles.disabledContainer
        ]}>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => {
              if (parentStatus?.isActive) {
                router.push('/(tabs)/centers');
              }
            }}
            disabled={!parentStatus?.isActive}
            activeOpacity={parentStatus?.isActive ? 0.7 : 1}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons 
                name="business" 
                size={28} 
                color={parentStatus?.isActive ? Colors.primary : Colors.textMuted} 
              />
            </View>
            <Text style={[
              styles.quickAccessLabel,
              !parentStatus?.isActive && styles.disabledText
            ]}>Browse Centers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => {
              if (parentStatus?.isActive) {
                router.push('/children');
              }
            }}
            disabled={!parentStatus?.isActive}
            activeOpacity={parentStatus?.isActive ? 0.7 : 1}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: Colors.accent + '15' }]}>
              <Ionicons 
                name="people" 
                size={28} 
                color={parentStatus?.isActive ? Colors.accent : Colors.textMuted} 
              />
            </View>
            <Text style={[
              styles.quickAccessLabel,
              !parentStatus?.isActive && styles.disabledText
            ]}>My Children</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => {
              if (parentStatus?.isActive) {
                router.push('/access-logs');
              }
            }}
            disabled={!parentStatus?.isActive}
            activeOpacity={parentStatus?.isActive ? 0.7 : 1}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: Colors.info + '15' }]}>
              <Ionicons 
                name="time" 
                size={28} 
                color={parentStatus?.isActive ? Colors.info : Colors.textMuted} 
              />
            </View>
            <Text style={[
              styles.quickAccessLabel,
              !parentStatus?.isActive && styles.disabledText
            ]}>Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Active Check-Out Card - Show for all users, but disabled for inactive */}
        {activeCheckIn && (
          <AnimatedCard variant="elevated" padding="large" style={[styles.quickActionCard, { borderLeftWidth: 4, borderLeftColor: Colors.warning }] as any} delay={0}>
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
              onPress={() => {
                if (parentStatus?.isActive) {
                  router.push({
                    pathname: '/check-out',
                    params: { checkInId: activeCheckIn.id }
                  });
                }
              }}
              icon="log-out"
              size="medium"
              fullWidth
              variant="primary"
              disabled={!parentStatus?.isActive}
            />
          </AnimatedCard>
        )}

        {/* Quick Check-In Card - Show for all users, but disabled for inactive */}
        <AnimatedCard 
          variant="elevated" 
          padding="large" 
          style={[
            styles.quickActionCard,
            parentStatus && !parentStatus.isActive && styles.disabledCard
          ]} 
          delay={activeCheckIn ? 100 : 0}
        >
          <View style={styles.quickActionContent}>
            <View style={styles.quickActionIcon}>
              <Ionicons 
                name="qr-code" 
                size={32} 
                color={parentStatus?.isActive ? Colors.primary : Colors.textMuted} 
              />
            </View>
            <View style={styles.quickActionText}>
              <Text style={[
                styles.quickActionTitle,
                !parentStatus?.isActive && styles.disabledText
              ]}>Quick Check-In</Text>
              <Text style={[
                styles.quickActionSubtitle,
                !parentStatus?.isActive && styles.disabledText
              ]}>Scan QR code at daycare</Text>
            </View>
          </View>
          <Button
            title="Scan Now"
            onPress={() => {
              if (parentStatus?.isActive) {
                router.push('/scan');
              }
            }}
            icon="scan"
            size="medium"
            fullWidth
            disabled={!parentStatus?.isActive}
          />
        </AnimatedCard>

        {/* Browse Centers Section - Show for all users, but disabled for inactive */}
        <View style={[
          styles.section,
          parentStatus && !parentStatus.isActive && styles.disabledSection
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle,
              !parentStatus?.isActive && styles.disabledText
            ]}>Browse Centers</Text>
            <TouchableOpacity 
              onPress={() => {
                if (parentStatus?.isActive) {
                  router.push('/(tabs)/centers');
                }
              }}
              disabled={!parentStatus?.isActive}
            >
              <Text style={[
                styles.seeAllText,
                !parentStatus?.isActive && styles.disabledText
              ]}>View More</Text>
            </TouchableOpacity>
          </View>

            {featuredCenters.length > 0 ? (
              featuredCenters.map((center) => (
                <Card
                  key={center.id}
                  variant="outlined"
                  padding="medium"
                  onPress={() => {
                    if (parentStatus?.isActive) {
                      router.push(`/center-detail?id=${center.id}`);
                    }
                  }}
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

        {/* My Children Section - Show for all users, but disabled for inactive */}
        <View style={[
          styles.section,
          parentStatus && !parentStatus.isActive && styles.disabledSection
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle,
              !parentStatus?.isActive && styles.disabledText
            ]}>My Children</Text>
            <TouchableOpacity 
              onPress={() => {
                if (parentStatus?.isActive) {
                  router.push('/children');
                }
              }}
              disabled={!parentStatus?.isActive}
            >
              <Text style={[
                styles.seeAllText,
                !parentStatus?.isActive && styles.disabledText
              ]}>Manage</Text>
            </TouchableOpacity>
          </View>

            {children.length > 0 ? (
              children.map((child) => (
                <Card
                  key={child.id}
                  variant="outlined"
                  padding="medium"
                  onPress={() => {
                    if (parentStatus?.isActive) {
                      router.push('/children');
                    }
                  }}
                  style={styles.childCard}
                >
                  <View style={styles.childCardContent}>
                    <View style={[styles.childIconSmall, { backgroundColor: Colors.accent + '15' }]}>
                      <Ionicons name="person" size={20} color={Colors.accent} />
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{child.name || `${child.first_name} ${child.last_name}`}</Text>
                      <Text style={styles.childAge}>
                        {calculateAge(child.date_of_birth)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </View>
                </Card>
              ))
            ) : (
              <Card 
                variant="outlined" 
                padding="medium" 
                onPress={() => {
                  if (parentStatus?.isActive) {
                    router.push('/children/add');
                  }
                }} 
                style={styles.emptyCard}
              >
                <View style={styles.emptyCardContent}>
                  <Ionicons name="add-circle-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyCardText}>Add your first child</Text>
                </View>
              </Card>
            )}
          </View>

        {/* Activity Section - Show for all users, but disabled for inactive */}
        <View style={[
          styles.section,
          parentStatus && !parentStatus.isActive && styles.disabledSection
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle,
              !parentStatus?.isActive && styles.disabledText
            ]}>Activity</Text>
            <TouchableOpacity 
              onPress={() => {
                if (parentStatus?.isActive) {
                  router.push('/access-logs');
                }
              }}
              disabled={!parentStatus?.isActive}
            >
              <Text style={[
                styles.seeAllText,
                !parentStatus?.isActive && styles.disabledText
              ]}>View All</Text>
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
                          {('name' in checkIn.children ? checkIn.children.name : `${checkIn.children.first_name} ${checkIn.children.last_name}`)} • {new Date(checkIn.check_in_time).toLocaleDateString('en-US', { 
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

        {/* Frequent Centers - Show for all users, but disabled for inactive */}
        {frequentCenters.length > 0 && (
          <View style={[
            styles.section,
            parentStatus && !parentStatus.isActive && styles.disabledSection
          ]}>
            <View style={styles.sectionHeader}>
              <Text style={[
                styles.sectionTitle,
                !parentStatus?.isActive && styles.disabledText
              ]}>Your Favorite Centers</Text>
            </View>

            {frequentCenters.map((center) => (
                <Card
                  key={center.id}
                  variant="outlined"
                  padding="medium"
                  onPress={() => {
                    if (parentStatus?.isActive) {
                      router.push(`/center-detail?id=${center.id}`);
                    }
                  }}
                  style={styles.centerCard}
                >
                  <View style={styles.centerContent}>
                    <View style={[styles.centerIconSmall, { backgroundColor: Colors.primary + '15' }]}>
                      <Ionicons 
                        name="business" 
                        size={20} 
                        color={parentStatus?.isActive ? Colors.primary : Colors.textMuted} 
                      />
                    </View>
                  <View style={styles.centerInfo}>
                    <Text style={styles.centerName}>{center.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="location" size={12} color={Colors.textLight} />
                      <Text style={styles.centerLocation}> {center.city}</Text>
                    </View>
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
        onNotificationCountChange={() => {
          // Invalidate notifications query to refresh unread count
          if (userId) {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
          }
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
            refreshData(); // Reload data after organization is selected
          }}
        />
      )}

      {/* Account Status Modal Overlay - Shows for inactive or suspended accounts */}
      {/* Only show if user is logged in AND status is checked AND account is inactive */}
      {/* Don't show if user is null (logged out) - extra defensive check */}
      <Modal
        visible={Boolean(
          user && 
          userId && 
          parentStatus && 
          !parentStatus.isActive &&
          // Extra defensive check: ensure we have a valid user session
          user.id === userId
        )}
        key={userId || "no-user"}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // Prevent modal from showing if user signs out while modal is visible
          if (!user || !userId) {
            setParentStatus(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inactiveModalContent}>
            <View style={[
              styles.inactiveModalIconContainer,
              parentStatus?.status === 'suspended' && { backgroundColor: Colors.error + '15' }
            ]}>
              <Ionicons 
                name={parentStatus?.status === 'suspended' ? 'ban' : 'information-circle'} 
                size={64} 
                color={parentStatus?.status === 'suspended' ? Colors.error : Colors.warning} 
              />
            </View>
            <Text style={styles.inactiveModalTitle}>
              {parentStatus?.status === 'suspended' ? 'Account Suspended' : 'Account Inactive'}
            </Text>
            <Text style={styles.inactiveModalMessage}>
              {parentStatus?.status === 'suspended' 
                ? 'Please contact your organisation administrator.'
                : 'Your account is currently inactive. Please wait for the PostPart team to verify your details.'}
            </Text>
            {parentStatus?.status === 'inactive' && (
              <View style={styles.inactiveModalInfo}>
                <Ionicons name="time-outline" size={20} color={Colors.textLight} />
                <Text style={styles.inactiveModalInfoText}>
                  Your account is pending review. This usually takes 24 hours.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  inactiveBanner: {
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    backgroundColor: Colors.warning + '10',
  },
  inactiveBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inactiveBannerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  inactiveBannerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  inactiveBannerMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  inactiveModalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.large,
  },
  inactiveModalIconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  inactiveModalTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  inactiveModalMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    marginBottom: Spacing.lg,
  },
  inactiveModalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  inactiveModalInfoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  disabledScrollView: {
    opacity: 0.5,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  disabledSection: {
    opacity: 0.5,
  },
  disabledCard: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.textMuted,
  },
});
