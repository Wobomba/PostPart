import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { apiRequest } from '../../lib/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { formatPhoneNumber, validatePhoneNumber } from '../../utils/phone';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleSendCode = async () => {
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
      setError(validation.error || 'Please enter a valid phone number');
      return;
    }

    const formattedPhone = formatPhoneNumber(phone);

    setError(undefined);
    setInfoMessage('If an account exists for that number, an OTP will be shared.');
    setRequestError(null);
    setShowContinue(Platform.OS === 'web');
    setLoading(true);

    try {
      await apiRequest('auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: formattedPhone,
          type: 'password_reset',
        }),
      });

      const neutralMessage = 'If an account exists for that number, an OTP will be shared.';
      if (Platform.OS !== 'web') {
        Alert.alert('Check Your Phone', neutralMessage, [
          {
            text: 'Continue',
            onPress: () => {
              router.replace({
                pathname: '/(auth)/verify-otp',
                params: { phone: formattedPhone, type: 'password_reset' },
              });
            },
          },
        ]);
      }
    } catch (requestError: any) {
      const message =
        requestError?.message ||
        'Unable to send a reset code. Please check your connection and try again.';
      setRequestError(message);
      setShowContinue(false);
      if (Platform.OS !== 'web') {
        Alert.alert('Unable to Send Code', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your registered phone number to receive a reset code.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Phone Number"
            placeholder="0700123456 or +256700123456"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (error) setError(undefined);
            }}
            error={error}
            icon="call-outline"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          {infoMessage && (
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          )}

          {requestError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{requestError}</Text>
            </View>
          )}

          <Button
            title="Send Reset Code"
            onPress={handleSendCode}
            loading={loading}
            disabled={showContinue}
            fullWidth
            size="large"
            style={styles.button}
          />

          {showContinue && (
            <View style={styles.continueContainer}>
              <Button
                title="Continue"
                onPress={() =>
                  router.replace({
                    pathname: '/(auth)/verify-otp',
                    params: { phone: formatPhoneNumber(phone), type: 'password_reset' },
                  })
                }
                fullWidth
                size="large"
                style={styles.continueButton}
              />
            </View>
          )}

          <View style={styles.backContainer}>
            <Button
              title="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              variant="ghost"
            />
          </View>
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
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
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
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    marginTop: Spacing.md,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary + '30',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error + '30',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  button: {
    marginTop: Spacing.lg,
  },
  continueContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  continueButton: {
    marginTop: Spacing.xs,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});

