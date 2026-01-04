import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  city?: string;
  state?: string;
}

interface OrganizationSelectionModalProps {
  visible: boolean;
  onClose?: () => void;
  userId: string;
  onOrganizationSelected?: () => void;
}

export function OrganizationSelectionModal({
  visible,
  onClose,
  userId,
  onOrganizationSelected,
}: OrganizationSelectionModalProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      loadOrganizations();
    }
  }, [visible]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, industry, city, state')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error loading organizations:', error);
      Alert.alert('Error', 'Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrgId) {
      Alert.alert('Selection Required', 'Please select your organization to continue.');
      return;
    }

    setSubmitting(true);

    try {
      // Update the user's profile with the selected organization
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: selectedOrgId })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert(
        'Success! 🎉',
        'Your organization has been set. An admin will review and activate your account shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onOrganizationSelected) {
                onOrganizationSelected();
              }
              if (onClose) {
                onClose();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error updating organization:', error);
      Alert.alert('Error', 'Failed to save your organization. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrganizations = searchQuery
    ? organizations.filter((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.industry?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : organizations;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="business" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Select Your Organization</Text>
            <Text style={styles.subtitle}>
              Choose the organization you're associated with. This helps us provide you with the right benefits and services.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading organizations...</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.organizationList} showsVerticalScrollIndicator={false}>
                {filteredOrganizations.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color={Colors.textLight} />
                    <Text style={styles.emptyText}>No organizations found</Text>
                  </View>
                ) : (
                  filteredOrganizations.map((org) => (
                    <TouchableOpacity
                      key={org.id}
                      style={[
                        styles.organizationCard,
                        selectedOrgId === org.id && styles.organizationCardSelected,
                      ]}
                      onPress={() => setSelectedOrgId(org.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.radioContainer}>
                        <View
                          style={[
                            styles.radio,
                            selectedOrgId === org.id && styles.radioSelected,
                          ]}
                        >
                          {selectedOrgId === org.id && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                      </View>
                      <View style={styles.organizationInfo}>
                        <Text style={styles.organizationName}>{org.name}</Text>
                        {org.industry && (
                          <Text style={styles.organizationDetail}>
                            <Ionicons name="briefcase-outline" size={12} color={Colors.textLight} />
                            {' '}{org.industry}
                          </Text>
                        )}
                        {(org.city || org.state) && (
                          <Text style={styles.organizationDetail}>
                            <Ionicons name="location-outline" size={12} color={Colors.textLight} />
                            {' '}{[org.city, org.state].filter(Boolean).join(', ')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <View style={styles.footer}>
                <Button
                  title="Confirm Selection"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={!selectedOrgId}
                  fullWidth
                  size="large"
                />
                <Text style={styles.footerNote}>
                  Don't see your organization? Contact support for assistance.
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Shadows.large,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  organizationList: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  organizationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  organizationCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  radioContainer: {
    marginRight: Spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.round,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary,
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  organizationDetail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xxs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  footer: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
});

