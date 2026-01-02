import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, Layout } from '../constants/theme';
import type { CheckInWithDetails } from '../../../shared/types';

export default function AccessLogsDetailScreen() {
  const router = useRouter();
  const { centerId, centerName } = useLocalSearchParams<{
    centerId: string;
    centerName: string;
  }>();
  
  const [checkins, setCheckins] = useState<CheckInWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (centerId) {
      loadCheckins();
    }
  }, [centerId]);

  const loadCheckins = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('checkins')
        .select('*, child:children(*)')
        .eq('parent_id', user.id)
        .eq('center_id', centerId)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setCheckins(data || []);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCheckins();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <Button
          title="← Back"
          onPress={() => router.back()}
          variant="ghost"
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Visit History</Text>
        <Text style={styles.subtitle}>{centerName}</Text>
        <Text style={styles.count}>
          {checkins.length} visit{checkins.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={checkins}
        renderItem={({ item }) => (
          <Card variant="flat">
            <View style={styles.checkinContent}>
              <View style={styles.checkinHeader}>
                <Text style={styles.checkinDate}>
                  {new Date(item.check_in_time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.checkinTime}>
                  {new Date(item.check_in_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {item.child && (
                <Text style={styles.checkinChild}>
                  {item.child.first_name} {item.child.last_name}
                </Text>
              )}
            </View>
          </Card>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No visits found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.sm,
  },
  header: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  count: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  list: {
    padding: Layout.screenPadding,
  },
  separator: {
    height: Spacing.sm,
  },
  checkinContent: {
    paddingVertical: Spacing.xs,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  checkinDate: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  checkinTime: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  checkinChild: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
});

