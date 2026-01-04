import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ChildFormData } from '../../../../shared/types';

export default function AddChildScreen() {
  const router = useRouter();
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

      // Check if child with same name and DOB already exists
      const { data: existingChildren } = await supabase
        .from('children')
        .select('id, first_name, last_name, date_of_birth')
        .eq('parent_id', user.id)
        .eq('first_name', formData.first_name.trim())
        .eq('last_name', formData.last_name.trim())
        .eq('date_of_birth', formData.date_of_birth);

      if (existingChildren && existingChildren.length > 0) {
        if (Platform.OS === 'web') {
          window.alert('A child with this name and date of birth already exists.');
        } else {
          Alert.alert('Duplicate Child', 'A child with this name and date of birth already exists.');
        }
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('children')
        .insert({
          parent_id: user.id,
          ...formData,
        });

      if (error) throw error;

      // Handle success differently for web vs mobile
      if (Platform.OS === 'web') {
        window.alert('Child profile added successfully');
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/profile');
        }
      } else {
        Alert.alert('Success', 'Child profile added successfully', [
          { 
            text: 'OK', 
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/profile');
              }
            }
          },
        ]);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to add child profile'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to add child profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
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
            <Text style={styles.headerTitle}>Add Child</Text>
            <View style={styles.headerSpacer} />
          </View>
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
              Add your child's information to use for check-ins at daycare centers
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
              title="Save Child Profile"
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
  headerContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
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

