import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { supabase } from '../../lib/supabase';
import { Colors, Typography, Spacing, Layout } from '../../constants/theme';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 8) {
      Alert.alert('Invalid Code', 'Please enter the 8-digit code sent to your email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      Alert.alert(
        'Email Verified! ✅',
        'Your email has been successfully verified. You can now sign in to your account.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
      });

      if (error) throw error;

      Alert.alert('Code Sent! 📧', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>📧</Text>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent an 8-digit verification code to:
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Verification Code"
            placeholder="Enter 8-digit code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={8}
            autoCapitalize="none"
            autoComplete="one-time-code"
            style={styles.otpInput}
          />

          <Button
            title="Verify Email"
            onPress={handleVerifyOTP}
            loading={loading}
            fullWidth
            style={styles.verifyButton}
          />

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <Button
              title="Resend Code"
              onPress={handleResendOTP}
              loading={resending}
              variant="ghost"
            />
          </View>

          <View style={styles.backContainer}>
            <Button
              title="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              variant="ghost"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            The code will expire in 60 minutes. Make sure to check your spam folder if you don't see the email.
          </Text>
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
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  logo: {
    fontSize: 80,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    marginTop: Spacing.xl,
  },
  otpInput: {
    fontSize: Typography.fontSize.xxl,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.bold,
  },
  verifyButton: {
    marginTop: Spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  resendText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
});

