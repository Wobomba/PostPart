import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            onClose();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const settingsSections: { title?: string; items: SettingsItem[] }[] = [
    {
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          onPress: () => {
            onClose();
            // Navigate to edit profile
          },
          showChevron: true,
        },
        {
          icon: 'people-outline',
          label: 'Manage Children',
          onPress: () => {
            onClose();
            router.push('/profile/add-child');
          },
          showChevron: true,
        },
      ],
    },
    {
      title: 'Activity',
      items: [
        {
          icon: 'time-outline',
          label: 'Access History',
          onPress: () => {
            onClose();
            router.push('/access-logs');
          },
          showChevron: true,
        },
        {
          icon: 'business-outline',
          label: 'Browse Centers',
          onPress: () => {
            onClose();
            router.push('/centers');
          },
          showChevron: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help & Support',
          onPress: () => {
            onClose();
            // Navigate to help
          },
          showChevron: true,
        },
        {
          icon: 'information-circle-outline',
          label: 'About PostPart',
          onPress: () => {
            onClose();
            Linking.openURL('https://postpart.org/');
          },
          showChevron: true,
        },
      ],
    },
    {
      items: [
        {
          icon: 'log-out-outline',
          label: 'Log Out',
          onPress: handleLogout,
          color: Colors.error,
          showChevron: false,
        },
      ],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              {section.title && (
                <Text style={styles.sectionTitle}>{section.title}</Text>
              )}
              <View style={styles.sectionContent}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.settingsItem,
                      itemIndex === section.items.length - 1 && styles.settingsItemLast,
                    ]}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingsItemLeft}>
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={item.color || Colors.text}
                      />
                      <Text
                        style={[
                          styles.settingsItemLabel,
                          item.color && { color: item.color },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {item.showChevron && (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={Colors.textMuted}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* App Version */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>PostPart v1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsItemLast: {
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  versionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
});

