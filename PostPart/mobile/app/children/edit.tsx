import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ChildFormData } from '../../../../shared/types';

export default function EditChildScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<ChildFormData>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    allergies: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ChildFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingChild, setLoadingChild] = useState(true);

  useEffect(() => {
    if (id) {
      loadChild();
    }
  }, [id]);

  const loadChild = async () => {
    try {
      setLoadingChild(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', id)
        .eq('parent_id', user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Child not found');

      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        date_of_birth: data.date_of_birth || '',
        allergies: data.allergies || '',
        notes: data.notes || '',
      });
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to load child profile'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to load child profile');
      }
      router.back();
    } finally {
      setLoadingChild(false);
    }
  };

  const handleSave = async () => {
    // Validate
    const newErrors: Partial<Record<keyof ChildFormData, string>> = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if another child with same name and DOB already exists (excluding current child)
      const { data: existingChildren } = await supabase
        .from('children')
        .select('id, first_name, last_name, date_of_birth')
        .eq('parent_id', user.id)
        .eq('first_name', formData.first_name.trim())
        .eq('last_name', formData.last_name.trim())
        .eq('date_of_birth', formData.date_of_birth)
        .neq('id', id);

      if (existingChildren && existingChildren.length > 0) {
        if (Platform.OS === 'web') {
          window.alert('Another child with this name and date of birth already exists.');
        } else {
          Alert.alert('Duplicate Child', 'Another child with this name and date of birth already exists.');
        }
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('children')
        .update({
          ...formData,
        })
        .eq('id', id)
        .eq('parent_id', user.id);

      if (error) throw error;

      // Handle success differently for web vs mobile
      if (Platform.OS === 'web') {
        window.alert('Child profile updated successfully');
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/children');
        }
      } else {
        Alert.alert('Success', 'Child profile updated successfully', [
          { 
            text: 'OK', 
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/children');
              }
            }
          },
        ]);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to update child profile'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to update child profile');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingChild) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading child profile...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/children');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Child</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Spacing.xxxl + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color={Colors.info} />
            </View>
            <Text style={styles.infoText}>
              Update your child's information. Changes will be reflected in all check-ins.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Input
              label="First Name *"
              placeholder="Enter first name"
              value={formData.first_name}
              onChangeText={(text) => {
                setFormData({ ...formData, first_name: text });
                if (errors.first_name) setErrors({ ...errors, first_name: undefined });
              }}
              error={errors.first_name}
              leftIcon="person-outline"
              autoCapitalize="words"
            />

            <Input
              label="Last Name *"
              placeholder="Enter last name"
              value={formData.last_name}
              onChangeText={(text) => {
                setFormData({ ...formData, last_name: text });
                if (errors.last_name) setErrors({ ...errors, last_name: undefined });
              }}
              error={errors.last_name}
              leftIcon="person-outline"
              autoCapitalize="words"
            />

            <Input
              label="Date of Birth * (YYYY-MM-DD)"
              placeholder="2020-01-15"
              value={formData.date_of_birth}
              onChangeText={(text) => {
                setFormData({ ...formData, date_of_birth: text });
                if (errors.date_of_birth) setErrors({ ...errors, date_of_birth: undefined });
              }}
              error={errors.date_of_birth}
              leftIcon="calendar-outline"
            />

            <View style={styles.sectionDivider} />

            <Text style={styles.sectionTitle}>Additional Information (Optional)</Text>

            <Input
              label="Allergies"
              placeholder="List any allergies (e.g., peanuts, dairy)"
              value={formData.allergies}
              onChangeText={(text) => setFormData({ ...formData, allergies: text })}
              leftIcon="alert-circle-outline"
              multiline
              numberOfLines={3}
            />

            <Input
              label="Notes"
              placeholder="Any additional notes for caregivers"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              leftIcon="document-text-outline"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Update Child Profile"
              onPress={handleSave}
              loading={loading}
              icon="checkmark-circle"
              fullWidth
              size="large"
            />
            <Button
              title="Cancel"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/children');
                }
              }}
              variant="outline"
              fullWidth
              size="large"
              style={styles.cancelButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    margin: Spacing.lg,
    gap: Spacing.md,
  },
  infoIconContainer: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.info,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  form: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xl,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  cancelButton: {
    marginTop: 0,
  },
});

