import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '../constants/theme';
import type { Notification } from '../../../shared/types';

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadNotification();
      markAsRead();
    }
  }, [id]);

  const loadNotification = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setNotification(data);
    } catch (error) {
      console.error('Error loading notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('parent_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('notification_id', id)
        .eq('parent_id', user.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading || !notification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {loading ? 'Loading...' : 'Notification not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor =
    notification.priority === 'high'
      ? Colors.error
      : notification.priority === 'normal'
      ? Colors.info
      : Colors.textMuted;

  const priorityEmoji =
    notification.priority === 'high'
      ? '🔴'
      : notification.priority === 'normal'
      ? '🔵'
      : '⚪';

  const typeEmoji =
    notification.type === 'announcement'
      ? '📢'
      : notification.type === 'reminder'
      ? '⏰'
      : notification.type === 'approval'
      ? '✅'
      : notification.type === 'center_update'
      ? '🏫'
      : '🔔';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <Button
            title="← Back"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.emoji}>{typeEmoji}</Text>
          <Text style={styles.title}>{notification.title}</Text>
          
          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Priority:</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
                <Text style={styles.priorityEmoji}>{priorityEmoji}</Text>
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.date}>
              {new Date(notification.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        <Card style={styles.messageCard}>
          <Text style={styles.message}>{notification.message}</Text>
        </Card>

        {notification.expires_at && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoEmoji}>⏱️</Text>
            <Text style={styles.infoText}>
              Expires: {new Date(notification.expires_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  headerContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.sm,
  },
  header: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.md,
  },
  emoji: {
    fontSize: 60,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.xxxl,
  },
  metadata: {
    marginTop: Spacing.md,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metadataLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  priorityEmoji: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  priorityText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  date: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  messageCard: {
    marginHorizontal: Layout.screenPadding,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  message: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
  },
  infoCard: {
    marginHorizontal: Layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
  },
  infoEmoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  infoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    flex: 1,
  },
});

