import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '../../constants/theme';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const phone = params.phone as string;
  const type = (params.type as string) || 'signup';
  const isPasswordReset = type === 'password_reset';
  const isPhoneFlow = isPasswordReset || !!phone;
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(isPhoneFlow ? 10 * 60 : 60 * 60);

  useEffect(() => {
    const initialSeconds = isPhoneFlow ? 10 * 60 : 60 * 60;
    setSecondsRemaining(initialSeconds);
    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isPhoneFlow]);

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async () => {
    if (isPhoneFlow) {
      if (!otp || otp.length !== 6) {
        Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your phone');
        return;
      }

      if (!phone) {
        Alert.alert('Error', 'Missing phone number. Please try again.');
        return;
      }

      setLoading(true);

      try {
        const result = await apiRequest('auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            email: email?.toLowerCase().trim(),
            phone,
            code: otp,
            type,
          }),
        });

        if (!result?.success) {
          throw new Error(result?.error || 'Verification failed');
        }

        if (isPasswordReset) {
          Alert.alert('Code Verified', 'You can now reset your password.', [
            {
              text: 'Continue',
              onPress: () => {
                router.replace({
                  pathname: '/(auth)/reset-password',
                  params: { phone, code: otp },
                });
              },
            },
          ]);
          return;
        }

        Alert.alert('Phone Verified', 'Your phone has been verified. You can now sign in.', [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]);
      } catch (error: any) {
        console.error('OTP verification error:', error);
        let errorMessage = 'Invalid or expired code. Please try again.';
        if (error.message?.includes('expired')) {
          errorMessage = 'This verification code has expired. Please request a new one.';
        } else if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        Alert.alert('Verification Failed', errorMessage);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!otp || otp.length !== 8) {
      Alert.alert('Invalid Code', 'Please enter the 8-digit code sent to your email');
      return;
    }

    setLoading(true);

    try {
      // Try verifying with 'signup' type first
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: otp,
        type: 'signup',
      });

      if (error) {
        // If signup verification fails, try 'email' type as fallback
        console.log('Signup verification failed, trying email type:', error.message);
        const { data: emailData, error: emailError } = await supabase.auth.verifyOtp({
          email: email.toLowerCase().trim(),
          token: otp,
          type: 'email',
        });

        if (emailError) throw emailError;

        // Email verification succeeded
        // Sync name from auth metadata to profile immediately after verification
        if (emailData?.user?.id) {
          try {
            const { syncAuthToProfile } = await import('../../utils/profile');
            await syncAuthToProfile(emailData.user.id);
            console.log('Synced name to profile after email OTP verification');
          } catch (syncError) {
            console.warn('Error syncing name after email OTP verification:', syncError);
            // Continue anyway - login will also sync
          }
        }

        Alert.alert(
          'Email Verified',
          'Your email has been successfully verified. You can now sign in to your account.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
        return;
      }

      // Signup verification succeeded
      // Sync name from auth metadata to profile immediately after verification
      if (data?.user?.id) {
        try {
          const { syncAuthToProfile } = await import('../../utils/profile');
          await syncAuthToProfile(data.user.id);
          console.log('Synced name to profile after OTP verification');
        } catch (syncError) {
          console.warn('Error syncing name after OTP verification:', syncError);
          // Continue anyway - login will also sync
        }
      }

      Alert.alert(
        'Email Verified',
        'Your email has been successfully verified. You can now sign in to your account.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('OTP verification error:', error);

      // Provide more helpful error messages
      let errorMessage = 'Invalid or expired code. Please try again.';

      if (error.message?.includes('expired')) {
        errorMessage = 'This verification code has expired. Please request a new one.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.message?.includes('already')) {
        errorMessage = 'This email is already verified. Please try signing in.';
      }

      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (isPhoneFlow) {
      if (!phone) {
        Alert.alert('Error', 'Missing phone number. Please try again.');
        return;
      }

      setResending(true);

      try {
        const result = await apiRequest('auth/send-otp', {
          method: 'POST',
          body: JSON.stringify({
            email: email?.toLowerCase().trim(),
            phone,
            type,
          }),
        });

        if (!result?.success) {
          throw new Error(result?.error || 'Failed to resend code');
        }

        setSecondsRemaining(10 * 60);
        Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
      } catch (error: any) {
        console.error('Resend OTP error:', error);

        let errorMessage = 'Failed to resend verification code. Please try again later.';

        if (error.message?.includes('wait 60 seconds') || error.message?.includes('429')) {
          errorMessage = 'Please wait 60 seconds before requesting another code.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }

        Alert.alert('Error', errorMessage);
      } finally {
        setResending(false);
      }
      return;
    }

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
      });

      if (error) {
        // Check for rate limit errors
        if (error.message?.includes('rate limit') || 
            error.message?.includes('too many') ||
            error.message?.includes('429') ||
            error.status === 429) {
          Alert.alert(
            'Rate Limit Reached',
            'You\'ve requested too many codes. Please wait 60 seconds before requesting another code, or wait up to 1 hour if you\'ve exceeded the hourly limit.\n\nFor development, consider disabling email confirmation in Supabase Dashboard.',
            [{ text: 'OK' }]
          );
        } else {
          throw error;
        }
        return;
      }

      setSecondsRemaining(60 * 60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to resend verification code. Please try again later.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={isPhoneFlow ? 'call' : 'mail'} size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>
            {isPhoneFlow ? 'Verify Your Phone' : 'Verify Your Email'}
          </Text>
          <Text style={styles.subtitle}>
            {isPhoneFlow
              ? 'We sent a 6-digit verification code to:'
              : 'We sent an 8-digit verification code to:'}
          </Text>
          <Text style={styles.email}>{isPhoneFlow ? phone : email}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Verification Code"
            placeholder={isPhoneFlow ? 'Enter 6-digit code' : 'Enter 8-digit code'}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={isPhoneFlow ? 6 : 8}
            autoCapitalize="none"
            autoComplete="one-time-code"
            style={styles.otpInput}
          />

          <Button
            title={isPhoneFlow ? 'Verify Phone' : 'Verify Email'}
            onPress={handleVerifyOTP}
            loading={loading}
            fullWidth
            style={styles.verifyButton}
          />

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity 
              onPress={handleResendOTP} 
              disabled={resending}
              activeOpacity={0.7}
              style={styles.resendButton}
            >
              {resending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.resendLink}>Resend Code</Text>
              )}
            </TouchableOpacity>
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
            {secondsRemaining > 0
              ? `Code expires in ${formatCountdown(secondsRemaining)}.`
              : 'This code has expired. Request a new one.'}
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
  iconContainer: {
    width: 100,
    height: 100,
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
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm,
  },
  resendText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  resendButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  resendLink: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
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

