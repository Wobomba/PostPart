import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '../constants/theme';
import type { Child } from '../../../shared/types';

interface ActiveCheckIn {
  id: string;
  child_id: string;
  center_id: string;
  check_in_time: string;
  center: {
    name: string;
  };
  child: Child;
}

export default function CheckOutScreen() {
  const router = useRouter();
  const { checkInId } = useLocalSearchParams<{ checkInId: string }>();
  
  const [activeCheckIn, setActiveCheckIn] = useState<ActiveCheckIn | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadActiveCheckIn();
  }, [checkInId]);

  const loadActiveCheckIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('checkins')
        .select(`
          id,
          child_id,
          center_id,
          check_in_time,
          check_out_time,
          centers(name),
          children(*)
        `)
        .eq('parent_id', user.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false });

      if (checkInId) {
        query = query.eq('id', checkInId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Filter to ensure we only get check-ins without check_out_time
        const activeCheckIn = data.find(ci => !ci.check_out_time);
        
        if (activeCheckIn) {
          setActiveCheckIn({
            id: activeCheckIn.id,
            child_id: activeCheckIn.child_id,
            center_id: activeCheckIn.center_id,
            check_in_time: activeCheckIn.check_in_time,
            center: Array.isArray(activeCheckIn.centers) ? activeCheckIn.centers[0] : activeCheckIn.centers,
            child: Array.isArray(activeCheckIn.children) ? activeCheckIn.children[0] : activeCheckIn.children,
          });
        } else {
          // All check-ins have been checked out
          setActiveCheckIn(null);
          if (checkInId) {
            Alert.alert(
              'Already Checked Out',
              'This check-in has already been checked out.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          }
        }
      } else {
        setActiveCheckIn(null);
        if (checkInId) {
          Alert.alert(
            'No Active Check-In',
            'You do not have any active check-ins to check out.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      }
    } catch (error) {
      console.error('Error loading active check-in:', error);
      Alert.alert('Error', 'Failed to load check-in information');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeCheckIn) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update check-in with check-out time
      const checkOutTime = new Date().toISOString();
      console.log('Attempting to check out check-in:', activeCheckIn.id, 'at', checkOutTime);
      
      const { data: updatedCheckIn, error: checkOutError } = await supabase
        .from('checkins')
        .update({
          check_out_time: checkOutTime,
        })
        .eq('id', activeCheckIn.id)
        .eq('parent_id', user.id)
        .select('id, check_out_time')
        .single();

      if (checkOutError) {
        console.error('Check-out update error:', checkOutError);
        console.error('Error details:', JSON.stringify(checkOutError, null, 2));
        throw checkOutError;
      }

      if (!updatedCheckIn) {
        console.error('Check-out update returned no data');
        throw new Error('Failed to update check-out. Please try again.');
      }

      if (!updatedCheckIn.check_out_time) {
        console.error('Check-out time was not set:', updatedCheckIn);
        throw new Error('Check-out time was not saved. Please try again.');
      }

      console.log('Check-out successful:', updatedCheckIn);

      // Verify the update was successful by re-querying
      const { data: verifyData, error: verifyError } = await supabase
        .from('checkins')
        .select('id, check_out_time')
        .eq('id', activeCheckIn.id)
        .single();

      if (verifyError) {
        console.error('Check-out verification error:', verifyError);
        // Still proceed - the update might have worked
      } else if (!verifyData?.check_out_time) {
        console.error('Check-out verification failed - check_out_time not set:', verifyData);
        Alert.alert(
          'Check-Out Verification Failed',
          'The check-out may not have been saved correctly. Please check your recent activity.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      } else {
        console.log('Check-out verified successfully:', verifyData);
      }

      // Log activity (non-blocking - don't fail check-out if logging fails)
      try {
        const { error: activityError } = await supabase.from('activity_log').insert({
          activity_type: 'checkout_completed',
          entity_type: 'checkin',
          entity_id: activeCheckIn.id,
          entity_name: `${activeCheckIn.child.first_name} ${activeCheckIn.child.last_name}`,
          related_entity_type: 'center',
          related_entity_id: activeCheckIn.center_id,
          related_entity_name: activeCheckIn.center.name,
          description: `Parent checked out ${activeCheckIn.child.first_name} ${activeCheckIn.child.last_name} from ${activeCheckIn.center.name}`,
        });
        
        if (activityError) {
          console.warn('Failed to log checkout activity:', activityError);
          // Don't throw - check-out should succeed even if logging fails
        }
      } catch (logError) {
        console.warn('Error logging checkout activity:', logError);
        // Don't throw - check-out should succeed even if logging fails
      }

      // Clear active check-in state before navigation
      setActiveCheckIn(null);

      // Navigate to success screen
      router.replace({
        pathname: '/check-out-success',
        params: {
          centerName: activeCheckIn.center.name,
          childName: `${activeCheckIn.child.first_name} ${activeCheckIn.child.last_name}`,
          checkInTime: activeCheckIn.check_in_time,
        },
      });
    } catch (error: any) {
      console.error('Error checking out:', error);
      Alert.alert(
        'Check-Out Failed',
        error.message || 'Failed to complete check-out. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeCheckIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active check-in found</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const checkInDate = new Date(activeCheckIn.check_in_time);
  const duration = Math.floor((new Date().getTime() - checkInDate.getTime()) / (1000 * 60)); // minutes

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Check Out</Text>
          <Text style={styles.subtitle}>
            Complete your child's visit
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Child</Text>
            <Text style={styles.infoValue}>
              {activeCheckIn.child.first_name} {activeCheckIn.child.last_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Centre</Text>
            <Text style={styles.infoValue}>{activeCheckIn.center.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Checked In</Text>
            <Text style={styles.infoValue}>
              {checkInDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at {checkInDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>
              {duration >= 60
                ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                : `${duration}m`}
            </Text>
          </View>
        </Card>

        <View style={styles.footer}>
          <Button
            title="Complete Check-Out"
            onPress={handleCheckOut}
            loading={loading}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPadding,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  backButton: {
    marginTop: Spacing.md,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  infoCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  footer: {
    gap: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.sm,
  },
});

