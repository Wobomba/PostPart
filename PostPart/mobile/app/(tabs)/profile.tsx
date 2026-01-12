import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useUserData } from '../../contexts/UserDataContext';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  
  // Get data from context
  const {
    user,
    profile,
    children,
    stats,
    refreshing,
    refreshData,
  } = useUserData();

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  const onRefresh = async () => {
    await refreshData();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleLogout = async () => {
    // For web, use window.confirm instead of Alert.alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      
      if (!confirmed) return;
      
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        router.replace('/(auth)/welcome');
      } catch (error: any) {
        window.alert(error?.message || 'Failed to log out. Please try again.');
      }
    } else {
      // For mobile, use Alert.alert
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                
                router.replace('/(auth)/welcome');
              } catch (error: any) {
                Alert.alert('Error', error?.message || 'Failed to log out. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
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
        {/* Profile Header - Centered */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </Text>
          </View>

          {/* Name & Email */}
          <Text style={styles.displayName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCheckIns}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.centersVisited}</Text>
              <Text style={styles.statLabel}>Centers Used</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{children.length}</Text>
              <Text style={styles.statLabel}>Children</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/profile/edit-profile')}
            >
              <Ionicons name="person-outline" size={18} color={Colors.text} style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/children/add')}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.text} style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Add Child</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Material UI Divider */}
        <View style={styles.divider} />

        {/* Settings & Support Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings & Support</Text>
          
          <View style={styles.settingsList}>
            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => Linking.openURL('https://postpart.org/')}
            >
              <View style={styles.settingsItemLeft}>
                <Ionicons name="information-circle-outline" size={22} color={Colors.textLight} />
                <Text style={styles.settingsItemLabel}>About PostPart</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => router.push('/access-logs')}
            >
              <View style={styles.settingsItemLeft}>
                <Ionicons name="time-outline" size={22} color={Colors.textLight} />
                <Text style={styles.settingsItemLabel}>Access History</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingsItem, styles.settingsItemLast]}
              onPress={handleLogout}
            >
              <View style={styles.settingsItemLeft}>
                <Ionicons name="log-out-outline" size={22} color={Colors.error} />
                <Text style={[styles.settingsItemLabel, { color: Colors.error }]}>Log Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom is now handled dynamically with safe area insets
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSize.huge,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  displayName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundDark,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  divider: {
    height: 8,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  settingsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  settingsList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  settingsItemLast: {
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
});
