import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { verifyCanCheckIn } from '../utils/parentStatus';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '../constants/theme';
import type { Child } from '../../../shared/types';

export default function CheckInScreen() {
  const router = useRouter();
  const { qrCodeId, centerId, centerName } = useLocalSearchParams<{
    qrCodeId: string;
    centerId: string;
    centerName: string;
  }>();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('first_name');

      if (error) throw error;
      setChildren(data || []);
      
      // Auto-select if only one child
      if (data && data.length === 1) {
        setSelectedChildId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading children:', error);
      Alert.alert('Error', 'Failed to load children profiles');
    }
  };

  const handleCheckIn = async () => {
    if (!selectedChildId) {
      Alert.alert('Select Child', 'Please select which child you are checking in');
      return;
    }

    setLoading(true);

    try {
      // Verify parent status before check-in
      const canCheckIn = await verifyCanCheckIn();
      
      if (!canCheckIn) {
        // Parent is not active - alert already shown
        setLoading(false);
        router.back();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create check-in record
      const { data: checkinData, error: checkinError } = await supabase
        .from('checkins')
        .insert({
          parent_id: user.id,
          center_id: centerId,
          child_id: selectedChildId,
          qr_code_id: qrCodeId,
          check_in_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (checkinError) throw checkinError;

      // Navigate to success screen
      router.replace({
        pathname: '/check-in-success',
        params: {
          centerName,
          childId: selectedChildId,
          checkInTime: checkinData.check_in_time,
        },
      });
    } catch (error: any) {
      console.error('Error checking in:', error);
      
      // Check if it's an allocation limit error (would come from a trigger/function)
      if (error.message?.includes('limit') || error.message?.includes('allocation')) {
        Alert.alert(
          'Check-In Limit Reached',
          'You have reached your visit limit for this period. Please contact your employer for more information.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Check-In Failed',
          error.message || 'Failed to complete check-in. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = () => {
    router.push('/profile/add-child');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.title}>Check In</Text>
          <Text style={styles.subtitle}>{centerName}</Text>
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.infoText}>
            Select which child you are checking in today
          </Text>
        </Card>

        {children.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👶</Text>
            <Text style={styles.emptyTitle}>No Children Added</Text>
            <Text style={styles.emptyText}>
              Add a child profile to continue with check-in
            </Text>
            <Button
              title="Add Child"
              onPress={handleAddChild}
              fullWidth
              style={styles.addButton}
            />
          </Card>
        ) : (
          <View style={styles.childrenContainer}>
            {children.map((child) => (
              <Card
                key={child.id}
                style={[
                  styles.childCard,
                  selectedChildId === child.id && styles.childCardSelected,
                ]}
                onPress={() => setSelectedChildId(child.id)}
              >
                <View style={styles.childContent}>
                  <Text style={styles.childEmoji}>👶</Text>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>
                      {child.first_name} {child.last_name}
                    </Text>
                    <Text style={styles.childAge}>
                      Born {new Date(child.date_of_birth).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedChildId === child.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Complete Check-In"
            onPress={handleCheckIn}
            loading={loading}
            disabled={!selectedChildId}
            fullWidth
            size="large"
          />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            fullWidth
            style={styles.cancelButton}
          />
        </View>
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
    flexGrow: 1,
    padding: Layout.screenPadding,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emoji: {
    fontSize: 60,
    marginBottom: Spacing.md,
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
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.info + '15',
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
    marginBottom: Spacing.lg,
  },
  infoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  addButton: {
    marginTop: Spacing.md,
  },
  childrenContainer: {
    marginBottom: Spacing.lg,
  },
  childCard: {
    marginBottom: Spacing.md,
  },
  childCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  childContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childEmoji: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  childAge: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  checkmark: {
    fontSize: 24,
    color: Colors.primary,
  },
  footer: {
    marginTop: 'auto',
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
});

