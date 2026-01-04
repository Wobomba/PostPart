import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  date_of_birth: string;
  allergies?: string;
  notes?: string;
}

export default function ChildrenManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  // Reload children when screen comes into focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      loadChildren();
    }, [])
  );

  const loadChildren = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('date_of_birth', { ascending: false });

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildren();
    setRefreshing(false);
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 1) {
      const months = monthDiff < 0 ? 12 + monthDiff : monthDiff;
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    
    return `${age} year${age !== 1 ? 's' : ''}`;
  };

  const handleDeleteChild = (child: Child) => {
    Alert.alert(
      'Delete Child Profile',
      `Are you sure you want to delete ${child.first_name}'s profile? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('children')
                .delete()
                .eq('id', child.id);

              if (error) throw error;

              Alert.alert('Success', 'Child profile deleted successfully');
              loadChildren();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete child profile');
            }
          },
        },
      ]
    );
  };

  const renderChild = ({ item }: { item: Child }) => (
    <Card
      variant="default"
      padding="medium"
      onPress={() => router.push(`/children/edit?id=${item.id}`)}
      style={styles.childCard}
    >
      <View style={styles.childHeader}>
        <View style={styles.childIcon}>
          <Ionicons name="person" size={24} color={Colors.primary} />
        </View>
        <View style={styles.childInfo}>
          <View style={styles.childTitleRow}>
            <Text style={styles.childName} numberOfLines={1}>
              {item.name || `${item.first_name} ${item.last_name}`}
            </Text>
            {item.allergies && (
              <View style={styles.allergyBadge}>
                <Ionicons name="alert-circle" size={16} color={Colors.warning} />
              </View>
            )}
          </View>
          <View style={styles.childDetail}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
            <Text style={styles.childDetailText}>{calculateAge(item.date_of_birth)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteChild(item);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
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
          <Text style={styles.title}>My Children</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/children/add')}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Children List */}
      <FlatList
        data={children}
        renderItem={renderChild}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Spacing.xxxl + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Children Added</Text>
              <Text style={styles.emptySubtitle}>
                Add your children's profiles to use for check-ins at daycare centers
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/children/add')}
              >
                <Ionicons name="add-circle" size={20} color={Colors.primary} />
                <Text style={styles.emptyButtonText}>Add Your First Child</Text>
              </TouchableOpacity>
            </View>
          ) : null
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
  addButton: {
    padding: Spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  childCard: {
    marginBottom: Spacing.md,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  childIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  childInfo: {
    flex: 1,
  },
  childTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  childName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.xs,
  },
  allergyBadge: {
    marginLeft: Spacing.xs,
  },
  childDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  childDetailText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  emptyButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
});

