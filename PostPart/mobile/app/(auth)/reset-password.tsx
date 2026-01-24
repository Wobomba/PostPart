import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { apiRequest } from '../../lib/api';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = params.phone as string;
  const code = params.code as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const handleResetPassword = async () => {
    if (!phone || !code) {
      Alert.alert('Error', 'Missing verification details. Please restart the reset process.');
      router.replace('/(auth)/forgot-password');
      return;
    }

    const newErrors: { password?: string; confirmPassword?: string } = {};
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await apiRequest('auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          code,
          password,
        }),
      });

      Alert.alert(
        'Password Updated',
        'Your password has been reset. Please sign in with your new password.',
        [
          {
            text: 'Back to Login',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (resetError: any) {
      const message =
        resetError?.message || 'Unable to reset your password. Please try again.';
      Alert.alert('Reset Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Create a new password for your account.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="New Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              placeholder="Enter your new password"
              secureTextEntry
              error={errors.password}
              autoCapitalize="none"
              editable={!loading}
            />

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: undefined });
                }
              }}
              placeholder="Confirm your new password"
              secureTextEntry
              error={errors.confirmPassword}
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.helperText}>Minimum 6 characters</Text>

            <Button
              title="Update Password"
              onPress={handleResetPassword}
              loading={loading}
              fullWidth
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  helperText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },
  button: {
    marginTop: Spacing.lg,
  },
});

