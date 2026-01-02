import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { NotificationWithStatus } from '../../../shared/types';

interface NotificationCardProps {
  notification: NotificationWithStatus;
  onPress: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
}) => {
  const priorityColor =
    notification.priority === 'high'
      ? Colors.error
      : notification.priority === 'normal'
      ? Colors.info
      : Colors.textMuted;

  return (
    <Card onPress={onPress} variant={notification.is_read ? 'flat' : 'elevated'}>
      <View style={styles.container}>
        <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, !notification.is_read && styles.titleUnread]}>
              {notification.title}
            </Text>
            {!notification.is_read && <View style={styles.unreadDot} />}
          </View>
          
          <Text
            style={styles.message}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
          
          <Text style={styles.date}>
            {new Date(notification.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  priorityIndicator: {
    width: 4,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
    flex: 1,
  },
  titleUnread: {
    fontWeight: Typography.fontWeight.semibold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.xs,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  date: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});

