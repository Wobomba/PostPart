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
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      // Try to load profile from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
      } else {
        // Fallback to auth metadata
        setFullName(user.user_metadata?.full_name || '');
        setPhone(user.user_metadata?.phone || '');
      }
    } catch (error) {
      console.log('Profile load error - may need database setup');
    }
  };

  const pickImage = async (useCamera: boolean = false) => {
    try {
      // Check if running on web
      if (Platform.OS === 'web' && useCamera) {
        Alert.alert(
          'Camera Not Available',
          'Camera is not available in web browser. Please use "Upload Photo" to select an image from your device, or test the camera feature on a mobile device.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required', 
            'Camera permission is required to take photos. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required', 
            'Gallery permission is required to select photos. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Launch camera or gallery
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: 'images' as any, // Updated from deprecated MediaTypeOptions
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images' as any, // Updated from deprecated MediaTypeOptions
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        Alert.alert('Success', 'Photo updated! Click "Save Changes" to save your profile.');
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to pick image. Please try again or use the other option.'
      );
    }
  };

  const handleChangePhoto = () => {
    setPhotoModalVisible(true);
  };

  const handleTakePhoto = async () => {
    setPhotoModalVisible(false);
    // Small delay to let modal close smoothly
    setTimeout(() => {
      pickImage(true);
    }, 300);
  };

  const handleUploadPhoto = async () => {
    setPhotoModalVisible(false);
    // Small delay to let modal close smoothly
    setTimeout(() => {
      pickImage(false);
    }, 300);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to update your profile');
        setLoading(false);
        return;
      }

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        // If table doesn't exist, just update auth metadata
        if (profileError.code === '42P01' || profileError.code === 'PGRST116') {
          Alert.alert(
            'Database Not Set Up',
            'The profiles table does not exist. Please set up your database first. For now, we\'ll update your display name.',
            [{ text: 'OK' }]
          );
        } else {
          throw profileError;
        }
      }

      // Also update auth metadata for consistency
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        },
      });

      if (authError) throw authError;

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
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
                  router.replace('/(tabs)/profile');
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
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
          {/* Profile Avatar */}
          <TouchableOpacity 
            style={styles.avatarSection}
            onPress={handleChangePhoto}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color={Colors.textInverse} />
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={18} color={Colors.textInverse} />
              </View>
            </View>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <Input
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                leftIcon="person-outline"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                leftIcon="call-outline"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <Input
                value={email}
                editable={false}
                placeholder="Email address"
                leftIcon="mail-outline"
                style={styles.disabledInput}
              />
              <Text style={styles.hint}>
                Email cannot be changed. Contact support if you need to update it.
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.actions}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              icon="checkmark"
              size="large"
              fullWidth
            />
            <Button
              title="Cancel"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              }}
              variant="outline"
              size="large"
              fullWidth
              style={styles.cancelButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Change Modal (LinkedIn Style) */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPhotoModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Current Photo Preview */}
            <View style={styles.photoPreview}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="person" size={80} color={Colors.textInverse} />
                </View>
              )}
            </View>

            {/* Options */}
            <View style={styles.photoOptions}>
              <TouchableOpacity 
                style={styles.photoOption}
                onPress={handleTakePhoto}
              >
                <View style={styles.photoOptionIcon}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                </View>
                <View style={styles.photoOptionTextContainer}>
                  <Text style={styles.photoOptionText}>Take Photo</Text>
                  {Platform.OS === 'web' && (
                    <Text style={styles.photoOptionHint}>Not available on web</Text>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.photoOptionDivider} />

              <TouchableOpacity 
                style={styles.photoOption}
                onPress={handleUploadPhoto}
              >
                <View style={styles.photoOptionIcon}>
                  <Ionicons name="images" size={24} color={Colors.primary} />
                </View>
                <View style={styles.photoOptionTextContainer}>
                  <Text style={styles.photoOptionText}>Upload Photo</Text>
                  {Platform.OS === 'web' && (
                    <Text style={styles.photoOptionHint}>Choose from your device</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.cancelPhotoButton}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Text style={styles.cancelPhotoText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    // paddingBottom is now handled dynamically with safe area insets
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  form: {
    paddingHorizontal: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  disabledInput: {
    opacity: 0.6,
  },
  hint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  cancelButton: {
    marginTop: 0,
  },
  // Photo Modal Styles (LinkedIn Style)
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptions: {
    backgroundColor: Colors.surface,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  photoOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  photoOptionTextContainer: {
    flex: 1,
  },
  photoOptionText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  photoOptionHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  photoOptionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xl,
  },
  cancelPhotoButton: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelPhotoText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textLight,
  },
});

