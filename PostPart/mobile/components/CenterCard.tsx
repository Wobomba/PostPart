import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { Center } from '../../../shared/types';

interface CenterCardProps {
  center: Center;
  onPress: () => void;
}

export const CenterCard: React.FC<CenterCardProps> = ({ center, onPress }) => {
  return (
    <Card onPress={onPress} variant="elevated">
      <View style={styles.container}>
        {center.image_url ? (
          <Image
            source={{ uri: center.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🏫</Text>
          </View>
        )}
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {center.name}
            </Text>
            {center.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.address} numberOfLines={2}>
            {center.address}, {center.city}, {center.state}
          </Text>
          
          {center.age_range && (
            <Text style={styles.ageRange}>Ages: {center.age_range}</Text>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  verifiedText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold,
  },
  address: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  ageRange: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
});

