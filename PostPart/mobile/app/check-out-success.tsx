import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, Layout } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CheckOutSuccessScreen() {
  const router = useRouter();
  const { centerName, childName, checkInTime } = useLocalSearchParams<{
    centerName: string;
    childName: string;
    checkInTime: string;
  }>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
        </View>
        
        <Text style={styles.title}>Check-Out Successful!</Text>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Child: </Text>
            {childName}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Centre: </Text>
            {centerName}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Checked Out: </Text>
            {new Date().toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <Text style={styles.message}>
          Your check-out has been recorded successfully. Thank you for using PostPart!
        </Text>

        <Button
          title="Done"
          onPress={() => {
            // Navigate to home and force refresh
            router.replace({
              pathname: '/(tabs)/home',
              params: { refresh: Date.now().toString() }
            });
          }}
          fullWidth
          size="large"
          style={styles.button}
        />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPadding,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  infoText: {
    ...Typography.body,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  button: {
    marginTop: Spacing.lg,
  },
});

