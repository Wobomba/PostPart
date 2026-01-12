import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { supabase } from '../../lib/supabase';
import { syncAuthToProfile } from '../../utils/profile';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';

export default function OrganizationScreen() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkOrganization();
  }, []);

  const checkOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Check if user already has an organization or organization name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, organization_name, full_name')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to handle case where profile doesn't exist yet

      // If profile doesn't exist, try to create it from auth metadata
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it from auth metadata
        const authName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: authName,
          });
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      } else if (profile && !profile.full_name) {
        // Profile exists but no full_name, sync from auth metadata
        const authName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        if (authName) {
          await supabase
            .from('profiles')
            .update({ full_name: authName })
            .eq('id', user.id);
        }
      }

      if (profile?.organization_id || profile?.organization_name) {
        // User already has organization or has entered organization name, redirect to home
        router.replace('/(tabs)/home');
        return;
      }

      setChecking(false);
    } catch (err) {
      console.error('Error checking organization:', err);
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    if (organizationName.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to continue');
        router.replace('/(auth)/login');
        return;
      }

      // Check if organization already exists (case-insensitive) - only for linking if it exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', organizationName.trim())
        .single();

      // Ensure profile exists and has full_name before updating
      // Sync auth metadata to profile to ensure name is set
      await syncAuthToProfile(user.id);

      // Update user profile with organization name (and organization_id if it exists)
      // Set status to inactive for admin validation
      const updateData: {
        organization_name: string;
        organization_id?: string;
        status: string;
        updated_at: string;
      } = {
        organization_name: organizationName.trim(),
        status: 'inactive',
        updated_at: new Date().toISOString(),
      };

      // If organization exists, link it; otherwise just save the name for admin to create later
      if (existingOrg) {
        updateData.organization_id = existingOrg.id;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Show success message with toast-like notification
      Alert.alert(
        'Organization Added Successfully! ✅',
        'Your organization has been registered. Please wait for the PostPart team to verify your details and activate your account. You will be notified once your account is active.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Small delay to ensure profile update is committed
              await new Promise(resolve => setTimeout(resolve, 500));
              // Redirect to home screen - UserDataContext will refresh on focus
              router.replace('/(tabs)/home');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error saving organization:', err);
      Alert.alert(
        'Error',
        err.message || 'Failed to save organization. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Organization Information</Text>
          <Text style={styles.subtitle}>
            Please enter the name of your organization to complete your registration
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Organization Name"
            placeholder="Enter your organization name"
            value={organizationName}
            onChangeText={(text) => {
              setOrganizationName(text);
              if (error) setError(null);
            }}
            error={error || undefined}
            icon="business-outline"
            autoCapitalize="words"
            editable={!loading}
          />

          <Button
            title="Continue"
            onPress={handleSubmit}
            loading={loading}
            icon="arrow-forward-outline"
            fullWidth
            size="large"
            style={styles.button}
          />

          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.textLight} />
            <Text style={styles.infoText}>
              Your account will be inactive until the PostPart team verifies your organization details.
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  form: {
    flex: 1,
    marginTop: Spacing.xl,
  },
  button: {
    marginTop: Spacing.lg,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
});

