import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { supabase } from '../../lib/supabase';
import { checkParentStatus, showStatusAlert } from '../../utils/parentStatus';
import { syncAuthToProfile } from '../../utils/profile';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    // Validate
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        // Check if it's an email confirmation error
        if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
          Alert.alert(
            'Email Not Verified',
            'Please verify your email address before signing in. Check your inbox for the verification code.',
            [
              {
                text: 'Verify Now',
                onPress: () => router.push({
                  pathname: '/(auth)/verify-otp',
                  params: { email: email.toLowerCase().trim() },
                }),
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
        } else if (error.message.includes('POST') || error.message.includes('fetch')) {
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
        } else {
          // Check for invalid credentials errors
          const isInvalidCredentials = 
            error.message.toLowerCase().includes('invalid login credentials') ||
            error.message.toLowerCase().includes('invalid password') ||
            error.message.toLowerCase().includes('invalid email') ||
            error.message.toLowerCase().includes('email not found') ||
            error.message.toLowerCase().includes('user not found') ||
            error.status === 400 ||
            error.status === 401;
          
          const errorMessage = isInvalidCredentials 
            ? 'Invalid credentials' 
            : (error.message || 'Invalid credentials');
          
          // Set inline error for display in form
          setErrors({ general: errorMessage });
          
          // Also show alert for visibility
          Alert.alert('Sign In Failed', errorMessage);
        }
      } else if (data?.session) {
        // Check if user has an organization or organization name
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, organization_name')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle to handle case where profile doesn't exist yet

          // If profile doesn't exist or doesn't have organization, redirect to organization entry
          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist yet, redirect to organization entry
            router.replace('/(auth)/organization');
            return;
          }

          if (!profile?.organization_id && !profile?.organization_name) {
            // User doesn't have organization, redirect to organization entry
            router.replace('/(auth)/organization');
            return;
          }
        }

        // Sync auth metadata to profile to ensure name is set
        // This handles cases where profile was created but name wasn't synced
        try {
          await syncAuthToProfile(user.id);
        } catch (syncError) {
          console.warn('Error syncing profile on login:', syncError);
          // Continue anyway - UserDataContext will handle it
        }

        // Navigate to home on successful login
        // Inactive users will be handled on the home screen
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('Login exception:', error);
      const errorMessage = 'Invalid credentials';
      setErrors({ general: errorMessage });
      Alert.alert('Sign In Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="log-in" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          {errors.general && (
            <View key="error-message" style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}
          
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email || errors.general) setErrors({ ...errors, email: undefined, general: undefined });
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password || errors.general) setErrors({ ...errors, password: undefined, general: undefined });
            }}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
            icon="lock-closed-outline"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            icon="log-in-outline"
            fullWidth
            size="large"
            style={styles.button}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our Terms of Service and Privacy Policy
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
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
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
    marginTop: Spacing.xl,
  },
  button: {
    marginTop: Spacing.lg,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  registerText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  registerLink: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  footer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
  },
});

