import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { supabase } from '../../lib/supabase';
import { Colors, Typography, Spacing, Layout } from '../../constants/theme';
import type { ChildFormData } from '../../../../shared/types';

export default function AddChildScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <Button
            title="← Cancel"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.emoji}>👶</Text>
          <Text style={styles.title}>Add Child</Text>
          <Text style={styles.subtitle}>
            Add your child's information to use for check-ins
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="First Name *"
            placeholder="Enter first name"
            value={formData.first_name}
            onChangeText={(text) => {
              setFormData({ ...formData, first_name: text });
              if (errors.first_name) setErrors({ ...errors, first_name: undefined });
            }}
            error={errors.first_name}
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
          />

          <Input
            label="Allergies (Optional)"
            placeholder="List any allergies"
            value={formData.allergies}
            onChangeText={(text) => setFormData({ ...formData, allergies: text })}
            multiline
          />

          <Input
            label="Notes (Optional)"
            placeholder="Any additional notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
          />
        </View>

        <View style={styles.footer}>
          <Button
            title="Save Child Profile"
            onPress={handleSave}
            loading={loading}
            fullWidth
            size="large"
          />
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
  },
  headerContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.sm,
  },
  header: {
    padding: Layout.screenPadding,
    paddingTop: 0,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 60,
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
  },
  form: {
    flex: 1,
    padding: Layout.screenPadding,
  },
  footer: {
    padding: Layout.screenPadding,
  },
});

