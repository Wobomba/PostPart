import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Colors, Typography, Spacing, Layout } from '../constants/theme';

export default function CheckInSuccessScreen() {
  const router = useRouter();
  const { centerName, checkInTime } = useLocalSearchParams<{
    centerName: string;
    checkInTime: string;
  }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <Text style={styles.title}>Check-In Successful!</Text>
        </View>

        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Center:</Text>
            <Text style={styles.detailValue}>{centerName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {new Date(checkInTime || '').toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </Card>

        <Card style={styles.messageCard}>
          <View style={styles.messageIconContainer}>
            <Ionicons name="happy-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.messageText}>
            Have a wonderful day! Your check-in has been recorded and you're all set.
          </Text>
        </Card>

        <View style={styles.footer}>
          <Button
            title="Go to Home"
            onPress={() => router.replace('/(tabs)/home')}
            fullWidth
            size="large"
          />
          
          <Button
            title="View My Visits"
            onPress={() => router.replace('/access-logs')}
            variant="outline"
            fullWidth
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Layout.screenPadding,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successIconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.success,
    textAlign: 'center',
  },
  detailsCard: {
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  detailValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  messageCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  messageIconContainer: {
    marginBottom: Spacing.md,
  },
  messageText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  footer: {
    marginTop: 'auto',
  },
  secondaryButton: {
    marginTop: Spacing.md,
  },
});

