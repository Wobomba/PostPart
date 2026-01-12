import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { checkParentStatus, ParentStatus } from '../utils/parentStatus';
import type { AccessLogSummary } from '../../../shared/types';

export default function AccessLogsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<AccessLogSummary[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [parentStatus, setParentStatus] = useState<ParentStatus | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkParentStatus();
      setParentStatus(status);
      // Don't redirect - allow viewing but disable interactions
    };
    checkStatus();
    loadAccessLogs();
  }, []);

  const loadAccessLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all check-ins with center info
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select('*, center:centers(id, name)')
        .eq('parent_id', user.id)
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      // Group by center and count visits
      const summaryMap: Record<string, AccessLogSummary> = {};
      let total = 0;

      checkins?.forEach((checkin) => {
        total++;
        const centerId = checkin.center_id;
        const centerName = checkin.center?.name || 'Unknown Center';

        if (summaryMap[centerId]) {
          summaryMap[centerId].visit_count++;
          if (new Date(checkin.check_in_time) > new Date(summaryMap[centerId].last_visit_date)) {
            summaryMap[centerId].last_visit_date = checkin.check_in_time;
          }
        } else {
          summaryMap[centerId] = {
            center_id: centerId,
            center_name: centerName,
            visit_count: 1,
            last_visit_date: checkin.check_in_time,
          };
        }
      });

      const summaryArray = Object.values(summaryMap).sort(
        (a, b) => b.visit_count - a.visit_count
      );

      setLogs(summaryArray);
      setTotalVisits(total);
    } catch (error) {
      console.error('Error loading access logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccessLogs();
    setRefreshing(false);
  };

  const handleLogPress = (log: AccessLogSummary) => {
    if (parentStatus?.isActive) {
      router.push({
        pathname: '/access-logs-detail',
        params: {
          centerId: log.center_id,
          centerName: log.center_name,
        },
      });
    }
  };

  const renderLogCard = ({ item }: { item: AccessLogSummary }) => (
    <Card
      variant="default"
      padding="medium"
      onPress={() => handleLogPress(item)}
      style={[
        styles.logCard,
        !parentStatus?.isActive && styles.disabledCard
      ]}
    >
      <View style={styles.logHeader}>
        <View style={styles.logIconContainer}>
          <Ionicons name="business" size={24} color={Colors.primary} />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logName} numberOfLines={1}>
            {item.center_name}
          </Text>
          <View style={styles.logMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="repeat-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>
                {item.visit_count} visit{item.visit_count !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>
                {formatDate(item.last_visit_date)}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </View>
    </Card>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        {/* Header with Back Button and Title */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Access History</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="location-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>Centers</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={20} color={Colors.info} />
            </View>
            <Text style={styles.statValue}>{totalVisits}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
        </View>
      </View>

      {/* Logs List */}
      <FlatList
        data={logs}
        renderItem={renderLogCard}
        keyExtractor={(item) => item.center_id}
        style={[
          styles.list,
          !parentStatus?.isActive && styles.disabledList
        ]}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Spacing.xxxl + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        scrollEnabled={parentStatus?.isActive !== false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {loading ? 'Loading...' : 'No Visits Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {loading ? 'Loading your visit history...' : 'Your visit history will appear here after your first check-in at a daycare center'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  logCard: {
    marginBottom: Spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  logContent: {
    flex: 1,
  },
  logName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  logMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
  },
  disabledCard: {
    opacity: 0.5,
  },
  disabledList: {
    opacity: 0.5,
  },
});

