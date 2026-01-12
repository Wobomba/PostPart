import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { checkParentStatus, ParentStatus } from '../../utils/parentStatus';
import type { Center } from '../../../shared/types';

const SEARCH_HISTORY_KEY = '@postpart_center_search_history';
const MAX_HISTORY_ITEMS = 10;

export default function CentersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [centers, setCenters] = useState<Center[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const [parentStatus, setParentStatus] = useState<ParentStatus | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkParentStatus();
      setParentStatus(status);
      // Don't redirect - allow viewing but disable interactions
    };
    checkStatus();
  }, []);

  useEffect(() => {
    loadCenters();
    loadSearchHistory();

    // Set up realtime subscription for instant center updates
    const centerChannel = supabase
      .channel('centers-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'centers',
          filter: 'is_verified=eq.true', // Only listen to verified centers
        },
        (payload) => {
          console.log('Center change detected:', payload);
          // Reload centers list
          loadCenters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(centerChannel);
    };
  }, []);

  useEffect(() => {
    filterCenters();
  }, [searchQuery, centers]);

  const loadSearchHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (historyJson) {
        const history = JSON.parse(historyJson);
        setSearchHistory(Array.isArray(history) ? history : []);
      }
    } catch (error) {
      // Silently handle
    }
  };

  const saveSearchToHistory = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const trimmedQuery = query.trim();
      const updatedHistory = [
        trimmedQuery,
        ...searchHistory.filter(item => item.toLowerCase() !== trimmedQuery.toLowerCase())
      ].slice(0, MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      setSearchHistory(updatedHistory);
    } catch (error) {
      // Silently handle
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      saveSearchToHistory(query);
    }
  };

  const handleHistoryTagPress = (historyItem: string) => {
    setSearchQuery(historyItem);
    saveSearchToHistory(historyItem);
  };

  const clearSearchHistory = async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (error) {
      // Silently handle
    }
  };

  const loadCenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('is_verified', true)
        .order('name');

      if (error) throw error;
      setCenters(data || []);
      setFilteredCenters(data || []);
    } catch (error) {
      // Silently handle - table may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const filterCenters = () => {
    if (!searchQuery.trim()) {
      setFilteredCenters(centers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = centers.filter(
      (center) =>
        center.name.toLowerCase().includes(query) ||
        center.city?.toLowerCase().includes(query) ||
        center.address?.toLowerCase().includes(query)
    );
    setFilteredCenters(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCenters();
    setRefreshing(false);
  };

  const renderCenterCard = ({ item }: { item: Center }) => (
    <Card
      variant="default"
      padding="medium"
      onPress={() => {
        if (parentStatus?.isActive) {
          router.push(`/center-detail?id=${item.id}`);
        }
      }}
      style={[
        styles.centerCard,
        !parentStatus?.isActive && styles.disabledCard
      ]}
    >
      <View style={styles.centerHeader}>
        <View style={styles.centerIcon}>
          <Ionicons name="business" size={24} color={Colors.primary} />
        </View>
        <View style={styles.centerInfo}>
          <View style={styles.centerTitleRow}>
            <Text style={styles.centerName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              </View>
            )}
          </View>
          {item.address && (
            <View style={styles.centerDetail}>
              <Ionicons name="location-outline" size={14} color={Colors.textLight} />
              <Text style={styles.centerDetailText} numberOfLines={1}>
                {item.city || item.address}
              </Text>
            </View>
          )}
          {item.operating_schedule && (
            <View style={styles.centerDetail}>
              <Ionicons name="time-outline" size={14} color={Colors.textLight} />
              <Text style={styles.centerDetailText}>
                {item.operating_schedule === '6am-6pm' && '6AM - 6PM'}
                {item.operating_schedule === '24/7' && '24/7 Service'}
                {item.operating_schedule === 'weekdays' && 'Weekdays Only'}
                {item.operating_schedule === 'weekends' && 'Weekends Only'}
                {item.operating_schedule === 'custom' && 'Custom Hours'}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </View>
      
      {/* Services Offered */}
      {item.services_offered && item.services_offered.length > 0 && (
        <View style={styles.servicesSection}>
          <Text style={styles.servicesLabel}>Services:</Text>
          <View style={styles.servicesChips}>
            {item.services_offered.slice(0, 2).map((service, index) => (
              <View key={index} style={styles.serviceChip}>
                <Text style={styles.serviceChipText} numberOfLines={1}>
                  {service}
                </Text>
              </View>
            ))}
            {item.services_offered.length > 2 && (
              <View style={[styles.serviceChip, styles.serviceChipMore]}>
                <Text style={styles.serviceChipText}>
                  +{item.services_offered.length - 2} more
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {(item.capacity || item.age_range) && (
        <View style={styles.centerMeta}>
          {item.capacity && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>Capacity: {item.capacity}</Text>
            </View>
          )}
          {item.age_range && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>
                {item.age_range}
              </Text>
            </View>
          )}
        </View>
      )}
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
          <Text style={styles.title}>Browse Centers</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Find daycare centers..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  saveSearchToHistory(searchQuery);
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
      </View>

      {/* Search History Section */}
      {searchHistory.length > 0 && !searchQuery && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Your history</Text>
            <TouchableOpacity onPress={clearSearchHistory}>
              <Text style={styles.clearHistoryText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.historyTags}>
            {searchHistory.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.historyTag}
                onPress={() => handleHistoryTagPress(item)}
              >
                <Text style={styles.historyTagText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Centers List */}
      <FlatList
        data={filteredCenters}
        renderItem={renderCenterCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Spacing.xxxl + insets.bottom },
        ]}
        style={[
          styles.list,
          !parentStatus?.isActive && styles.disabledList
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        scrollEnabled={parentStatus?.isActive !== false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No centers found' : 'No centers available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Check back later for updates'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

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
  searchBarContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
  historySection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  historyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  clearHistoryText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  historyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  historyTag: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  historyTagText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  centerCard: {
    marginBottom: Spacing.md,
  },
  centerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  centerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  centerInfo: {
    flex: 1,
  },
  centerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  centerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.xs,
  },
  verifiedBadge: {
    marginLeft: Spacing.xs,
  },
  centerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  centerDetailText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  servicesSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  servicesLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  servicesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  serviceChip: {
    backgroundColor: Colors.primaryLight + '30',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    maxWidth: '48%',
  },
  serviceChipMore: {
    backgroundColor: Colors.primaryLight + '30',
  },
  serviceChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  centerMeta: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
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
