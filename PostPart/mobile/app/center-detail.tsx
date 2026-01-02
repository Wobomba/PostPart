import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '../constants/theme';
import type { Center, CheckIn } from '../../../shared/types';

export default function CenterDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [center, setCenter] = useState<Center | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (!center) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyEmoji}>🏫</Text>
          <Text style={styles.emptyText}>Center not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with back button */}
        <View style={styles.headerContainer}>
          <Button
            title="← Back"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>

        {/* Center Image - Only show if image_url looks like an image, not a map link */}
        {center.image_url && !center.image_url.includes('maps.google') && !center.image_url.includes('maps.apple') && 
         (center.image_url.includes('.jpg') || center.image_url.includes('.png') || center.image_url.includes('.jpeg') || center.image_url.includes('.webp')) ? (
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
              <Text style={styles.visitEmoji}>📊</Text>
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
          
          <InfoRow icon="📍" label="Address">
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
                <View key={index} style={styles.serviceItem}>
                  <Text style={styles.serviceText}>• {service}</Text>
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
            <InfoRow icon="🕒" label="Operating Hours">
              {center.operating_schedule === '6am-6pm' && '6:00 AM - 6:00 PM (Standard Day Care)'}
              {center.operating_schedule === '24/7' && '24/7 (Round the Clock)'}
              {center.operating_schedule === 'weekdays' && 'Weekdays Only (Monday - Friday)'}
              {center.operating_schedule === 'weekends' && 'Weekends Only (Saturday - Sunday)'}
              {center.operating_schedule === 'custom' && center.custom_hours}
            </InfoRow>
          )}
          
          {center.age_range && (
            <InfoRow icon="👶" label="Age Range">
              {center.age_range}
            </InfoRow>
          )}
          
          {center.capacity && (
            <InfoRow icon="👥" label="Capacity">
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
  icon: string;
  label: string;
  children: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, children }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
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
    paddingBottom: Spacing.xl,
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
  headerContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.sm,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.backgroundDark,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 80,
  },
  titleContainer: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.md,
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
  visitEmoji: {
    fontSize: 32,
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
    marginBottom: Spacing.md,
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
  infoIcon: {
    fontSize: 20,
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
    gap: Spacing.sm,
  },
  serviceItem: {
    marginBottom: Spacing.xs,
  },
  serviceText: {
    fontSize: Typography.fontSize.md,
    color: Colors.text,
    lineHeight: 24,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amenityTag: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  amenityText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
});

