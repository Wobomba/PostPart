import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import ImageCarousel from '../components/ImageCarousel';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '../constants/theme';
import type { Center, CheckIn } from '../../../shared/types';

// Default placeholder images for centers without custom images
const DEFAULT_CENTER_IMAGES = [
  require('../assets/adorable-kid-lifestyle.jpg'),
  require('../assets/portrait-teacher-work-educational-system.jpg'),
  require('../assets/realistic-scene-with-young-children-with-autism-playing.jpg'),
];

// Get a consistent random image based on center ID
const getPlaceholderImage = (centerId: string) => {
  // Use center ID to generate a consistent index (same center always gets same image)
  const hash = centerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % DEFAULT_CENTER_IMAGES.length;
  return DEFAULT_CENTER_IMAGES[index];
};

export default function CenterDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [center, setCenter] = useState<Center | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      loadCenterData();
    }
  }, [id]);

  const loadCenterData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Load center details
      const { data: centerData, error: centerError } = await supabase
        .from('centers')
        .select('*')
        .eq('id', id)
        .single();

      if (centerError) throw centerError;
      setCenter(centerData);

      // Load visit count for this center
      if (user) {
        const { count } = await supabase
          .from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', user.id)
          .eq('center_id', id);

        setVisitCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading center:', error);
      Alert.alert('Error', 'Failed to load center details');
    } finally {
      setLoading(false);
    }
  };


  const handleGetDirections = () => {
    if (center) {
      // If centre has a custom map link, use it
      if (center.image_url && (center.image_url.startsWith('http://') || center.image_url.startsWith('https://'))) {
        Linking.openURL(center.image_url);
      } 
      // If centre has coordinates, use them
      else if (center.latitude && center.longitude) {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`);
      }
      // Fallback to address search
      else {
        const locationParts = [center.address, center.city, center.district, center.region, 'Uganda'].filter(Boolean);
        const address = encodeURIComponent(locationParts.join(', '));
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
      }
    }
  };

  const handleViewVisits = () => {
    router.push({
      pathname: '/access-logs-detail',
      params: { centerId: id, centerName: center?.name },
    });
  };

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (!center) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyEmoji}>🏫</Text>
          <Text style={styles.emptyText}>Center not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Spacing.xxxl + insets.bottom }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section - Slideshow */}
        <ImageCarousel
          images={center.images && center.images.length > 0 
            ? center.images.filter(img => img && !img.includes('maps.google') && !img.includes('maps.apple'))
            : center.image_url && !center.image_url.includes('maps.google') && !center.image_url.includes('maps.apple') &&
              (center.image_url.includes('.jpg') || center.image_url.includes('.png') || 
               center.image_url.includes('.jpeg') || center.image_url.includes('.webp'))
              ? [center.image_url]
              : []
          }
          height={350}
          placeholderImage={getPlaceholderImage(center.id)}
        />

        {/* Center Name & Verification */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{center.name}</Text>
          {center.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>

        {/* Visit Count */}
        {visitCount > 0 && (
          <Card style={styles.visitCard}>
            <View style={styles.visitContent}>
              <View style={styles.visitIconContainer}>
                <Ionicons name="stats-chart" size={28} color={Colors.primary} />
              </View>
              <View style={styles.visitInfo}>
                <Text style={styles.visitCount}>{visitCount}</Text>
                <Text style={styles.visitLabel}>Visit{visitCount !== 1 ? 's' : ''}</Text>
              </View>
              <Button
                title="View History"
                onPress={handleViewVisits}
                variant="outline"
                size="small"
              />
            </View>
          </Card>
        )}

        {/* Address Information */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          
          <InfoRow iconName="location" label="Address">
            {[center.address, center.city, center.district, center.region].filter(Boolean).join(', ')}
          </InfoRow>

          <Button
            title="Get Directions"
            onPress={handleGetDirections}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Services Offered */}
        {center.services_offered && center.services_offered.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <View style={styles.servicesContainer}>
              {center.services_offered.map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* About */}
        {center.description && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{center.description}</Text>
          </Card>
        )}

        {/* Details */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          {center.operating_schedule && (
            <InfoRow iconName="time" label="Operating Hours">
              {center.operating_schedule === '6am-6pm' && '6:00 AM - 6:00 PM (Standard Day Care)'}
              {center.operating_schedule === '24/7' && '24/7 (Round the Clock)'}
              {center.operating_schedule === 'weekdays' && 'Weekdays Only (Monday - Friday)'}
              {center.operating_schedule === 'weekends' && 'Weekends Only (Saturday - Sunday)'}
              {center.operating_schedule === 'custom' && center.custom_hours}
            </InfoRow>
          )}
          
          {center.age_range && (
            <InfoRow iconName="happy" label="Age Range">
              {center.age_range}
            </InfoRow>
          )}
          
          {center.capacity && (
            <InfoRow iconName="people" label="Capacity">
              {center.capacity} children
            </InfoRow>
          )}
        </Card>

        {/* Amenities */}
        {center.amenities && center.amenities.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenities}>
              {center.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityTag}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

interface InfoRowProps {
  iconName: string;  // Ionicons name
  label: string;
  children: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ iconName, label, children }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconContainer}>
      <Ionicons name={iconName as any} size={20} color={Colors.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{children}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    // paddingBottom handled dynamically with insets.bottom
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.screenPadding,
  },
  loadingText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textLight,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
  },
  titleContainer: {
    padding: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.verified,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  verifiedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  visitCard: {
    marginHorizontal: Layout.screenPadding,
    marginBottom: Spacing.md,
  },
  visitContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  visitInfo: {
    flex: 1,
  },
  visitCount: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  visitLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  section: {
    marginHorizontal: Layout.screenPadding,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  serviceTag: {
    backgroundColor: Colors.primaryLight + '30',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  serviceText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amenityTag: {
    backgroundColor: Colors.primaryLight + '30',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  amenityText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
});

